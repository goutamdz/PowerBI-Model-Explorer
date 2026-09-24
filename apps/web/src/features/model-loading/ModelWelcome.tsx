import { ModelFolderPicker } from './ModelFolderPicker';
import { featureHelp } from '../help/featureHelp';
import { ToolIcon } from '../../shared/ui/ToolIcon';

interface ModelWelcomeProps {
  loading: boolean;
  error: string | null;
  onLoad: (files?: File[]) => void;
  onCompare: () => void;
  onGuide: () => void;
}

export function ModelWelcome({ loading, error, onLoad, onCompare, onGuide }: ModelWelcomeProps) {
  return (
    <div className="m-auto w-full max-w-lg animate-fade-in space-y-5 px-6 py-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <ToolIcon name="relationships" />
      </div>
      <h1 className="font-display text-4xl font-bold text-white">Power BI Semantic Model Explorer</h1>
      <p className="text-sm leading-relaxed text-slate-300">Explore your Power BI tables, connections, and formulas.</p>
      <p className="text-xs leading-relaxed text-slate-400">
        <strong className="font-semibold text-emerald-300">Everything runs locally.</strong>{' '}
        {featureHelp.load.description}
      </p>
      <ModelFolderPicker label={loading ? 'Reading model...' : 'Choose model folder'} disabled={loading} onSelect={onLoad} />
      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-slate-500">or</span>
        <span className="h-px flex-1 bg-border" />
      </div>
      <button type="button" onClick={() => onLoad()} disabled={loading} className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50">
        Explore demo model
      </button>
      <p className="text-xs text-slate-400">{featureHelp.demo.description}</p>
      {error ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">{error}</p> : null}
      <div className="flex items-center justify-center gap-4">
        <button type="button" onClick={onCompare} className="text-sm text-slate-400 hover:text-accent">{featureHelp.compare.title}</button>
        <button type="button" onClick={onGuide} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-white hover:bg-panelHover">Feature guide</button>
      </div>
    </div>
  );
}
