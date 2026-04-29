import { useState } from 'react';
import { ColumnInfo } from '@/lib/electron-api';
import { formatCellValue, isJsonValue, truncateText } from '@/lib/data-browser-utils';
import { cn } from '@/lib/utils';

interface DataGridProps {
  columns: ColumnInfo[];
  rows: any[];
  selectedRows: Set<any>;
  onRowSelect: (rowId: any) => void;
  onRowSelectAll: (selected: boolean) => void;
  onRowClick?: (row: any) => void;
  onRowEdit?: (row: any) => void;
  onRowDelete?: (row: any) => void;
  onSort?: (column: string, direction: 'ASC' | 'DESC') => void;
  sortColumn?: string | null;
  sortDirection?: 'ASC' | 'DESC';
  primaryKeyColumn: string | null;
}

export function DataGrid({
  columns,
  rows,
  selectedRows,
  onRowSelect,
  onRowSelectAll,
  onRowClick,
  onRowEdit,
  onRowDelete,
  onSort,
  sortColumn,
  sortDirection,
  primaryKeyColumn,
}: DataGridProps) {
  const [hoveredRow, setHoveredRow] = useState<any>(null);

  const getPrimaryKeyValue = (row: any): any => {
    if (!primaryKeyColumn) return null;
    return row[primaryKeyColumn];
  };

  const handleHeaderClick = (columnName: string) => {
    if (onSort) {
      const newDirection =
        sortColumn === columnName && sortDirection === 'ASC' ? 'DESC' : 'ASC';
      onSort(columnName, newDirection);
    }
  };

  const allRowsSelected = rows.length > 0 && rows.every(row => 
    selectedRows.has(getPrimaryKeyValue(row))
  );

  const handleSelectAllChange = () => {
    onRowSelectAll(!allRowsSelected);
  };

  if (rows.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground">
        <div className="text-centre">
          <p className="text-lg font-medium">No data</p>
          <p className="text-sm">This table is empty</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-auto border rounded-lg max-h-[calc(100vh-20rem)]">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 sticky top-0 z-10">
          <tr>
            {/* Selection checkbox column */}
            <th className="w-12 px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={allRowsSelected}
                onChange={handleSelectAllChange}
                className="rounded border-gray-300 dark:border-gray-600"
              />
            </th>
            {columns.map((column) => (
              <th
                key={column.name}
                className={cn(
                  'px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap',
                  onSort && 'cursor-pointer hover:text-foreground transition-colours'
                )}
                onClick={() => onSort && handleHeaderClick(column.name)}
              >
                <div className="flex items-centre gap-2">
                  <span>{column.name}</span>
                  {column.isPrimaryKey && (
                    <span className="text-xs text-blue-600 dark:text-blue-400">PK</span>
                  )}
                  {column.notNull && !column.isPrimaryKey && (
                    <span className="text-xs text-orange-600 dark:text-orange-400">*</span>
                  )}
                  {sortColumn === column.name && (
                    <span className="text-xs">
                      {sortDirection === 'ASC' ? '↑' : '↓'}
                    </span>
                  )}
                </div>
              </th>
            ))}
            {/* Actions column */}
            {(onRowEdit || onRowDelete) && (
              <th className="px-4 py-3 text-left font-medium text-muted-foreground w-32">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => {
            const rowId = getPrimaryKeyValue(row);
            const isSelected = selectedRows.has(rowId);
            const isHovered = hoveredRow === rowId;

            return (
              <tr
                key={rowId ?? rowIndex}
                className={cn(
                  'border-t transition-colours',
                  isSelected && 'bg-blue-50 dark:bg-blue-950/30',
                  isHovered && !isSelected && 'bg-muted/30',
                  onRowClick && 'cursor-pointer'
                )}
                onMouseEnter={() => setHoveredRow(rowId)}
                onMouseLeave={() => setHoveredRow(null)}
                onClick={() => onRowClick && onRowClick(row)}
              >
                {/* Selection checkbox */}
                <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onRowSelect(rowId)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                </td>
                {columns.map((column) => {
                  const value = row[column.name];
                  const formatted = formatCellValue(value, column.type);
                  const isJson = isJsonValue(value);

                  return (
                    <td
                      key={column.name}
                      className="px-4 py-2 max-w-xs overflow-hidden text-ellipsis"
                      title={isJson ? '[JSON data]' : formatted}
                    >
                      <span
                        className={cn(
                          value === null || value === undefined
                            ? 'text-muted-foreground italic'
                            : 'text-foreground',
                          isJson && 'font-mono text-xs'
                        )}
                      >
                        {value === null || value === undefined
                          ? 'null'
                          : truncateText(formatted, 80)}
                      </span>
                    </td>
                  );
                })}
                {/* Actions */}
                {(onRowEdit || onRowDelete) && (
                  <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-2">
                      {onRowEdit && (
                        <button
                          onClick={() => onRowEdit(row)}
                          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        >
                          Edit
                        </button>
                      )}
                      {onRowDelete && (
                        <button
                          onClick={() => onRowDelete(row)}
                          className="text-xs text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
