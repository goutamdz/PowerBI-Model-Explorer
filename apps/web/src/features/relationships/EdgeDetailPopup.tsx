import { useDismissiblePanel } from '../../shared/ui/useDismissiblePanel';
import type { EdgeDetail } from './types';

interface EdgeDetailPopupProps {
  edge: EdgeDetail;
  onClose: () => void;
}

export function EdgeDetailPopup({ edge, onClose }: EdgeDetailPopupProps) {
  const panelRef = useDismissiblePanel(onClose);
  const isActive = edge.active === 'true';
  const isBidirectional = edge.direction === 'both';

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div
        ref={panelRef}
        className="relative w-full max-w-sm animate-slide-up rounded-2xl border border-white/[0.06] bg-panel shadow-popup"
      >
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <h2 className="font-display text-lg font-bold text-white">How these tables connect</h2>
          <button type="button" aria-label="Close relationship details" onClick={onClose} className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 transition hover:bg-white/10 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="rounded-lg bg-accent/15 px-2.5 py-1 font-semibold text-accent">{edge.source}</span>
            <span className="text-slate-500">{isBidirectional ? '↔' : '→'}</span>
            <span className="rounded-lg bg-accent/15 px-2.5 py-1 font-semibold text-accent">{edge.target}</span>
          </div>

          <div className="space-y-2.5">
            <DetailRow label="Column A" value={`${edge.source}[${edge.fromColumn}]`} />
            <DetailRow label="Column B" value={`${edge.target}[${edge.toColumn}]`} />
            <DetailRow label="Row matching" value={edge.cardinality} />
            <p className="text-xs text-slate-400">Cardinality: 1 means a unique key; * means repeated values.</p>
            <DetailRow
              label="Filter direction"
              value={isBidirectional ? 'Both ways' : 'One way'}
              badge={isBidirectional ? 'text-amber-400 bg-amber-400/15' : 'text-slate-300 bg-white/[0.06]'}
            />
            <p className="text-xs leading-relaxed text-slate-400">{isBidirectional ? 'Each table can filter the other.' : `${edge.source} can filter ${edge.target}, but not the reverse through this link.`}</p>
            <DetailRow
              label="Status"
              value={isActive ? 'Active' : 'Inactive'}
              badge={isActive ? 'text-emerald-400 bg-emerald-400/15' : 'text-red-400 bg-red-400/15'}
            />
            <p className="text-xs text-slate-400">{isActive ? 'Used by default.' : 'Not used by default; DAX can enable it.'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
      <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${badge ?? 'text-slate-300 bg-white/[0.06]'}`}>{value}</span>
    </div>
  );
}
