import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import cytoscape, { type Core } from 'cytoscape';
import type { SemanticModelResponse } from '../../model/types';
import { buildGraphElements } from './graph';
import { arrangeGraph } from './graphLayout';
import { createGraphStyles } from './graphStyles';
import { applyGraphHighlights, type GraphHighlights } from './graphHighlights';
import { bindGraphInteractions, type GraphSelectionHandlers } from './graphInteractions';
import { observeGraphResize, zoomGraph } from './graphViewport';
import { EdgeHoverCard, type EdgeHoverInfo } from './EdgeHoverCard';

export interface ModelGraphHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
}

interface ModelGraphProps extends GraphHighlights, GraphSelectionHandlers {
  model: SemanticModelResponse;
  hoverEnabled: boolean;
}

export const ModelGraph = forwardRef<ModelGraphHandle, ModelGraphProps>(function ModelGraph({
  model, allPaths, searchTerm, focusedTables, inspectorTables, hoverEnabled, onSelectTable, onSelectEdge,
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<Core | null>(null);
  const interactionsRef = useRef<ReturnType<typeof bindGraphInteractions> | null>(null);
  const handlersRef = useRef({ onSelectTable, onSelectEdge });
  const hoverEnabledRef = useRef(hoverEnabled);
  const [edgeHover, setEdgeHover] = useState<EdgeHoverInfo | null>(null);

  // Keep event callbacks current without rebuilding the graph on UI rerenders.
  useEffect(() => {
    handlersRef.current = { onSelectTable, onSelectEdge };
    hoverEnabledRef.current = hoverEnabled;
    if (!hoverEnabled) interactionsRef.current?.clearHover();
  }, [onSelectTable, onSelectEdge, hoverEnabled]);

  useImperativeHandle(ref, () => ({
    zoomIn() {
      if (cyRef.current) zoomGraph(cyRef.current, 1.3);
    },
    zoomOut() {
      if (cyRef.current) zoomGraph(cyRef.current, 1 / 1.3);
    },
    fit() {
      interactionsRef.current?.clearHover();
      if (cyRef.current) arrangeGraph(cyRef.current);
    },
  }), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cy = cytoscape({
      container,
      elements: buildGraphElements(model),
      style: createGraphStyles(Object.keys(model.tables).length),
      wheelSensitivity: 0.3,
      minZoom: 0.1,
      maxZoom: 3,
      layout: { name: 'preset' },
    });
    cyRef.current = cy;

    const interactions = bindGraphInteractions(cy, {
      getSelectionHandlers: () => handlersRef.current,
      isHoverEnabled: () => hoverEnabledRef.current,
      onHover: setEdgeHover,
    });
    interactionsRef.current = interactions;
    interactions.clearHover();
    arrangeGraph(cy);
    const stopObserving = observeGraphResize(cy, container, interactions.clearHover);

    return () => {
      stopObserving();
      interactions.dispose();
      cy.stop(true);
      cy.destroy();
      cyRef.current = null;
      interactionsRef.current = null;
    };
  }, [model]);

  useEffect(() => {
    const cy = cyRef.current;
    if (cy) applyGraphHighlights(cy, { allPaths, searchTerm, focusedTables, inspectorTables });
  }, [model, allPaths, searchTerm, focusedTables, inspectorTables]);

  return (
    <div ref={containerRef} className="absolute inset-0">
      {edgeHover ? <EdgeHoverCard {...edgeHover} /> : null}
    </div>
  );
});
