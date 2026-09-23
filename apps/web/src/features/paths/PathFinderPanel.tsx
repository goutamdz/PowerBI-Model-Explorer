import type { PathsResponse } from '../../model/types';
import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { ToolIcon } from '../../shared/ui/ToolIcon';

interface PathFinderPanelProps {
  tableNames: string[];
  sourceTable: string;
  targetTable: string;
  loadingPaths: boolean;
  pathsResponse: PathsResponse | null;
  onChangeTables: (source: string, target: string) => void;
  onFindPaths: () => void;
}

export function PathFinderPanel({ tableNames, sourceTable, targetTable, loadingPaths, pathsResponse, onChangeTables, onFindPaths }: PathFinderPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
        <div className="min-w-0 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-slate-300">Starting table</label>
            <SearchableSelect value={sourceTable} options={tableNames} placeholder="Choose starting table..." onChange={(name) => onChangeTables(name, targetTable)} />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-300">Destination table</label>
            <SearchableSelect value={targetTable} options={tableNames} placeholder="Choose destination table..." onChange={(name) => onChangeTables(sourceTable, name)} />
          </div>
        </div>
        <button type="button" aria-label="Swap starting and destination tables" title="Swap tables" disabled={!sourceTable && !targetTable} onClick={() => onChangeTables(targetTable, sourceTable)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:text-white disabled:opacity-30"><ToolIcon name="swap" /></button>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onFindPaths} disabled={loadingPaths || !sourceTable || !targetTable} className="flex-1 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white hover:bg-accentMuted disabled:opacity-40">{loadingPaths ? 'Tracing...' : 'Trace paths'}</button>
        {pathsResponse ? <button type="button" onClick={() => onChangeTables('', '')} className="rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-white/5">Clear</button> : null}
      </div>
      {pathsResponse ? (
        <div role="status" className="space-y-2 text-xs text-slate-400">
          <p>{pathsResponse.totalPaths ? `${pathsResponse.totalPaths} path${pathsResponse.totalPaths === 1 ? '' : 's'} highlighted` : 'No route in this direction. Try swapping the tables.'}</p>
          {pathsResponse.ambiguous ? <p className="text-amber-400">Multiple routes found. Review active and inactive links.</p> : null}
        </div>
      ) : null}
    </div>
  );
}
