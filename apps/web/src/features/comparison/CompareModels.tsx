import { useState } from 'react';
import { fetchCompare, fetchModel } from '../../model/worker/client';
import type { CompareResponse, DiffKind, SemanticModelResponse } from '../../model/types';
import { ModelFolderPicker } from '../model-loading/ModelFolderPicker';
import { FeatureGuide } from '../help/FeatureGuide';
import { featureHelp } from '../help/featureHelp';

interface CompareModelsProps {
  onBack: () => void;
}

const kindLabel: Record<DiffKind, string> = {
  'only-in-a': 'Only in Model A',
  'only-in-b': 'Only in Model B',
  'different': 'Changed settings',
};

const kindColor: Record<DiffKind, string> = {
  'only-in-a': 'text-amber-400 bg-amber-400/15',
  'only-in-b': 'text-cyan-400 bg-cyan-400/15',
  'different': 'text-red-400 bg-red-400/15',
};

export function CompareModels({ onBack }: CompareModelsProps) {
  const [modelA, setModelA] = useState<SemanticModelResponse | null>(null);
  const [modelB, setModelB] = useState<SemanticModelResponse | null>(null);
  const [loadingFolder, setLoadingFolder] = useState<'a' | 'b' | null>(null);
  const [result, setResult] = useState<CompareResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DiffKind | 'all'>('all');
  const [showGuide, setShowGuide] = useState(false);

  async function handleSelectFolder(side: 'a' | 'b', files: File[]) {
    const setModel = side === 'a' ? setModelA : setModelB;
    setLoadingFolder(side);
    setModel(null);
    setResult(null);
    setFilter('all');
    setError(null);
    try {
      setModel(await fetchModel(files));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unable to read the selected model.');
    } finally {
      setLoadingFolder(null);
    }
  }

  async function handleCompare() {
    if (!modelA || !modelB) {
      setError('Select both model folders.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCompare(modelA, modelB);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Comparison failed.');
    } finally {
      setLoading(false);
    }
  }

  const filteredDiffs = result
    ? filter === 'all'
      ? result.diffs
      : result.diffs.filter((d) => d.kind === filter)
    : [];

  const countByKind = result
    ? {
        'only-in-a': result.diffs.filter((d) => d.kind === 'only-in-a').length,
        'only-in-b': result.diffs.filter((d) => d.kind === 'only-in-b').length,
        different: result.diffs.filter((d) => d.kind === 'different').length,
      }
    : null;

  return (
    <div className="flex h-full flex-col bg-surface">
      {/* Header */}
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

      {/* Input area */}
      <div className="border-b border-white/[0.06] bg-panel/50 px-6 py-5">
        <div className="mx-auto max-w-4xl space-y-4">
          <p className="text-sm text-slate-400">1. Choose two .SemanticModel folders. Both stay on your device.</p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-300">Model A — original / reference</label>
              <ModelFolderPicker
                label={loadingFolder === 'a' ? 'Reading model A...' : 'Choose model A folder'}
                folderName={modelA?.folderPath}
                disabled={loading || loadingFolder !== null}
                onSelect={(files) => handleSelectFolder('a', files)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-300">Model B — version to compare</label>
              <ModelFolderPicker
                label={loadingFolder === 'b' ? 'Reading model B...' : 'Choose model B folder'}
                folderName={modelB?.folderPath}
                disabled={loading || loadingFolder !== null}
                onSelect={(files) => handleSelectFolder('b', files)}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleCompare}
              disabled={loading || loadingFolder !== null || !modelA || !modelB}
              className="rounded-xl bg-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-accentMuted disabled:opacity-50"
            >
              {loading ? 'Comparing…' : '2. Compare relationships'}
            </button>
            {result ? (
              <button
                type="button"
                onClick={() => { setResult(null); setFilter('all'); }}
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

      {/* Results area */}
      {result ? (
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="mx-auto max-w-4xl space-y-4">
            {/* Summary */}
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-panel px-5 py-3">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-slate-500">Model A</span>
                <span className="font-mono text-xs font-bold text-white">{result.totalA} relationships</span>
              </div>
              <span className="text-[8px] text-slate-700">•</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-slate-500">Model B</span>
                <span className="font-mono text-xs font-bold text-white">{result.totalB} relationships</span>
              </div>
              <span className="text-[8px] text-slate-700">•</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[10px] text-slate-500">Differences</span>
                <span className={`font-mono text-xs font-bold ${result.totalDiffs === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {result.totalDiffs}
                </span>
              </div>
            </div>

            {result.totalDiffs === 0 ? (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-8 text-center">
                <p className="text-lg font-semibold text-emerald-400">No relationship differences found</p>
                <p className="mt-1 text-sm text-slate-400">Relationship settings match. Other model content may differ.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-400">Only in A = removed. Only in B = added. Changed values show A then B.</p>
                {/* Filter tabs */}
                <div className="flex gap-2">
                  {([['all', 'All changes', result.totalDiffs], ['only-in-a', 'Only in A', countByKind!['only-in-a']], ['only-in-b', 'Only in B', countByKind!['only-in-b']], ['different', 'Changed settings', countByKind!.different]] as const).map(([key, label, count]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFilter(key)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filter === key ? 'bg-accent text-white' : 'border border-slate-600/40 text-slate-400 hover:bg-panelHover hover:text-white'}`}
                    >
                      {label} <span className="ml-1 font-mono opacity-70">({count})</span>
                    </button>
                  ))}
                </div>

                {/* Diff list */}
                <div className="space-y-2">
                  {filteredDiffs.map((diff) => (
                    <div key={diff.key} className="rounded-xl border border-white/[0.06] bg-panel px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-mono text-sm text-white">{diff.key}</p>
                        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${kindColor[diff.kind]}`}>
                          {kindLabel[diff.kind]}
                        </span>
                      </div>

                      {diff.kind === 'different' && diff.differences ? (
                        <div className="mt-3 space-y-1.5">
                          {diff.differences.map((d) => {
                            const [label, values] = d.split(': ');
                            const [valA, valB] = (values ?? '').split(' vs ');
                            return (
                              <div key={d} className="flex items-center gap-3 text-xs">
                                <span className="w-20 font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
                                <span className="rounded bg-amber-400/15 px-2 py-0.5 font-mono text-amber-300">{valA}</span>
                                <span className="text-slate-600">→</span>
                                <span className="rounded bg-cyan-400/15 px-2 py-0.5 font-mono text-cyan-300">{valB}</span>
                              </div>
                            );
                          })}
                        </div>
                      ) : null}

                      {diff.kind === 'only-in-a' && diff.a ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded bg-white/[0.06] px-2 py-0.5 text-slate-300">Cardinality: {diff.a.cardinality}</span>
                          <span className="rounded bg-white/[0.06] px-2 py-0.5 text-slate-300">Direction: {diff.a.direction}</span>
                          <span className="rounded bg-white/[0.06] px-2 py-0.5 text-slate-300">{diff.a.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                      ) : null}

                      {diff.kind === 'only-in-b' && diff.b ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          <span className="rounded bg-white/[0.06] px-2 py-0.5 text-slate-300">Cardinality: {diff.b.cardinality}</span>
                          <span className="rounded bg-white/[0.06] px-2 py-0.5 text-slate-300">Direction: {diff.b.direction}</span>
                          <span className="rounded bg-white/[0.06] px-2 py-0.5 text-slate-300">{diff.b.isActive ? 'Active' : 'Inactive'}</span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <p className="max-w-lg px-6 text-center text-sm text-slate-400">Choose both folders to compare their relationships.</p>
        </div>
      )}
      {showGuide ? <FeatureGuide onClose={() => setShowGuide(false)} /> : null}
    </div>
  );
}
