import { startTransition, useCallback, useDeferredValue, useMemo, useReducer, useRef, useState } from 'react';
import { fetchDemoModel, fetchModel, fetchPaths, fetchSuggestions } from '../model/worker/client';
import type { ModelSuggestion } from '../model/localModel';
import { ModelFolderPicker } from '../features/model-loading/ModelFolderPicker';
import { ModelGraph, type ModelGraphHandle } from '../features/canvas/ModelGraph';
import { EdgeDetailPopup } from '../features/relationships/EdgeDetailPopup';
import type { EdgeDetail } from '../features/relationships/types';
import { ModelChecksPanel } from '../features/model-checks/ModelChecksPanel';
import { TableDetailPopup } from '../features/tables/TableDetailPopup';
import { RelationshipTable } from '../features/relationships/RelationshipTable';
import { TableInspector } from '../features/tables/TableInspector';
import { SearchTablesPanel } from '../features/tables/SearchTablesPanel';
import { FocusTablesPanel } from '../features/tables/FocusTablesPanel';
import { PathFinderPanel } from '../features/paths/PathFinderPanel';
import { FeatureGuide } from '../features/help/FeatureGuide';
import { CanvasWorkspace } from '../features/workspace/CanvasWorkspace';
import { ToolIcon } from '../shared/ui/ToolIcon';
import { featureHelp } from '../features/help/featureHelp';
import { initialWorkspaceState, workspaceReducer, type WorkspaceTool } from '../features/workspace/workspace';
import type { PathResult, PathsResponse, SemanticModelResponse } from '../model/types';

const emptyPaths: PathResult[] = [];
const emptyTables: string[] = [];

interface ModelWorkspaceProps {
  onNavigateCompare: () => void;
}

