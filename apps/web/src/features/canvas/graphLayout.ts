import cytoscape, { type BoundingBox12, type Core } from 'cytoscape';
import fcose, { type FcoseLayoutOptions } from 'cytoscape-fcose';

cytoscape.use(fcose);

export const mapPadding = 32;

export function getTableSize(tableCount: number) {
  const scale = Math.pow(13 / Math.max(13, tableCount), 0.2);
  return {
    width: Math.max(120, Math.round(156 * scale)),
    height: Math.max(52, Math.round(64 * scale)),
  };
}

export function arrangeGraph(cy: Core) {
  if (cy.nodes().empty() || cy.width() <= 0 || cy.height() <= 0) return;
  cy.stop(true);
  // A stable, canvas-shaped seed avoids random layouts on every panel resize.
  cy.layout({
    name: 'grid',
    fit: false,
    animate: false,
    boundingBox: { x1: 0, y1: 0, w: cy.width(), h: cy.height() },
    cols: Math.max(1, Math.ceil(Math.sqrt(cy.nodes().length * cy.width() / cy.height()))),
    nodeDimensionsIncludeLabels: true,
    spacingFactor: 1.2,
  }).run();
  const options: FcoseLayoutOptions = {
    name: 'fcose',
    quality: 'proof',
    animate: false,
    fit: false,
    padding: mapPadding,
    idealEdgeLength: 60,
    nodeRepulsion: 4500,
    edgeElasticity: 0.45,
    tilingPaddingHorizontal: 40,
    tilingPaddingVertical: 40,
    packComponents: false,
    numIter: 1500,
    nodeDimensionsIncludeLabels: true,
    randomize: false,
  };
  cy.layout(options).run();
  separateTables(cy);
  fillCanvas(cy);
}

function separateTables(cy: Core) {
  const placed: BoundingBox12[] = [];
  const gap = 12;
  // Force layouts can leave collisions in dense models. Preserve horizontal
  // positions and vertical order while giving every card guaranteed clearance.
  const nodes = cy.nodes().sort((a, b) => a.position('y') - b.position('y'));
  for (const node of nodes) {
    const bounds = node.boundingBox();
    let offset = 0;
    for (const previous of placed) {
      if (bounds.x1 < previous.x2 + gap && bounds.x2 + gap > previous.x1) {
        offset = Math.max(offset, previous.y2 + gap - bounds.y1);
      }
    }
    if (offset > 0) node.position('y', node.position('y') + offset);
    placed.push({ x1: bounds.x1, x2: bounds.x2, y1: bounds.y1 + offset, y2: bounds.y2 + offset });
  }
}

function fillCanvas(cy: Core) {
  const nodes = cy.nodes();
  cy.fit(nodes, mapPadding);
  cy.zoom(Math.min(cy.zoom(), 1.5));
  const bounds = nodes.boundingBox();
  const positions = nodes.map((node) => node.position());
  const minX = Math.min(...positions.map((p) => p.x));
  const maxX = Math.max(...positions.map((p) => p.x));
  const minY = Math.min(...positions.map((p) => p.y));
  const maxY = Math.max(...positions.map((p) => p.y));
  const availableWidth = Math.max(1, cy.width() - 2 * mapPadding) / cy.zoom();
  const availableHeight = Math.max(1, cy.height() - 2 * mapPadding) / cy.zoom();
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const outerWidth = bounds.w - spanX;
  const outerHeight = bounds.h - spanY;
  // Expand only the spare axis: table shapes and existing separation stay intact.
  const scaleX = spanX > 0 ? Math.max(1, (availableWidth - outerWidth) / spanX) : 1;
  const scaleY = spanY > 0 ? Math.max(1, (availableHeight - outerHeight) / spanY) : 1;
  nodes.positions((node) => ({
    x: (node.position('x') - minX) * scaleX,
    y: (node.position('y') - minY) * scaleY,
  }));
  cy.center(nodes);
}
