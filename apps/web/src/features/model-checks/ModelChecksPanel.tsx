import type { ModelSuggestion } from '../../model/localModel';
import { SuggestionsPanel } from './SuggestionsPanel';

interface ModelChecksPanelProps {
  suggestions: ModelSuggestion[] | null;
  loading: boolean;
  onRunChecks: () => void;
}

export function ModelChecksPanel({ suggestions, loading, onRunChecks }: ModelChecksPanelProps) {
  let buttonLabel = 'Run model checks';
  if (suggestions) buttonLabel = 'Run checks again';
  if (loading) buttonLabel = 'Checking...';

  return (
    <div className="space-y-4">
      <button type="button" onClick={onRunChecks} disabled={loading} className="w-full rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accentMuted disabled:opacity-40">
        {buttonLabel}
      </button>
      {suggestions !== null || loading ? (
        <SuggestionsPanel suggestions={suggestions ?? []} loading={loading} />
      ) : (
        <p className="text-xs text-slate-500">Run local checks to see suggestions here.</p>
      )}
    </div>
  );
}
