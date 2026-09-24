import type { TableNode } from '../../model/types';
import { useDismissiblePanel } from '../../shared/ui/useDismissiblePanel';
import { ColumnUsageList } from './ColumnUsageList';

interface TableDetailPopupProps {
  table: TableNode;
  onClose: () => void;
}

export function TableDetailPopup({ table, onClose }: TableDetailPopupProps) {
  const panelRef = useDismissiblePanel(onClose);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div
        ref={panelRef}
        className="relative w-full max-w-md animate-slide-up rounded-2xl border border-white/[0.06] bg-panel shadow-popup"
      >
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
        <div className="overlay-scroll max-h-[60vh] overflow-y-auto px-6 py-4 space-y-5">
          <p className="text-xs text-slate-400">Columns and formulas. The table role is estimated.</p>
          <TableStatistics table={table} />
          <div>
            <h3 className="mb-2 text-sm font-semibold text-slate-200">Columns — fields in this table</h3>
            <div className="flex flex-wrap gap-1.5">
              {table.columns.map((column) => (
                <span key={column} className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-xs text-slate-300">{column}</span>
              ))}
            </div>
          </div>
          <TableMeasures measures={table.measures} />
          <ColumnUsageList table={table} />
        </div>
      </div>
    </div>
  );
}

function TableStatistics({ table }: { table: TableNode }) {
  const statistics = [
    { label: 'Columns', value: table.columns.length },
    { label: 'Measures', value: table.measures.length },
    { label: 'Relationships', value: table.degree },
    { label: 'Formula references', value: table.columnReferences.length },
  ];

  return (
    <div className="grid grid-cols-2 gap-2">
      {statistics.map(({ label, value }) => (
        <div key={label} className="rounded-xl bg-surface px-3 py-2 text-center">
          <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 font-display text-lg font-bold text-white">{value}</p>
        </div>
      ))}
    </div>
  );
}

function TableMeasures({ measures }: { measures: TableNode['measures'] }) {
  if (measures.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-200">Measures — DAX calculations</h3>
      <p className="mb-2 text-xs text-slate-400">Formulas are shown, not executed.</p>
      <div className="space-y-2">
        {measures.map((measure) => (
          <div key={measure.name} className="rounded-xl bg-surface p-3">
            <p className="text-sm font-semibold text-accent">{measure.name}</p>
            <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-slate-400">{measure.expression}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
