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

function expectClearRelationships(cy: Core) {
  for (const edge of cy.edges()) {
    const source = edge.source().position();
    const target = edge.target().position();
    const steps = Math.max(1, Math.ceil(Math.hypot(target.x - source.x, target.y - source.y)));
    for (const node of cy.nodes().not(edge.connectedNodes())) {
      const bounds = node.boundingBox();
      let obstructed = false;
      for (let step = 0; step <= steps; step++) {
        const x = source.x + (target.x - source.x) * step / steps;
        const y = source.y + (target.y - source.y) * step / steps;
        if (x > bounds.x1 - 8 && x < bounds.x2 + 8 && y > bounds.y1 - 8 && y < bounds.y2 + 8) {
          obstructed = true;
          break;
        }
      }
      expect(obstructed, `${edge.id()} passes through ${node.id()}`).toBe(false);
    }
  }
  expect(countCrossings(cy)).toBe(0);
}

function countCrossings(cy: Core) {
  const side = (a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }) =>
    (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  const edges = cy.edges();
  let crossings = 0;
  for (let i = 0; i < edges.length; i++) {
    for (let j = i + 1; j < edges.length; j++) {
      if (edges[i].connectedNodes().intersect(edges[j].connectedNodes()).nonempty()) continue;
      const a = edges[i].source().position();
      const b = edges[i].target().position();
      const c = edges[j].source().position();
      const d = edges[j].target().position();
      if (side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0) crossings++;
    }
  }
  return crossings;
}

function sharedDimensionElements(facts: number, disconnected = 0): ElementDefinition[] {
  const dimensions = facts * 3;
  const elements: ElementDefinition[] = [
    ...Array.from({ length: facts }, (_, i) => ({ data: { id: `Fact ${i}`, label: `Fact ${i}`, kind: 'fact' } })),
    ...Array.from({ length: dimensions }, (_, i) => ({ data: { id: `Dimension ${i}`, label: `Dimension ${i}` } })),
    ...Array.from({ length: disconnected }, (_, i) => ({ data: { id: `Unrelated ${i}`, label: `Unrelated ${i}` } })),
  ];
  for (let fact = 0; fact < facts; fact++) {
    const linkedDimensions = new Set([0, 1, 2, ...Array.from({ length: 5 }, (_, i) => (fact * 3 + i) % dimensions)]);
    for (const dimension of linkedDimensions) {
      elements.push({ data: { id: `${fact}-${dimension}`, source: `Dimension ${dimension}`, target: `Fact ${fact}` } });
    }
  }
  return elements;
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

  it.each([[1384, 824], [1064, 824], [1224, 823], [1200, 650], [960, 650]])(
    'keeps demo relationships clear of tables and other links at %i x %i',
    (width, height) => {
      const cy = makeGraph(width, height);
      arrangeGraph(cy);
      expectContainedAndSeparated(cy);
      expectClearRelationships(cy);
    },
  );

  it('restores the same clean layout after opening and closing a sidebar', () => {
    const cy = makeGraph(1384, 824);
    arrangeGraph(cy);
    const positions = cy.nodes().map((node) => ({ ...node.position() }));
    const zoom = cy.zoom();
    const pan = { ...cy.pan() };
    vi.mocked(cy.width).mockReturnValue(1064);
    arrangeGraph(cy);
    expectClearRelationships(cy);
    vi.mocked(cy.width).mockReturnValue(1384);
    arrangeGraph(cy);
    expectClearRelationships(cy);
    expect(cy.nodes().map((node) => node.position())).toEqual(positions);
    expect(cy.zoom()).toBe(zoom);
    expect(cy.pan()).toEqual(pan);
  });

  it('uses separate curves for parallel relationships without hiding inactive links', () => {
    const cy = makeGraph(1064, 824);
    const calendarLinks = cy.edges().filter((edge) => edge.source().id() === 'Calendar');
    expect(calendarLinks).toHaveLength(2);
    for (const edge of calendarLinks) {
      expect(edge.style('curve-style')).toBe('bezier');
      expect(edge.numericStyle('control-point-step-size')).toBeGreaterThanOrEqual(40);
    }
    expect(calendarLinks.filter('[active = "false"]').style('line-style')).toBe('dashed');
  });

  it.each([[6, 1384, 40], [6, 1064, 50], [8, 1384, 65], [8, 1064, 65], [12, 1384, 180], [12, 1064, 190]])(
    'reduces crossings with %i shared fact tables in a %i-wide canvas to at most %i',
    (facts, width, maximumCrossings) => {
      const elements = sharedDimensionElements(facts);
      const cy = makeGraph(width, 824, elements);
      arrangeGraph(cy);
      expectContainedAndSeparated(cy);
      expect(countCrossings(cy)).toBeLessThanOrEqual(maximumCrossings);
      expect(cy.elements()).toHaveLength(elements.length);
    },
  );

  it.each([[1790, 765], [1384, 824], [1064, 824]])(
    'packs disconnected tables without a wasted top band at %i x %i',
    (width, height) => {
      const cy = makeGraph(width, height, sharedDimensionElements(12, 24));
      arrangeGraph(cy);
      expectContainedAndSeparated(cy);
      const connected = cy.nodes().filter((node) => node.connectedEdges().nonempty()).renderedBoundingBox();
      expect(connected.y1).toBeLessThanOrEqual(mapPadding + 1);
      const usableArea = (width - 2 * mapPadding) * (height - 2 * mapPadding);
      expect(connected.w * connected.h / usableArea).toBeGreaterThan(0.6);
      expect(cy.nodes()).toHaveLength(72);
      const groups = cy.elements().components().map((component) => component.nodes().boundingBox());
      for (let i = 0; i < groups.length; i++) {
        for (let j = i + 1; j < groups.length; j++) {
          const a = groups[i];
          const b = groups[j];
          expect(a.x2 <= b.x1 || b.x2 <= a.x1 || a.y2 <= b.y1 || b.y2 <= a.y1).toBe(true);
        }
      }
    },
  );

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
