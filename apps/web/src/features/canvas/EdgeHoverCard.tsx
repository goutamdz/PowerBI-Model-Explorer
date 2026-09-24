import type { EdgeDetail } from '../relationships/types';

export interface EdgeHoverInfo {
  detail: EdgeDetail;
  x: number;
  y: number;
}

interface HoverRowProps {
  label: string;
  value: string;
  className?: string;
}

function HoverRow({ label, value, className = 'truncate text-slate-300' }: HoverRowProps) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="font-mono text-[9px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className={className}>{value}</span>
    </div>
  );
}

export function EdgeHoverCard({ detail, x, y }: EdgeHoverInfo) {
  const bidirectional = detail.direction === 'both';
  const active = detail.active === 'true';
  return (
    <div
      className="pointer-events-none absolute z-30 w-64 -translate-y-full rounded-xl border border-slate-600/60 bg-panel/95 p-3 text-xs shadow-glow backdrop-blur"
      style={{ left: Math.max(8, x + 12), top: Math.max(8, y - 12) }}
    >
      <div className="mb-2 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5 border-b border-slate-700/50 pb-2">
        <span className="min-w-0 break-words rounded bg-accent/15 px-1.5 py-0.5 text-center font-semibold text-accent">{detail.source}</span>
        <span className="text-slate-500">{bidirectional ? '\u2194' : '\u2192'}</span>
        <span className="min-w-0 break-words rounded bg-accent/15 px-1.5 py-0.5 text-center font-semibold text-accent">{detail.target}</span>
      </div>
      <div className="space-y-1">
        <HoverRow label="Column A" value={`${detail.source}[${detail.fromColumn}]`} />
        <HoverRow label="Column B" value={`${detail.target}[${detail.toColumn}]`} />
        <HoverRow label="Row matching" value={detail.cardinality} className="font-mono text-cyan-300" />
        <HoverRow
          label="Filter direction"
          value={bidirectional ? 'Both ways' : 'One way'}
          className={bidirectional ? 'text-amber-400' : 'text-slate-300'}
        />
        <p className="mt-2 text-[11px] text-slate-400">1 = unique key; * = repeated values. Click the line for an explanation.</p>
        <HoverRow
          label="Status"
          value={active ? 'Active' : 'Inactive'}
          className={active ? 'text-emerald-400' : 'text-red-400'}
        />
      </div>
    </div>
  );
}
