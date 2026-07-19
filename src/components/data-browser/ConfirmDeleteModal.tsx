import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { getPrimaryKeyColumn } from '@/lib/data-browser-utils';
import { ColumnInfo, Row } from '@/lib/electron-api';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  tableName: string;
  rowCount: number;
  rows?: Row[];
  columns?: ColumnInfo[];
  relatedData?: Record<string, Row[]>;
}

export function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  tableName,
  rowCount,
  rows = [],
  columns = [],
  relatedData = {},
}: ConfirmDeleteModalProps) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setDeleting(true);
    setError(null);

    try {
      await onConfirm();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete row(s)');
    } finally {
      setDeleting(false);
    }
  };

  const handleCancel = () => {
    setError(null);
    onClose();
  };

  const pkColumn = columns.length > 0 ? getPrimaryKeyColumn(columns) : null;
  const relatedRecordCount = Object.values(relatedData).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title="Confirm Deletion"
      icon={<AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />}
      footer={
        <>
          <Button variant="outline" onClick={handleCancel} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : `Delete ${rowCount === 1 ? 'Row' : 'Rows'}`}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-3 py-2 rounded-lg text-sm">
            {error}
          </div>
        )}

        <p className="text-sm">
          Are you sure you want to delete{' '}
          <strong className="font-semibold">
            {rowCount === 1 ? '1 row' : `${rowCount} rows`}
          </strong>{' '}
          from the <strong className="font-semibold">{tableName}</strong> table?
        </p>

        {rowCount > 0 && rowCount <= 3 && rows.length > 0 && pkColumn && (
          <div className="bg-muted/30 rounded-lg p-3 text-xs space-y-1">
            <div className="font-medium text-muted-foreground mb-1">
              Rows to be deleted:
            </div>
            {rows.map((row, i) => (
              <div key={i} className="font-mono">
                {pkColumn.name}: {String(row[pkColumn.name])}
              </div>
            ))}
          </div>
        )}

        {rowCount > 3 && (
          <div className="bg-muted/30 rounded-lg p-3 text-xs">
            <div className="font-medium text-muted-foreground">
              {rowCount} rows selected for deletion
            </div>
          </div>
        )}

        {relatedRecordCount > 0 && (
          <div className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 px-3 py-2 rounded-lg text-sm">
            <div className="font-medium mb-1">⚠️ Related records will also be deleted</div>
            <div className="text-xs space-y-0.5">
              {Object.entries(relatedData).map(([table, records]) => (
                <div key={table}>
                  • {table}: {records.length} record{records.length !== 1 ? 's' : ''}
                </div>
              ))}
            </div>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          This action cannot be undone.
        </p>
      </div>
    </Modal>
  );
}
