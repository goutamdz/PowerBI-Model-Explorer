import cytoscape, { type Core, type ElementDefinition } from 'cytoscape';
import { afterEach, describe, expect, it, vi } from 'vitest';
import demo from '../../demo/model.json';
import { parseSemanticModelFiles } from '../../model/tmdl/tmdlCore';
import { buildGraphElements } from './graph';
import { arrangeGraph, getTableSize, mapPadding } from './graphLayout';
import { createGraphStyles } from './graphStyles';

const graphs: Core[] = [];
const demoElements = buildGraphElements(parseSemanticModelFiles(demo.name, demo.files));

function makeGraph(width: number, height: number, elements = demoElements) {
  const tableCount = elements.filter(({ data }) => data.source === undefined).length;
  const cy = cytoscape({
    headless: true,
    styleEnabled: true,
    elements,
    minZoom: 0.1,
    maxZoom: 3,
    style: createGraphStyles(tableCount),
  });
  vi.spyOn(cy, 'width').mockReturnValue(width);
  vi.spyOn(cy, 'height').mockReturnValue(height);
  graphs.push(cy);
  return cy;
}

function expectContainedAndSeparated(cy: Core) {
  const nodes = cy.nodes();
  for (const node of nodes) {
    const bounds = node.renderedBoundingBox();
    expect(bounds.x1).toBeGreaterThanOrEqual(mapPadding - 1);
    expect(bounds.y1).toBeGreaterThanOrEqual(mapPadding - 1);
    expect(bounds.x2).toBeLessThanOrEqual(cy.width() - mapPadding + 1);
    expect(bounds.y2).toBeLessThanOrEqual(cy.height() - mapPadding + 1);
  }
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i].boundingBox();
      const b = nodes[j].boundingBox();
      expect(a.x2 <= b.x1 || b.x2 <= a.x1 || a.y2 <= b.y1 || b.y2 <= a.y1,
        `${nodes[i].id()} overlaps ${nodes[j].id()}`).toBe(true);
    }
  }
}

afterEach(() => {
  graphs.splice(0).forEach((cy) => cy.destroy());
  vi.restoreAllMocks();
});

describe('adaptive table layout', () => {
  it('progressively shrinks boxes for larger models with a readable minimum', () => {
    expect(getTableSize(0)).toEqual({ width: 156, height: 64 });
    expect(getTableSize(13)).toEqual({ width: 156, height: 64 });
    expect(getTableSize(26)).toEqual({ width: 136, height: 56 });
    expect(getTableSize(52)).toEqual({ width: 120, height: 52 });
    expect(getTableSize(1000)).toEqual({ width: 120, height: 52 });
    for (let count = 14; count <= 100; count++) {
      const previous = getTableSize(count - 1);
      const current = getTableSize(count);
      expect(current.width).toBeLessThanOrEqual(previous.width);
      expect(current.height).toBeLessThanOrEqual(previous.height);
    }
  });

  it.each([26, 52, 100])('fits %i connected tables using smaller boxes', (count) => {
    const elements: ElementDefinition[] = [
      ...Array.from({ length: count }, (_, i) => ({ data: { id: `Table ${i}`, label: `Table ${i}` } })),
      ...Array.from({ length: count - 1 }, (_, i) => ({
        data: { id: `link-${i}`, source: `Table ${Math.floor(i / 3)}`, target: `Table ${i + 1}` },
      })),
    ];
    const cy = makeGraph(1384, 824, elements);
    arrangeGraph(cy);
    expectContainedAndSeparated(cy);
    expect(cy.nodes()[0].width()).toBe(getTableSize(count).width);
    expect(cy.nodes()[0].height()).toBe(getTableSize(count).height);
    expect(cy.nodes()[0].numericStyle('font-size')).toBe(13);
    const bounds = cy.nodes().renderedBoundingBox();
    expect(bounds.w / (cy.width() - 2 * mapPadding)).toBeGreaterThan(0.95);
    expect(bounds.h / (cy.height() - 2 * mapPadding)).toBeGreaterThan(0.95);
    expect(cy.edges()).toHaveLength(count - 1);
  });

  it.each([[1384, 824], [1064, 824], [342, 421]])(
    'uses both axes without overlapping or clipping at %i x %i',
    (width, height) => {
      const cy = makeGraph(width, height);
      arrangeGraph(cy);
      expectContainedAndSeparated(cy);
      const bounds = cy.nodes().renderedBoundingBox();
      expect(bounds.w / (width - 2 * mapPadding)).toBeGreaterThan(0.95);
      expect(bounds.h / (height - 2 * mapPadding)).toBeGreaterThan(0.95);
      if (width >= 1000) expect(13 * cy.zoom()).toBeGreaterThanOrEqual(12);
      expect(cy.nodes()).toHaveLength(13);
      expect(cy.edges()).toHaveLength(11);
    },
  );

  it('reflows on resize while retaining highlights and relationship metadata', () => {
    const cy = makeGraph(1384, 824);
    arrangeGraph(cy);
    const before = cy.nodes().map((node) => ({ ...node.position() }));
    cy.nodes()[0].addClass('inspectorNode');
    const edges = cy.edges().map((edge) => ({ ...edge.data() }));
    vi.mocked(cy.width).mockReturnValue(1064);
    arrangeGraph(cy);
    expectContainedAndSeparated(cy);
    expect(cy.nodes().map((node) => node.position())).not.toEqual(before);
    expect(cy.nodes()[0].hasClass('inspectorNode')).toBe(true);
    expect(cy.edges().map((edge) => edge.data())).toEqual(edges);
  });

  it.each([0, 1, 2, 20])('handles %i disconnected tables', (count) => {
    const elements: ElementDefinition[] = Array.from({ length: count }, (_, i) => ({ data: { id: `Table ${i}`, label: `Table ${i}` } }));
    const cy = makeGraph(1384, 824, elements);
    arrangeGraph(cy);
    expectContainedAndSeparated(cy);
    expect(Number.isFinite(cy.zoom())).toBe(true);
    expect(cy.zoom()).toBeLessThanOrEqual(1.5);
  });

  it('handles cycles, parallel links, and self-relationships', () => {
    const cy = makeGraph(1064, 824, [
      ...['A', 'B', 'C'].map((id) => ({ data: { id, label: id } })),
      ...[['A', 'B'], ['B', 'C'], ['C', 'A'], ['A', 'B'], ['A', 'A']].map(([source, target], i) => ({
        data: { id: `edge-${i}`, source, target },
      })),
    ]);
    arrangeGraph(cy);
    expectContainedAndSeparated(cy);
    expect(cy.edges()).toHaveLength(5);
  });
});
