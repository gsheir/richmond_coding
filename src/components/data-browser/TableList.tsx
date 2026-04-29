import { getTableDisplayName, getTableColour } from '@/lib/data-browser-utils';
import { cn } from '@/lib/utils';

interface TableListProps {
  tables: string[];
  selectedTable: string | null;
  onTableSelect: (tableName: string) => void;
  tableCounts?: Record<string, number>;
  loading?: boolean;
}

export function TableList({
  tables,
  selectedTable,
  onTableSelect,
  tableCounts = {},
  loading = false,
}: TableListProps) {
  if (loading) {
    return (
      <div className="p-4 space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-10 bg-muted/50 rounded-lg animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="p-4 text-centre text-muted-foreground">
        <p className="text-sm">No tables found</p>
      </div>
    );
  }

  return (
    <div className="p-2 space-y-1">
      <div className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Tables
      </div>
      {tables.map((table) => {
        const isSelected = selectedTable === table;
        const count = tableCounts[table];

        return (
          <button
            key={table}
            onClick={() => onTableSelect(table)}
            className={cn(
              'w-full text-left px-3 py-2 rounded-lg transition-colours',
              'hover:bg-muted/50',
              isSelected && 'bg-muted font-medium'
            )}
          >
            <div className="flex items-centre justify-between gap-2">
              <span className="text-sm truncate">
                {getTableDisplayName(table)}
              </span>
              {count !== undefined && (
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full',
                    getTableColour(table)
                  )}
                >
                  {count}
                </span>
              )}
            </div>
            <div className="text-xs text-muted-foreground font-mono mt-0.5">
              {table}
            </div>
          </button>
        );
      })}
    </div>
  );
}