function ModelWorkspace({ onNavigateCompare }: ModelWorkspaceProps) {
  const [model, setModel] = useState<SemanticModelResponse | null>(null);
  const [workspace, dispatch] = useReducer(workspaceReducer, initialWorkspaceState);
  const [pathsResponse, setPathsResponse] = useState<PathsResponse | null>(null);
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<EdgeDetail | null>(null);
  const [sourceTable, setSourceTable] = useState('');
  const [targetTable, setTargetTable] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [loadingPaths, setLoadingPaths] = useState(false);
  const [suggestions, setSuggestions] = useState<ModelSuggestion[] | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [focusedTables, setFocusedTables] = useState<string[]>([]);
  const [inspectorTable, setInspectorTable] = useState<string | null>(null);
  const [hoverEnabled, setHoverEnabled] = useState(true);
  const [showGuide, setShowGuide] = useState(false);
  const deferredSearch = useDeferredValue(searchTerm);
  const graphRef = useRef<ModelGraphHandle>(null);
  const pathRequest = useRef(0);

  const tableNames = useMemo(
    () => Object.keys(model?.tables ?? {}).sort((a, b) => a.localeCompare(b)),
    [model],
  );
  const selectedTable = selectedTableName ? model?.tables[selectedTableName] ?? null : null;
  const searchMatches = useMemo(() => tableNames.filter((name) =>
    name.toLowerCase().includes(deferredSearch.trim().toLowerCase())), [tableNames, deferredSearch]);
  const inspectedRelationships = useMemo(() => model?.relationships.filter(
    (rel) => rel.fromTable === inspectorTable || rel.toTable === inspectorTable,
  ) ?? [], [model, inspectorTable]);
  const inspectorTables = useMemo(() => inspectorTable ? Array.from(new Set([
    inspectorTable, ...inspectedRelationships.flatMap((rel) => [rel.fromTable, rel.toTable]),
  ])) : [], [inspectorTable, inspectedRelationships]);
  const filteredRelationships = useMemo(() => {
    if (!model) return [];
    if (focusedTables.length === 0) return model.relationships;
    const focusedSet = new Set(focusedTables);
    return model.relationships.filter((rel) => focusedSet.has(rel.fromTable) || focusedSet.has(rel.toTable));
  }, [model, focusedTables]);

  function clearView() {
    pathRequest.current += 1;
    setPathsResponse(null);
    setSourceTable('');
    setTargetTable('');
    setSearchTerm('');
    setFocusedTables([]);
    setInspectorTable(null);
    dispatch({ type: 'clear' });
  }

  async function handleLoadModel(files?: File[]) {
    setLoadingModel(true);
    setErrorMessage(null);
    try {
      const next = files ? await fetchModel(files) : await fetchDemoModel();
      startTransition(() => {
        setModel(next);
        clearView();
        setSelectedTableName(null);
        setSelectedEdge(null);
        setSuggestions(null);
        dispatch({ type: 'reset' });
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load the semantic model.');
    } finally {
      setLoadingModel(false);
    }
  }

  async function handleFindPaths() {
    if (!model || !sourceTable || !targetTable) return;
    const request = ++pathRequest.current;
    setLoadingPaths(true);
    setErrorMessage(null);
    try {
      const result = await fetchPaths(model, sourceTable, targetTable);
      if (request === pathRequest.current) startTransition(() => setPathsResponse(result));
    } catch (error) {
      if (request === pathRequest.current) {
        setErrorMessage(error instanceof Error ? error.message : 'Unable to compute paths.');
      }
    } finally {
      setLoadingPaths(false);
    }
  }

  function updatePathTables(source: string, target: string) {
    pathRequest.current += 1;
    setSourceTable(source);
    setTargetTable(target);
    setPathsResponse(null);
    dispatch({ type: 'highlight', mode: 'paths' });
  }

  const handleSelectTable = useCallback((name: string | null) => setSelectedTableName(name), []);
  const handleSelectEdge = useCallback((edge: EdgeDetail | null) => setSelectedEdge(edge), []);

  async function handleGetSuggestions() {
    if (!model) return;
    setLoadingSuggestions(true);
    setErrorMessage(null);
    try {
      const result = await fetchSuggestions(model);
      setSuggestions(result.suggestions);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to run model checks.');
    } finally {
      setLoadingSuggestions(false);
    }
  }

  function selectTool(tool: WorkspaceTool) {
    dispatch({ type: 'select', tool });
  }

  if (!model) {
    return (
      <div className="flex h-full overflow-y-auto bg-surface">
        <div className="m-auto w-full max-w-lg animate-fade-in space-y-5 px-6 py-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/10 text-accent">
            <ToolIcon name="relationships" />
          </div>
          <h1 className="font-display text-4xl font-bold text-white">Relationship Visualizer</h1>
          <p className="text-sm leading-relaxed text-slate-300">Explore your Power BI tables, connections, and formulas.</p>
          <p className="text-xs leading-relaxed text-slate-400">{featureHelp.load.description}</p>
          <ModelFolderPicker label={loadingModel ? 'Reading model...' : 'Choose model folder'} disabled={loadingModel} onSelect={handleLoadModel} />
          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs text-slate-500">or</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <button type="button" onClick={() => handleLoadModel()} disabled={loadingModel} className="w-full rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50">
            Explore demo model
          </button>
          <p className="text-xs text-slate-400">{featureHelp.demo.description}</p>
          {errorMessage ? <p role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-2 text-sm text-danger">{errorMessage}</p> : null}
          <div className="flex items-center justify-center gap-4">
            <button type="button" onClick={onNavigateCompare} className="text-sm text-slate-400 hover:text-accent">{featureHelp.compare.title}</button>
            <button type="button" onClick={() => setShowGuide(true)} className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-white hover:bg-panelHover">Feature guide</button>
          </div>
        </div>
        {showGuide ? <FeatureGuide onClose={() => setShowGuide(false)} /> : null}
      </div>
    );
  }

  const panel = (() => {
    switch (workspace.tool) {
      case 'search':
        return (
          <SearchTablesPanel
            searchTerm={searchTerm}
            searchMatches={searchMatches}
            onSearch={(term) => {
              setSearchTerm(term);
              dispatch({ type: 'highlight', mode: 'search' });
            }}
            onSelectTable={setSelectedTableName}
          />
        );
      case 'focus':
        return (
          <FocusTablesPanel
            tableNames={tableNames}
            focusedTables={focusedTables}
            onAddTable={(name) => {
              if (name) setFocusedTables((tables) => tables.includes(name) ? tables : [...tables, name]);
              dispatch({ type: 'highlight', mode: 'focus' });
            }}
            onRemoveTable={(name) => setFocusedTables((tables) => tables.filter((table) => table !== name))}
            onClear={() => setFocusedTables([])}
          />
        );
      case 'inspect':
        return (
          <div className="space-y-4">
            <TableInspector model={model} selectedTable={inspectorTable} onSelectTable={(name) => { setInspectorTable(name); dispatch({ type: 'highlight', mode: 'inspect' }); }} />
            {inspectorTable ? <RelationshipTable relationships={inspectedRelationships} selectedTable={inspectorTable} /> : null}
          </div>
        );
      case 'paths':
        return (
          <PathFinderPanel
            tableNames={tableNames}
            sourceTable={sourceTable}
            targetTable={targetTable}
            loadingPaths={loadingPaths}
            pathsResponse={pathsResponse}
            onChangeTables={updatePathTables}
            onFindPaths={handleFindPaths}
          />
        );
      case 'relationships':
        return (
          <div className="space-y-3">
            {focusedTables.length ? <div className="flex items-start justify-between gap-2 text-xs text-slate-400"><span>Links touching your focused tables.</span><button type="button" onClick={() => setFocusedTables([])} className="shrink-0 text-accent">Show all</button></div> : null}
            <RelationshipTable relationships={filteredRelationships} />
          </div>
        );
      case 'checks':
        return (
          <ModelChecksPanel suggestions={suggestions} loading={loadingSuggestions} onRunChecks={handleGetSuggestions} />
        );
      default:
        return null;
    }
  })();

  return (
    <div className="relative h-full w-full overflow-hidden">
      <CanvasWorkspace
        modelName={model.folderPath}
        metrics={model.metrics}
        workspace={workspace}
        hoverEnabled={hoverEnabled}
        onSelectTool={selectTool}
        onCloseTool={() => dispatch({ type: 'close' })}
        onClearView={clearView}
        onToggleHover={() => setHoverEnabled((enabled) => !enabled)}
        onGuide={() => setShowGuide(true)}
        onCompare={onNavigateCompare}
        onZoomIn={() => graphRef.current?.zoomIn()}
        onZoomOut={() => graphRef.current?.zoomOut()}
        onFit={() => graphRef.current?.fit()}
        panel={panel}
      >
        <ModelGraph
          ref={graphRef}
          model={model}
          allPaths={workspace.highlight === 'paths' ? pathsResponse?.paths ?? emptyPaths : emptyPaths}
          searchTerm={workspace.highlight === 'search' ? deferredSearch : ''}
          focusedTables={workspace.highlight === 'focus' ? focusedTables : emptyTables}
          inspectorTables={workspace.highlight === 'inspect' ? inspectorTables : emptyTables}
          hoverEnabled={hoverEnabled}
          onSelectTable={handleSelectTable}
          onSelectEdge={handleSelectEdge}
        />
        {errorMessage ? (
          <div role="alert" className="absolute inset-x-4 bottom-4 z-30 flex items-start justify-between gap-3 rounded-lg border border-danger/30 bg-panel px-4 py-3 text-xs text-danger">
            {errorMessage}
            <button type="button" aria-label="Dismiss error" onClick={() => setErrorMessage(null)}><ToolIcon name="close" /></button>
          </div>
        ) : null}
      </CanvasWorkspace>
      {selectedTable ? <TableDetailPopup table={selectedTable} onClose={() => setSelectedTableName(null)} /> : null}
      {selectedEdge ? <EdgeDetailPopup edge={selectedEdge} onClose={() => setSelectedEdge(null)} /> : null}
      {showGuide ? <FeatureGuide onClose={() => setShowGuide(false)} /> : null}
    </div>
  );
}

export default ModelWorkspace;
