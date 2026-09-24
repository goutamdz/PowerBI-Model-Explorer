import { useEffect, useMemo, useRef, useState } from 'react';
import cytoscape, { type Core } from 'cytoscape';
import type { SemanticModelResponse } from '../../model/types';
import type { EdgeHoverInfo } from './EdgeHoverCard';
import { buildGraphElements } from './graph';
import { arrangeGraph } from './graphLayout';
import { createGraphStyles } from './graphStyles';
import { applyGraphHighlights, type GraphHighlights } from './graphHighlights';
import { bindGraphInteractions, type GraphSelectionHandlers } from './graphInteractions';
import { observeGraphResize, zoomGraph } from './graphViewport';

export interface ModelGraphHandle {
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
}

export interface ModelGraphOptions extends GraphHighlights, GraphSelectionHandlers {
  model: SemanticModelResponse;
  hoverEnabled: boolean;
}

export function useModelGraph(options: ModelGraphOptions) {
  const {
    model,
    allPaths,
    searchTerm,
    searchSelection,
    focusedTables,
    inspectorTables,
    hoverEnabled,
    onSelectTable,
    onSelectEdge,
  } = options;
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Core | null>(null);
  const interactionsRef = useRef<ReturnType<typeof bindGraphInteractions> | null>(null);
  const handlersRef = useRef({ onSelectTable, onSelectEdge });
  const hoverEnabledRef = useRef(hoverEnabled);
  const highlightsRef = useRef<GraphHighlights>({
    allPaths, searchTerm, searchSelection, focusedTables, inspectorTables,
  });
  const [edgeHover, setEdgeHover] = useState<EdgeHoverInfo | null>(null);

  // Refs let event handlers use current props without rebuilding the whole graph.
  useEffect(() => {
    handlersRef.current = { onSelectTable, onSelectEdge };
    hoverEnabledRef.current = hoverEnabled;
    if (!hoverEnabled) interactionsRef.current?.clearHover();
  }, [onSelectTable, onSelectEdge, hoverEnabled]);

  const controls = useMemo<ModelGraphHandle>(() => ({
    zoomIn() {
      if (graphRef.current) zoomGraph(graphRef.current, 1.3);
    },
    zoomOut() {
      if (graphRef.current) zoomGraph(graphRef.current, 1 / 1.3);
    },
    fit() {
      interactionsRef.current?.clearHover();
      if (graphRef.current) arrangeGraph(graphRef.current);
    },
  }), []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const graph = cytoscape({
      container,
      elements: buildGraphElements(model),
      style: createGraphStyles(Object.keys(model.tables).length),
      wheelSensitivity: 0.3,
      minZoom: 0.1,
      maxZoom: 3,
      layout: { name: 'preset' },
    });
    graphRef.current = graph;

    const interactions = bindGraphInteractions(graph, {
      getSelectionHandlers: () => handlersRef.current,
      isHoverEnabled: () => hoverEnabledRef.current,
      onHover: setEdgeHover,
    });
    interactionsRef.current = interactions;
    interactions.clearHover();
    arrangeGraph(graph);

    const stopObserving = observeGraphResize(graph, container, interactions.clearHover, () => {
      // Resizing must not lose the table the user just located.
      applyGraphHighlights(graph, highlightsRef.current, { animate: false });
    });

    return () => {
      stopObserving();
      interactions.dispose();
      graph.stop(true);
      graph.destroy();
      graphRef.current = null;
      interactionsRef.current = null;
    };
  }, [model]);

  useEffect(() => {
    highlightsRef.current = { allPaths, searchTerm, searchSelection, focusedTables, inspectorTables };
    if (graphRef.current) {
      applyGraphHighlights(graphRef.current, highlightsRef.current);
    }
  }, [model, allPaths, searchTerm, searchSelection, focusedTables, inspectorTables]);

  return { containerRef, edgeHover, controls };
}
