import type { ModelSuggestion } from '../../model/localModel';

interface SuggestionsPanelProps {
  suggestions: ModelSuggestion[];
  loading: boolean;
}

const severityConfig = {
  critical: 'border-red-500/30 text-red-400',
  warning: 'border-amber-400/30 text-amber-400',
  info: 'border-blue-400/30 text-blue-400',
};

export function SuggestionsPanel({ suggestions, loading }: SuggestionsPanelProps) {
  return (
    <section aria-label="Model check results" className="space-y-3">
      {loading ? (
        <p role="status" className="py-6 text-center text-xs text-slate-400">Checking model...</p>
      ) : suggestions.length === 0 ? (
        <p className="py-4 text-xs leading-relaxed text-slate-400">No issues flagged. This does not guarantee model correctness.</p>
      ) : suggestions.map((suggestion) => (
        <article key={suggestion.title} className={`rounded-lg border bg-surface/60 p-3 ${severityConfig[suggestion.severity]}`}>
          <span className="text-[10px] uppercase tracking-wider">{suggestion.severity}</span>
          <h3 className="mt-1 text-xs font-semibold text-slate-200">{suggestion.title}</h3>
          <p className="mt-2 text-xs leading-relaxed text-slate-400">{suggestion.description}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {suggestion.tables.map((table) => <span key={table} className="break-all rounded bg-white/5 px-2 py-1 text-[10px] text-slate-400">{table}</span>)}
          </div>
        </article>
      ))}
      <p className="text-[11px] leading-relaxed text-slate-500">Local checks use fixed rules, not AI. Suggestions only.</p>
    </section>
  );
}
