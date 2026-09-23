import { useEffect, useMemo, useRef } from 'react';
import type { TableNode } from '../../model/types';

interface TableDetailPopupProps {
  table: TableNode;
  onClose: () => void;
}

export function TableDetailPopup({ table, onClose }: TableDetailPopupProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Group column references by column name for organized display
  const refsByColumn = useMemo(() => {
    const map = new Map<string, typeof table.columnReferences>();
    for (const ref of table.columnReferences) {
      const existing = map.get(ref.column) ?? [];
      existing.push(ref);
      map.set(ref.column, existing);
    }
    return map;
  }, [table.columnReferences]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    }

    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div
        ref={panelRef}
        className="relative w-full max-w-md animate-slide-up rounded-2xl border border-white/[0.06] bg-panel shadow-popup"
      >
        {/* header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-xl font-bold text-white">{table.name}</h2>
            <span className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider ${table.kind === 'fact' ? 'bg-fact/20 text-fact' : 'bg-dimension/20 text-dimension'}`}>
              {table.kind}
            </span>
          </div>
          <button type="button" aria-label="Close table details" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/10 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* body */}
        <div className="overlay-scroll max-h-[60vh] overflow-y-auto px-6 py-4 space-y-5">
          <p className="text-xs text-slate-400">Columns and formulas. The table role is estimated.</p>
          {/* stats row */}
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: 'Columns', val: table.columns.length },
              { label: 'Measures', val: table.measures.length },
              { label: 'Relationships', val: table.degree },
              { label: 'Formula references', val: table.columnReferences.length },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-surface px-3 py-2 text-center">
                <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{s.label}</p>
                <p className="mt-1 font-display text-lg font-bold text-white">{s.val}</p>
              </div>
            ))}
          </div>

          {/* columns */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-200">Columns — fields in this table</h3>
            <div className="flex flex-wrap gap-1.5">
              {table.columns.map((col) => (
                <span key={col} className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-xs text-slate-300">{col}</span>
              ))}
            </div>
          </div>

          {/* measures */}
          {table.measures.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-200">Measures — DAX calculations</h3>
              <p className="mb-2 text-xs text-slate-400">Formulas are shown, not executed.</p>
              <div className="space-y-2">
                {table.measures.map((m) => (
                  <div key={m.name} className="rounded-xl bg-surface p-3">
                    <p className="text-sm font-semibold text-accent">{m.name}</p>
                    <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-400">{m.expression}</pre>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* column references (DAX usage) */}
          {table.columnReferences.length > 0 ? (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-slate-200">Where these columns are used</h3>
              <p className="mb-2 text-xs text-slate-400">Detected column references in measures, not a full dependency analysis.</p>
              <div className="space-y-3">
                {Array.from(refsByColumn.entries()).map(([column, refs]) => (
                  <div key={column} className="rounded-xl border border-white/[0.06] bg-surface p-3">
                    <p className="mb-2 text-xs font-semibold text-white">
                      <span className="text-slate-500">{table.name}</span>
                      <span className="text-accent">[{column}]</span>
                      <span className="ml-2 rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-slate-400">{refs.length} usage{refs.length > 1 ? 's' : ''}</span>
                    </p>
                    <div className="space-y-2">
                      {refs.map((ref, i) => {
                        // Extract only lines that reference this column
                        const pattern = new RegExp(`'?${table.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'?\\s*\\[${column.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'i');
                        const matchingLines = ref.expression
                          .split('\n')
                          .filter((line) => pattern.test(line))
                          .map((line) => line.trim());

                        return (
                        <div key={`${ref.referencedIn}-${ref.sourceTable}-${i}`} className="rounded-lg bg-panel p-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${ref.referenceType === 'measure' ? 'bg-accent/15 text-accent' : 'bg-amber-400/15 text-amber-400'}`}>
                              {ref.referenceType === 'measure' ? 'Measure' : 'Calc Column'}
                            </span>
                            <span className="text-xs font-semibold text-white">{ref.referencedIn}</span>
                            <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-400">
                              Table: <span className="text-slate-300">{ref.sourceTable}</span>
                            </span>
                          </div>
                          {matchingLines.length > 0 ? (
                            <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-slate-400">{matchingLines.join('\n')}</pre>
                          ) : (
                            <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-slate-400">{ref.expression}</pre>
                          )}
                        </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
