import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { initialWorkspaceState, workspaceReducer, workspaceTools } from './workspace';
import { CanvasWorkspace } from './CanvasWorkspace';
import { WorkspaceToolbar } from './WorkspaceChrome';
import { RelationshipTable } from '../relationships/RelationshipTable';
import { SearchTablesPanel } from '../tables/SearchTablesPanel';
import demo from '../../demo/model.json';
import { parseSemanticModelFiles } from '../../model/tmdl/tmdlCore';
import { ToolIcon } from '../../shared/ui/ToolIcon';

const model = parseSemanticModelFiles(demo.name, demo.files);
const noop = () => {};
const props: ComponentProps<typeof CanvasWorkspace> = {
  modelName: model.folderPath,
  metrics: model.metrics,
  workspace: initialWorkspaceState,
  hoverEnabled: true,
  onHome: noop,
  onSelectTool: noop,
  onCloseTool: noop,
  onClearView: noop,
  onToggleHover: noop,
  onGuide: noop,
  onCompare: noop,
  onZoomIn: noop,
  onZoomOut: noop,
  onFit: noop,
  panel: <div>Tool content</div>,
  children: <div>Graph content</div>,
};

describe('canvas-first workspace', () => {
  it('keeps a labeled Home button in the header for demo and local models', () => {
    for (const modelName of [model.folderPath, 'Local.SemanticModel']) {
      const html = renderToStaticMarkup(<CanvasWorkspace {...props} modelName={modelName} />);
      const header = html.slice(html.indexOf('<header'), html.indexOf('</header>'));
      expect(header).toContain('title="Return to home"');
      expect(header).toContain('<span>Home</span>');
      expect(header).toContain(renderToStaticMarkup(<ToolIcon name="home" />));
    }
  });

  it('starts with a clean canvas and all tools available in a slim toolbar', () => {
    const html = renderToStaticMarkup(<CanvasWorkspace {...props} />);
    expect(html).toContain('Graph content');
    expect(html).not.toContain('<aside');
    expect(html).not.toContain('Tool content');
    expect(html).not.toContain('shadow-glow');
    for (const tool of workspaceTools) expect(html).toContain(`aria-label="${tool.title}"`);
    expect(html).toContain('aria-label="Hover details"');
    expect(html).toContain('aria-label="Feature guide"');
    expect(html).toContain('aria-label="Compare two models"');
    expect(html).toContain('aria-label="Expand feature bar"');
    for (const tool of workspaceTools) expect(html).not.toContain(tool.description);
  });

  it.each([
    { expanded: false, hoverEnabled: false },
    { expanded: false, hoverEnabled: true },
    { expanded: true, hoverEnabled: false },
    { expanded: true, hoverEnabled: true },
  ])('renders expanded=$expanded and hoverEnabled=$hoverEnabled without changing tool selection', ({ expanded, hoverEnabled }) => {
    const html = renderToStaticMarkup(
      <WorkspaceToolbar
        expanded={expanded}
        onToggleExpanded={noop}
        selectedTool="search"
        hoverEnabled={hoverEnabled}
        toolButtons={{ current: {} }}
        onSelectTool={noop}
        onCompare={noop}
        onToggleHover={noop}
        onGuide={noop}
      />,
    );
    expect(html).toContain(`aria-label="${expanded ? 'Collapse' : 'Expand'} feature bar"`);
    expect(html).toContain(`aria-expanded="${expanded}" aria-controls="workspace-toolbar-tools"`);
    expect(html).toContain('id="workspace-toolbar-tools"');
    expect(html).toContain('aria-expanded="true" aria-controls="workspace-tool-panel"');
    expect(html).toContain(`role="switch" aria-checked="${hoverEnabled}"`);
    expect(html).toContain('aria-label="Compare two models"');
    const toggle = html.slice(html.indexOf('<button'), html.indexOf('</button>'));
    expect(toggle).not.toContain('<span');
    expect(toggle).toContain('h-9 w-9');
    for (const tool of workspaceTools) {
      expect(html).toContain(`aria-label="${tool.title}"`);
      expect(html).not.toContain(tool.description);
      expect(html.includes(`>${tool.title}</span>`)).toBe(expanded);
    }
    for (const label of ['Compare two models', 'Hover details', 'Feature guide']) {
      expect(html.includes(`>${label}</span>`)).toBe(expanded);
    }
    expect(html).toContain(`title="Hover details: ${hoverEnabled ? 'on' : 'off'}"`);
    expect(html).toContain(renderToStaticMarkup(<ToolIcon name={hoverEnabled ? 'hover' : 'hoverOff'} />));
    expect(html).not.toContain(renderToStaticMarkup(<ToolIcon name={hoverEnabled ? 'hoverOff' : 'hover'} />));
    expect(html.includes('inline-flex h-4 w-7')).toBe(expanded);
    if (expanded) expect(html).toContain(hoverEnabled ? 'translate-x-3' : 'translate-x-0');
  });

  it('docks exactly one tool beside the canvas, with a close control', () => {
    for (const tool of workspaceTools) {
      const workspace = workspaceReducer(initialWorkspaceState, { type: 'select', tool: tool.id });
      const html = renderToStaticMarkup(<CanvasWorkspace {...props} workspace={workspace} />);
      expect(html.match(/<aside\b/g)).toHaveLength(1);
      expect(html).toContain(`aria-label="Close ${tool.title}"`);
      expect(html).toContain('md:w-80');
      expect(html).toContain('md:flex-row');
      expect(html).toContain('Tool content');
      expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('<aside'));
    }
  });

  it('keeps the legend in the centered footer instead of the tool rail', () => {
    const html = renderToStaticMarkup(<CanvasWorkspace {...props} />);
    const footer = html.slice(html.indexOf('<footer'));
    expect(footer).toContain('aria-label="Map legend"');
    expect(footer).toContain('2xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]');
    expect(footer.match(/<li\b/g)).toHaveLength(5);
    expect(html).not.toContain('aria-label="Legend"');
  });

  it('identifies search results as locate actions and marks the selected table', () => {
    const html = renderToStaticMarkup(<SearchTablesPanel searchTerm="" searchMatches={['Sales', 'Store']} selectedTable="Sales" onSearch={noop} onSelectTable={noop} />);
    expect(html).toContain('title="Locate Sales on the map"');
    expect(html).toContain('title="Locate Store on the map"');
    expect(html.match(/aria-current="true"/g)).toHaveLength(1);
    expect(html).toContain('2 matching tables');
  });

  it('retains the highlighted view when closing and inspecting non-graph tools', () => {
    const paths = workspaceReducer(initialWorkspaceState, { type: 'select', tool: 'paths' });
    const closed = workspaceReducer(paths, { type: 'close' });
    expect(closed).toEqual({ tool: null, highlight: 'paths' });
    const checks = workspaceReducer(closed, { type: 'select', tool: 'checks' });
    expect(checks).toEqual({ tool: 'checks', highlight: 'paths' });
    expect(workspaceReducer(checks, { type: 'select', tool: 'checks' })).toEqual(closed);
  });

  it('switches graph modes without allowing two active panels', () => {
    const inspector = workspaceReducer(initialWorkspaceState, { type: 'select', tool: 'inspect' });
    const focus = workspaceReducer(inspector, { type: 'select', tool: 'focus' });
    expect(focus).toEqual({ tool: 'focus', highlight: 'focus' });
    expect(workspaceReducer(focus, { type: 'clear' })).toEqual({ tool: 'focus', highlight: null });
    expect(workspaceReducer(focus, { type: 'reset' })).toEqual(initialWorkspaceState);
    expect(workspaceReducer(focus, { type: 'highlight', mode: 'focus' })).toEqual(focus);
  });

  it('keeps relationship columns, direction, cardinality, and status in the docked list', () => {
    const delivery = model.relationships.find((rel) => rel.fromColumn === 'Delivery Date')!;
    const html = renderToStaticMarkup(<RelationshipTable relationships={[delivery]} selectedTable="Calendar" />);
    expect(html).toContain('Calendar');
    expect(html).toContain('[Date]');
    expect(html).toContain('Sales');
    expect(html).toContain('[Delivery Date]');
    expect(html).toContain('1:*');
    expect(html).toContain('Inactive');
    expect(html).toContain('Filters: Calendar → Sales');
    expect(html).not.toContain('<table');
    expect(html).not.toContain('absolute');
  });
});
