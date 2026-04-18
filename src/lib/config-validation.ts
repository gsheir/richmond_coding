// Validation utilities for button configuration

import { ButtonConfig } from "./types";

export interface ValidationError {
  field: string;
  message: string;
  buttonCode?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export function validateButtonConfig(buttons: ButtonConfig[]): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Track hotkeys and codes for duplicate detection
  const hotkeys = new Map<string, string[]>();
  const codes = new Set<string>();

  buttons.forEach((button) => {
    // Validate required fields
    if (!button.code || button.code.trim() === '') {
      errors.push({
        field: 'code',
        message: 'Button code is required',
        buttonCode: button.code,
      });
    }

    if (!button.label || button.label.trim() === '') {
      errors.push({
        field: 'label',
        message: 'Button label is required',
        buttonCode: button.code,
      });
    }

    if (!button.hotkey || button.hotkey.trim() === '') {
      errors.push({
        field: 'hotkey',
        message: 'Hotkey is required',
        buttonCode: button.code,
      });
    }

    // Check for duplicate codes
    if (button.code && codes.has(button.code)) {
      errors.push({
        field: 'code',
        message: `Duplicate button code: ${button.code}`,
        buttonCode: button.code,
      });
    } else if (button.code) {
      codes.add(button.code);
    }

    // Track hotkeys for duplicate detection
    if (button.hotkey) {
      const key = button.hotkey.toLowerCase();
      if (!hotkeys.has(key)) {
        hotkeys.set(key, []);
      }
      hotkeys.get(key)!.push(button.code);
    }

    // Validate position values
    if (button.position.x < 0) {
      warnings.push({
        field: 'position.x',
        message: 'X position is negative',
        buttonCode: button.code,
      });
    }

    if (button.position.y < 0) {
      warnings.push({
        field: 'position.y',
        message: 'Y position is negative',
        buttonCode: button.code,
      });
    }

    if (button.position.width <= 0) {
      errors.push({
        field: 'position.width',
        message: 'Width must be greater than 0',
        buttonCode: button.code,
      });
    }

    if (button.position.height <= 0) {
      errors.push({
        field: 'position.height',
        message: 'Height must be greater than 0',
        buttonCode: button.code,
      });
    }

    // Validate style values
    if (button.style.opacity < 0 || button.style.opacity > 1) {
      errors.push({
        field: 'style.opacity',
        message: 'Opacity must be between 0 and 1',
        buttonCode: button.code,
      });
    }

    if (button.style.fontSize <= 0) {
      warnings.push({
        field: 'style.fontSize',
        message: 'Font size should be greater than 0',
        buttonCode: button.code,
      });
    }

    // Validate timing values for phase buttons
    if (button.type === 'phase') {
      if (button.leadMs < 0) {
        warnings.push({
          field: 'leadMs',
          message: 'Lead time should not be negative',
          buttonCode: button.code,
        });
      }

      if (button.lagMs < 0) {
        warnings.push({
          field: 'lagMs',
          message: 'Lag time should not be negative',
          buttonCode: button.code,
        });
      }
    }

    // Validate colour format
    if (!isValidColor(button.style.colour)) {
      errors.push({
        field: 'style.colour',
        message: 'Invalid colour format (use #RRGGBB)',
        buttonCode: button.code,
      });
    }
  });

  // Check for duplicate hotkeys
  hotkeys.forEach((codes, hotkey) => {
    if (codes.length > 1) {
      warnings.push({
        field: 'hotkey',
        message: `Hotkey "${hotkey}" is used by multiple buttons: ${codes.join(', ')}`,
      });
    }
  });

  // Check for overlapping positions
  const overlaps = findOverlappingButtons(buttons);
  overlaps.forEach(({ button1, button2 }) => {
    warnings.push({
      field: 'position',
      message: `Buttons "${button1.code}" and "${button2.code}" overlap`,
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

function isValidColor(colour: string): boolean {
  // Check for hex colour format #RRGGBB or #RGB
  return /^#([0-9A-F]{3}){1,2}$/i.test(colour);
}

interface OverlapInfo {
  button1: ButtonConfig;
  button2: ButtonConfig;
}

function findOverlappingButtons(buttons: ButtonConfig[]): OverlapInfo[] {
  const overlaps: OverlapInfo[] = [];

  for (let i = 0; i < buttons.length; i++) {
    for (let j = i + 1; j < buttons.length; j++) {
      const b1 = buttons[i];
      const b2 = buttons[j];

      // Check if rectangles overlap
      const b1Right = b1.position.x + b1.position.width;
      const b1Bottom = b1.position.y + b1.position.height;
      const b2Right = b2.position.x + b2.position.width;
      const b2Bottom = b2.position.y + b2.position.height;

      const overlapsX = b1.position.x < b2Right && b1Right > b2.position.x;
      const overlapsY = b1.position.y < b2Bottom && b1Bottom > b2.position.y;

      if (overlapsX && overlapsY) {
        overlaps.push({ button1: b1, button2: b2 });
      }
    }
  }

  return overlaps;
}

export function generateUniqueCode(existingCodes: string[], prefix: string = 'BTN'): string {
  let counter = 1;
  let code = `${prefix}_${counter}`;
  
  while (existingCodes.includes(code)) {
    counter++;
    code = `${prefix}_${counter}`;
  }
  
  return code;
}

export function generateUniqueHotkey(existingHotkeys: string[]): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const lowercaseHotkeys = existingHotkeys.map(h => h.toLowerCase());
  
  for (const char of alphabet) {
    if (!lowercaseHotkeys.includes(char.toLowerCase())) {
      return char;
    }
  }
  
  // If all single characters are taken, use special characters
  const special = ['-', '=', '[', ']', ';', "'", ',', '.', '/'];
  for (const char of special) {
    if (!lowercaseHotkeys.includes(char)) {
      return char;
    }
  }
  
  return '?'; // Fallback
}
