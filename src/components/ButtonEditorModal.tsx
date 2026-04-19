// Button Editor Modal - comprehensive form for editing button configuration
import { useState, useEffect, useRef } from "react";
import { ButtonConfig, ButtonType } from "@/lib/types";
import { Button } from "./ui/Button";
import { X } from "lucide-react";
import { formatHotkeyDisplay, normaliseHotkey, isValidHotkeyKey } from "@/lib/utils";

interface ButtonEditorModalProps {
  button: ButtonConfig | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (button: ButtonConfig) => void;
  existingCodes: string[];
}

export function ButtonEditorModal({
  button,
  isOpen,
  onClose,
  onSave,
  existingCodes,
}: ButtonEditorModalProps) {
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<ButtonType>(ButtonType.PHASE);
  const [category, setCategory] = useState<string>("");
  const [hotkey, setHotkey] = useState("");
  const [x, setX] = useState(10);
  const [y, setY] = useState(10);
  const [width, setWidth] = useState(120);
  const [height, setHeight] = useState(60);
  const [colour, setColour] = useState("#2D5F8D");
  const [opacity, setOpacity] = useState(0.9);
  const [fontSize, setFontSize] = useState(10);
  const [fontWeight, setFontWeight] = useState("bold");
  const [leadMs, setLeadMs] = useState(3000);
  const [lagMs, setLagMs] = useState(5000);
  const [possessionState, setPossessionState] = useState<"in-possession" | "out-of-possession" | "">("");
  const [hierarchyLevel, setHierarchyLevel] = useState<number>(1);
  const [transitionType, setTransitionType] = useState<"upgrade" | "downgrade" | "ball-lost" | "ball-won" | "">("");
  const [forPossessionState, setForPossessionState] = useState<"in-possession" | "out-of-possession" | "">("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCapturingHotkey, setIsCapturingHotkey] = useState(false);
  const hotkeyInputRef = useRef<HTMLInputElement>(null);

  // Load button data ONLY when modal opens (not when button prop changes)
  useEffect(() => {
    if (isOpen && !isInitialized) {
      if (button) {
        setCode(button.code);
        setLabel(button.label);
        setType(button.type);
        setCategory(button.category || "");
        setHotkey(button.hotkey || "");
        setX(button.position.x);
        setY(button.position.y);
        setWidth(button.position.width);
        setHeight(button.position.height);
        setColour(button.style.colour);
        setOpacity(button.style.opacity);
        setFontSize(button.style.fontSize);
        setFontWeight(button.style.fontWeight);
        setLeadMs(button.leadMs);
        setLagMs(button.lagMs);
        setPossessionState(button.possessionState || "");
        setHierarchyLevel(button.hierarchyLevel || 1);
        setTransitionType(button.transitionType || "");
        setForPossessionState(button.forPossessionState || "");
      } else {
        // Reset for new button
        setCode("");
        setLabel("");
        setType(ButtonType.PHASE);
        setCategory("");
        setHotkey("");
        setX(10);
        setY(10);
        setWidth(120);
        setHeight(60);
        setColour("#2D5F8D");
        setOpacity(0.9);
        setFontSize(10);
        setFontWeight("bold");
        setLeadMs(3000);
        setLagMs(5000);
        setPossessionState("");
        setHierarchyLevel(1);
        setTransitionType("");
        setForPossessionState("");
      }
      setErrors({});
      setIsInitialized(true);
    }
    
    // Reset initialization flag when modal closes
    if (!isOpen) {
      setIsInitialized(false);
    }
  }, [isOpen, button, isInitialized]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!code.trim()) {
      newErrors.code = "Code is required";
    } else if (existingCodes.includes(code) && button?.code !== code) {
      newErrors.code = "Code already exists";
    }

    if (!label.trim()) {
      newErrors.label = "Label is required";
    }

    // Hotkey is optional, but if provided, validate it
    if (hotkey.trim()) {
      // Allow single characters or arrow keys
      const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(hotkey);
      if (!isArrowKey && hotkey.length > 1) {
        newErrors.hotkey = "Hotkey must be a single character or arrow key";
      }
    }

    if (width <= 0) {
      newErrors.width = "Width must be greater than 0";
    }

    if (height <= 0) {
      newErrors.height = "Height must be greater than 0";
    }

    if (opacity < 0 || opacity > 1) {
      newErrors.opacity = "Opacity must be between 0 and 1";
    }

    if (!/^#[0-9A-F]{6}$/i.test(colour)) {
      newErrors.colour = "Colour must be in #RRGGBB format";
    }

    if (type === ButtonType.TERMINATION && !category) {
      newErrors.category = "Outcome is required for termination buttons";
    }

    if (type === ButtonType.PHASE && !possessionState) {
      newErrors.possessionState = "Possession state is required for phase buttons";
    }

    if (type === ButtonType.PHASE && hierarchyLevel < 1) {
      newErrors.hierarchyLevel = "Hierarchy level must be at least 1";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validate()) {
      return;
    }

    const updatedButton: ButtonConfig = {
      code,
      label,
      type,
      category: type === ButtonType.TERMINATION ? category : undefined,
      hotkey: hotkey.trim() || undefined,
      position: { x, y, width, height },
      style: {
        colour,
        opacity,
        fontSize,
        fontWeight,
      },
      leadMs,
      lagMs,
      possessionState: type === ButtonType.PHASE && possessionState ? possessionState as "in-possession" | "out-of-possession" : undefined,
      hierarchyLevel: type === ButtonType.PHASE ? hierarchyLevel : undefined,
      transitionType: type === ButtonType.TERMINATION && transitionType ? transitionType as "upgrade" | "downgrade" | "ball-lost" | "ball-won" : undefined,
      forPossessionState: type === ButtonType.TERMINATION && forPossessionState ? forPossessionState as "in-possession" | "out-of-possession" : undefined,
    };

    onSave(updatedButton);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {button ? "Edit Button" : "Add Button"}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Basic Properties */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Basic Properties</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Code <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  placeholder="BUTTON_CODE"
                />
                {errors.code && (
                  <p className="text-xs text-destructive mt-1">{errors.code}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Label <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  placeholder="Button Label"
                />
                {errors.label && (
                  <p className="text-xs text-destructive mt-1">{errors.label}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Type <span className="text-destructive">*</span>
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as ButtonType)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                >
                  <option value="phase">Phase</option>
                  <option value="termination">Termination</option>
                  <option value="context">Context</option>
                </select>
              </div>

              {type === ButtonType.TERMINATION && (
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Outcome <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  >
                    <option value="">Select outcome</option>
                    <option value="success">Success</option>
                    <option value="hold">Hold</option>
                    <option value="failure">Failure</option>
                  </select>
                  {errors.category && (
                    <p className="text-xs text-destructive mt-1">{errors.category}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-1">
                  Hotkey
                </label>
                <div className="relative">
                  <input
                    ref={hotkeyInputRef}
                    type="text"
                    value={hotkey ? formatHotkeyDisplay(hotkey) : ''}
                    onFocus={() => setIsCapturingHotkey(true)}
                    onBlur={() => setIsCapturingHotkey(false)}
                    onKeyDown={(e) => {
                      e.preventDefault();
                      
                      // Allow clearing with Backspace or Delete
                      if (e.key === 'Backspace' || e.key === 'Delete') {
                        setHotkey('');
                        return;
                      }
                      
                      // Check if it's a valid hotkey
                      if (isValidHotkeyKey(e.key)) {
                        setHotkey(normaliseHotkey(e.key));
                      }
                    }}
                    readOnly
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm cursor-pointer"
                    placeholder={isCapturingHotkey ? "Press a key..." : "Click to set (optional)"}
                  />
                  {hotkey && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        setHotkey('');
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                {errors.hotkey && (
                  <p className="text-xs text-destructive mt-1">{errors.hotkey}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Supports letters, numbers, symbols, and arrow keys
                </p>
              </div>
            </div>
          </div>

          {/* Position & Size */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Position & Size</h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">X</label>
                <input
                  type="number"
                  value={x}
                  onChange={(e) => setX(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Y</label>
                <input
                  type="number"
                  value={y}
                  onChange={(e) => setY(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Width</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                />
                {errors.width && (
                  <p className="text-xs text-destructive mt-1">{errors.width}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Height</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                />
                {errors.height && (
                  <p className="text-xs text-destructive mt-1">{errors.height}</p>
                )}
              </div>
            </div>
          </div>

          {/* Styling */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Styling</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Colour</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={colour}
                    onChange={(e) => setColour(e.target.value)}
                    className="w-12 h-10 rounded border border-input cursor-pointer"
                  />
                  <input
                    type="text"
                    value={colour}
                    onChange={(e) => setColour(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg border border-input bg-background text-sm"
                    placeholder="#RRGGBB"
                  />
                </div>
                {errors.colour && (
                  <p className="text-xs text-destructive mt-1">{errors.colour}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Opacity ({opacity})
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={opacity}
                  onChange={(e) => setOpacity(Number(e.target.value))}
                  className="w-full"
                />
                {errors.opacity && (
                  <p className="text-xs text-destructive mt-1">{errors.opacity}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Font Size (px)</label>
                <input
                  type="number"
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Font Weight</label>
                <select
                  value={fontWeight}
                  onChange={(e) => setFontWeight(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
            </div>
          </div>

          {/* Phase Properties */}
          {type === ButtonType.PHASE && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Phase Properties</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Possession State <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={possessionState}
                    onChange={(e) => setPossessionState(e.target.value as "in-possession" | "out-of-possession" | "")}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  >
                    <option value="">Select possession state</option>
                    <option value="in-possession">In Possession</option>
                    <option value="out-of-possession">Out of Possession</option>
                  </select>
                  {errors.possessionState && (
                    <p className="text-xs text-destructive mt-1">{errors.possessionState}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Hierarchy Level <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={hierarchyLevel}
                    onChange={(e) => setHierarchyLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  />
                  {errors.hierarchyLevel && (
                    <p className="text-xs text-destructive mt-1">{errors.hierarchyLevel}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Higher numbers = higher hierarchy (minimum 1)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Lead Time (ms)</label>
                  <input
                    type="number"
                    value={leadMs}
                    onChange={(e) => setLeadMs(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Lag Time (ms)</label>
                  <input
                    type="number"
                    value={lagMs}
                    onChange={(e) => setLagMs(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Termination Properties */}
          {type === ButtonType.TERMINATION && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Termination Properties</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Transition Type
                  </label>
                  <select
                    value={transitionType}
                    onChange={(e) => setTransitionType(e.target.value as "upgrade" | "downgrade" | "ball-lost" | "ball-won" | "")}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  >
                    <option value="">None (manual only)</option>
                    <option value="upgrade">Upgrade</option>
                    <option value="downgrade">Downgrade</option>
                    <option value="ball-lost">Ball Lost</option>
                    <option value="ball-won">Ball Won</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Used for automatic phase transitions
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    For Possession State
                  </label>
                  <select
                    value={forPossessionState}
                    onChange={(e) => setForPossessionState(e.target.value as "in-possession" | "out-of-possession" | "")}
                    className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm"
                  >
                    <option value="">Any (generic)</option>
                    <option value="in-possession">In Possession</option>
                    <option value="out-of-possession">Out of Possession</option>
                  </select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Which possession context this applies to
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Preview */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Preview</h3>
            <div className="border border-border rounded-lg p-4 bg-muted/20">
              <button
                style={{
                  backgroundColor: colour,
                  opacity: opacity,
                  width: Math.min(width, 200),
                  height: Math.min(height, 80),
                }}
                className="rounded-xl font-semibold text-white shadow-lg"
              >
                <div className="flex flex-col items-center justify-center h-full gap-1">
                  <span style={{ fontSize: `${fontSize}px`, fontWeight }}>
                    {label || "Label"}
                  </span>
                  {(hotkey || "K") && (
                    <span className="text-[10px] opacity-70 border border-white/30 rounded px-1.5 py-0.5">
                      {formatHotkeyDisplay(hotkey) || "K"}
                    </span>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-3 justify-end">
          <Button onClick={onClose} variant="ghost">
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {button ? "Save Changes" : "Add Button"}
          </Button>
        </div>
      </div>
    </div>
  );
}
