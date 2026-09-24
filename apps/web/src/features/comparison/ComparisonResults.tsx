import type { CompareResponse, DiffKind } from '../../model/types';

export type ComparisonFilter = DiffKind | 'all';

const differenceLabels: Record<DiffKind, string> = {
  'only-in-a': 'Only in Model A',
  'only-in-b': 'Only in Model B',
  different: 'Changed settings',
};

const differenceColors: Record<DiffKind, string> = {
  'only-in-a': 'text-amber-400 bg-amber-400/15',
  'only-in-b': 'text-cyan-400 bg-cyan-400/15',
  different: 'text-red-400 bg-red-400/15',
};

interface ComparisonResultsProps {
  result: CompareResponse;
  filter: ComparisonFilter;
  onFilter: (filter: ComparisonFilter) => void;
}

export function ComparisonResults({ result, filter, onFilter }: ComparisonResultsProps) {
  const filteredDiffs = result.diffs.filter((difference) => filter === 'all' || difference.kind === filter);
  const countKind = (kind: DiffKind) => result.diffs.filter((difference) => difference.kind === kind).length;
  const filters = [
    { key: 'all', label: 'All changes', count: result.totalDiffs },
    { key: 'only-in-a', label: 'Only in A', count: countKind('only-in-a') },
    { key: 'only-in-b', label: 'Only in B', count: countKind('only-in-b') },
    { key: 'different', label: 'Changed settings', count: countKind('different') },
  ] as const;

  return (
    <div className="flex-1 overflow-y-auto px-6 py-5">
      <div className="mx-auto max-w-4xl space-y-4">
        <ComparisonSummary result={result} />
        {result.totalDiffs === 0 ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-8 text-center">
            <p className="text-lg font-semibold text-emerald-400">No relationship differences found</p>
            <p className="mt-1 text-sm text-slate-400">Relationship settings match. Other model content may differ.</p>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-400">Only in A = removed. Only in B = added. Changed values show A then B.</p>
            <div className="flex gap-2">
              {filters.map(({ key, label, count }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => onFilter(key)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${filter === key ? 'bg-accent text-white' : 'border border-slate-600/40 text-slate-400 hover:bg-panelHover hover:text-white'}`}
                >
                  {label} <span className="ml-1 font-mono opacity-70">({count})</span>
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {filteredDiffs.map((difference) => <RelationshipDifference key={difference.key} difference={difference} />)}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ComparisonSummary({ result }: { result: CompareResponse }) {
  return (
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
  );
}

function RelationshipDifference({ difference }: { difference: CompareResponse['diffs'][number] }) {
  const relationship = difference.kind === 'only-in-a' ? difference.a
    : difference.kind === 'only-in-b' ? difference.b : null;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-panel px-5 py-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-sm text-white">{difference.key}</p>
        <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-semibold ${differenceColors[difference.kind]}`}>
          {differenceLabels[difference.kind]}
        </span>
      </div>
      {difference.kind === 'different' && difference.differences ? (
        <div className="mt-3 space-y-1.5">
          {difference.differences.map((description) => {
            const [label, values] = description.split(': ');
            const [valueA, valueB] = (values ?? '').split(' vs ');
            return (
              <div key={description} className="flex items-center gap-3 text-xs">
                <span className="w-20 font-mono text-[10px] uppercase tracking-wider text-slate-500">{label}</span>
                <span className="rounded bg-amber-400/15 px-2 py-0.5 font-mono text-amber-300">{valueA}</span>
                <span className="text-slate-600">→</span>
                <span className="rounded bg-cyan-400/15 px-2 py-0.5 font-mono text-cyan-300">{valueB}</span>
              </div>
            );
          })}
        </div>
      ) : null}
      {relationship ? (
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-white/[0.06] px-2 py-0.5 text-slate-300">Cardinality: {relationship.cardinality}</span>
          <span className="rounded bg-white/[0.06] px-2 py-0.5 text-slate-300">Direction: {relationship.direction}</span>
          <span className="rounded bg-white/[0.06] px-2 py-0.5 text-slate-300">{relationship.isActive ? 'Active' : 'Inactive'}</span>
        </div>
      ) : null}
    </div>
  );
}
