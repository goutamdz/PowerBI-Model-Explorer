import type { BoundingBox12, Core } from 'cytoscape';

const minimumTableGap = 12;
const maximumOverviewZoom = 1.5;

export function separateTables(graph: Core) {
  const placedBounds: BoundingBox12[] = [];
  const nodes = graph.nodes().sort((first, second) => first.position('y') - second.position('y'));

  // Move colliding cards down without changing their horizontal order.
  for (const node of nodes) {
    const bounds = node.boundingBox();
    let offsetY = 0;

    for (const previous of placedBounds) {
      const overlapsHorizontally = bounds.x1 < previous.x2 + minimumTableGap
        && bounds.x2 + minimumTableGap > previous.x1;
      if (overlapsHorizontally) {
        offsetY = Math.max(offsetY, previous.y2 + minimumTableGap - bounds.y1);
      }
    }

    if (offsetY > 0) node.position('y', node.position('y') + offsetY);
    placedBounds.push({
      x1: bounds.x1,
      x2: bounds.x2,
      y1: bounds.y1 + offsetY,
      y2: bounds.y2 + offsetY,
    });
  }
}

export function fillCanvas(graph: Core, padding: number) {
  const nodes = graph.nodes();
  graph.fit(nodes, padding);
  graph.zoom(Math.min(graph.zoom(), maximumOverviewZoom));

  const bounds = nodes.boundingBox();
  const positions = nodes.map((node) => node.position());
  const minimumX = Math.min(...positions.map((position) => position.x));
  const maximumX = Math.max(...positions.map((position) => position.x));
  const minimumY = Math.min(...positions.map((position) => position.y));
  const maximumY = Math.max(...positions.map((position) => position.y));
  const positionSpanX = maximumX - minimumX;
  const positionSpanY = maximumY - minimumY;
  const outerWidth = bounds.w - positionSpanX;
  const outerHeight = bounds.h - positionSpanY;
  const availableWidth = Math.max(1, graph.width() - 2 * padding) / graph.zoom();
  const availableHeight = Math.max(1, graph.height() - 2 * padding) / graph.zoom();

  // Only expand spare space: shrinking positions could make table boxes overlap.
  const scaleX = getExpansionScale(positionSpanX, availableWidth - outerWidth);
  const scaleY = getExpansionScale(positionSpanY, availableHeight - outerHeight);
  nodes.positions((node) => ({
    x: (node.position('x') - minimumX) * scaleX,
    y: (node.position('y') - minimumY) * scaleY,
  }));
  graph.center(nodes);
}

function getExpansionScale(currentSpan: number, availableSpan: number) {
  if (currentSpan <= 0) return 1;
  return Math.max(1, availableSpan / currentSpan);
}
