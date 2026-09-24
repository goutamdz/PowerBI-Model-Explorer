import { useMemo } from 'react';
import type { SemanticModelResponse } from '../../model/types';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';

interface TableInspectorProps {
  model: SemanticModelResponse;
  selectedTable: string | null;
  onSelectTable: (tableName: string | null) => void;
}

export function TableInspector({ model, selectedTable, onSelectTable }: TableInspectorProps) {
  const tableNames = useMemo(
    () => Object.keys(model.tables).sort((a, b) => a.localeCompare(b)),
    [model],
  );
  const { relatedTables, relationshipCount } = useMemo(() => {
    if (!selectedTable) return { relatedTables: [], relationshipCount: 0 };

    const relationships = model.relationships.filter(
      (relationship) => relationship.fromTable === selectedTable || relationship.toTable === selectedTable,
    );
    const neighbors = new Set<string>();
    for (const relationship of relationships) {
      if (relationship.fromTable === selectedTable) neighbors.add(relationship.toTable);
      if (relationship.toTable === selectedTable) neighbors.add(relationship.fromTable);
    }
    return { relatedTables: Array.from(neighbors), relationshipCount: relationships.length };
  }, [model, selectedTable]);

  return (
    <section aria-label="Table connections">
      <div className="space-y-3">
        <div>
          <label className="mb-1.5 block text-xs text-slate-300">Table to explore</label>
          <SearchableSelect
            value={selectedTable || ''}
            options={tableNames}
            placeholder="Choose table..."
            onChange={onSelectTable}
          />
        </div>
        {selectedTable ? (
          <ConnectionSummary
            tableName={selectedTable}
            relatedTables={relatedTables}
            relationshipCount={relationshipCount}
            onClear={() => onSelectTable(null)}
          />
        ) : (
          <p className="text-center text-[10px] italic text-slate-500">
            Choose a table to see its direct connections.
          </p>
        )}
      </div>
    </section>
  );
}

interface ConnectionSummaryProps {
  tableName: string;
  relatedTables: string[];
  relationshipCount: number;
  onClear: () => void;
}

function ConnectionSummary({ tableName, relatedTables, relationshipCount, onClear }: ConnectionSummaryProps) {
  return (
    <div className="space-y-2 rounded-lg border border-emerald-600/20 bg-emerald-950/20 p-3">
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-emerald-400" />
        <span className="font-semibold text-white">{tableName}</span>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Directly connected tables:</span>
          <span className="font-mono font-semibold text-emerald-300">{relatedTables.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Relationships:</span>
          <span className="font-mono font-semibold text-emerald-300">{relationshipCount}</span>
        </div>
      </div>
      {relatedTables.length > 0 && (
        <div className="mt-2 border-t border-emerald-600/20 pt-2">
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Connected to:</p>
          <div className="flex flex-wrap gap-1">
            {relatedTables.map((table) => (
              <span key={table} className="inline-block rounded bg-emerald-600/20 px-2 py-0.5 text-[10px] text-emerald-200">
                {table}
              </span>
            ))}
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={onClear}
        className="mt-2 w-full rounded-lg border border-emerald-600/30 bg-emerald-600/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-600/20"
      >
        Clear Selection
      </button>
    </div>
  );
}
