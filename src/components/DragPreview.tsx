// Renders the floating preview of buttons currently being dragged on the layout canvas.
import { ButtonConfig } from "@/lib/types";
import { formatHotkeyDisplay } from "@/lib/utils";
import { PILL_HEIGHT_THRESHOLD } from "./VisualLayoutEditor";

interface DragPreviewProps {
  buttons: ButtonConfig[];
  draggingButton: string;
  dragCurrentPosition: { x: number; y: number };
  dragStartPositions: Map<string, { x: number; y: number }>;
}

export function DragPreview({ buttons, draggingButton, dragCurrentPosition, dragStartPositions }: DragPreviewProps) {
  const originalPos = dragStartPositions.get(draggingButton);
  if (!originalPos) return null;

  const deltaX = dragCurrentPosition.x - originalPos.x;
  const deltaY = dragCurrentPosition.y - originalPos.y;

  return (
    <>
      {Array.from(dragStartPositions.keys()).map((buttonCode) => {
        const button = buttons.find(b => b.code === buttonCode);
        const startPos = dragStartPositions.get(buttonCode);
        if (!button || !startPos) return null;

        const previewX = startPos.x + deltaX;
        const previewY = startPos.y + deltaY;
        const borderRadius = button.position.height < PILL_HEIGHT_THRESHOLD ? "9999px" : "0.75rem";

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
      })}
    </>
  );
}
