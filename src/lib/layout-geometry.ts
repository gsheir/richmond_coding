// Pure geometry helpers for the visual button layout editor – no React/DOM
// dependencies, so these are unit-testable in isolation.
import { ButtonConfig } from "./types";

export interface SelectionRect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export type Alignment = "left" | "center" | "right" | "top" | "middle" | "bottom";

export function isButtonInSelection(button: ButtonConfig, rect: SelectionRect): boolean {
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
}

// Converts a drag-selection start/end point pair into a normalised rectangle
// (top-left origin, positive width/height) for rendering.
export function getSelectionRectFromPoints(
  start: { x: number; y: number },
  end: { x: number; y: number }
): { left: number; top: number; width: number; height: number } {
  const x1 = Math.min(start.x, end.x);
  const y1 = Math.min(start.y, end.y);
  const x2 = Math.max(start.x, end.x);
  const y2 = Math.max(start.y, end.y);

  return { left: x1, top: y1, width: x2 - x1, height: y2 - y1 };
}

function clamp(value: number, size: number, canvasSize: number): number {
  return Math.round(Math.max(0, Math.min(canvasSize - size, value)));
}

// Aligns the selected buttons to a shared edge/centre line, returning a new
// buttons array (does not mutate).
export function alignButtons(
  buttons: ButtonConfig[],
  selectedCodes: string[],
  alignment: Alignment,
  canvasWidth: number,
  canvasHeight: number
): ButtonConfig[] {
  const selectedButtonsData = buttons.filter((b) => selectedCodes.includes(b.code));
  if (selectedButtonsData.length < 2) return buttons;

  let referenceValue: number;

  switch (alignment) {
    case "left":
      referenceValue = Math.min(...selectedButtonsData.map((b) => b.position.x));
      break;
    case "center": {
      const minX = Math.min(...selectedButtonsData.map((b) => b.position.x));
      const maxX = Math.max(...selectedButtonsData.map((b) => b.position.x + b.position.width));
      referenceValue = (minX + maxX) / 2;
      break;
    }
    case "right":
      referenceValue = Math.max(...selectedButtonsData.map((b) => b.position.x + b.position.width));
      break;
    case "top":
      referenceValue = Math.min(...selectedButtonsData.map((b) => b.position.y));
      break;
    case "middle": {
      const minY = Math.min(...selectedButtonsData.map((b) => b.position.y));
      const maxY = Math.max(...selectedButtonsData.map((b) => b.position.y + b.position.height));
      referenceValue = (minY + maxY) / 2;
      break;
    }
    case "bottom":
      referenceValue = Math.max(...selectedButtonsData.map((b) => b.position.y + b.position.height));
      break;
  }

  return buttons.map((btn) => {
    if (!selectedCodes.includes(btn.code)) return btn;

    let newX = btn.position.x;
    let newY = btn.position.y;

    switch (alignment) {
      case "left":
        newX = referenceValue;
        break;
      case "center":
        newX = referenceValue - btn.position.width / 2;
        break;
      case "right":
        newX = referenceValue - btn.position.width;
        break;
      case "top":
        newY = referenceValue;
        break;
      case "middle":
        newY = referenceValue - btn.position.height / 2;
        break;
      case "bottom":
        newY = referenceValue - btn.position.height;
        break;
    }

    return {
      ...btn,
      position: {
        ...btn.position,
        x: clamp(newX, btn.position.width, canvasWidth),
        y: clamp(newY, btn.position.height, canvasHeight),
      },
    };
  });
}

// Distributes the selected buttons evenly (or with a fixed gap) along an
// axis, returning a new buttons array (does not mutate).
export function distributeButtons(
  buttons: ButtonConfig[],
  selectedCodes: string[],
  direction: "horizontal" | "vertical",
  gap?: number
): ButtonConfig[] {
  const selectedButtonsData = buttons.filter((b) => selectedCodes.includes(b.code));
  if (selectedButtonsData.length < 3) return buttons;

  const axis = direction === "horizontal" ? "x" : "y";
  const sizeKey = direction === "horizontal" ? "width" : "height";
  const sorted = [...selectedButtonsData].sort((a, b) => a.position[axis] - b.position[axis]);

  const newPositions = new Map<string, number>();

  if (gap !== undefined) {
    let current = sorted[0].position[axis];
    newPositions.set(sorted[0].code, current);
    for (let i = 1; i < sorted.length; i++) {
      current += sorted[i - 1].position[sizeKey] + gap;
      newPositions.set(sorted[i].code, current);
    }
  } else {
    const start = sorted[0].position[axis];
    const end = sorted[sorted.length - 1].position[axis] + sorted[sorted.length - 1].position[sizeKey];
    const totalSize = sorted.reduce((sum, btn) => sum + btn.position[sizeKey], 0);
    const evenGap = (end - start - totalSize) / (sorted.length - 1);

    let current = start;
    sorted.forEach((btn, index) => {
      if (index > 0) {
        current += sorted[index - 1].position[sizeKey] + evenGap;
      }
      newPositions.set(btn.code, current);
    });
  }

  return buttons.map((btn) => {
    const newValue = newPositions.get(btn.code);
    if (newValue === undefined) return btn;

    return {
      ...btn,
      position: {
        ...btn.position,
        [axis]: Math.round(newValue),
      },
    };
  });
}
