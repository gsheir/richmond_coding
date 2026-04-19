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

  // Track codes for duplicate detection
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
