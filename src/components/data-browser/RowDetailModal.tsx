import { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { ColumnInfo } from '@/lib/electron-api';
import {
  parseValueForEdit,
  prepareValueForSave,
  isJsonValue,
  getPrimaryKeyColumn,
} from '@/lib/data-browser-utils';
import { cn } from '@/lib/utils';

interface RowDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  row: any | null;
  columns: ColumnInfo[];
  tableName: string;
  onSave: (rowId: any, updates: Record<string, any>) => Promise<void>;
  relatedData?: Record<string, any[]>;
  readOnly?: boolean;
}

export function RowDetailModal({
  isOpen,
  onClose,
  row,
  columns,
  tableName,
  onSave,
  relatedData = {},
  readOnly = false,
}: RowDetailModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (row) {
      setFormData({ ...row });
      setError(null);
    }
  }, [row]);

  const pkColumn = getPrimaryKeyColumn(columns);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!pkColumn || !row) return;

    setSaving(true);
    setError(null);

    try {
      const updates: Record<string, any> = {};
      
      // Prepare all changed values
      for (const column of columns) {
        if (column.isPrimaryKey) continue; // Don't update primary key
        
        const newValue = formData[column.name];
        const oldValue = row[column.name];
        
        if (newValue !== oldValue) {
          updates[column.name] = prepareValueForSave(newValue, column.type);
        }
      }

      if (Object.keys(updates).length > 0) {
        await onSave(row[pkColumn.name], updates);
      }
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({ ...row });
    setError(null);
    onClose();
  };

  if (!row) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={readOnly ? 'View Row' : 'Edit Row'}
      subtitle={
        <>
          Table: {tableName}
          {pkColumn && ` • ${pkColumn.name}: ${row[pkColumn.name]}`}
        </>
      }
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={handleCancel} disabled={saving}>
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {!readOnly && (
            <Button type="submit" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </>
      }
    >
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
              <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-3 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            {columns.map((column) => {
              const value = formData[column.name];
              const isDisabled = readOnly || column.isPrimaryKey;
              const isJson = isJsonValue(value);

              return (
                <div key={column.name}>
                  <label className="block text-sm font-medium mb-1.5">
                    <div className="flex items-center gap-2">
                      <span>{column.name}</span>
                      {column.isPrimaryKey && (
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                          Primary Key
                        </span>
                      )}
                      {column.notNull && !column.isPrimaryKey && (
                        <span className="text-xs text-orange-600 dark:text-orange-400">
                          Required
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground font-mono">
                        {column.type}
                      </span>
                    </div>
                  </label>

                  {isJson ? (
                    <textarea
                      value={parseValueForEdit(value, column.type)}
                      onChange={(e) =>
                        setFormData({ ...formData, [column.name]: e.target.value })
                      }
                      disabled={isDisabled}
                      rows={8}
                      className={cn(
                        'w-full px-3 py-2 text-sm bg-background border border-border/50 rounded-md',
                        'focus:outline-none focus:ring-2 focus:ring-ring',
                        'font-mono',
                        isDisabled && 'opacity-60 cursor-not-allowed'
                      )}
                    />
                  ) : (
                    <input
                      type="text"
                      value={parseValueForEdit(value, column.type)}
                      onChange={(e) =>
                        setFormData({ ...formData, [column.name]: e.target.value })
                      }
                      disabled={isDisabled}
                      required={column.notNull && !column.isPrimaryKey}
                      className={cn(
                        'w-full px-3 py-2 text-sm bg-background border border-border/50 rounded-md',
                        'focus:outline-none focus:ring-2 focus:ring-ring',
                        isDisabled && 'opacity-60 cursor-not-allowed'
                      )}
                    />
                  )}
                </div>
              );
            })}

            {/* Related Data */}
            {Object.keys(relatedData).length > 0 && (
              <div className="pt-4 border-t border-border/50">
                <h3 className="text-sm font-medium mb-3">Related Records</h3>
                {Object.entries(relatedData).map(([tableName, rows]) => (
                  <div key={tableName} className="mb-3">
                    <div className="text-xs text-muted-foreground mb-1">
                      {tableName} ({rows.length})
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2 text-xs font-mono max-h-32 overflow-y-auto">
                      {rows.map((relRow, i) => (
                        <div key={i} className="mb-1">
                          {JSON.stringify(relRow)}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
      </form>
    </Modal>
  );
}
