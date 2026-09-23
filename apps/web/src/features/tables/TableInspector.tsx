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
    [model]
  );

  // Get relationships for the selected table
  const { relatedTables, relationships } = useMemo(() => {
    if (!selectedTable) {
      return { relatedTables: [], relationships: [] };
    }

    // Only relationships where the selected table is on one side
    const rels = model.relationships.filter(
      (rel) => rel.fromTable === selectedTable || rel.toTable === selectedTable
    );

    // Directly related tables (neighbors of the selected table)
    const tables = new Set<string>();
    rels.forEach((rel) => {
      if (rel.fromTable === selectedTable) tables.add(rel.toTable);
      if (rel.toTable === selectedTable) tables.add(rel.fromTable);
    });

    return {
      relatedTables: Array.from(tables),
      relationships: rels,
    };
  }, [model, selectedTable]);

  return (
        <section aria-label="Table connections">
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs text-slate-300">
                Table to explore
              </label>
              <SearchableSelect
                value={selectedTable || ''}
                options={tableNames}
                placeholder="Choose table..."
                onChange={onSelectTable}
              />
            </div>

            {selectedTable && (
              <div className="space-y-2 rounded-lg border border-emerald-600/20 bg-emerald-950/20 p-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400" />
                  <span className="font-semibold text-white">{selectedTable}</span>
                </div>
                
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Directly connected tables:</span>
                    <span className="font-mono font-semibold text-emerald-300">{relatedTables.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Relationships:</span>
                    <span className="font-mono font-semibold text-emerald-300">{relationships.length}</span>
                  </div>
                </div>

                {relatedTables.length > 0 && (
                  <div className="mt-2 border-t border-emerald-600/20 pt-2">
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Connected to:</p>
                    <div className="flex flex-wrap gap-1">
                      {relatedTables.map((table) => (
                        <span
                          key={table}
                          className="inline-block rounded bg-emerald-600/20 px-2 py-0.5 text-[10px] text-emerald-200"
                        >
                          {table}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => onSelectTable(null)}
                  className="mt-2 w-full rounded-lg border border-emerald-600/30 bg-emerald-600/10 px-3 py-1.5 text-xs font-medium text-emerald-300 transition hover:bg-emerald-600/20"
                >
                  Clear Selection
                </button>
              </div>
            )}

            {!selectedTable && (
              <p className="text-center text-[10px] italic text-slate-500">
                Choose a table to see its direct connections.
              </p>
            )}
          </div>
        </section>
  );
}
