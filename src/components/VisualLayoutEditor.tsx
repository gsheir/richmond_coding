// Visual Layout Editor - drag-and-drop interface for button configuration
import { useState, useRef, useEffect, DragEvent, MouseEvent } from "react";
import { ButtonConfig } from "@/lib/types";
import { Plus, Edit2, Trash2, AlertCircle, RotateCcw, GripVertical, AlignHorizontalJustifyStart, AlignHorizontalJustifyCenter, AlignHorizontalJustifyEnd, AlignVerticalJustifyStart, AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter, ChevronDown } from "lucide-react";
import { Button } from "./ui/Button";
import { ButtonEditorModal } from "./ButtonEditorModal";
import { validateButtonConfig, ValidationResult } from "@/lib/config-validation";
import { saveCodingWindowConfig, resetCodingWindowConfig } from "@/lib/electron-api";
import { formatHotkeyDisplay } from "@/lib/utils";

interface VisualLayoutEditorProps {
  buttons: ButtonConfig[];
  onButtonsChange: (buttons: ButtonConfig[]) => void;
  onConfigSaved?: (buttons: ButtonConfig[]) => void;
}

export function VisualLayoutEditor({ buttons, onButtonsChange, onConfigSaved }: VisualLayoutEditorProps) {
  const [selectedButtons, setSelectedButtons] = useState<string[]>([]);
  const [draggingButton, setDraggingButton] = useState<string | null>(null);
  const [editingButton, setEditingButton] = useState<ButtonConfig | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [dragStartPositions, setDragStartPositions] = useState<Map<string, { x: number; y: number }>>(new Map());
  const [dragCurrentPosition, setDragCurrentPosition] = useState<{ x: number; y: number } | null>(null);
  const [shiftPressed, setShiftPressed] = useState(false);
  const [dragDirection, setDragDirection] = useState<'horizontal' | 'vertical' | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isDirty, setIsDirty] = useState(false);
  const [savedButtonsSnapshot, setSavedButtonsSnapshot] = useState<string>(JSON.stringify(buttons));
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [draggedListButton, setDraggedListButton] = useState<string | null>(null);
  const [showAlignDropdown, setShowAlignDropdown] = useState(false);
  const [showDistributeDropdown, setShowDistributeDropdown] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const alignDropdownRef = useRef<HTMLDivElement>(null);
  const distributeDropdownRef = useRef<HTMLDivElement>(null);
  
  // Rectangular selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });

  const CANVAS_WIDTH = 680;
  const CANVAS_HEIGHT = 720;

  // Run validation whenever buttons change
  useEffect(() => {
    const result = validateButtonConfig(buttons);
    setValidation(result);
  }, [buttons]);

  // Track dirty state by comparing current buttons with saved snapshot
  useEffect(() => {
    const currentSnapshot = JSON.stringify(buttons);
    setIsDirty(currentSnapshot !== savedButtonsSnapshot);
  }, [buttons, savedButtonsSnapshot]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      if (alignDropdownRef.current && !alignDropdownRef.current.contains(e.target as Node)) {
        setShowAlignDropdown(false);
      }
      if (distributeDropdownRef.current && !distributeDropdownRef.current.contains(e.target as Node)) {
        setShowDistributeDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Track shift key for snap-to-axis dragging
      if (e.key === 'Shift') {
        setShiftPressed(true);
      }
      
      // Delete selected buttons with Delete or Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedButtons.length > 0) {
        // Don't delete if user is typing in an input field
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
          return;
        }
        e.preventDefault();
        handleDeleteSelected();
      }
      
      // Cmd/Ctrl+A to select all buttons
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        setSelectedButtons(buttons.map(b => b.code));
      }

      // Escape to clear selection
      if (e.key === 'Escape') {
        setSelectedButtons([]);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedButtons, buttons]);

  const handleDragStart = (e: DragEvent<HTMLDivElement>, buttonCode: string) => {
    const button = buttons.find((b) => b.code === buttonCode);
    if (!button) return;

    // If dragging a button that's not in the selection, select only it
    let buttonsToMove: string[];
    if (!selectedButtons.includes(buttonCode)) {
      buttonsToMove = [buttonCode];
      setSelectedButtons([buttonCode]);
    } else {
      buttonsToMove = selectedButtons;
    }

    // Store initial positions of all buttons being dragged
    const initialPositions = new Map<string, { x: number; y: number }>();
    buttonsToMove.forEach((code) => {
      const btn = buttons.find((b) => b.code === code);
      if (btn) {
        initialPositions.set(code, { x: btn.position.x, y: btn.position.y });
      }
    });
    setDragStartPositions(initialPositions);

    // Calculate offset relative to the dragged button
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setDragOffset({ x: offsetX, y: offsetY });
    setDraggingButton(buttonCode);
    setDragDirection(null); // Reset drag direction
    
    // Hide default drag ghost
    const dragGhost = document.createElement('div');
    dragGhost.style.position = 'absolute';
    dragGhost.style.top = '-9999px';
    document.body.appendChild(dragGhost);
    e.dataTransfer.setDragImage(dragGhost, 0, 0);
    setTimeout(() => document.body.removeChild(dragGhost), 0);
    
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    
    if (!draggingButton || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    let newX = e.clientX - rect.left - dragOffset.x;
    let newY = e.clientY - rect.top - dragOffset.y;
    
    // Calculate delta from original position
    const originalPos = dragStartPositions.get(draggingButton);
    if (originalPos && shiftPressed) {
      const deltaX = Math.abs(newX - originalPos.x);
      const deltaY = Math.abs(newY - originalPos.y);
      
      // Determine drag direction on first significant movement
      if (!dragDirection && (deltaX > 5 || deltaY > 5)) {
        setDragDirection(deltaX > deltaY ? 'horizontal' : 'vertical');
      }
      
      // Constrain to the determined direction
      if (dragDirection === 'horizontal') {
        newY = originalPos.y;
      } else if (dragDirection === 'vertical') {
        newX = originalPos.x;
      }
    }
    
    setDragCurrentPosition({ x: newX, y: newY });
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (!draggingButton || !canvasRef.current) return;

    const draggedButton = buttons.find((b) => b.code === draggingButton);
    if (!draggedButton) return;

    const rect = canvasRef.current.getBoundingClientRect();
    
    // Calculate new position for the dragged button
    let newX = e.clientX - rect.left - dragOffset.x;
    let newY = e.clientY - rect.top - dragOffset.y;
    
    // Calculate the delta from the original position
    const originalPos = dragStartPositions.get(draggingButton);
    if (!originalPos) return;
    
    // Apply shift-snap constraints
    if (shiftPressed && dragDirection) {
      if (dragDirection === 'horizontal') {
        newY = originalPos.y;
      } else if (dragDirection === 'vertical') {
        newX = originalPos.x;
      }
    }
    
    const deltaX = newX - originalPos.x;
    const deltaY = newY - originalPos.y;

    // Update positions for all selected buttons
    const updatedButtons = buttons.map((btn) => {
      if (dragStartPositions.has(btn.code)) {
        const startPos = dragStartPositions.get(btn.code)!;
        const newPosX = startPos.x + deltaX;
        const newPosY = startPos.y + deltaY;
        
        // Constrain to canvas bounds
        const constrainedX = Math.max(0, Math.min(CANVAS_WIDTH - btn.position.width, newPosX));
        const constrainedY = Math.max(0, Math.min(CANVAS_HEIGHT - btn.position.height, newPosY));
        
        return {
          ...btn,
          position: {
            ...btn.position,
            x: Math.round(constrainedX),
            y: Math.round(constrainedY),
          },
        };
      }
      return btn;
    });

    onButtonsChange(updatedButtons);
    setDraggingButton(null);
    setDragStartPositions(new Map());
    setDragCurrentPosition(null);
    setDragDirection(null);
  };

  const handleAddButton = () => {
    setEditingButton(null);
    setIsAddingNew(true);
  };

  const handleEditButton = (button: ButtonConfig) => {
    setEditingButton(button);
    setIsAddingNew(false);
  };

  const handleDeleteButton = (code: string) => {
    if (confirm(`Are you sure you want to delete button "${code}"?`)) {
      onButtonsChange(buttons.filter((b) => b.code !== code));
      setSelectedButtons(selectedButtons.filter((c) => c !== code));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedButtons.length === 0) return;
    
    const message = selectedButtons.length === 1
      ? `Are you sure you want to delete button "${selectedButtons[0]}"?`
      : `Are you sure you want to delete ${selectedButtons.length} buttons?`;
    
    if (confirm(message)) {
      onButtonsChange(buttons.filter((b) => !selectedButtons.includes(b.code)));
      setSelectedButtons([]);
    }
  };

  // Check if a button intersects with the selection rectangle
  const isButtonInSelection = (button: ButtonConfig, rect: { x1: number; y1: number; x2: number; y2: number }) => {
    const btnLeft = button.position.x;
    const btnRight = button.position.x + button.position.width;
    const btnTop = button.position.y;
    const btnBottom = button.position.y + button.position.height;

    return !(
      btnRight < rect.x1 ||
      btnLeft > rect.x2 ||
      btnBottom < rect.y1 ||
      btnTop > rect.y2
    );
  };

  // Canvas mouse handlers for rectangular selection
  const handleCanvasMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (!canvasRef.current) return;
    
    // Only start selection if clicking on canvas background (not a button)
    if (e.target !== canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsSelecting(true);
    setSelectionStart({ x, y });
    setSelectionEnd({ x, y });

    // Clear selection if not holding Cmd/Ctrl
    if (!e.metaKey && !e.ctrlKey) {
      setSelectedButtons([]);
    }
  };

  const handleCanvasMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setSelectionEnd({ x, y });

    // Update selected buttons based on current selection rectangle
    const selectionRect = {
      x1: Math.min(selectionStart.x, x),
      y1: Math.min(selectionStart.y, y),
      x2: Math.max(selectionStart.x, x),
      y2: Math.max(selectionStart.y, y),
    };

    const buttonsInSelection = buttons
      .filter((btn) => isButtonInSelection(btn, selectionRect))
      .map((btn) => btn.code);

    setSelectedButtons(buttonsInSelection);
  };

  const handleCanvasMouseUp = () => {
    setIsSelecting(false);
  };

  // Handle button click with Cmd/Ctrl for multi-select
  const handleButtonClick = (e: MouseEvent<HTMLDivElement>, buttonCode: string) => {
    e.stopPropagation();

    if (e.metaKey || e.ctrlKey) {
      // Toggle selection
      if (selectedButtons.includes(buttonCode)) {
        setSelectedButtons(selectedButtons.filter((c) => c !== buttonCode));
      } else {
        setSelectedButtons([...selectedButtons, buttonCode]);
      }
    } else {
      // Select only this button
      setSelectedButtons([buttonCode]);
    }
  };

  // Calculate selection rectangle dimensions for rendering
  const getSelectionRect = () => {
    const x1 = Math.min(selectionStart.x, selectionEnd.x);
    const y1 = Math.min(selectionStart.y, selectionEnd.y);
    const x2 = Math.max(selectionStart.x, selectionEnd.x);
    const y2 = Math.max(selectionStart.y, selectionEnd.y);

    return {
      left: x1,
      top: y1,
      width: x2 - x1,
      height: y2 - y1,
    };
  };

  // Align selected buttons
  const handleAlign = (alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    if (selectedButtons.length < 2) return;
    setShowAlignDropdown(false);

    const selectedButtonsData = buttons.filter(b => selectedButtons.includes(b.code));
    
    let referenceValue: number;
    
    switch (alignment) {
      case 'left':
        referenceValue = Math.min(...selectedButtonsData.map(b => b.position.x));
        break;
      case 'center':
        const minX = Math.min(...selectedButtonsData.map(b => b.position.x));
        const maxX = Math.max(...selectedButtonsData.map(b => b.position.x + b.position.width));
        referenceValue = (minX + maxX) / 2;
        break;
      case 'right':
        referenceValue = Math.max(...selectedButtonsData.map(b => b.position.x + b.position.width));
        break;
      case 'top':
        referenceValue = Math.min(...selectedButtonsData.map(b => b.position.y));
        break;
      case 'middle':
        const minY = Math.min(...selectedButtonsData.map(b => b.position.y));
        const maxY = Math.max(...selectedButtonsData.map(b => b.position.y + b.position.height));
        referenceValue = (minY + maxY) / 2;
        break;
      case 'bottom':
        referenceValue = Math.max(...selectedButtonsData.map(b => b.position.y + b.position.height));
        break;
    }

    const updatedButtons = buttons.map(btn => {
      if (!selectedButtons.includes(btn.code)) return btn;

      let newX = btn.position.x;
      let newY = btn.position.y;

      switch (alignment) {
        case 'left':
          newX = referenceValue;
          break;
        case 'center':
          newX = referenceValue - btn.position.width / 2;
          break;
        case 'right':
          newX = referenceValue - btn.position.width;
          break;
        case 'top':
          newY = referenceValue;
          break;
        case 'middle':
          newY = referenceValue - btn.position.height / 2;
          break;
        case 'bottom':
          newY = referenceValue - btn.position.height;
          break;
      }

      return {
        ...btn,
        position: {
          ...btn.position,
          x: Math.round(Math.max(0, Math.min(CANVAS_WIDTH - btn.position.width, newX))),
          y: Math.round(Math.max(0, Math.min(CANVAS_HEIGHT - btn.position.height, newY))),
        },
      };
    });

    onButtonsChange(updatedButtons);
  };

  // Distribute selected buttons
  const handleDistribute = (direction: 'horizontal' | 'vertical', gap?: number) => {
    if (selectedButtons.length < 3) return;
    setShowDistributeDropdown(false);

    const selectedButtonsData = buttons.filter(b => selectedButtons.includes(b.code));
    
    if (gap !== undefined) {
      // Distribute with specific gap
      if (direction === 'horizontal') {
        const sorted = [...selectedButtonsData].sort((a, b) => a.position.x - b.position.x);
        
        // Pre-calculate positions for all sorted buttons
        const newPositions = new Map<string, number>();
        let currentX = sorted[0].position.x;
        newPositions.set(sorted[0].code, currentX);
        
        for (let i = 1; i < sorted.length; i++) {
          currentX += sorted[i - 1].position.width + gap;
          newPositions.set(sorted[i].code, currentX);
        }
        
        const updatedButtons = buttons.map(btn => {
          const newX = newPositions.get(btn.code);
          if (newX === undefined) return btn;
          
          return {
            ...btn,
            position: {
              ...btn.position,
              x: Math.round(newX),
            },
          };
        });
        
        onButtonsChange(updatedButtons);
      } else {
        const sorted = [...selectedButtonsData].sort((a, b) => a.position.y - b.position.y);
        
        // Pre-calculate positions for all sorted buttons
        const newPositions = new Map<string, number>();
        let currentY = sorted[0].position.y;
        newPositions.set(sorted[0].code, currentY);
        
        for (let i = 1; i < sorted.length; i++) {
          currentY += sorted[i - 1].position.height + gap;
          newPositions.set(sorted[i].code, currentY);
        }
        
        const updatedButtons = buttons.map(btn => {
          const newY = newPositions.get(btn.code);
          if (newY === undefined) return btn;
          
          return {
            ...btn,
            position: {
              ...btn.position,
              y: Math.round(newY),
            },
          };
        });
        
        onButtonsChange(updatedButtons);
      }
    } else {
      // Distribute evenly across available space
      if (direction === 'horizontal') {
        const sorted = [...selectedButtonsData].sort((a, b) => a.position.x - b.position.x);
        const leftmost = sorted[0].position.x;
        const rightmost = sorted[sorted.length - 1].position.x + sorted[sorted.length - 1].position.width;
        const totalWidth = sorted.reduce((sum, btn) => sum + btn.position.width, 0);
        const totalGap = (rightmost - leftmost - totalWidth) / (sorted.length - 1);
        
        let currentX = leftmost;
        const updatedButtons = buttons.map(btn => {
          const index = sorted.findIndex(s => s.code === btn.code);
          if (index === -1) return btn;
          
          if (index > 0) {
            currentX += sorted[index - 1].position.width + totalGap;
          }
          
          return {
            ...btn,
            position: {
              ...btn.position,
              x: Math.round(currentX),
            },
          };
        });
        
        onButtonsChange(updatedButtons);
      } else {
        const sorted = [...selectedButtonsData].sort((a, b) => a.position.y - b.position.y);
        const topmost = sorted[0].position.y;
        const bottommost = sorted[sorted.length - 1].position.y + sorted[sorted.length - 1].position.height;
        const totalHeight = sorted.reduce((sum, btn) => sum + btn.position.height, 0);
        const totalGap = (bottommost - topmost - totalHeight) / (sorted.length - 1);
        
        let currentY = topmost;
        const updatedButtons = buttons.map(btn => {
          const index = sorted.findIndex(s => s.code === btn.code);
          if (index === -1) return btn;
          
          if (index > 0) {
            currentY += sorted[index - 1].position.height + totalGap;
          }
          
          return {
            ...btn,
            position: {
              ...btn.position,
              y: Math.round(currentY),
            },
          };
        });
        
        onButtonsChange(updatedButtons);
      }
    }
  };

  // Update position from input fields
  const handlePositionUpdate = (code: string, axis: 'x' | 'y', value: number) => {
    const updatedButtons = buttons.map(btn => {
      if (btn.code !== code) return btn;
      
      return {
        ...btn,
        position: {
          ...btn.position,
          [axis]: Math.round(Math.max(0, Math.min(
            axis === 'x' ? CANVAS_WIDTH - btn.position.width : CANVAS_HEIGHT - btn.position.height,
            value
          ))),
        },
      };
    });
    
    onButtonsChange(updatedButtons);
  };

  const handleSaveButton = (button: ButtonConfig) => {
    if (editingButton) {
      // Update existing button
      const updatedButtons = buttons.map((b) =>
        b.code === editingButton.code ? button : b
      );
      onButtonsChange(updatedButtons);
    } else {
      // Add new button
      onButtonsChange([...buttons, button]);
    }
    setEditingButton(null);
    setIsAddingNew(false);
  };

  const handleSaveConfig = async () => {
    try {
      setSaveStatus("saving");
      
      // Helper function to serialize a button
      const serializeButton = (btn: ButtonConfig) => {
        const baseConfig: any = {
          code: btn.code,
          label: btn.label,
          type: btn.type,
          category: btn.category,
          hotkey: btn.hotkey,
          position: btn.position,
          style: {
            colour: btn.style.colour,
            opacity: btn.style.opacity,
            font_size: btn.style.fontSize,
            font_weight: btn.style.fontWeight,
          },
          lead_ms: btn.leadMs,
          lag_ms: btn.lagMs,
        };
        
        // Add optional properties if they exist
        if (btn.possessionState) {
          baseConfig.possession_state = btn.possessionState;
        }
        if (btn.hierarchyLevel !== undefined) {
          baseConfig.hierarchy_level = btn.hierarchyLevel;
        }
        if (btn.transitionType) {
          baseConfig.transition_type = btn.transitionType;
        }
        if (btn.forPossessionState) {
          baseConfig.for_possession_state = btn.forPossessionState;
        }
        
        return baseConfig;
      };
      
      // Separate buttons by type
      const phaseButtons = buttons.filter(b => b.type === 'phase').map(serializeButton);
      const contextButtons = buttons.filter(b => b.type === 'context').map(serializeButton);
      const terminationButtons = buttons.filter(b => b.type === 'termination').map(serializeButton);
      
      const config = {
        phase_buttons: phaseButtons,
        context_buttons: contextButtons,
        termination_buttons: terminationButtons,
      };

      await saveCodingWindowConfig(config);
      
      // Update global store after successful save
      if (typeof onConfigSaved === 'function') {
        onConfigSaved(buttons);
      }
      
      // Update snapshot and clear dirty state
      setSavedButtonsSnapshot(JSON.stringify(buttons));
      setIsDirty(false);
      
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to save config:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const handleResetConfig = async () => {
    try {
      setSaveStatus("saving");
      const defaultConfig = await resetCodingWindowConfig();
      
      // Combine phase, context, and termination buttons
      const allButtons = [
        ...(defaultConfig.phase_buttons || []),
        ...(defaultConfig.context_buttons || []),
        ...(defaultConfig.termination_buttons || []),
      ];
      
      // Update buttons from default config
      const loadedButtons = allButtons.map((btn: any) => ({
        code: btn.code,
        label: btn.label,
        type: btn.type,
        category: btn.category || undefined,
        hotkey: btn.hotkey || undefined,
        position: btn.position,
        style: {
          colour: btn.style.colour,
          opacity: btn.style.opacity,
          fontSize: btn.style.font_size,
          fontWeight: btn.style.font_weight,
        },
        leadMs: btn.lead_ms,
        lagMs: btn.lag_ms,
        possessionState: btn.possession_state,
        hierarchyLevel: btn.hierarchy_level,
        transitionType: btn.transition_type,
        forPossessionState: btn.for_possession_state,
      }));
      
      onButtonsChange(loadedButtons);
      
      // Update global store after successful reset
      if (typeof onConfigSaved === 'function') {
        onConfigSaved(loadedButtons);
      }
      
      // Update snapshot and clear dirty state
      setSavedButtonsSnapshot(JSON.stringify(loadedButtons));
      setIsDirty(false);
      setShowResetConfirm(false);
      
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      console.error("Failed to reset config:", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  // List drag and drop handlers
  const handleListDragStart = (e: DragEvent<HTMLTableRowElement>, buttonCode: string) => {
    setDraggedListButton(buttonCode);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleListDragOver = (e: DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleListDrop = (e: DragEvent<HTMLTableRowElement>, targetCode: string, buttonType: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedListButton || draggedListButton === targetCode) {
      setDraggedListButton(null);
      return;
    }

    const draggedButton = buttons.find(b => b.code === draggedListButton);
    const targetButton = buttons.find(b => b.code === targetCode);

    if (!draggedButton || !targetButton || draggedButton.type !== targetButton.type) {
      setDraggedListButton(null);
      return;
    }

    // Get buttons of the same type
    const sameTypeButtons = buttons.filter(b => b.type === buttonType);
    const otherButtons = buttons.filter(b => b.type !== buttonType);

    const draggedIndex = sameTypeButtons.findIndex(b => b.code === draggedListButton);
    const targetIndex = sameTypeButtons.findIndex(b => b.code === targetCode);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedListButton(null);
      return;
    }

    // Reorder within the same type
    const reordered = [...sameTypeButtons];
    const [removed] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    // Combine with other types
    const newButtons = [...otherButtons, ...reordered];
    onButtonsChange(newButtons);
    setDraggedListButton(null);
  };

  const handleListDragEnd = () => {
    setDraggedListButton(null);
  };

  const existingCodes = buttons.map((b) => b.code);

  // Categorise buttons by type
  const phaseButtons = buttons.filter(b => b.type === 'phase');
  const contextButtons = buttons.filter(b => b.type === 'context');
  const terminationButtons = buttons.filter(b => b.type === 'termination');

  // Helper to render a categorised button table
  const renderButtonTable = (categoryButtons: ButtonConfig[], categoryName: string, categoryType: string) => {
    if (categoryButtons.length === 0) return null;

    return (
      <div key={categoryType} className="w-full">
        <h4 className="text-sm font-medium mb-2">{categoryName}</h4>
        <div className="border border-border rounded-lg overflow-hidden w-full">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="w-8"></th>
                <th className="text-left px-3 py-2 font-medium">Code</th>
                <th className="text-left px-3 py-2 font-medium">Label</th>
                <th className="text-left px-3 py-2 font-medium">Hotkey</th>
                <th className="text-left px-3 py-2 font-medium">Position</th>
                <th className="text-right px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categoryButtons.map((button) => (
                <tr
                  key={button.code}
                  draggable
                  onDragStart={(e) => handleListDragStart(e, button.code)}
                  onDragOver={handleListDragOver}
                  onDrop={(e) => handleListDrop(e, button.code, categoryType)}
                  onDragEnd={handleListDragEnd}
                  className={`border-b border-border/50 hover:bg-muted/30 transition-colors cursor-move ${
                    selectedButtons.includes(button.code) ? "bg-muted/50" : ""
                  } ${draggedListButton === button.code ? "opacity-50" : ""}`}
                  onClick={(e) => {
                    if (e.metaKey || e.ctrlKey) {
                      if (selectedButtons.includes(button.code)) {
                        setSelectedButtons(selectedButtons.filter((c) => c !== button.code));
                      } else {
                        setSelectedButtons([...selectedButtons, button.code]);
                      }
                    } else {
                      setSelectedButtons([button.code]);
                    }
                  }}
                >
                  <td className="px-2 py-2 text-muted-foreground">
                    <GripVertical className="w-4 h-4" />
                  </td>
                  <td 
                    className="px-3 py-2 font-mono text-xs font-bold text-white"
                    style={{ 
                      backgroundColor: button.style.colour,
                      opacity: button.style.opacity 
                    }}
                  >
                    {button.code}
                  </td>
                  <td className="px-3 py-2">{button.label}</td>
                  <td className="px-3 py-2">
                    {button.hotkey ? (
                      <span className="inline-block border border-border rounded px-1.5 py-0.5 text-xs font-mono">
                        {formatHotkeyDisplay(button.hotkey)}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">None</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {button.position.x}, {button.position.y}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex gap-1 justify-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditButton(button);
                        }}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteButton(button.code);
                        }}
                        className="p-1 rounded hover:bg-destructive/20 text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Description */}
      <p className="text-sm text-muted-foreground">
        Customise the coding buttons that appear in the Code page. Drag buttons to reposition them, click-and-drag on canvas to select multiple, or use the editor to modify properties.
      </p>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={handleAddButton} size="sm">
            <Plus className="w-4 h-4" />
            Add Button
          </Button>
          {selectedButtons.length > 0 && (
            <Button 
              onClick={handleDeleteSelected} 
              size="sm" 
              variant="destructive"
            >
              <Trash2 className="w-4 h-4" />
              Delete {selectedButtons.length > 1 ? `${selectedButtons.length} Buttons` : "Button"}
            </Button>
          )}
          <div className="relative">
            <Button onClick={handleSaveConfig} size="sm" variant="secondary" disabled={saveStatus === "saving"}>
              {saveStatus === "saving" ? "Saving..." : saveStatus === "saved" ? "Saved!" : "Save Configuration"}
            </Button>
            {isDirty && saveStatus === "idle" && (
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full" title="Unsaved changes" />
            )}
          </div>
          <Button 
            onClick={() => setShowResetConfirm(true)} 
            size="sm" 
            variant="outline"
            disabled={saveStatus === "saving"}
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Default
          </Button>

          {/* Align Dropdown */}
          <div className="relative" ref={alignDropdownRef}>
            <Button
              onClick={() => setShowAlignDropdown(!showAlignDropdown)}
              size="sm"
              variant="outline"
              disabled={selectedButtons.length < 2}
              className="gap-1"
            >
              Align
              <ChevronDown className="w-3 h-3" />
            </Button>
            {showAlignDropdown && selectedButtons.length >= 2 && (
              <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 min-w-[160px]">
                <div className="p-1">
                  <button
                    onClick={() => handleAlign('left')}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2"
                  >
                    <AlignHorizontalJustifyStart className="w-4 h-4" />
                    Align Left
                  </button>
                  <button
                    onClick={() => handleAlign('center')}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2"
                  >
                    <AlignHorizontalJustifyCenter className="w-4 h-4" />
                    Align Centre
                  </button>
                  <button
                    onClick={() => handleAlign('right')}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2"
                  >
                    <AlignHorizontalJustifyEnd className="w-4 h-4" />
                    Align Right
                  </button>
                  <div className="h-px bg-border my-1" />
                  <button
                    onClick={() => handleAlign('top')}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2"
                  >
                    <AlignVerticalJustifyStart className="w-4 h-4" />
                    Align Top
                  </button>
                  <button
                    onClick={() => handleAlign('middle')}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2"
                  >
                    <AlignVerticalJustifyCenter className="w-4 h-4" />
                    Align Middle
                  </button>
                  <button
                    onClick={() => handleAlign('bottom')}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2"
                  >
                    <AlignVerticalJustifyEnd className="w-4 h-4" />
                    Align Bottom
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Distribute Dropdown */}
          <div className="relative" ref={distributeDropdownRef}>
            <Button
              onClick={() => setShowDistributeDropdown(!showDistributeDropdown)}
              size="sm"
              variant="outline"
              disabled={selectedButtons.length < 3}
              className="gap-1"
            >
              Distribute
              <ChevronDown className="w-3 h-3" />
            </Button>
            {showDistributeDropdown && selectedButtons.length >= 3 && (
              <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-50 min-w-[200px]">
                <div className="p-1">
                  <button
                    onClick={() => handleDistribute('horizontal')}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2"
                  >
                    <AlignHorizontalDistributeCenter className="w-4 h-4" />
                    Distribute Horizontally
                  </button>
                  <button
                    onClick={() => handleDistribute('vertical')}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-accent rounded flex items-center gap-2"
                  >
                    <AlignVerticalDistributeCenter className="w-4 h-4" />
                    Distribute Vertically
                  </button>
                  <div className="h-px bg-border my-1" />
                  <div className="px-3 py-2">
                    <label className="text-xs font-medium text-muted-foreground block mb-2">Set Horizontal Spacing</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Gap (px)"
                        min="0"
                        className="flex-1 h-8 px-2 text-xs bg-background border border-input rounded"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const gap = parseInt(e.currentTarget.value) || 0;
                            handleDistribute('horizontal', gap);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          const gap = parseInt(input.value) || 0;
                          handleDistribute('horizontal', gap);
                          input.value = '';
                        }}
                        className="px-2 h-8 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                  <div className="px-3 py-2">
                    <label className="text-xs font-medium text-muted-foreground block mb-2">Set Vertical Spacing</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        placeholder="Gap (px)"
                        min="0"
                        className="flex-1 h-8 px-2 text-xs bg-background border border-input rounded"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const gap = parseInt(e.currentTarget.value) || 0;
                            handleDistribute('vertical', gap);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                          const gap = parseInt(input.value) || 0;
                          handleDistribute('vertical', gap);
                          input.value = '';
                        }}
                        className="px-2 h-8 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Position Fields */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs font-medium text-muted-foreground">Position:</span>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">X:</span>
              <input
                type="number"
                value={selectedButtons.length === 1 ? buttons.find(b => b.code === selectedButtons[0])?.position.x ?? '' : ''}
                onChange={(e) => {
                  if (selectedButtons.length === 1) {
                    handlePositionUpdate(selectedButtons[0], 'x', parseInt(e.target.value) || 0);
                  }
                }}
                disabled={selectedButtons.length !== 1}
                placeholder="–"
                className="w-16 h-8 px-2 text-xs bg-background border border-input rounded disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Y:</span>
              <input
                type="number"
                value={selectedButtons.length === 1 ? buttons.find(b => b.code === selectedButtons[0])?.position.y ?? '' : ''}
                onChange={(e) => {
                  if (selectedButtons.length === 1) {
                    handlePositionUpdate(selectedButtons[0], 'y', parseInt(e.target.value) || 0);
                  }
                }}
                disabled={selectedButtons.length !== 1}
                placeholder="–"
                className="w-16 h-8 px-2 text-xs bg-background border border-input rounded disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>
        <div className="text-sm text-muted-foreground">
          {buttons.length} button{buttons.length !== 1 ? "s" : ""}
          {selectedButtons.length > 0 && ` • ${selectedButtons.length} selected`}
          {isDirty && <span className="text-blue-500 ml-2">• Unsaved changes</span>}
        </div>
      </div>

      {/* Validation Messages */}
      {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
        <div className="space-y-2">
          {validation.errors.length > 0 && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-destructive">Errors</p>
                  <ul className="text-xs text-destructive/80 space-y-1 mt-1">
                    {validation.errors.map((error, index) => (
                      <li key={index}>
                        {error.buttonCode && `[${error.buttonCode}] `}
                        {error.message}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {validation.warnings.length > 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-500">
                    Warnings
                  </p>
                  <ul className="text-xs text-yellow-600/80 dark:text-yellow-500/80 space-y-1 mt-1">
                    {validation.warnings.slice(0, 5).map((warning, index) => (
                      <li key={index}>{warning.message}</li>
                    ))}
                    {validation.warnings.length > 5 && (
                      <li>... and {validation.warnings.length - 5} more</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Canvas */}
      <div className="space-y-2">
        <div
          ref={canvasRef}
          className="relative border-2 border-border rounded-xl bg-muted/20 overflow-hidden select-none"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          {buttons.map((button) => {
            const borderRadius = button.position.height < 24 ? "9999px" : "0.75rem";
            const isSelected = selectedButtons.includes(button.code);
            const isBeingDragged = draggingButton !== null && dragStartPositions.has(button.code);
            return (
            <div
              key={button.code}
              draggable
              onDragStart={(e) => handleDragStart(e, button.code)}
              onClick={(e) => handleButtonClick(e, button.code)}
              className={`absolute cursor-move group transition-all overflow-hidden shadow-lg ${
                isSelected
                  ? "ring-2 ring-primary ring-offset-2"
                  : ""
              } ${isBeingDragged ? "opacity-50" : ""}`}
              style={{
                left: button.position.x,
                top: button.position.y,
                width: button.position.width,
                height: button.position.height,
                backgroundColor: button.style.colour,
                opacity: isBeingDragged ? 0.5 : button.style.opacity,
                borderRadius: borderRadius,
              }}
            >
              <div className="relative w-full h-full flex flex-col items-center justify-center text-white pointer-events-none">
                <span
                  className="text-center"
                  style={{ fontSize: `${button.style.fontSize}px`, fontWeight: button.style.fontWeight }}
                >
                  {button.label}
                </span>
                {button.hotkey && (
                  <span className="text-[10px] opacity-70 border border-white/30 rounded px-1.5 py-0.5 mt-1">
                    {formatHotkeyDisplay(button.hotkey)}
                  </span>
                )}

                {/* Action buttons (visible on hover or when selected) */}
                {isSelected && selectedButtons.length === 1 && (
                  <div className="absolute top-1 right-1 flex gap-1 pointer-events-auto">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditButton(button);
                      }}
                      className="p-1 bg-black/50 rounded hover:bg-black/70 transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteButton(button.code);
                      }}
                      className="p-1 bg-black/50 rounded hover:bg-destructive/70 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            );
          })}

          {/* Selection Rectangle */}
          {isSelecting && (() => {
            const rect = getSelectionRect();
            return (
              <div
                className="absolute border-2 border-primary bg-primary/10 pointer-events-none"
                style={{
                  left: rect.left,
                  top: rect.top,
                  width: rect.width,
                  height: rect.height,
                }}
              />
            );
          })()}

          {/* Drag Preview - show buttons being dragged */}
          {draggingButton && dragCurrentPosition && dragStartPositions.size > 0 && (() => {
            const originalPos = dragStartPositions.get(draggingButton);
            if (!originalPos) return null;

            const deltaX = dragCurrentPosition.x - originalPos.x;
            const deltaY = dragCurrentPosition.y - originalPos.y;

            return Array.from(dragStartPositions.keys()).map((buttonCode) => {
              const button = buttons.find(b => b.code === buttonCode);
              const startPos = dragStartPositions.get(buttonCode);
              if (!button || !startPos) return null;

              const previewX = startPos.x + deltaX;
              const previewY = startPos.y + deltaY;
              const borderRadius = button.position.height < 24 ? "9999px" : "0.75rem";

              return (
                <div
                  key={`preview-${button.code}`}
                  className="absolute overflow-hidden shadow-xl pointer-events-none border-2 border-primary"
                  style={{
                    left: previewX,
                    top: previewY,
                    width: button.position.width,
                    height: button.position.height,
                    backgroundColor: button.style.colour,
                    opacity: 0.8,
                    borderRadius: borderRadius,
                  }}
                >
                  <div className="relative w-full h-full flex flex-col items-center justify-center text-white">
                    <span
                      className="text-center"
                      style={{ fontSize: `${button.style.fontSize}px`, fontWeight: button.style.fontWeight }}
                    >
                      {button.label}
                    </span>
                    {button.hotkey && (
                      <span className="text-[10px] opacity-70 border border-white/30 rounded px-1.5 py-0.5 mt-1">
                        {formatHotkeyDisplay(button.hotkey)}
                      </span>
                    )}
                  </div>
                </div>
              );
            });
          })()}

          {buttons.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-muted-foreground">
                <p className="text-sm">No buttons configured</p>
                <p className="text-xs mt-1">Click "Add Button" to get started</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Keyboard Layout Visualization */}
      <div className="space-y-2" style={{ width: CANVAS_WIDTH }}>
        <h3 className="text-sm font-semibold">Keyboard Hotkey Map</h3>
        <div className="bg-muted/20 rounded-xl p-4 border border-border">
          {/* Create hotkey map */}
          {(() => {
            const hotkeyMap = new Map<string, ButtonConfig[]>();
            buttons.forEach((btn) => {
              if (btn.hotkey) {
                // Normalize space character to 'SPACE' for matching
                const normalizedHotkey = btn.hotkey === ' ' ? 'SPACE' : btn.hotkey.toUpperCase();
                const existing = hotkeyMap.get(normalizedHotkey) || [];
                hotkeyMap.set(normalizedHotkey, [...existing, btn]);
              }
            });

            const renderKey = (key: string, label?: string, width: string = "w-10", extraClasses: string = "") => {
              const normalizedKey = key.toUpperCase();
              const buttonList = hotkeyMap.get(normalizedKey) || [];
              const displayLabel = label || key;
              
              // Handle multiple buttons with diagonal split
              if (buttonList.length > 1) {
                const buttonTitles = buttonList.map(b => `${b.label} (${b.code})`).join(', ');
                return (
                  <div
                    key={key}
                    className={`${width} h-10 rounded border-2 flex items-center justify-center text-xs font-medium transition-all overflow-hidden relative ${extraClasses}`}
                    style={{
                      borderColor: buttonList[0].style.colour,
                    }}
                    title={buttonTitles}
                  >
                    {/* Diagonal split background */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to bottom right, ${buttonList[0].style.colour} 0%, ${buttonList[0].style.colour} 50%, ${buttonList[1].style.colour} 50%, ${buttonList[1].style.colour} 100%)`,
                      }}
                    />
                    <span className="relative z-10 text-white font-bold">{displayLabel}</span>
                  </div>
                );
              }
              
              // Single button or no button
              const button = buttonList[0];
              return (
                <div
                  key={key}
                  className={`${width} h-10 rounded border-2 flex items-center justify-center text-xs font-medium transition-all ${extraClasses}`}
                  style={{
                    backgroundColor: button ? button.style.colour : 'transparent',
                    borderColor: button ? button.style.colour : 'hsl(var(--border))',
                    color: button ? 'white' : 'hsl(var(--muted-foreground))',
                    fontWeight: button ? 'bold' : 'normal',
                  }}
                  title={button ? `${button.label} (${button.code})` : undefined}
                >
                  {displayLabel}
                </div>
              );
            };

            const renderArrowKey = (key: string, label: string) => {
              const normalizedKey = key.toUpperCase();
              const buttonList = hotkeyMap.get(normalizedKey) || [];
              
              // Handle multiple buttons with diagonal split
              if (buttonList.length > 1) {
                const buttonTitles = buttonList.map(b => `${b.label} (${b.code})`).join(', ');
                return (
                  <div
                    key={key}
                    className="w-10 h-[18px] rounded border-2 flex items-center justify-center text-xs font-medium transition-all overflow-hidden relative"
                    style={{
                      borderColor: buttonList[0].style.colour,
                    }}
                    title={buttonTitles}
                  >
                    {/* Diagonal split background */}
                    <div 
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to bottom right, ${buttonList[0].style.colour} 0%, ${buttonList[0].style.colour} 50%, ${buttonList[1].style.colour} 50%, ${buttonList[1].style.colour} 100%)`,
                      }}
                    />
                    <span className="relative z-10 text-white font-bold">{label}</span>
                  </div>
                );
              }
              
              // Single button or no button
              const button = buttonList[0];
              return (
                <div
                  key={key}
                  className="w-10 h-[18px] rounded border-2 flex items-center justify-center text-xs font-medium transition-all"
                  style={{
                    backgroundColor: button ? button.style.colour : 'transparent',
                    borderColor: button ? button.style.colour : 'hsl(var(--border))',
                    color: button ? 'white' : 'hsl(var(--muted-foreground))',
                    fontWeight: button ? 'bold' : 'normal',
                  }}
                  title={button ? `${button.label} (${button.code})` : undefined}
                >
                  {label}
                </div>
              );
            };

            return (
              <div className="space-y-1.5 font-mono">
                {/* Number row */}
                <div className="flex gap-1">
                  {renderKey('`', '`')}
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map(k => renderKey(k))}
                  {renderKey('-', '-')}
                  {renderKey('=', '=')}
                  {renderKey('Backspace', 'delete', 'w-20', 'text-[10px]')}
                </div>

                {/* QWERTY row */}
                <div className="flex gap-1">
                  {renderKey('Tab', 'tab', 'w-16', 'text-[10px]')}
                  {['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'].map(k => renderKey(k))}
                  {renderKey('[', '[')}
                  {renderKey(']', ']')}
                  {renderKey('\\', '\\')}
                </div>

                {/* ASDF row */}
                <div className="flex gap-1">
                  {renderKey('CapsLock', 'caps lock', 'w-20', 'text-[10px]')}
                  {['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'].map(k => renderKey(k))}
                  {renderKey(';', ';')}
                  {renderKey("'", "'")}
                  {renderKey('Enter', 'return', 'w-20', 'text-[10px]')}
                </div>

                {/* ZXCV row */}
                <div className="flex gap-1">
                  {renderKey('Shift', 'shift', 'w-24', 'text-[10px]')}
                  {['Z', 'X', 'C', 'V', 'B', 'N', 'M'].map(k => renderKey(k))}
                  {renderKey(',', ',')}
                  {renderKey('.', '.')}
                  {renderKey('/', '/')}
                  {renderKey('Shift', 'shift', 'w-24', 'text-[10px]')}
                </div>

                {/* Space row */}
                <div className="flex gap-1 items-center">
                  {renderKey('Fn', 'fn', 'w-10', 'text-[10px]')}
                  {renderKey('Ctrl', '⌃', 'w-10')}
                  {renderKey('Alt', '⌥', 'w-10')}
                  {renderKey('Cmd', '⌘', 'w-10')}
                  {renderKey('Space', '', 'w-[216px]')}
                  {renderKey('Cmd', '⌘', 'w-10')}
                  {renderKey('Alt', '⌥', 'w-10')}
                  
                  {/* Arrow keys */}
                  <div className="flex flex-col gap-1 ml-2">
                    <div className="flex justify-center">
                      {renderArrowKey('ArrowUp', '↑')}
                    </div>
                    <div className="flex gap-1">
                      {renderArrowKey('ArrowLeft', '←')}
                      {renderArrowKey('ArrowDown', '↓')}
                      {renderArrowKey('ArrowRight', '→')}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Button Lists */}
      <div className="w-full space-y-4">
        <h3 className="text-sm font-semibold">Button Lists</h3>
        {renderButtonTable(phaseButtons, "Phase Buttons", "phase")}
        {renderButtonTable(contextButtons, "Context Buttons", "context")}
        {renderButtonTable(terminationButtons, "Termination Buttons", "termination")}
        {buttons.length === 0 && (
          <div className="py-8 text-center text-muted-foreground text-sm">
            No buttons configured
          </div>
        )}
      </div>

      {/* Button Editor Modal */}
      <ButtonEditorModal
        button={editingButton}
        isOpen={isAddingNew || editingButton !== null}
        onClose={() => {
          setEditingButton(null);
          setIsAddingNew(false);
        }}
        onSave={handleSaveButton}
        existingCodes={existingCodes.filter((c) => c !== editingButton?.code)}
      />

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl p-6 max-w-md mx-4 shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Reset to Default Configuration?</h3>
                <p className="text-sm text-muted-foreground">
                  This will replace all current buttons with the default configuration. This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button 
                onClick={() => setShowResetConfirm(false)} 
                size="sm" 
                variant="outline"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleResetConfig} 
                size="sm" 
                variant="destructive"
                disabled={saveStatus === "saving"}
              >
                {saveStatus === "saving" ? "Resetting..." : "Reset"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
