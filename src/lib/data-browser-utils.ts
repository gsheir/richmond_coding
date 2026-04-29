// Utility functions for the data browser

import { ColumnInfo } from './electron-api';

/**
 * Format a cell value based on its column type
 */
export function formatCellValue(value: any, columnType: string): string {
  if (value === null || value === undefined) {
    return '';
  }

  const type = columnType.toUpperCase();

  // Handle timestamps
  if (type.includes('DATETIME') || type.includes('TIMESTAMP')) {
    try {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString('en-GB', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      }
    } catch (e) {
      // If parsing fails, fall through to default
    }
  }

  // Handle integers
  if (type.includes('INTEGER') || type.includes('INT')) {
    return String(value);
  }

  // Handle JSON
  if (type.includes('JSON') || type.includes('TEXT')) {
    const str = String(value);
    // Check if it looks like JSON
    if ((str.startsWith('{') && str.endsWith('}')) || 
        (str.startsWith('[') && str.endsWith(']'))) {
      try {
        JSON.parse(str);
        return '[JSON]';
      } catch (e) {
        // Not JSON, display as text
      }
    }
  }

  return String(value);
}

/**
 * Format a full JSON value for display
 */
export function formatJsonValue(value: any): string {
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
}

/**
 * Check if a column appears to be a foreign key
 */
export function isForeignKeyColumn(columnName: string): boolean {
  return columnName.endsWith('_id') || columnName === 'id';
}

/**
 * Get a user-friendly display name for a table
 */
export function getTableDisplayName(tableName: string): string {
  // Capitalise and add spaces
  return tableName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Get the primary key column from a schema
 */
export function getPrimaryKeyColumn(columns: ColumnInfo[]): ColumnInfo | null {
  return columns.find(col => col.isPrimaryKey) || null;
}

/**
 * Get a row identifier (primary key value or first column)
 */
export function getRowIdentifier(row: any, columns: ColumnInfo[]): any {
  const pkColumn = getPrimaryKeyColumn(columns);
  if (pkColumn) {
    return row[pkColumn.name];
  }
  // Fallback to first column
  if (columns.length > 0) {
    return row[columns[0].name];
  }
  return null;
}

/**
 * Determine if a value is likely to be JSON
 */
export function isJsonValue(value: any): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
         (trimmed.startsWith('[') && trimmed.endsWith(']'));
}

/**
 * Parse a value for editing
 */
export function parseValueForEdit(value: any, columnType: string): any {
  const type = columnType.toUpperCase();

  if (value === null || value === undefined) {
    return '';
  }

  if (type.includes('INTEGER') || type.includes('INT')) {
    return Number(value);
  }

  if (type.includes('REAL') || type.includes('FLOAT')) {
    return Number(value);
  }

  return String(value);
}

/**
 * Prepare a value for saving to the database
 */
export function prepareValueForSave(value: any, columnType: string): any {
  const type = columnType.toUpperCase();

  if (value === '' || value === null || value === undefined) {
    return null;
  }

  if (type.includes('INTEGER') || type.includes('INT')) {
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  if (type.includes('REAL') || type.includes('FLOAT')) {
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  if (type.includes('JSON')) {
    // Try to parse and re-stringify to validate
    try {
      const parsed = JSON.parse(String(value));
      return JSON.stringify(parsed);
    } catch (e) {
      return String(value);
    }
  }

  return String(value);
}

/**
 * Truncate long text for display in tables
 */
export function truncateText(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Get a colour for a table badge based on its name
 */
export function getTableColour(tableName: string): string {
  const colours = [
    'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  ];
  
  // Generate a consistent index based on table name
  let hash = 0;
  for (let i = 0; i < tableName.length; i++) {
    hash = tableName.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colours[Math.abs(hash) % colours.length];
}
