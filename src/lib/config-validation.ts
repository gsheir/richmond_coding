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

      // Validate possession state
      if (!button.possessionState) {
        warnings.push({
          field: 'possessionState',
          message: 'Possession state not set (required for auto-transitions)',
          buttonCode: button.code,
        });
      } else if (button.possessionState !== 'in-possession' && button.possessionState !== 'out-of-possession') {
        errors.push({
          field: 'possessionState',
          message: 'Possession state must be "in-possession" or "out-of-possession"',
          buttonCode: button.code,
        });
      }

      // Validate hierarchy level
      if (button.hierarchyLevel === undefined) {
        warnings.push({
          field: 'hierarchyLevel',
          message: 'Hierarchy level not set (required for auto-transitions)',
          buttonCode: button.code,
        });
      } else if (button.hierarchyLevel < 1) {
        errors.push({
          field: 'hierarchyLevel',
          message: 'Hierarchy level must be at least 1',
          buttonCode: button.code,
        });
      }
    }

    // Validate transition type for termination buttons
    if (button.type === 'termination') {
      // Validate category
      if (button.category) {
        const validCategories = ['success', 'failure', 'hold'];
        if (!validCategories.includes(button.category)) {
          errors.push({
            field: 'category',
            message: `Invalid category (must be one of: ${validCategories.join(', ')})`,
            buttonCode: button.code,
          });
        }
      }
      
      // Validate transition type
      if (button.transitionType) {
        const validTypes = ['upgrade', 'downgrade', 'ball-lost', 'ball-won'];
        if (!validTypes.includes(button.transitionType)) {
          errors.push({
            field: 'transitionType',
            message: `Invalid transition type (must be one of: ${validTypes.join(', ')})`,
            buttonCode: button.code,
          });
        }
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

  // Check for presence of auto-transition termination buttons
  const transitionTypes = buttons
    .filter(b => b.type === 'termination' && b.transitionType)
    .map(b => b.transitionType);
  
  const requiredTypes: Array<'upgrade' | 'downgrade' | 'ball-lost' | 'ball-won'> = ['upgrade', 'downgrade', 'ball-lost', 'ball-won'];
  requiredTypes.forEach(type => {
    if (!transitionTypes.includes(type)) {
      warnings.push({
        field: 'transitionType',
        message: `No termination button with transition type "${type}" (auto-transitions may not work fully)`,
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
