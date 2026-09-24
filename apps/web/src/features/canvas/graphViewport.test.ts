import cytoscape, { type Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { arrangeGraph } from './graphLayout';
import { applyGraphHighlights, type GraphHighlights } from './graphHighlights';
import { observeGraphResize } from './graphViewport';

vi.mock('./graphLayout', () => ({ arrangeGraph: vi.fn() }));

let cy: Core;
let notify: ResizeObserverCallback;
let observer: ResizeObserver;
let dispose: () => void;
const container = { clientWidth: 1200, clientHeight: 800 } as HTMLElement;
const onResize = vi.fn();
const onLayout = vi.fn();

function resize(width: number, height: number) {
  const contentRect = { width, height, x: 0, y: 0, top: 0, right: width, bottom: height, left: 0, toJSON: () => ({ width, height }) };
  const sizes = [{ inlineSize: width, blockSize: height }];
  notify([{
    target: container,
    contentRect,
    borderBoxSize: sizes,
    contentBoxSize: sizes,
    devicePixelContentBoxSize: sizes,
  }], observer);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('ResizeObserver', class implements ResizeObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    constructor(callback: ResizeObserverCallback) {
      notify = callback;
      observer = this;
    }
  });
  cy = cytoscape({
    headless: true,
    styleEnabled: true,
    elements: [{ data: { id: 'Sales' } }, { data: { id: 'Store' } }],
  });
  vi.spyOn(cy, 'width').mockReturnValue(880);
  vi.spyOn(cy, 'height').mockReturnValue(800);
});

afterEach(() => {
  dispose();
  cy.destroy();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.resetAllMocks();
});

describe('graph resize navigation', () => {
  it('restores the latest search selection after the debounced layout', () => {
    let highlights: GraphHighlights = {
      allPaths: [], focusedTables: [], inspectorTables: [], searchTerm: '',
      searchSelection: { tableName: 'Sales' },
    };
    vi.mocked(arrangeGraph).mockImplementation(() => {
      cy.nodes().positions((_node, index) => ({ x: 200 + index * 300, y: 100 }));
      cy.zoom(0.2);
      cy.pan({ x: 0, y: 0 });
    });
    dispose = observeGraphResize(cy, container, onResize, () => {
      applyGraphHighlights(cy, highlights, { animate: false });
      onLayout();
    });
    resize(880, 800);
    expect(onResize).toHaveBeenCalledOnce();
    expect(onLayout).not.toHaveBeenCalled();
    highlights = { ...highlights, searchSelection: { tableName: 'Store' } };
    vi.advanceTimersByTime(120);
    expect(arrangeGraph).toHaveBeenCalledOnce();
    expect(onLayout).toHaveBeenCalledOnce();
    expect(cy.nodes('.searchMatch').map((node) => node.id())).toEqual(['Store']);
    expect(cy.getElementById('Store').renderedPosition()).toEqual({ x: 440, y: 400 });
    expect(cy.zoom()).toBe(1.5);
  });

  it('ignores unchanged and hidden sizes and coalesces resize events', () => {
    dispose = observeGraphResize(cy, container, onResize, onLayout);
    resize(1200, 800);
    resize(0, 800);
    resize(880, 0);
    expect(onResize).not.toHaveBeenCalled();
    resize(900, 800);
    vi.advanceTimersByTime(80);
    resize(880, 800);
    vi.advanceTimersByTime(119);
    expect(arrangeGraph).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(arrangeGraph).toHaveBeenCalledOnce();
    expect(onLayout).toHaveBeenCalledOnce();
  });

  it('cancels a pending layout and selection restore on disposal', () => {
    dispose = observeGraphResize(cy, container, onResize, onLayout);
    resize(880, 800);
    dispose();
    vi.advanceTimersByTime(120);
    expect(observer.disconnect).toHaveBeenCalled();
    expect(arrangeGraph).not.toHaveBeenCalled();
    expect(onLayout).not.toHaveBeenCalled();
  });
});
