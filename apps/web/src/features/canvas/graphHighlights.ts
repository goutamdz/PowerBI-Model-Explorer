import type { Core, EdgeSingular, NodeCollection } from 'cytoscape';
import type { PathResult } from '../../model/types';
import { collectAllPathElements } from './graph';
import { locateTableOnGraph } from './graphViewport';

export interface GraphHighlights {
  allPaths: PathResult[];
  searchTerm: string;
  searchSelection?: { tableName: string } | null;
  focusedTables: string[];
  inspectorTables: string[];
}

const highlightClasses = 'dimmed pathNode pathEndpoint pathEdge searchMatch focusNode focusEdge inspectorNode inspectorEdge';

export function applyGraphHighlights(graph: Core, highlights: GraphHighlights, options: { animate?: boolean } = {}) {
  let selected: NodeCollection = graph.nodes().filter(() => false);
  graph.batch(() => {
    graph.elements().removeClass(highlightClasses);
    selected = highlightActiveView(graph, highlights);
  });

  graph.stop(true);
  if (selected.empty()) return;

  const animate = options.animate !== false;
  const searching = selected[0].hasClass('searchMatch');

  if (searching && highlights.searchSelection) {
    locateTableOnGraph(graph, selected, animate);
    return;
  }

  if (searching) {
    if (animate) graph.animate({ center: { eles: selected }, duration: 300, easing: 'ease-out-cubic' });
    else graph.center(selected);
    return;
  }

  if (animate) graph.animate({ fit: { eles: selected, padding: 80 }, duration: 400, easing: 'ease-out-cubic' });
  else graph.fit(selected, 80);
}

function highlightActiveView(graph: Core, highlights: GraphHighlights): NodeCollection {
  // Only one view wins, so an old search cannot obscure an active inspection.
  if (highlights.inspectorTables.length > 0) {
    return highlightTableGroup(graph, highlights.inspectorTables, 'inspectorNode', 'inspectorEdge');
  }
  if (highlights.allPaths.length > 0) {
    return highlightPaths(graph, highlights.allPaths);
  }
  if (highlights.focusedTables.length > 0) {
    return highlightTableGroup(graph, highlights.focusedTables, 'focusNode', 'focusEdge');
  }
  return highlightSearchResults(graph, highlights.searchTerm, highlights.searchSelection);
}

function highlightTableGroup(graph: Core, tableNames: string[], nodeClass: string, edgeClass: string) {
  const tables = new Set(tableNames);
  highlightSelection(graph, tables, nodeClass, edgeClass, (edge) => {
    return tables.has(edge.source().id()) && tables.has(edge.target().id());
  });
  return graph.nodes(`.${nodeClass}`);
}

function highlightPaths(graph: Core, paths: PathResult[]) {
  const { nodes, edges } = collectAllPathElements(paths);
  highlightSelection(graph, nodes, 'pathNode', 'pathEdge', (edge) => edges.has(edge.id()));

  for (const path of paths) {
    const endpoints = [path.nodes[0], path.nodes[path.nodes.length - 1]];
    for (const tableName of endpoints) {
      if (tableName !== undefined) {
        graph.getElementById(tableName).removeClass('pathNode').addClass('pathEndpoint');
      }
    }
  }
  return graph.nodes().filter((node) => nodes.has(node.id()));
}

function highlightSearchResults(graph: Core, searchTerm: string, selection: GraphHighlights['searchSelection']) {
  const query = searchTerm.trim().toLowerCase();
  if (!query && !selection) return graph.nodes().filter(() => false);

  const matches = graph.nodes().filter((node) => {
    if (selection) return node.id() === selection.tableName;
    return node.id().toLowerCase().includes(query);
  });
  matches.addClass('searchMatch');
  return matches;
}

function highlightSelection(
  graph: Core,
  tables: Set<string>,
  nodeClass: string,
  edgeClass: string,
  includesEdge: (edge: EdgeSingular) => boolean,
) {
  graph.nodes().forEach((node) => {
    node.addClass(tables.has(node.id()) ? nodeClass : 'dimmed');
  });
  graph.edges().forEach((edge) => {
    edge.addClass(includesEdge(edge) ? edgeClass : 'dimmed');
  });
}
