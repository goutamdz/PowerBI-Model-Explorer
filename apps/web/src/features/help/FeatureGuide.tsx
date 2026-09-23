import { useEffect, useRef } from 'react';
import { featureHelp, modelTerms } from './featureHelp';

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
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="m-auto max-h-[90vh] w-[calc(100%-2rem)] max-w-3xl rounded-2xl border border-slate-600/40 bg-panel p-0 text-slate-200 shadow-popup backdrop:bg-black/60"
    >
      <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-slate-700 bg-panel px-6 py-4">
        <h2 id="feature-guide-title" className="font-display text-xl font-bold text-white">Feature guide</h2>
        <button type="button" autoFocus onClick={onClose} className="rounded-lg border border-slate-600 px-3 py-1.5 text-sm text-white hover:bg-panelHover">
          Close guide
        </button>
      </div>
      <div className="space-y-6 p-6">
        <p className="text-sm leading-relaxed text-slate-300">
          Start with the demo or open your own model. Select an icon on the left to open a tool.
          Only one panel opens at a time, beside the canvas. Hover over icons for their names.
        </p>
        <p className="text-sm leading-relaxed text-slate-300">
          Tables rearrange to use the canvas width and height when panels or the window resize.
          Larger models use smaller table boxes while keeping the base text size unchanged.
          Show whole map also resets table positions and zoom.
        </p>
        <section aria-labelledby="guide-features">
          <h3 id="guide-features" className="mb-3 font-semibold text-white">What would you like to do?</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {Object.values(featureHelp).map((feature) => (
              <div key={feature.title} className="rounded-xl border border-white/10 bg-surface p-4">
                <h4 className="text-sm font-semibold text-accent">{feature.title}</h4>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>
        <section aria-labelledby="guide-demo" className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
          <h3 id="guide-demo" className="font-semibold text-emerald-300">Try this in the demo</h3>
          <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-slate-300">
            <li>Select <strong>Trace filter paths</strong> in the left toolbar. Choose <strong>Product Category</strong> as the starting table and <strong>Sales</strong> as the destination.</li>
            <li>Select <strong>Trace paths</strong> to highlight Product Category -&gt; Product Subcategory -&gt; Product -&gt; Sales: three hops.</li>
            <li>Change the starting table to <strong>Region</strong> and trace again. Two routes reach Sales: one through Store and one through Customer.</li>
          </ol>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">The path finder includes inactive relationships and shows up to 2,000 unique table routes. A highlighted route is not proof that a filter is active in Power BI.</p>
        </section>
        <section aria-labelledby="guide-terms">
          <h3 id="guide-terms" className="mb-3 font-semibold text-white">Power BI terms in plain language</h3>
          <dl className="space-y-3">
            {modelTerms.map(({ term, definition }) => (
              <div key={term}>
                <dt className="text-sm font-semibold text-white">{term}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-slate-300">{definition}</dd>
              </div>
            ))}
          </dl>
        </section>
        <p className="text-xs leading-relaxed text-slate-400">Close a panel to regain canvas space; selections and highlights remain. Clear view resets search, focus, and paths. The top bar has zoom controls. The legend sits at the bottom center. Hover details and this guide are available in the left toolbar. Drag to pan, scroll to zoom, and click tables or lines for details.</p>
      </div>
    </dialog>
  );
}
