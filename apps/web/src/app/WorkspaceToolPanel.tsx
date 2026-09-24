import { ModelChecksPanel } from '../features/model-checks/ModelChecksPanel';
import { PathFinderPanel } from '../features/paths/PathFinderPanel';
import { RelationshipTable } from '../features/relationships/RelationshipTable';
import { FocusTablesPanel } from '../features/tables/FocusTablesPanel';
import { SearchTablesPanel } from '../features/tables/SearchTablesPanel';
import { TableInspector } from '../features/tables/TableInspector';
import type { ModelWorkspaceController } from './useModelWorkspace';

export function WorkspaceToolPanel({ controller }: { controller: ModelWorkspaceController }) {
  const {
    model, workspace, searchTerm, searchMatches, searchSelection,
    tableNames, focusedTables, inspectorTable, inspectedRelationships,
    sourceTable, targetTable, loadingPaths, pathsResponse, filteredRelationships,
    suggestions, loadingSuggestions,
  } = controller;

  if (!model) return null;

  switch (workspace.tool) {
    case 'search':
      return (
        <SearchTablesPanel
          searchTerm={searchTerm}
          searchMatches={searchMatches}
          selectedTable={searchSelection?.tableName}
          onSearch={controller.searchTables}
          onSelectTable={controller.selectSearchResult}
        />
      );
    case 'focus':
      return (
        <FocusTablesPanel
          tableNames={tableNames}
          focusedTables={focusedTables}
          onAddTable={controller.addFocusedTable}
          onRemoveTable={controller.removeFocusedTable}
          onClear={controller.clearFocusedTables}
        />
      );
    case 'inspect':
      return (
        <div className="space-y-4">
          <TableInspector model={model} selectedTable={inspectorTable} onSelectTable={controller.inspectTable} />
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
          onChangeTables={controller.updatePathTables}
          onFindPaths={controller.findPaths}
        />
      );
    case 'relationships':
      return (
        <div className="space-y-3">
          {focusedTables.length ? (
            <div className="flex items-start justify-between gap-2 text-xs text-slate-400">
              <span>Links touching your focused tables.</span>
              <button type="button" onClick={controller.clearFocusedTables} className="shrink-0 text-accent">Show all</button>
            </div>
          ) : null}
          <RelationshipTable relationships={filteredRelationships} />
        </div>
      );
    case 'checks':
      return <ModelChecksPanel suggestions={suggestions} loading={loadingSuggestions} onRunChecks={controller.runChecks} />;
    default:
      return null;
  }
}
