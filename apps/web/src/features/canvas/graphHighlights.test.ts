import cytoscape, { type Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyGraphHighlights, type GraphHighlights } from './graphHighlights';

let cy: Core;
const empty: GraphHighlights = { allPaths: [], searchTerm: '', focusedTables: [], inspectorTables: [] };
const path = { nodes: ['A', 'B', 'C'], edges: ['ab', 'bc'], hopCount: 2, containsInactiveRelationship: false };

beforeEach(() => {
  cy = cytoscape({
    headless: true,
    styleEnabled: true,
    minZoom: 0.1,
    maxZoom: 3,
    elements: [
      ...['A', 'B', 'C', 'D'].map((id, index) => ({ data: { id }, position: { x: index * 200, y: index * 100 } })),
      { data: { id: 'ab', source: 'A', target: 'B' } },
      { data: { id: 'bc', source: 'B', target: 'C' } },
      { data: { id: 'cd', source: 'C', target: 'D' } },
    ],
    layout: { name: 'preset' },
  });
  vi.spyOn(cy, 'width').mockReturnValue(1064);
  vi.spyOn(cy, 'height').mockReturnValue(824);
  vi.spyOn(cy, 'animate');
  vi.spyOn(cy, 'stop');
});

afterEach(() => { cy.destroy(); vi.restoreAllMocks(); });

describe('graph highlights', () => {
  it('prioritizes inspection over paths, focus, and search', () => {
    applyGraphHighlights(cy, {
      allPaths: [path], inspectorTables: ['A', 'B'], focusedTables: ['D'], searchTerm: 'C',
      searchSelection: { tableName: 'D' },
    });
    expect(cy.nodes('.inspectorNode').map((node) => node.id())).toEqual(['A', 'B']);
    expect(cy.edges('.inspectorEdge').map((edge) => edge.id())).toEqual(['ab']);
    expect(cy.nodes('.dimmed').map((node) => node.id())).toEqual(['C', 'D']);
    expect(cy.nodes('.pathNode, .focusNode, .searchMatch')).toHaveLength(0);
    expect(cy.animate).toHaveBeenCalledWith(expect.objectContaining({ fit: expect.objectContaining({ padding: 80 }) }));
  });

  it('uses path edge IDs and distinguishes endpoints from intermediate tables', () => {
    applyGraphHighlights(cy, { ...empty, allPaths: [path], focusedTables: ['D'] });
    expect(cy.nodes('.pathEndpoint').map((node) => node.id())).toEqual(['A', 'C']);
    expect(cy.nodes('.pathNode').map((node) => node.id())).toEqual(['B']);
    expect(cy.edges('.pathEdge').map((edge) => edge.id())).toEqual(['ab', 'bc']);
    expect(cy.getElementById('D').hasClass('dimmed')).toBe(true);
  });

  it('focuses only links whose two endpoints are selected', () => {
    applyGraphHighlights(cy, { ...empty, focusedTables: ['B', 'C'], searchTerm: 'A' });
    expect(cy.edges('.focusEdge').map((edge) => edge.id())).toEqual(['bc']);
    expect(cy.edges('.dimmed')).toHaveLength(2);
  });

  it('centers case-insensitive search results without dimming or changing zoom', () => {
    applyGraphHighlights(cy, { ...empty, searchTerm: ' b ' });
    expect(cy.nodes('.searchMatch').map((node) => node.id())).toEqual(['B']);
    expect(cy.elements('.dimmed')).toHaveLength(0);
    expect(cy.animate).toHaveBeenCalledWith(expect.objectContaining({ center: expect.any(Object), duration: 300 }));
    expect(cy.animate).not.toHaveBeenCalledWith(expect.objectContaining({ fit: expect.any(Object) }));
  });

  it('locates the exact selected result, even with no search text', () => {
    cy.zoom(0.1);
    applyGraphHighlights(cy, { ...empty, searchSelection: { tableName: 'B' } }, { animate: false });
    expect(cy.nodes('.searchMatch').map((node) => node.id())).toEqual(['B']);
    expect(cy.elements('.dimmed')).toHaveLength(0);
    expect(cy.zoom()).toBe(1.5);
    expect(cy.getElementById('B').renderedPosition()).toEqual({ x: 532, y: 412 });
    expect(cy.animate).not.toHaveBeenCalled();
  });

  it('selects one literal table name without also selecting substring matches', () => {
    const tableName = 'Sales [Region].2026';
    cy.add([
      { data: { id: tableName } },
      { data: { id: `${tableName} Backup` } },
    ]);
    applyGraphHighlights(cy, { ...empty, searchTerm: 'sales', searchSelection: { tableName } });
    expect(cy.nodes('.searchMatch').map((node) => node.id())).toEqual([tableName]);
    expect(cy.animate).toHaveBeenCalledWith(expect.objectContaining({ zoom: 1.5, pan: expect.any(Object) }));
  });

  it('can locate the same result again after panning away', () => {
    const highlights = { ...empty, searchSelection: { tableName: 'B' } };
    applyGraphHighlights(cy, highlights, { animate: false });
    cy.pan({ x: -1000, y: 1000 });
    applyGraphHighlights(cy, highlights, { animate: false });
    expect(cy.getElementById('B').renderedPosition()).toEqual({ x: 532, y: 412 });
  });

  it('fits the selected table inside a narrow canvas rather than over-zooming', () => {
    vi.mocked(cy.width).mockReturnValue(160);
    vi.mocked(cy.height).mockReturnValue(100);
    cy.nodes().style({ width: 156, height: 64 });
    applyGraphHighlights(cy, { ...empty, searchSelection: { tableName: 'B' } }, { animate: false });
    const bounds = cy.getElementById('B').renderedBoundingBox();
    expect(bounds.x1).toBeGreaterThanOrEqual(0);
    expect(bounds.y1).toBeGreaterThanOrEqual(0);
    expect(bounds.x2).toBeLessThanOrEqual(160);
    expect(bounds.y2).toBeLessThanOrEqual(100);
    expect(cy.zoom()).toBeLessThan(1.5);
  });

  it('cancels pending navigation when search is cleared or has no matches', () => {
    applyGraphHighlights(cy, { ...empty, searchSelection: { tableName: 'B' } });
    vi.mocked(cy.stop).mockClear();
    applyGraphHighlights(cy, { ...empty, searchTerm: 'missing' });
    expect(cy.stop).toHaveBeenCalledWith(true);
    expect(cy.nodes('.searchMatch')).toHaveLength(0);
    vi.mocked(cy.stop).mockClear();
    applyGraphHighlights(cy, empty);
    expect(cy.stop).toHaveBeenCalledWith(true);
  });

  it('clears stale highlight classes but preserves hover state', () => {
    cy.getElementById('A').addClass('hover');
    applyGraphHighlights(cy, { ...empty, allPaths: [path] });
    applyGraphHighlights(cy, empty);
    expect(cy.elements('.dimmed, .pathNode, .pathEndpoint, .pathEdge')).toHaveLength(0);
    expect(cy.getElementById('A').hasClass('hover')).toBe(true);
  });

  it('does not animate for unmatched searches or empty selections', () => {
    applyGraphHighlights(cy, empty);
    applyGraphHighlights(cy, { ...empty, searchTerm: 'missing' });
    expect(cy.animate).not.toHaveBeenCalled();
  });
});
