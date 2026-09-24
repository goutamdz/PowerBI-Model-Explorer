import type { BoundingBox12, Core, NodeCollection, Position } from 'cytoscape';

interface LayoutLink {
  source: number;
  target: number;
}

export interface LayoutGeometry {
  positions: Position[];
  bounds: BoundingBox12[];
  components: number[];
  links: LayoutLink[];
}

const tableObstructionPenalty = 4;
const edgeClearance = 8;

export function getLayoutGeometry(graph: Core, components: NodeCollection[]): LayoutGeometry {
  const nodes = graph.nodes().toArray();
  const componentByTable = new Map<string, number>();

  components.forEach((component, componentIndex) => {
    component.forEach((node) => {
      componentByTable.set(node.id(), componentIndex);
    });
  });

  const links = graph.edges().map((edge) => ({
    source: nodes.indexOf(edge.source()),
    target: nodes.indexOf(edge.target()),
  }));

  return {
    // Copy positions so trying another layout cannot change the saved candidate.
    positions: nodes.map((node) => ({ ...node.position() })),
    bounds: nodes.map((node) => node.boundingBox()),
    components: nodes.map((node) => componentByTable.get(node.id())!),
    links: links.filter((link) => link.source !== link.target),
  };
}

export function scoreRelationships(geometry: LayoutGeometry, stopAt = Infinity) {
  const { positions, bounds, components, links } = geometry;
  let score = 0;

  for (let linkIndex = 0; linkIndex < links.length; linkIndex++) {
    const link = links[linkIndex];
    const start = positions[link.source];
    const end = positions[link.target];

    for (let tableIndex = 0; tableIndex < bounds.length; tableIndex++) {
      const isEndpoint = tableIndex === link.source || tableIndex === link.target;
      const isSameComponent = components[tableIndex] === components[link.source];
      if (isEndpoint || !isSameComponent) continue;

      if (intersectsTable(start, end, bounds[tableIndex])) {
        // A hidden relationship is harder to follow than a visible line crossing.
        score += tableObstructionPenalty;
      }
    }

    for (let otherIndex = linkIndex + 1; otherIndex < links.length; otherIndex++) {
      const other = links[otherIndex];
      if (shareEndpoint(link, other)) continue;
      if (components[link.source] !== components[other.source]) continue;

      if (linesCross(start, end, positions[other.source], positions[other.target])) {
        score++;
      }
    }

    // Once a candidate is worse, counting more conflicts cannot make it win.
    if (score >= stopAt) return score;
  }

  return score;
}

function shareEndpoint(first: LayoutLink, second: LayoutLink) {
  return first.source === second.source
    || first.source === second.target
    || first.target === second.source
    || first.target === second.target;
}

function linesCross(start: Position, end: Position, otherStart: Position, otherEnd: Position) {
  const otherLineStraddles = sideOfLine(start, end, otherStart) * sideOfLine(start, end, otherEnd) < 0;
  const thisLineStraddles = sideOfLine(otherStart, otherEnd, start) * sideOfLine(otherStart, otherEnd, end) < 0;
  return otherLineStraddles && thisLineStraddles;
}

function sideOfLine(start: Position, end: Position, point: Position) {
  return (end.x - start.x) * (point.y - start.y) - (end.y - start.y) * (point.x - start.x);
}

function intersectsTable(start: Position, end: Position, bounds: BoundingBox12) {
  const outsideHorizontally = Math.max(start.x, end.x) < bounds.x1 - edgeClearance
    || Math.min(start.x, end.x) > bounds.x2 + edgeClearance;
  const outsideVertically = Math.max(start.y, end.y) < bounds.y1 - edgeClearance
    || Math.min(start.y, end.y) > bounds.y2 + edgeClearance;
  if (outsideHorizontally || outsideVertically) return false;

  // Both axes must share a section of the line inside the table's rectangle.
  let entryFraction = 0;
  let exitFraction = 1;

  for (const axis of ['x', 'y'] as const) {
    const minimum = (axis === 'x' ? bounds.x1 : bounds.y1) - edgeClearance;
    const maximum = (axis === 'x' ? bounds.x2 : bounds.y2) + edgeClearance;
    const distance = end[axis] - start[axis];

    if (distance === 0) {
      if (start[axis] < minimum || start[axis] > maximum) return false;
      continue;
    }

    const firstIntersection = (minimum - start[axis]) / distance;
    const secondIntersection = (maximum - start[axis]) / distance;
    entryFraction = Math.max(entryFraction, Math.min(firstIntersection, secondIntersection));
    exitFraction = Math.min(exitFraction, Math.max(firstIntersection, secondIntersection));
    if (entryFraction > exitFraction) return false;
  }

  return true;
}
