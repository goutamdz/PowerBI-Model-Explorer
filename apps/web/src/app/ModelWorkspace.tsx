import { useState } from 'react';
import { ModelGraph } from '../features/canvas/ModelGraph';
import { EdgeDetailPopup } from '../features/relationships/EdgeDetailPopup';
import { TableDetailPopup } from '../features/tables/TableDetailPopup';
import { FeatureGuide } from '../features/help/FeatureGuide';
import { ModelWelcome } from '../features/model-loading/ModelWelcome';
import { CanvasWorkspace } from '../features/workspace/CanvasWorkspace';
import { ToolIcon } from '../shared/ui/ToolIcon';
import type { PathResult } from '../model/types';
import { useModelWorkspace } from './useModelWorkspace';
import { WorkspaceToolPanel } from './WorkspaceToolPanel';

const emptyPaths: PathResult[] = [];
const emptyTables: string[] = [];

interface ModelWorkspaceProps {
  onNavigateCompare: () => void;
}

function ModelWorkspace({ onNavigateCompare }: ModelWorkspaceProps) {
  const controller = useModelWorkspace();
  const [showGuide, setShowGuide] = useState(false);
  const {
    model, workspace, graphRef, selectedTable, selectedEdge, hoverEnabled,
    loadingModel, errorMessage, pathsResponse, deferredSearch, searchSelection,
    focusedTables, inspectorTables,
  } = controller;

  if (!model) {
    return (
      <div className="flex h-full overflow-y-auto bg-surface">
        <ModelWelcome
          loading={loadingModel}
          error={errorMessage}
          onLoad={controller.loadModel}
          onCompare={onNavigateCompare}
          onGuide={() => setShowGuide(true)}
        />
        {showGuide ? <FeatureGuide onClose={() => setShowGuide(false)} /> : null}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <CanvasWorkspace
        modelName={model.folderPath}
        metrics={model.metrics}
        workspace={workspace}
        hoverEnabled={hoverEnabled}
        onSelectTool={controller.selectTool}
        onCloseTool={controller.closeTool}
        onClearView={controller.clearView}
        onToggleHover={controller.toggleHover}
        onGuide={() => setShowGuide(true)}
        onCompare={onNavigateCompare}
        onZoomIn={() => graphRef.current?.zoomIn()}
        onZoomOut={() => graphRef.current?.zoomOut()}
        onFit={() => graphRef.current?.fit()}
        panel={<WorkspaceToolPanel controller={controller} />}
      >
        <ModelGraph
          ref={graphRef}
          model={model}
          allPaths={workspace.highlight === 'paths' ? pathsResponse?.paths ?? emptyPaths : emptyPaths}
          searchTerm={workspace.highlight === 'search' ? deferredSearch : ''}
          searchSelection={workspace.highlight === 'search' ? searchSelection : null}
          focusedTables={workspace.highlight === 'focus' ? focusedTables : emptyTables}
          inspectorTables={workspace.highlight === 'inspect' ? inspectorTables : emptyTables}
          hoverEnabled={hoverEnabled}
          onSelectTable={controller.selectTable}
          onSelectEdge={controller.selectEdge}
        />
        {errorMessage ? (
          <div role="alert" className="absolute inset-x-4 bottom-4 z-30 flex items-start justify-between gap-3 rounded-lg border border-danger/30 bg-panel px-4 py-3 text-xs text-danger">
            {errorMessage}
            <button type="button" aria-label="Dismiss error" onClick={controller.dismissError}><ToolIcon name="close" /></button>
          </div>
        ) : null}
      </CanvasWorkspace>
      {selectedTable ? <TableDetailPopup table={selectedTable} onClose={() => controller.selectTable(null)} /> : null}
      {selectedEdge ? <EdgeDetailPopup edge={selectedEdge} onClose={() => controller.selectEdge(null)} /> : null}
      {showGuide ? <FeatureGuide onClose={() => setShowGuide(false)} /> : null}
    </div>
  );
}

export default ModelWorkspace;
