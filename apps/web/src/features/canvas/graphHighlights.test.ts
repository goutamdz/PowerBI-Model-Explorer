import cytoscape, { type Core } from 'cytoscape';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { applyGraphHighlights, type GraphHighlights } from './graphHighlights';

let cy: Core;
const empty: GraphHighlights = { allPaths: [], searchTerm: '', focusedTables: [], inspectorTables: [] };
const path = { nodes: ['A', 'B', 'C'], edges: ['ab', 'bc'], hopCount: 2, containsInactiveRelationship: false };

beforeEach(() => {
  cy = cytoscape({
    headless: true,
    elements: [
      ...['A', 'B', 'C', 'D'].map((id) => ({ data: { id } })),
      { data: { id: 'ab', source: 'A', target: 'B' } },
      { data: { id: 'bc', source: 'B', target: 'C' } },
      { data: { id: 'cd', source: 'C', target: 'D' } },
    ],
  });
  vi.spyOn(cy, 'animate');
});

afterEach(() => { cy.destroy(); vi.restoreAllMocks(); });

describe('graph highlights', () => {
  it('prioritizes inspection over paths, focus, and search', () => {
    applyGraphHighlights(cy, { allPaths: [path], inspectorTables: ['A', 'B'], focusedTables: ['D'], searchTerm: 'C' });
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
