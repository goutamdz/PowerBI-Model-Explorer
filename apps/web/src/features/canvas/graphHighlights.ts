import type { Core, EdgeSingular, NodeCollection } from 'cytoscape';
import type { PathResult } from '../../model/types';
import { collectAllPathElements } from './graph';

export interface GraphHighlights {
  allPaths: PathResult[];
  searchTerm: string;
  focusedTables: string[];
  inspectorTables: string[];
}

const highlightClasses = 'dimmed pathNode pathEndpoint pathEdge searchMatch focusNode focusEdge inspectorNode inspectorEdge';

function highlightSelection(
  cy: Core,
  tables: Set<string>,
  nodeClass: string,
  edgeClass: string,
  includesEdge: (edge: EdgeSingular) => boolean,
) {
  cy.nodes().forEach((node) => { node.addClass(tables.has(node.id()) ? nodeClass : 'dimmed'); });
  cy.edges().forEach((edge) => { edge.addClass(includesEdge(edge) ? edgeClass : 'dimmed'); });
}

export function applyGraphHighlights(cy: Core, highlights: GraphHighlights) {
  const { allPaths, searchTerm, focusedTables, inspectorTables } = highlights;
  let selected: NodeCollection = cy.nodes().filter(() => false);
  let centerOnly = false;

  cy.batch(() => {
    cy.elements().removeClass(highlightClasses);

    // Preserve the view priority: inspection, paths, focus, then search.
    if (inspectorTables.length || (!allPaths.length && focusedTables.length)) {
      const inspecting = inspectorTables.length > 0;
      const tables = new Set(inspecting ? inspectorTables : focusedTables);
      const nodeClass = inspecting ? 'inspectorNode' : 'focusNode';
      const edgeClass = inspecting ? 'inspectorEdge' : 'focusEdge';
      highlightSelection(cy, tables, nodeClass, edgeClass,
        (edge) => tables.has(edge.source().id()) && tables.has(edge.target().id()));
      selected = cy.nodes(`.${nodeClass}`);
    } else if (allPaths.length) {
      const { nodes, edges } = collectAllPathElements(allPaths);
      highlightSelection(cy, nodes, 'pathNode', 'pathEdge', (edge) => edges.has(edge.id()));
      for (const path of allPaths) {
        for (const endpoint of [path.nodes[0], path.nodes[path.nodes.length - 1]]) {
          if (endpoint !== undefined) cy.getElementById(endpoint).removeClass('pathNode').addClass('pathEndpoint');
        }
      }
      selected = cy.nodes().filter((node) => nodes.has(node.id()));
    } else {
      const query = searchTerm.trim().toLowerCase();
      if (!query) return;
      selected = cy.nodes().filter((node) => node.id().toLowerCase().includes(query));
      selected.addClass('searchMatch');
      centerOnly = true;
    }
  });

  if (selected.empty()) return;
  cy.stop();
  if (centerOnly) {
    cy.animate({ center: { eles: selected }, duration: 300, easing: 'ease-out-cubic' });
  } else {
    cy.animate({ fit: { eles: selected, padding: 80 }, duration: 400, easing: 'ease-out-cubic' });
  }
}
