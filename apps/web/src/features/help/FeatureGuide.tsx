import { useEffect, useRef } from 'react';
import { featureHelp } from './featureHelp';

export function FeatureGuide({ onClose }: { onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="feature-guide-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl border border-slate-600/40 bg-panel p-0 text-slate-200 shadow-popup backdrop:bg-black/60"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-700 bg-panel px-4 py-3">
        <h2 id="feature-guide-title" className="font-display text-lg font-semibold text-white">Feature guide</h2>
        <button type="button" autoFocus onClick={onClose} className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-white hover:bg-panelHover">
          Close guide
        </button>
      </div>
      <div className="px-4 pb-4">
        <dl className="divide-y divide-white/10">
          {Object.values(featureHelp).map((feature) => (
            <div key={feature.title} className="grid gap-1 py-2.5 text-sm sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
              <dt className="font-medium text-white">{feature.title}</dt>
              <dd className="text-slate-300">{feature.description}</dd>
            </div>
          ))}
        </dl>
        <section aria-labelledby="guide-controls" className="space-y-2 border-t border-slate-700 py-3 text-xs text-slate-300">
          <h3 id="guide-controls" className="font-semibold text-white">Map controls</h3>
          <p>Drag to pan. Scroll to zoom. Click a line for relationship details.</p>
          <p><strong>Show whole map:</strong> reset positions and zoom. <strong>Clear view:</strong> remove highlights.</p>
          <p><strong>Close a panel:</strong> keep selections. <strong>Hover details:</strong> toggle relationship tooltips.</p>
        </section>
        <p className="border-t border-slate-700 pt-3 text-xs leading-relaxed text-slate-400">
          Paths include inactive relationships (up to 2,000 routes); highlights do not prove active filtering.
          Comparison checks relationships only, not data or formulas. Model checks never edit your model.
        </p>
      </div>
    </dialog>
  );
}
