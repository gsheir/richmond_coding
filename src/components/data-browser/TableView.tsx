import { useState, useEffect, useCallback } from 'react';
import { Search, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { DataGrid } from './DataGrid';
import { RowDetailModal } from './RowDetailModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import {
  dbGetTableSchema,
  dbGetTableData,
  dbGetRelatedData,
  dbUpdateRow,
  dbDeleteRow,
  dbDeleteRows,
  ColumnInfo,
  TableDataOptions,
} from '@/lib/electron-api';
import { getTableDisplayName, getPrimaryKeyColumn } from '@/lib/data-browser-utils';
import { cn } from '@/lib/utils';

interface TableViewProps {
  tableName: string;
}

export function TableView({ tableName }: TableViewProps) {
  const [schema, setSchema] = useState<{ columns: ColumnInfo[]; foreignKeys: any[] } | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Sorting state
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'ASC' | 'DESC'>('ASC');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});

  // Selection state
  const [selectedRows, setSelectedRows] = useState<Set<any>>(new Set());

  // Modal state
  const [editingRow, setEditingRow] = useState<any | null>(null);
  const [relatedData, setRelatedData] = useState<Record<string, any[]>>({});
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [rowsToDelete, setRowsToDelete] = useState<any[]>([]);

  const pkColumn = schema ? getPrimaryKeyColumn(schema.columns) : null;

  // Load schema
  useEffect(() => {
    let cancelled = false;

    const loadSchema = async () => {
      try {
        const schemaData = await dbGetTableSchema(tableName);
        if (!cancelled) {
          setSchema(schemaData);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load schema');
        }
      }
    };

    loadSchema();

    return () => {
      cancelled = true;
    };
  }, [tableName]);

  // Load table data
  const loadData = useCallback(async () => {
    if (!schema) return;

    setLoading(true);
    setError(null);

    try {
      const options: TableDataOptions = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        orderBy: sortColumn,
        orderDir: sortDirection,
        filters,
      };

      const result = await dbGetTableData(tableName, options);
      setRows(result.rows);
      setTotalCount(result.totalCount);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [tableName, schema, page, pageSize, sortColumn, sortDirection, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Apply search filter
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery && schema) {
        // Apply search to all text columns
        const newFilters: Record<string, any> = {};
        schema.columns.forEach((col) => {
          if (col.type.toUpperCase().includes('TEXT')) {
            newFilters[col.name] = searchQuery;
          }
        });
        setFilters(newFilters);
      } else {
        setFilters({});
      }
      setPage(1); // Reset to first page when searching
    }, 300); // Debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, schema]);

  const handleSort = (column: string, direction: 'ASC' | 'DESC') => {
    setSortColumn(column);
    setSortDirection(direction);
    setPage(1);
  };

  const handleRowSelect = (rowId: any) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId);
    } else {
      newSelected.add(rowId);
    }
    setSelectedRows(newSelected);
  };

  const handleRowSelectAll = (selected: boolean) => {
    if (selected && pkColumn) {
      const allIds = rows.map((row) => row[pkColumn.name]);
      setSelectedRows(new Set(allIds));
    } else {
      setSelectedRows(new Set());
    }
  };

  const handleRowClick = async (row: any) => {
    if (!pkColumn) return;

    try {
      const related = await dbGetRelatedData(tableName, row[pkColumn.name]);
      setRelatedData(related);
      setEditingRow(row);
    } catch (err) {
      console.error('Failed to load related data:', err);
      setRelatedData({});
      setEditingRow(row);
    }
  };

  const handleSaveRow = async (rowId: any, updates: Record<string, any>) => {
    await dbUpdateRow(tableName, rowId, updates);
    await loadData();
    setEditingRow(null);
    setRelatedData({});
  };

  const handleDeleteRow = async (row: any) => {
    if (!pkColumn) return;

    try {
      const related = await dbGetRelatedData(tableName, row[pkColumn.name]);
      setRelatedData(related);
      setRowsToDelete([row]);
      setDeleteConfirmOpen(true);
    } catch (err) {
      console.error('Failed to load related data:', err);
      setRelatedData({});
      setRowsToDelete([row]);
      setDeleteConfirmOpen(true);
    }
  };

  const handleDeleteSelected = async () => {
    if (!pkColumn) return;

    const rowsToDeleteArray = rows.filter((row) =>
      selectedRows.has(row[pkColumn.name])
    );
    setRowsToDelete(rowsToDeleteArray);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!pkColumn) return;

    if (rowsToDelete.length === 1) {
      await dbDeleteRow(tableName, rowsToDelete[0][pkColumn.name]);
    } else {
      const ids = rowsToDelete.map((row) => row[pkColumn.name]);
      await dbDeleteRows(tableName, ids);
    }

    await loadData();
    setSelectedRows(new Set());
    setRowsToDelete([]);
    setRelatedData({});
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  if (!schema) {
    return (
      <div className="flex items-centre justify-centre h-64">
        <div className="text-muted-foreground">Loading schema...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-border/50 px-4 py-3">
        <div className="flex items-centre justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">{getTableDisplayName(tableName)}</h2>
            <p className="text-sm text-muted-foreground">
              {totalCount} row{totalCount !== 1 ? 's' : ''}
              {selectedRows.size > 0 && ` • ${selectedRows.size} selected`}
            </p>
          </div>

          {/* Batch actions */}
          {selectedRows.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDeleteSelected}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete {selectedRows.size}
            </Button>
          )}
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-sm bg-background border border-border/50 rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Data grid */}
      <div className="flex-1 overflow-auto p-4">
        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-3 py-2 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-centre justify-centre h-64">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : (
          <DataGrid
            columns={schema.columns}
            rows={rows}
            selectedRows={selectedRows}
            onRowSelect={handleRowSelect}
            onRowSelectAll={handleRowSelectAll}
            onRowClick={handleRowClick}
            onRowEdit={handleRowClick}
            onRowDelete={handleDeleteRow}
            onSort={handleSort}
            sortColumn={sortColumn}
            sortDirection={sortDirection}
            primaryKeyColumn={pkColumn?.name || null}
          />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-t border-border/50 px-4 py-3">
          <div className="flex items-centre justify-between">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>

            <div className="flex items-centre gap-2">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="px-2 py-1 text-sm bg-background border border-border/50 rounded-md"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>

              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <RowDetailModal
        isOpen={!!editingRow}
        onClose={() => {
          setEditingRow(null);
          setRelatedData({});
        }}
        row={editingRow}
        columns={schema.columns}
        tableName={tableName}
        onSave={handleSaveRow}
        relatedData={relatedData}
      />

      <ConfirmDeleteModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setRowsToDelete([]);
          setRelatedData({});
        }}
        onConfirm={handleConfirmDelete}
        tableName={tableName}
        rowCount={rowsToDelete.length}
        rows={rowsToDelete}
        columns={schema.columns}
        relatedData={relatedData}
      />
    </div>
  );
}
