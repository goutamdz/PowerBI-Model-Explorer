import type { ComponentProps, RefObject } from 'react';
import type { MetricsSummary } from '../../model/types';
import { ToolIcon } from '../../shared/ui/ToolIcon';
import { MapLegend } from '../canvas/MapLegend';
import { featureHelp } from '../help/featureHelp';
import { workspaceTools, type WorkspaceState, type WorkspaceTool } from './workspace';

export const workspaceIconButton = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-accent';

interface WorkspaceHeaderProps {
  modelName: string;
  onHome: () => void;
  onClearView: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export function WorkspaceHeader({ modelName, onHome, onClearView, onZoomIn, onZoomOut, onFit }: WorkspaceHeaderProps) {
  return (
    <header className="flex h-12 shrink-0 items-center gap-3 border-b border-border bg-panel/60 px-3">
      <button type="button" onClick={onHome} title="Return to home" className="flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-accent">
        <ToolIcon name="home" /> <span>Home</span>
      </button>
      <span className="hidden font-display text-sm font-semibold text-white sm:block">Relationship Visualizer</span>
      <span className="min-w-0 flex-1 truncate text-xs text-slate-400" title={modelName}>{modelName}</span>
      <button type="button" onClick={onClearView} title="Clear search, focus, and path highlights" className="flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-accent">
        <ToolIcon name="clear" /> <span className="hidden sm:inline">Clear view</span><span className="sr-only sm:hidden">Clear view</span>
      </button>
      <div className="flex border-l border-border pl-2">
        <button type="button" aria-label="Zoom out" title="Zoom out" onClick={onZoomOut} className={workspaceIconButton}>
          <ToolIcon name="minus" />
        </button>
        <button type="button" aria-label="Zoom in" title="Zoom in" onClick={onZoomIn} className={workspaceIconButton}>
          <ToolIcon name="plus" />
        </button>
        <button type="button" aria-label="Show whole map" title="Rearrange and show whole map" onClick={onFit} className={workspaceIconButton}>
          <ToolIcon name="fit" />
        </button>
      </div>
    </header>
  );
}

interface WorkspaceToolbarProps {
  expanded: boolean;
  onToggleExpanded: () => void;
  selectedTool: WorkspaceTool | null;
  hoverEnabled: boolean;
  toolButtons: RefObject<Partial<Record<WorkspaceTool, HTMLButtonElement>>>;
  onSelectTool: (tool: WorkspaceTool) => void;
  onCompare: () => void;
  onToggleHover: () => void;
  onGuide: () => void;
}

export function WorkspaceToolbar({
  expanded, onToggleExpanded, selectedTool, hoverEnabled, toolButtons, onSelectTool, onCompare, onToggleHover, onGuide,
}: WorkspaceToolbarProps) {
  return (
    <nav aria-label="Model tools" className={`z-20 flex min-h-0 shrink-0 flex-col items-center gap-1 border-r border-border bg-panel/60 px-1 py-2 ${expanded ? 'w-56 max-w-[45vw] sm:max-w-none' : 'w-12 sm:w-14'}`}>
      <button
        type="button"
        aria-label={expanded ? 'Collapse feature bar' : 'Expand feature bar'}
        title={expanded ? 'Collapse feature bar' : 'Expand feature bar'}
        aria-expanded={expanded}
        aria-controls="workspace-toolbar-tools"
        onClick={onToggleExpanded}
        className={`${workspaceIconButton} ${expanded ? 'self-start' : ''}`}
      >
        <ToolIcon name={expanded ? 'collapse' : 'expand'} />
      </button>
      <div id="workspace-toolbar-tools" className="overlay-scroll flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto">
        {workspaceTools.map((tool) => {
          const isSelected = selectedTool === tool.id;
          return (
            <ToolbarButton
              key={tool.id}
              ref={(element) => {
                if (element) toolButtons.current[tool.id] = element;
              }}
              icon={tool.id}
              label={tool.title}
              expanded={expanded}
              aria-expanded={isSelected}
              aria-controls={isSelected ? 'workspace-tool-panel' : undefined}
              onClick={() => onSelectTool(tool.id)}
              className={isSelected ? 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/30' : ''}
            />
          );
        })}
        <div className="my-1 w-6 border-t border-border" />
        <ToolbarButton
          icon="compare"
          label={featureHelp.compare.title}
          expanded={expanded}
          onClick={onCompare}
        />
        <div className="min-h-3 flex-1" />
        <ToolbarButton
          icon={hoverEnabled ? 'hover' : 'hoverOff'}
          label="Hover details"
          expanded={expanded}
          title={`Hover details: ${hoverEnabled ? 'on' : 'off'}`}
          role="switch"
          aria-checked={hoverEnabled}
          onClick={onToggleHover}
          className={hoverEnabled ? 'text-emerald-400' : ''}
        >
          <span aria-hidden="true" className={`inline-flex h-4 w-7 shrink-0 items-center rounded-full p-0.5 ${hoverEnabled ? 'bg-emerald-500' : 'bg-slate-600'}`}>
            <span className={`h-3 w-3 rounded-full bg-white transition-transform motion-reduce:transition-none ${hoverEnabled ? 'translate-x-3' : 'translate-x-0'}`} />
          </span>
        </ToolbarButton>
        <ToolbarButton
          icon="help"
          label="Feature guide"
          expanded={expanded}
          onClick={onGuide}
        />
      </div>
    </nav>
  );
}

interface ToolbarButtonProps extends ComponentProps<'button'> {
  icon: ComponentProps<typeof ToolIcon>['name'];
  label: string;
  expanded: boolean;
}

function ToolbarButton({ icon, label, expanded, children, className = '', title, ...buttonProps }: ToolbarButtonProps) {
  const size = expanded ? 'h-9 w-full gap-3 px-2 text-left' : 'h-9 w-9 justify-center';

  return (
    <button {...buttonProps} type="button" aria-label={label} title={title ?? label} className={`flex shrink-0 items-center rounded-md text-slate-400 transition hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-accent ${size} ${className}`}>
      <ToolIcon name={icon} />
      {expanded ? <span className="min-w-0 flex-1 truncate text-sm">{label}</span> : null}
      {expanded ? children : null}
    </button>
  );
}

export function WorkspaceStatus({ metrics, highlight }: { metrics: MetricsSummary; highlight: WorkspaceState['highlight'] }) {
  return (
    <footer className="grid shrink-0 grid-cols-1 items-center gap-x-4 border-t border-border bg-panel/60 px-3 text-[10px] text-slate-500 2xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
      <span className="hidden whitespace-nowrap 2xl:block">Drag to pan · Scroll to zoom · Click for details</span>
      <MapLegend />
      <div className="flex min-h-7 min-w-0 max-w-full items-center gap-3 justify-self-center overflow-x-auto whitespace-nowrap font-mono 2xl:justify-self-end">
        {highlight ? <span className="text-accent">{highlight} view</span> : null}
        <span>Tables <b className="font-medium text-slate-300">{metrics.totalTables}</b></span>
        <span>Relationships <b className="font-medium text-slate-300">{metrics.totalRelationships}</b></span>
        <span>Active <b className="font-medium text-emerald-400">{metrics.totalActiveRelationships}</b></span>
        <span>Inactive <b className="font-medium text-slate-300">{metrics.totalInactiveRelationships}</b></span>
        <span>Measures <b className="font-medium text-slate-300">{metrics.totalMeasures}</b></span>
      </div>
    </footer>
  );
}
