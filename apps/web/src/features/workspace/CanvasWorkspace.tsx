import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import type { MetricsSummary } from '../../model/types';
import { workspaceTools, type WorkspaceState, type WorkspaceTool } from './workspace';
import { ToolIcon } from '../../shared/ui/ToolIcon';
import { WorkspaceHeader, WorkspaceStatus, WorkspaceToolbar, workspaceIconButton } from './WorkspaceChrome';

interface CanvasWorkspaceProps {
  modelName: string;
  metrics: MetricsSummary;
  workspace: WorkspaceState;
  hoverEnabled: boolean;
  onSelectTool: (tool: WorkspaceTool) => void;
  onCloseTool: () => void;
  onClearView: () => void;
  onToggleHover: () => void;
  onGuide: () => void;
  onCompare: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  panel: ReactNode;
  children: ReactNode;
}

export function CanvasWorkspace(props: CanvasWorkspaceProps) {
  const activeTool = workspaceTools.find((tool) => tool.id === props.workspace.tool);
  const toolButtons = useRef<Partial<Record<WorkspaceTool, HTMLButtonElement>>>({});
  const [toolbarExpanded, setToolbarExpanded] = useState(false);

  function closePanel() {
    props.onCloseTool();
    // Return keyboard users to the tool that opened the dismissed panel.
    if (activeTool) toolButtons.current[activeTool.id]?.focus();
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <WorkspaceHeader
        modelName={props.modelName}
        onClearView={props.onClearView}
        onZoomIn={props.onZoomIn}
        onZoomOut={props.onZoomOut}
        onFit={props.onFit}
      />
      <div className="flex min-h-0 flex-1">
        <WorkspaceToolbar
          expanded={toolbarExpanded}
          onToggleExpanded={() => setToolbarExpanded((expanded) => !expanded)}
          selectedTool={props.workspace.tool}
          hoverEnabled={props.hoverEnabled}
          toolButtons={toolButtons}
          onSelectTool={props.onSelectTool}
          onCompare={props.onCompare}
          onToggleHover={props.onToggleHover}
          onGuide={props.onGuide}
        />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
          <main aria-label="Relationship canvas" className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
            {props.children}
          </main>
          {activeTool ? <ToolPanel tool={activeTool} onClose={closePanel}>{props.panel}</ToolPanel> : null}
        </div>
      </div>
      <WorkspaceStatus metrics={props.metrics} highlight={props.workspace.highlight} />
    </div>
  );
}

interface ToolPanelProps {
  tool: (typeof workspaceTools)[number];
  onClose: () => void;
  children: ReactNode;
}

function ToolPanel({ tool, onClose, children }: ToolPanelProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    onClose();
  }

  return (
    <aside id="workspace-tool-panel" aria-labelledby="workspace-tool-title" onKeyDown={handleKeyDown} className="flex max-h-[45%] w-full shrink-0 flex-col border-t border-border bg-panel md:max-h-none md:w-80 md:border-l md:border-t-0">
      <header className="flex min-h-12 shrink-0 items-center gap-2 border-b border-border px-4">
        <span className="text-accent"><ToolIcon name={tool.id} /></span>
        <h2 id="workspace-tool-title" className="min-w-0 flex-1 text-sm font-semibold text-white">{tool.title}</h2>
        <button type="button" aria-label={`Close ${tool.title}`} title="Close panel" onClick={onClose} className={workspaceIconButton}>
          <ToolIcon name="close" />
        </button>
      </header>
      <div className="overlay-scroll min-h-0 flex-1 overflow-y-auto p-4">
        <p className="mb-4 text-xs leading-relaxed text-slate-400">{tool.description}</p>
        {children}
      </div>
    </aside>
  );
}
