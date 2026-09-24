import { useState } from 'react';
import { ModelFolderPicker } from '../model-loading/ModelFolderPicker';
import { FeatureGuide } from '../help/FeatureGuide';
import { featureHelp } from '../help/featureHelp';
import { ComparisonResults } from './ComparisonResults';
import { useModelComparison } from './useModelComparison';

interface CompareModelsProps {
  onBack: () => void;
}

export function CompareModels({ onBack }: CompareModelsProps) {
  const comparison = useModelComparison();
  const [showGuide, setShowGuide] = useState(false);
  const { modelA, modelB, loadingFolder, result, loading, error, filter } = comparison;
  const folderPickerDisabled = loading || loadingFolder !== null;

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex items-center gap-4 border-b border-white/[0.06] bg-panel px-6 py-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back to model explorer"
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-600/40 text-slate-400 transition hover:bg-accent/20 hover:text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="font-display text-xl font-bold text-white">{featureHelp.compare.title}</h1>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">{featureHelp.compare.description}</p>
          <p className="mt-1 text-xs text-slate-400">Relationships only; data and formulas are not compared.</p>
        </div>
        <button type="button" onClick={() => setShowGuide(true)} className="ml-auto shrink-0 rounded-lg border border-slate-600 px-3 py-2 text-xs text-white hover:bg-panelHover">Feature guide</button>
      </div>

      <div className="border-b border-white/[0.06] bg-panel/50 px-6 py-5">
        <div className="mx-auto max-w-4xl space-y-4">
          <p className="text-sm text-slate-400">1. Choose two .SemanticModel folders. Both stay on your device.</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-300">Model A — original / reference</label>
              <ModelFolderPicker
                label={loadingFolder === 'a' ? 'Reading model A...' : 'Choose model A folder'}
                folderName={modelA?.folderPath}
                disabled={folderPickerDisabled}
                onSelect={(files) => comparison.selectFolder('a', files)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Model B — version to compare</label>
              <ModelFolderPicker
                label={loadingFolder === 'b' ? 'Reading model B...' : 'Choose model B folder'}
                folderName={modelB?.folderPath}
                disabled={folderPickerDisabled}
                onSelect={(files) => comparison.selectFolder('b', files)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={comparison.compareModels}
              disabled={folderPickerDisabled || !modelA || !modelB}
              className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accentMuted disabled:opacity-50"
            >
              {loading ? 'Comparing…' : '2. Compare relationships'}
            </button>
            {result ? (
              <button
                type="button"
                onClick={comparison.clearResults}
                className="rounded-xl border border-border px-4 py-2.5 text-sm text-slate-400 transition hover:bg-panelHover hover:text-white"
              >
                Clear results
              </button>
            ) : null}
          </div>
          {error ? (
            <p className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p>
          ) : null}
        </div>
      </div>

      {result ? (
        <ComparisonResults result={result} filter={filter} onFilter={comparison.setFilter} />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="max-w-lg px-6 text-center text-sm text-slate-400">Choose both folders to compare their relationships.</p>
        </div>
      )}
      {showGuide ? <FeatureGuide onClose={() => setShowGuide(false)} /> : null}
    </div>
  );
}
