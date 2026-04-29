import { useState, useEffect } from 'react';
import { TableList } from './data-browser/TableList';
import { TableView } from './data-browser/TableView';
import { dbListTables, dbGetRowCount } from '@/lib/electron-api';
import { Database } from 'lucide-react';

export function DataBrowserPage() {
  const [tables, setTables] = useState<string[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableCounts, setTableCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTables = async () => {
      try {
        setLoading(true);
        const tableList = await dbListTables();
        setTables(tableList);

        // Load row counts for each table
        const counts: Record<string, number> = {};
        for (const table of tableList) {
          try {
            const count = await dbGetRowCount(table);
            counts[table] = count;
          } catch (err) {
            console.error(`Failed to get count for ${table}:`, err);
            counts[table] = 0;
          }
        }
        setTableCounts(counts);

        // Select first table by default
        if (tableList.length > 0 && !selectedTable) {
          setSelectedTable(tableList[0]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load tables');
      } finally {
        setLoading(false);
      }
    };

    loadTables();
  }, []);

  const handleTableSelect = (tableName: string) => {
    setSelectedTable(tableName);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar with table list */}
      <div className="w-64 border-r border-border/50 overflow-y-auto">
        <div className="p-4 border-b border-border/50">
          <div className="flex items-centre gap-2">
            <Database className="w-5 h-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">Data Browser</h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Browse and edit database tables
          </p>
        </div>

        <TableList
          tables={tables}
          selectedTable={selectedTable}
          onTableSelect={handleTableSelect}
          tableCounts={tableCounts}
          loading={loading}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        {error && (
          <div className="p-4">
            <div className="bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          </div>
        )}

        {!error && !selectedTable && !loading && (
          <div className="flex items-centre justify-centre h-full text-muted-foreground">
            <div className="text-centre">
              <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No table selected</p>
              <p className="text-sm">Select a table from the sidebar to view its data</p>
            </div>
          </div>
        )}

        {selectedTable && !error && (
          <TableView key={selectedTable} tableName={selectedTable} />
        )}
      </div>
    </div>
  );
}
