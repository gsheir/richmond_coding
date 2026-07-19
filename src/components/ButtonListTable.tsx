// A categorised, drag-reorderable table of buttons (phase/context/termination).
import { DragEvent, MouseEvent } from "react";
import { Edit2, Trash2, GripVertical } from "lucide-react";
import { ButtonConfig } from "@/lib/types";
import { formatHotkeyDisplay } from "@/lib/utils";

interface ButtonListTableProps {
  buttons: ButtonConfig[];
  categoryName: string;
  categoryType: string;
  selectedButtons: string[];
  draggedButton: string | null;
  onSelect: (e: MouseEvent, code: string) => void;
  onEdit: (button: ButtonConfig) => void;
  onDelete: (code: string) => void;
  onDragStart: (e: DragEvent<HTMLTableRowElement>, code: string) => void;
  onDragOver: (e: DragEvent<HTMLTableRowElement>) => void;
  onDrop: (e: DragEvent<HTMLTableRowElement>, targetCode: string, categoryType: string) => void;
  onDragEnd: () => void;
}

export function ButtonListTable({
  buttons,
  categoryName,
  categoryType,
  selectedButtons,
  draggedButton,
  onSelect,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: ButtonListTableProps) {
  if (buttons.length === 0) return null;

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
            {buttons.map((button) => (
              <tr
                key={button.code}
                draggable
                onDragStart={(e) => onDragStart(e, button.code)}
                onDragOver={onDragOver}
                onDrop={(e) => onDrop(e, button.code, categoryType)}
                onDragEnd={onDragEnd}
                className={`border-b border-border/50 hover:bg-muted/30 transition-colors cursor-move ${
                  selectedButtons.includes(button.code) ? "bg-muted/50" : ""
                } ${draggedButton === button.code ? "opacity-50" : ""}`}
                onClick={(e) => onSelect(e, button.code)}
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
                        onEdit(button);
                      }}
                      className="p-1 rounded hover:bg-muted transition-colors"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(button.code);
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
}
