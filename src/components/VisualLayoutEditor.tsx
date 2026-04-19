// Visual Layout Editor - drag-and-drop interface for button configuration
import { useState, useRef, useEffect, DragEvent, MouseEvent } from "react";
import { ButtonConfig } from "@/lib/types";
import { Plus, Edit2, Trash2, AlertCircle } from "lucide-react";
import { Button } from "./ui/Button";
import { ButtonEditorModal } from "./ButtonEditorModal";
import { validateButtonConfig, ValidationResult } from "@/lib/config-validation";
import { saveCodingWindowConfig } from "@/lib/electron-api";

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
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isDirty, setIsDirty] = useState(false);
  const [savedButtonsSnapshot, setSavedButtonsSnapshot] = useState<string>(JSON.stringify(buttons));
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Rectangular selection state
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState({ x: 0, y: 0 });
  const [selectionEnd, setSelectionEnd] = useState({ x: 0, y: 0 });

  const CANVAS_WIDTH = 680;
  const CANVAS_HEIGHT = 480;

  // Run validation whenever buttons change
  useState(() => {
    const result = validateButtonConfig(buttons);
    setValidation(result);
  });

  // Track dirty state by comparing current buttons with saved snapshot
  useEffect(() => {
    const currentSnapshot = JSON.stringify(buttons);
    setIsDirty(currentSnapshot !== savedButtonsSnapshot);
  }, [buttons, savedButtonsSnapshot]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    if (!draggingButton || !canvasRef.current) return;

    const draggedButton = buttons.find((b) => b.code === draggingButton);
    if (!draggedButton) return;

    const rect = canvasRef.current.getBoundingClientRect();
    
    // Calculate new position for the dragged button
    const newX = e.clientX - rect.left - dragOffset.x;
    const newY = e.clientY - rect.top - dragOffset.y;
    
    // Calculate the delta from the original position
    const originalPos = dragStartPositions.get(draggingButton);
    if (!originalPos) return;
    
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
      const config = {
        buttons: buttons.map((btn) => ({
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
        })),
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

  const existingCodes = buttons.map((b) => b.code);
  const existingHotkeys = buttons.map((b) => b.hotkey).filter((h): h is string => h !== undefined);

  return (
    <div className="space-y-4">
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
        <p className="text-sm text-muted-foreground">
          Drag buttons to reposition them. Click-and-drag on canvas to select multiple. Cmd/Ctrl+click to toggle selection.
        </p>
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
                    {button.hotkey}
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

      {/* Button List */}
      <div className="w-full">
        <h3 className="text-sm font-semibold mb-2">Button List</h3>
        <div className="border border-border rounded-lg overflow-hidden w-full">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Code</th>
                <th className="text-left px-3 py-2 font-medium">Label</th>
                <th className="text-left px-3 py-2 font-medium">Type</th>
                <th className="text-left px-3 py-2 font-medium">Hotkey</th>
                <th className="text-left px-3 py-2 font-medium">Position</th>
                <th className="text-right px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {buttons.map((button) => (
                <tr
                  key={button.code}
                  className={`border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer ${
                    selectedButtons.includes(button.code) ? "bg-muted/50" : ""
                  }`}
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
                  <td className="px-3 py-2 font-mono text-xs">{button.code}</td>
                  <td className="px-3 py-2">{button.label}</td>
                  <td className="px-3 py-2 capitalize">{button.type}</td>
                  <td className="px-3 py-2">
                    {button.hotkey ? (
                      <span className="inline-block border border-border rounded px-1.5 py-0.5 text-xs font-mono">
                        {button.hotkey}
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
        existingHotkeys={existingHotkeys.filter((h) => h !== editingButton?.hotkey)}
      />
    </div>
  );
}
