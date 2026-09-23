import cytoscape, { type Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bindGraphInteractions, getEdgeDetail } from './graphInteractions';

let cy: Core;
let interactions: ReturnType<typeof bindGraphInteractions>;
let hoverEnabled: boolean;
let handlers = { onSelectTable: vi.fn(), onSelectEdge: vi.fn() };
const onHover = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => setTimeout(() => callback(16), 16));
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
  cy = cytoscape({
    headless: true,
    elements: [
      { data: { id: 'Calendar' } },
      { data: { id: 'Sales' } },
      { data: { id: 'link', source: 'Calendar', target: 'Sales', fromColumn: 'Date', toColumn: 'Delivery Date', cardinality: '1:*', direction: 'single', active: 'false' } },
    ],
  });
  hoverEnabled = true;
  handlers = { onSelectTable: vi.fn(), onSelectEdge: vi.fn() };
  interactions = bindGraphInteractions(cy, { getSelectionHandlers: () => handlers, isHoverEnabled: () => hoverEnabled, onHover });
});

afterEach(() => {
  interactions.dispose();
  cy.destroy();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('graph interactions', () => {
  it('shares the same correctly oriented details for hover and click', () => {
    const edge = cy.edges()[0];
    edge.emit('mouseover');
    edge.emit('tap');
    expect(handlers.onSelectEdge).toHaveBeenCalledWith(getEdgeDetail(edge));
    expect(onHover).toHaveBeenCalledWith({ detail: getEdgeDetail(edge), x: 0, y: 0 });
    expect(getEdgeDetail(edge)).toMatchObject({ source: 'Calendar', target: 'Sales', fromColumn: 'Date', toColumn: 'Delivery Date', cardinality: '1:*', active: 'false' });
  });

  it('uses updated selection callbacks without rebinding or rebuilding the graph', () => {
    const oldHandler = handlers.onSelectTable;
    handlers = { onSelectTable: vi.fn(), onSelectEdge: vi.fn() };
    cy.nodes()[0].emit('tap');
    expect(oldHandler).not.toHaveBeenCalled();
    expect(handlers.onSelectTable).toHaveBeenCalledWith('Calendar');
    cy.emit('tap');
    expect(handlers.onSelectTable).toHaveBeenLastCalledWith(null);
    expect(handlers.onSelectEdge).toHaveBeenLastCalledWith(null);
  });

  it('batches pointer movement into one hover update per animation frame', () => {
    const edge = cy.edges()[0];
    edge.emit('mouseover');
    edge.emit('mousemove');
    edge.emit('mousemove');
    edge.emit('mousemove');
    expect(onHover).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(16);
    expect(onHover).toHaveBeenCalledTimes(2);
  });

  it('cancels queued hover updates when cleared, disabled, or disposed', () => {
    const edge = cy.edges()[0];
    edge.emit('mouseover');
    edge.emit('mousemove');
    interactions.clearHover();
    vi.advanceTimersByTime(16);
    expect(onHover).toHaveBeenLastCalledWith(null);
    hoverEnabled = false;
    onHover.mockClear();
    edge.emit('mouseover');
    expect(onHover).not.toHaveBeenCalled();
    hoverEnabled = true;
    edge.emit('mouseover');
    edge.emit('mousemove');
    interactions.dispose();
    onHover.mockClear();
    vi.advanceTimersByTime(16);
    edge.emit('mouseover');
    expect(onHover).not.toHaveBeenCalled();
  });

  it('keeps node and connected-edge hover feedback independent of tooltip settings', () => {
    hoverEnabled = false;
    cy.nodes()[0].emit('mouseover');
    expect(cy.nodes()[0].hasClass('hover')).toBe(true);
    expect(cy.edges()[0].hasClass('hoverEdge')).toBe(true);
    cy.nodes()[0].emit('mouseout');
    expect(cy.nodes()[0].hasClass('hover')).toBe(false);
    expect(cy.edges()[0].hasClass('hoverEdge')).toBe(false);
  });
});
