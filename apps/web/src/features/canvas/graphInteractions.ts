import type { Core, EdgeSingular, EventObject, EventObjectEdge, EventObjectNode } from 'cytoscape';
import type { EdgeDetail } from '../relationships/types';
import type { EdgeHoverInfo } from './EdgeHoverCard';

export interface GraphSelectionHandlers {
  onSelectTable: (name: string | null) => void;
  onSelectEdge: (edge: EdgeDetail | null) => void;
}

interface GraphInteractionOptions {
  getSelectionHandlers: () => GraphSelectionHandlers;
  isHoverEnabled: () => boolean;
  onHover: (hover: EdgeHoverInfo | null) => void;
}

export function getEdgeDetail(edge: EdgeSingular): EdgeDetail {
  const { id, source, target, fromColumn, toColumn, cardinality, direction, active }: EdgeDetail = edge.data();
  return { id, source, target, fromColumn, toColumn, cardinality, direction, active };
}

export function bindGraphInteractions(cy: Core, options: GraphInteractionOptions) {
  let hoveredEdge: EdgeHoverInfo | null = null;
  let hoverFrame: number | undefined;

  function clearHover() {
    if (hoverFrame !== undefined) cancelAnimationFrame(hoverFrame);
    hoverFrame = undefined;
    hoveredEdge = null;
    options.onHover(null);
  }

  function enterNode(event: EventObjectNode) {
    cy.batch(() => {
      event.target.addClass('hover');
      event.target.connectedEdges().addClass('hoverEdge');
    });
  }

  function leaveNode(event: EventObjectNode) {
    cy.batch(() => {
      event.target.removeClass('hover');
      event.target.connectedEdges().removeClass('hoverEdge');
    });
  }

  function enterEdge(event: EventObjectEdge) {
    if (!options.isHoverEnabled()) return;
    event.target.addClass('hoverEdge');
    const { x, y } = event.renderedPosition ?? { x: 0, y: 0 };
    hoveredEdge = { detail: getEdgeDetail(event.target), x, y };
    options.onHover(hoveredEdge);
  }

  function moveEdge(event: EventObjectEdge) {
    if (!options.isHoverEnabled() || !hoveredEdge) return;
    const { x, y } = event.renderedPosition ?? { x: 0, y: 0 };
    hoveredEdge = { ...hoveredEdge, x, y };
    // Multiple pointer events in a frame need only one React render.
    if (hoverFrame !== undefined) return;
    hoverFrame = requestAnimationFrame(() => {
      hoverFrame = undefined;
      if (options.isHoverEnabled()) options.onHover(hoveredEdge);
    });
  }

  function leaveEdge(event: EventObjectEdge) {
    event.target.removeClass('hoverEdge');
    clearHover();
  }

  function selectNode(event: EventObjectNode) {
    options.getSelectionHandlers().onSelectTable(event.target.id());
  }

  function selectEdge(event: EventObjectEdge) {
    options.getSelectionHandlers().onSelectEdge(getEdgeDetail(event.target));
  }

  function selectBackground(event: EventObject) {
    if (event.target !== cy) return;
    const handlers = options.getSelectionHandlers();
    handlers.onSelectTable(null);
    handlers.onSelectEdge(null);
  }

  cy.on('mouseover', 'node', enterNode);
  cy.on('mouseout', 'node', leaveNode);
  cy.on('mouseover', 'edge', enterEdge);
  cy.on('mousemove', 'edge', moveEdge);
  cy.on('mouseout', 'edge', leaveEdge);
  cy.on('tap', 'node', selectNode);
  cy.on('tap', 'edge', selectEdge);
  cy.on('tap', selectBackground);

  return {
    clearHover,
    dispose() {
      if (hoverFrame !== undefined) cancelAnimationFrame(hoverFrame);
      cy.off('mouseover', 'node', enterNode);
      cy.off('mouseout', 'node', leaveNode);
      cy.off('mouseover', 'edge', enterEdge);
      cy.off('mousemove', 'edge', moveEdge);
      cy.off('mouseout', 'edge', leaveEdge);
      cy.off('tap', 'node', selectNode);
      cy.off('tap', 'edge', selectEdge);
      cy.off('tap', selectBackground);
    },
  };
}
