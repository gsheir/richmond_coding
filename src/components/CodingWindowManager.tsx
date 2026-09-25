// Settings panel for listing, creating, duplicating, renaming, defaulting and deleting code windows
import { useEffect, useState } from "react";
import { AlertCircle, Copy, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { CodingWindow } from "@/lib/types";
import {
  CodingWindowSource,
  createCodingWindow,
  deleteCodingWindow,
  duplicateCodingWindow,
  renameCodingWindow,
  setDefaultCodingWindow,
} from "@/lib/electron-api";
import { cn } from "@/lib/utils";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

interface CodingWindowManagerProps {
  windows: CodingWindow[];
  selectedWindowId: number | null;
  onSelect: (windowId: number) => void;
  // Resolves true if it's fine to move away from the window being edited
  confirmDiscardChanges: () => Promise<boolean>;
  onWindowsChanged: () => Promise<void>;
}

const INPUT_CLASS =
  "w-full px-3 py-2 text-sm bg-background/50 border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring";

// IPC errors arrive as "Error: <message>"
const toMessage = (error: unknown) =>
  (error instanceof Error ? error.message : String(error)).replace(/^Error:\s*/, "");

// SQLite datetime('now') values are UTC without a zone marker
const formatUpdatedAt = (value: string) => {
  const date = new Date(`${value.replace(" ", "T")}Z`);
  return isNaN(date.getTime()) ? value : date.toLocaleDateString();
};

export function CodingWindowManager({
  windows,
  selectedWindowId,
  onSelect,
  confirmDiscardChanges,
  onWindowsChanged,
}: CodingWindowManagerProps) {
  const [formMode, setFormMode] = useState<"create" | "rename" | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedWindow = windows.find((w) => w.id === selectedWindowId) ?? null;

  const runAction = async (action: () => Promise<void>) => {
    setIsBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(toMessage(err));
    } finally {
      setIsBusy(false);
    }
  };

  const handleSelect = async (windowId: number) => {
    if (windowId === selectedWindowId) return;
    if (!(await confirmDiscardChanges())) return;
    onSelect(windowId);
  };

  const handleCreate = async (name: string, description: string | null, source: CodingWindowSource) => {
    if (!(await confirmDiscardChanges())) return;
    const windowId = await createCodingWindow(name, description, source);
    await onWindowsChanged();
    onSelect(windowId);
  };

  const handleRename = async (name: string, description: string | null) => {
    if (!selectedWindow) return;
    await renameCodingWindow(selectedWindow.id, name, description);
    await onWindowsChanged();
  };

  const handleDuplicate = () =>
    runAction(async () => {
      if (!selectedWindow) return;
      if (!(await confirmDiscardChanges())) return;
      const windowId = await duplicateCodingWindow(selectedWindow.id);
      await onWindowsChanged();
      onSelect(windowId);
    });

  const handleSetDefault = () =>
    runAction(async () => {
      if (!selectedWindow) return;
      await setDefaultCodingWindow(selectedWindow.id);
      await onWindowsChanged();
    });

  // The parent reselects the default window once the deleted one disappears
  const handleDelete = () =>
    runAction(async () => {
      if (!selectedWindow) return;
      if (!(await confirmDiscardChanges())) return;
      await deleteCodingWindow(selectedWindow.id);
      setShowDeleteConfirm(false);
      await onWindowsChanged();
    });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Each match is coded with one code window. Select a window to edit its layout below. The default window is preselected for new matches.
      </p>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setFormMode("create")} size="sm" disabled={isBusy}>
          <Plus className="w-4 h-4" />
          New Window
        </Button>
        <Button onClick={handleDuplicate} size="sm" variant="outline" disabled={isBusy || !selectedWindow}>
          <Copy className="w-4 h-4" />
          Duplicate
        </Button>
        <Button onClick={() => setFormMode("rename")} size="sm" variant="outline" disabled={isBusy || !selectedWindow}>
          <Pencil className="w-4 h-4" />
          Rename
        </Button>
        <Button
          onClick={handleSetDefault}
          size="sm"
          variant="outline"
          disabled={isBusy || !selectedWindow || selectedWindow.isDefault}
        >
          <Star className="w-4 h-4" />
          Set as Default
        </Button>
        <Button
          onClick={() => setShowDeleteConfirm(true)}
          size="sm"
          variant="outline"
          disabled={isBusy || !selectedWindow || windows.length <= 1}
          title={windows.length <= 1 ? "The last code window cannot be deleted" : undefined}
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Window list */}
      <div className="flex flex-col gap-1.5">
        {windows.map((w) => (
          <button
            key={w.id}
            onClick={() => handleSelect(w.id)}
            className={cn(
              "w-full flex items-center justify-between gap-3 px-3 py-2 rounded-lg border text-left transition-colors",
              w.id === selectedWindowId
                ? "border-primary/60 bg-primary/10"
                : "border-border/40 hover:bg-accent/30"
            )}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium truncate">{w.name}</span>
                {w.isDefault && (
                  <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-primary/20 text-primary shrink-0">
                    Default
                  </span>
                )}
              </div>
              {w.description && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">{w.description}</p>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground text-right shrink-0">
              <div>{w.matchCount} {w.matchCount === 1 ? "match" : "matches"}</div>
              <div className="text-muted-foreground/70">Updated {formatUpdatedAt(w.updatedAt)}</div>
            </div>
          </button>
        ))}
        {windows.length === 0 && (
          <div className="py-4 text-center text-sm text-muted-foreground">Loading code windows...</div>
        )}
      </div>

      <CodingWindowFormModal
        mode={formMode}
        windows={windows}
        editingWindow={formMode === "rename" ? selectedWindow : null}
        onClose={() => setFormMode(null)}
        onCreate={handleCreate}
        onRename={handleRename}
      />

      {/* Delete confirmation */}
      <Modal
        isOpen={showDeleteConfirm && !!selectedWindow}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Code Window?"
        icon={
          <div className="p-2 bg-destructive/10 rounded-lg">
            <AlertCircle className="w-5 h-5 text-destructive" />
          </div>
        }
        footer={
          <>
            <Button onClick={() => setShowDeleteConfirm(false)} size="sm" variant="outline">
              Cancel
            </Button>
            <Button onClick={handleDelete} size="sm" variant="destructive" disabled={isBusy}>
              {isBusy ? "Deleting..." : "Delete"}
            </Button>
          </>
        }
      >
        {selectedWindow && (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              This will permanently delete <strong className="text-foreground">{selectedWindow.name}</strong> and all of its buttons.
            </p>
            {selectedWindow.matchCount > 0 && (
              <p>
                {selectedWindow.matchCount} {selectedWindow.matchCount === 1 ? "match uses" : "matches use"} this window and will be switched to the default window
                {selectedWindow.isDefault ? " (another window will become the default)" : ""}. Codes already recorded in those matches are kept.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

interface CodingWindowFormModalProps {
  mode: "create" | "rename" | null;
  windows: CodingWindow[];
  editingWindow: CodingWindow | null;
  onClose: () => void;
  onCreate: (name: string, description: string | null, source: CodingWindowSource) => Promise<void>;
  onRename: (name: string, description: string | null) => Promise<void>;
}

// Select values: "blank", "template" or "window:<id>"
const sourceFromValue = (value: string): CodingWindowSource =>
  value.startsWith("window:") ? Number(value.slice("window:".length)) : (value as "blank" | "template");

function CodingWindowFormModal({ mode, windows, editingWindow, onClose, onCreate, onRename }: CodingWindowFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceValue, setSourceValue] = useState("blank");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset the form each time the modal opens
  useEffect(() => {
    if (!mode) return;
    setName(editingWindow?.name ?? "");
    setDescription(editingWindow?.description ?? "");
    setSourceValue("blank");
    setSubmitError(null);
  }, [mode, editingWindow]);

  const trimmedName = name.trim();
  const nameTaken = windows.some(
    (w) => w.id !== editingWindow?.id && w.name.toLowerCase() === trimmedName.toLowerCase()
  );
  const validationError = !trimmedName
    ? null
    : nameTaken
      ? `A code window named "${trimmedName}" already exists`
      : null;
  const canSubmit = !!trimmedName && !nameTaken && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const desc = description.trim() || null;
      if (mode === "create") {
        await onCreate(trimmedName, desc, sourceFromValue(sourceValue));
      } else {
        await onRename(trimmedName, desc);
      }
      onClose();
    } catch (err) {
      setSubmitError(toMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={mode !== null}
      onClose={onClose}
      title={mode === "create" ? "New Code Window" : "Rename Code Window"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="coding-window-name" className="block text-sm font-medium mb-1.5">
            Name
          </label>
          <input
            id="coding-window-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Attacking focus"
            autoFocus
            className={INPUT_CLASS}
          />
          {validationError && <p className="text-xs text-destructive mt-1">{validationError}</p>}
        </div>

        <div>
          <label htmlFor="coding-window-description" className="block text-sm font-medium mb-1.5">
            Description <span className="text-muted-foreground font-normal">(optional)</span>
          </label>
          <input
            id="coding-window-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={INPUT_CLASS}
          />
        </div>

        {mode === "create" && (
          <div>
            <label htmlFor="coding-window-source" className="block text-sm font-medium mb-1.5">
              Start from
            </label>
            <select
              id="coding-window-source"
              value={sourceValue}
              onChange={(e) => setSourceValue(e.target.value)}
              className={INPUT_CLASS}
            >
              <option value="blank">Blank – no buttons</option>
              <option value="template">Built-in template</option>
              {windows.map((w) => (
                <option key={w.id} value={`window:${w.id}`}>
                  Copy of {w.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {submitError && (
          <div className="px-3 py-2 rounded-lg bg-destructive/10 border border-destructive/30 text-xs text-destructive">
            {submitError}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" onClick={onClose} variant="outline" size="sm">
            Cancel
          </Button>
          <Button type="submit" variant="attack" size="sm" disabled={!canSubmit}>
            {isSubmitting ? "Saving..." : mode === "create" ? "Create Window" : "Save"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
