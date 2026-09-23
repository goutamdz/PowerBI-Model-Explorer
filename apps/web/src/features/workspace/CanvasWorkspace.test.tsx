import type { ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { initialWorkspaceState, workspaceReducer, workspaceTools } from './workspace';
import { CanvasWorkspace } from './CanvasWorkspace';
import { RelationshipTable } from '../relationships/RelationshipTable';
import demo from '../../demo/model.json';
import { parseSemanticModelFiles } from '../../model/tmdl/tmdlCore';

const model = parseSemanticModelFiles(demo.name, demo.files);
const noop = () => {};
const props: ComponentProps<typeof CanvasWorkspace> = {
  modelName: model.folderPath,
  metrics: model.metrics,
  workspace: initialWorkspaceState,
  hoverEnabled: true,
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
  it('starts with a clean canvas and all tools available in a slim toolbar', () => {
    const html = renderToStaticMarkup(<CanvasWorkspace {...props} />);
    expect(html).toContain('Graph content');
    expect(html).not.toContain('<aside');
    expect(html).not.toContain('Tool content');
    expect(html).not.toContain('shadow-glow');
    for (const tool of workspaceTools) expect(html).toContain(`aria-label="${tool.title}"`);
    expect(html).toContain('aria-label="Hover details"');
    expect(html).toContain('aria-label="Feature guide"');
    expect(html).toContain('aria-label="Compare model relationships"');
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
