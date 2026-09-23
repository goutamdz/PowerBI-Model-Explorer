import { useRef, type ReactNode } from 'react';
import type { MetricsSummary } from '../../model/types';
import { featureHelp } from '../help/featureHelp';
import { workspaceTools, type WorkspaceState, type WorkspaceTool } from './workspace';
import { ToolIcon } from '../../shared/ui/ToolIcon';
import { MapLegend } from '../canvas/MapLegend';

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

const iconButton = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-accent';

export function CanvasWorkspace(props: CanvasWorkspaceProps) {
  const activeTool = workspaceTools.find((tool) => tool.id === props.workspace.tool);
  const toolButtons = useRef<Partial<Record<WorkspaceTool, HTMLButtonElement>>>({});
  function closePanel() {
    props.onCloseTool();
    if (activeTool) toolButtons.current[activeTool.id]?.focus();
  }
  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-panel/60 px-3">
        <span className="hidden font-display text-sm font-semibold text-white sm:block">Relationship Visualizer</span>
        <span className="min-w-0 flex-1 truncate text-xs text-slate-400" title={props.modelName}>{props.modelName}</span>
        <button type="button" onClick={props.onClearView} title="Clear search, focus, and path highlights" className="flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-accent">
          <ToolIcon name="clear" /> <span className="hidden sm:inline">Clear view</span><span className="sr-only sm:hidden">Clear view</span>
        </button>
        <div className="flex border-l border-border pl-2">
          <button type="button" aria-label="Zoom out" title="Zoom out" onClick={props.onZoomOut} className={iconButton}><ToolIcon name="minus" /></button>
          <button type="button" aria-label="Zoom in" title="Zoom in" onClick={props.onZoomIn} className={iconButton}><ToolIcon name="plus" /></button>
          <button type="button" aria-label="Show whole map" title="Rearrange and show whole map" onClick={props.onFit} className={iconButton}><ToolIcon name="fit" /></button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav aria-label="Model tools" className="overlay-scroll z-20 flex w-12 shrink-0 flex-col items-center gap-1 overflow-y-auto border-r border-border bg-panel/60 py-2 sm:w-14">
          {workspaceTools.map((tool) => (
            <button
              key={tool.id}
              ref={(element) => { if (element) toolButtons.current[tool.id] = element; }}
              type="button"
              aria-label={tool.title}
              title={tool.title}
              aria-expanded={props.workspace.tool === tool.id}
              aria-controls={props.workspace.tool === tool.id ? 'workspace-tool-panel' : undefined}
              onClick={() => props.onSelectTool(tool.id)}
              className={`${iconButton} ${props.workspace.tool === tool.id ? 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/30' : ''}`}
            >
              <ToolIcon name={tool.id} />
            </button>
          ))}
          <div className="my-1 w-6 border-t border-border" />
          <button type="button" aria-label={featureHelp.compare.title} title={featureHelp.compare.title} onClick={props.onCompare} className={iconButton}><ToolIcon name="compare" /></button>
          <div className="min-h-3 flex-1" />
          <button type="button" aria-label="Hover details" title={`Hover details: ${props.hoverEnabled ? 'on' : 'off'}`} aria-pressed={props.hoverEnabled} onClick={props.onToggleHover} className={`${iconButton} ${props.hoverEnabled ? 'text-emerald-400' : ''}`}><ToolIcon name="hover" /></button>
          <button type="button" aria-label="Feature guide" title="Feature guide" onClick={props.onGuide} className={iconButton}><ToolIcon name="help" /></button>
        </nav>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col md:flex-row">
          <main aria-label="Relationship canvas" className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
            {props.children}
          </main>
          {activeTool ? (
            <aside id="workspace-tool-panel" aria-labelledby="workspace-tool-title" onKeyDown={(event) => { if (event.key === 'Escape') { event.stopPropagation(); closePanel(); } }} className="flex max-h-[45%] w-full shrink-0 flex-col border-t border-border bg-panel md:max-h-none md:w-80 md:border-l md:border-t-0">
              <header className="flex min-h-12 shrink-0 items-center gap-2 border-b border-border px-4">
                <span className="text-accent"><ToolIcon name={activeTool.id} /></span>
                <h2 id="workspace-tool-title" className="min-w-0 flex-1 text-sm font-semibold text-white">{activeTool.title}</h2>
                <button type="button" aria-label={`Close ${activeTool.title}`} title="Close panel" onClick={closePanel} className={iconButton}><ToolIcon name="close" /></button>
              </header>
              <div className="overlay-scroll min-h-0 flex-1 overflow-y-auto p-4">
                <p className="mb-4 text-xs leading-relaxed text-slate-400">{activeTool.description}</p>
                {props.panel}
              </div>
            </aside>
          ) : null}
        </div>
      </div>

      <footer className="grid shrink-0 grid-cols-1 items-center gap-x-4 border-t border-border bg-panel/60 px-3 text-[10px] text-slate-500 2xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <span className="hidden whitespace-nowrap 2xl:block">Drag to pan · Scroll to zoom · Click for details</span>
        <MapLegend />
        <div className="flex min-h-7 min-w-0 max-w-full items-center gap-3 justify-self-center overflow-x-auto whitespace-nowrap font-mono 2xl:justify-self-end">
          {props.workspace.highlight ? <span className="text-accent">{props.workspace.highlight} view</span> : null}
          <span>Tables <b className="font-medium text-slate-300">{props.metrics.totalTables}</b></span>
          <span>Relationships <b className="font-medium text-slate-300">{props.metrics.totalRelationships}</b></span>
          <span>Active <b className="font-medium text-emerald-400">{props.metrics.totalActiveRelationships}</b></span>
          <span>Inactive <b className="font-medium text-slate-300">{props.metrics.totalInactiveRelationships}</b></span>
          <span>Measures <b className="font-medium text-slate-300">{props.metrics.totalMeasures}</b></span>
        </div>
      </footer>
    </div>
  );
}
