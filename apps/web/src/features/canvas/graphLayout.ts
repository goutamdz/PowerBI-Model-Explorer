import cytoscape, { type Core, type Position } from 'cytoscape';
import fcose, { type FcoseLayoutOptions } from 'cytoscape-fcose';
import { getLayoutGeometry, scoreRelationships, type LayoutGeometry } from './layoutGeometry';
import { untangleRelationships } from './layoutOptimization';
import { packComponents } from './layoutPacking';
import { fillCanvas, separateTables } from './layoutSpacing';

cytoscape.use(fcose);

export const mapPadding = 32;

interface LayoutCandidate {
  score: number;
  geometry: LayoutGeometry;
  zoom: number;
  pan: Position;
}

export function getTableSize(tableCount: number) {
  // Shrink dense models gradually without making their labels too small.
  const scale = Math.pow(13 / Math.max(13, tableCount), 0.2);
  return {
    width: Math.max(120, Math.round(156 * scale)),
    height: Math.max(52, Math.round(64 * scale)),
  };
}

export function arrangeGraph(graph: Core) {
  const nodes = graph.nodes();
  if (nodes.empty() || graph.width() <= 0 || graph.height() <= 0) return;
  graph.stop(true);

  const forceLayoutOptions = createForceLayoutOptions();
  const candidateColumns = getCandidateColumns(graph);
  const components = graph.elements().components().map((component) => component.nodes());
  let bestLayout: LayoutCandidate | undefined;

  // Compare stable seeds instead of accepting a force layout that hides or crosses links.
  for (const columns of candidateColumns) {
    graph.layout({
      name: 'grid',
      fit: false,
      animate: false,
      boundingBox: { x1: 0, y1: 0, w: graph.width(), h: graph.height() },
      cols: columns,
      nodeDimensionsIncludeLabels: true,
      spacingFactor: 1.2,
    }).run();
    graph.layout(forceLayoutOptions).run();
    separateTables(graph);
    packComponents(graph, components);
    fillCanvas(graph, mapPadding);

    const geometry = getLayoutGeometry(graph, components);
    const candidate: LayoutCandidate = {
      score: scoreRelationships(geometry),
      geometry,
      zoom: graph.zoom(),
      pan: { ...graph.pan() },
    };
    if (isBetterLayout(candidate, bestLayout)) bestLayout = candidate;
  }

  if (!bestLayout) return;
  const { geometry, zoom, pan } = bestLayout;
  untangleRelationships(geometry, bestLayout.score);
  nodes.positions((_node, index) => geometry.positions[index]);
  graph.viewport({ zoom, pan });
  fillCanvas(graph, mapPadding);
}

function isBetterLayout(candidate: LayoutCandidate, current?: LayoutCandidate) {
  if (!current) return true;
  if (candidate.score !== current.score) return candidate.score < current.score;
  return candidate.zoom > current.zoom;
}

function getCandidateColumns(graph: Core) {
  const tableCount = graph.nodes().length;
  const initialColumns = Math.ceil(Math.sqrt(tableCount * graph.width() / graph.height()));
  let offsets = [0, 1, 2, -1, -2];

  if (graph.edges().empty()) offsets = [0];
  else if (tableCount > 100) offsets = [0, 1, 2];

  const columnCounts = offsets.map((offset) => {
    return Math.max(1, Math.min(tableCount, initialColumns + offset));
  });
  return new Set(columnCounts);
}

function createForceLayoutOptions(): FcoseLayoutOptions {
  return {
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
}
