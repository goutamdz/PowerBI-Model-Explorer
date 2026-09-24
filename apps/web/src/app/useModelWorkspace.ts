import { startTransition, useCallback, useDeferredValue, useMemo, useReducer, useRef, useState } from 'react';
import { fetchDemoModel, fetchModel, fetchPaths, fetchSuggestions } from '../model/worker/client';
import type { ModelSuggestion } from '../model/localModel';
import type { ModelGraphHandle } from '../features/canvas/ModelGraph';
import type { EdgeDetail } from '../features/relationships/types';
import { initialWorkspaceState, workspaceReducer, type WorkspaceTool } from '../features/workspace/workspace';
import type { PathsResponse, SemanticModelResponse } from '../model/types';

export function useModelWorkspace() {
  const [model, setModel] = useState<SemanticModelResponse | null>(null);
  const [workspace, dispatch] = useReducer(workspaceReducer, initialWorkspaceState);
  const [pathsResponse, setPathsResponse] = useState<PathsResponse | null>(null);
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<EdgeDetail | null>(null);
  const [sourceTable, setSourceTable] = useState('');
  const [targetTable, setTargetTable] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchSelection, setSearchSelection] = useState<{ tableName: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadingModel, setLoadingModel] = useState(false);
  const [loadingPaths, setLoadingPaths] = useState(false);
  const [suggestions, setSuggestions] = useState<ModelSuggestion[] | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [focusedTables, setFocusedTables] = useState<string[]>([]);
  const [inspectorTable, setInspectorTable] = useState<string | null>(null);
  const [hoverEnabled, setHoverEnabled] = useState(true);
  const deferredSearch = useDeferredValue(searchTerm);
  const graphRef = useRef<ModelGraphHandle>(null);
  const pathRequest = useRef(0);

  const tableNames = useMemo(
    () => Object.keys(model?.tables ?? {}).sort((a, b) => a.localeCompare(b)),
    [model],
  );
  const selectedTable = selectedTableName ? model?.tables[selectedTableName] ?? null : null;
  const searchMatches = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    return tableNames.filter((name) => name.toLowerCase().includes(query));
  }, [tableNames, deferredSearch]);
  const inspectedRelationships = useMemo(() => model?.relationships.filter(
    (relationship) => relationship.fromTable === inspectorTable || relationship.toTable === inspectorTable,
  ) ?? [], [model, inspectorTable]);
  const inspectorTables = useMemo(() => {
    if (!inspectorTable) return [];
    const neighbors = inspectedRelationships.flatMap((relationship) => [
      relationship.fromTable, relationship.toTable,
    ]);
    return Array.from(new Set([inspectorTable, ...neighbors]));
  }, [inspectorTable, inspectedRelationships]);
  const filteredRelationships = useMemo(() => {
    if (!model) return [];
    if (focusedTables.length === 0) return model.relationships;
    const focusedSet = new Set(focusedTables);
    return model.relationships.filter((relationship) =>
      focusedSet.has(relationship.fromTable) || focusedSet.has(relationship.toTable));
  }, [model, focusedTables]);

  function clearView() {
    // Ignore an in-flight path result once its selection has been cleared.
    pathRequest.current += 1;
    setPathsResponse(null);
    setSourceTable('');
    setTargetTable('');
    setSearchTerm('');
    setSearchSelection(null);
    setFocusedTables([]);
    setInspectorTable(null);
    dispatch({ type: 'clear' });
  }

  async function loadModel(files?: File[]) {
    setLoadingModel(true);
    setErrorMessage(null);
    try {
      // The worker reads selected files locally; model contents are never uploaded.
      const nextModel = files ? await fetchModel(files) : await fetchDemoModel();
      startTransition(() => {
        setModel(nextModel);
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

  async function findPaths() {
    if (!model || !sourceTable || !targetTable) return;
    const request = ++pathRequest.current;
    setLoadingPaths(true);
    setErrorMessage(null);
    try {
      const result = await fetchPaths(model, sourceTable, targetTable);
      // A previous query must not replace paths for a newer table selection.
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

  const selectTable = useCallback((name: string | null) => setSelectedTableName(name), []);
  const selectEdge = useCallback((edge: EdgeDetail | null) => setSelectedEdge(edge), []);

  async function runChecks() {
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
    // Closing or switching panels must not discard the user's tool selections.
    dispatch({ type: 'select', tool });
  }

  function searchTables(term: string) {
    setSearchTerm(term);
    setSearchSelection(null);
    dispatch({ type: 'highlight', mode: 'search' });
  }

  function selectSearchResult(tableName: string) {
    // A fresh object lets the canvas locate even an already-selected result again.
    setSearchSelection({ tableName });
    dispatch({ type: 'highlight', mode: 'search' });
  }

  function addFocusedTable(name: string) {
    if (name) setFocusedTables((tables) => tables.includes(name) ? tables : [...tables, name]);
    dispatch({ type: 'highlight', mode: 'focus' });
  }

  function removeFocusedTable(name: string) {
    setFocusedTables((tables) => tables.filter((table) => table !== name));
  }

  function inspectTable(name: string | null) {
    setInspectorTable(name);
    dispatch({ type: 'highlight', mode: 'inspect' });
  }

  return {
    model, workspace, graphRef, tableNames, selectedTable, selectedEdge,
    searchTerm, deferredSearch, searchSelection, searchMatches,
    focusedTables, inspectorTable, inspectorTables, inspectedRelationships, filteredRelationships,
    sourceTable, targetTable, pathsResponse, loadingPaths,
    suggestions, loadingSuggestions, loadingModel, errorMessage, hoverEnabled,
    loadModel, clearView, selectTool, searchTables, selectSearchResult,
    addFocusedTable, removeFocusedTable, inspectTable, updatePathTables, findPaths,
    runChecks, selectTable, selectEdge,
    clearFocusedTables: () => setFocusedTables([]),
    closeTool: () => dispatch({ type: 'close' }),
    dismissError: () => setErrorMessage(null),
    toggleHover: () => setHoverEnabled((enabled) => !enabled),
  };
}

export type ModelWorkspaceController = ReturnType<typeof useModelWorkspace>;
