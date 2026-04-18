// Visual Layout Editor - drag-and-drop interface for button configuration
import { useState, useRef, useEffect, DragEvent } from "react";
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
  const [selectedButton, setSelectedButton] = useState<string | null>(null);
  const [draggingButton, setDraggingButton] = useState<string | null>(null);
  const [editingButton, setEditingButton] = useState<ButtonConfig | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isDirty, setIsDirty] = useState(false);
  const [savedButtonsSnapshot, setSavedButtonsSnapshot] = useState<string>(JSON.stringify(buttons));
  const canvasRef = useRef<HTMLDivElement>(null);

  const CANVAS_WIDTH = 660;
  const CANVAS_HEIGHT = 400;

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

  const handleDragStart = (e: DragEvent<HTMLDivElement>, buttonCode: string) => {
    const button = buttons.find((b) => b.code === buttonCode);
    if (!button) return;

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

    const buttonIndex = buttons.findIndex((b) => b.code === draggingButton);
    if (buttonIndex === -1) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(CANVAS_WIDTH - buttons[buttonIndex].position.width, e.clientX - rect.left - dragOffset.x));
    const y = Math.max(0, Math.min(CANVAS_HEIGHT - buttons[buttonIndex].position.height, e.clientY - rect.top - dragOffset.y));

    const updatedButtons = [...buttons];
    updatedButtons[buttonIndex] = {
      ...updatedButtons[buttonIndex],
      position: {
        ...updatedButtons[buttonIndex].position,
        x: Math.round(x),
        y: Math.round(y),
      },
    };

    onButtonsChange(updatedButtons);
    setDraggingButton(null);
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
      if (selectedButton === code) {
        setSelectedButton(null);
      }
    }
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
  const existingHotkeys = buttons.map((b) => b.hotkey);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button onClick={handleAddButton} size="sm">
            <Plus className="w-4 h-4" />
            Add Button
          </Button>
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
          Drag buttons to reposition them. Click to select, then use the edit button to modify properties.
        </p>
        <div
          ref={canvasRef}
          className="relative border-2 border-border rounded-xl bg-muted/20 overflow-hidden"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {buttons.map((button) => {
            const borderRadius = button.position.height < 24 ? "9999px" : "0.75rem";
            return (
            <div
              key={button.code}
              draggable
              onDragStart={(e) => handleDragStart(e, button.code)}
              onClick={() => setSelectedButton(button.code)}
              className={`absolute cursor-move group transition-all overflow-hidden shadow-lg ${
                selectedButton === button.code
                  ? "ring-2 ring-primary ring-offset-2"
                  : ""
              } ${draggingButton === button.code ? "opacity-50" : ""}`}
              style={{
                left: button.position.x,
                top: button.position.y,
                width: button.position.width,
                height: button.position.height,
                backgroundColor: button.style.colour,
                opacity: draggingButton === button.code ? 0.5 : button.style.opacity,
                borderRadius: borderRadius,
              }}
            >
              <div className="relative w-full h-full flex flex-col items-center justify-center text-white">
                <span
                  style={{ fontSize: `${button.style.fontSize}px`, fontWeight: button.style.fontWeight }}
                >
                  {button.label}
                </span>
                <span className="text-[10px] opacity-70 border border-white/30 rounded px-1.5 py-0.5 mt-1">
                  {button.hotkey}
                </span>

                {/* Action buttons (visible on hover or when selected) */}
                {selectedButton === button.code && (
                  <div className="absolute top-1 right-1 flex gap-1">
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

          {buttons.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
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
                  className={`border-b border-border/50 hover:bg-muted/30 transition-colors ${
                    selectedButton === button.code ? "bg-muted/50" : ""
                  }`}
                  onClick={() => setSelectedButton(button.code)}
                >
                  <td className="px-3 py-2 font-mono text-xs">{button.code}</td>
                  <td className="px-3 py-2">{button.label}</td>
                  <td className="px-3 py-2 capitalize">{button.type}</td>
                  <td className="px-3 py-2">
                    <span className="inline-block border border-border rounded px-1.5 py-0.5 text-xs font-mono">
                      {button.hotkey}
                    </span>
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
