import type { Core, NodeCollection } from 'cytoscape';
import { arrangeGraph } from './graphLayout';

export function zoomGraph(graph: Core, factor: number) {
  graph.zoom({
    level: graph.zoom() * factor,
    renderedPosition: { x: graph.width() / 2, y: graph.height() / 2 },
  });
}

export function locateTableOnGraph(graph: Core, table: NodeCollection, animate: boolean) {
  const bounds = table.boundingBox();
  const padding = Math.min(80, graph.width() / 4, graph.height() / 4);
  const zoomToFitWidth = (graph.width() - 2 * padding) / bounds.w;
  const zoomToFitHeight = (graph.height() - 2 * padding) / bounds.h;
  const zoom = Math.max(graph.minZoom(), Math.min(1.5, graph.maxZoom(), zoomToFitWidth, zoomToFitHeight));

  // Translate graph coordinates into screen coordinates to center the selected card.
  const tableCenterX = bounds.x1 + bounds.w / 2;
  const tableCenterY = bounds.y1 + bounds.h / 2;
  const viewport = {
    zoom,
    pan: {
      x: graph.width() / 2 - tableCenterX * zoom,
      y: graph.height() / 2 - tableCenterY * zoom,
    },
  };

  if (animate) {
    graph.animate({ ...viewport, duration: 300, easing: 'ease-out-cubic' });
  } else {
    graph.viewport(viewport);
  }
}

export function observeGraphResize(
  graph: Core,
  container: HTMLElement,
  onResize: () => void,
  onLayout: () => void,
) {
  let previousWidth = container.clientWidth;
  let previousHeight = container.clientHeight;
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;

  const observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    const unchanged = width === previousWidth && height === previousHeight;
    if (!width || !height || unchanged) return;

    graph.resize();
    // Wait for sidebar transitions to settle before running the expensive layout.
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      arrangeGraph(graph);
      onLayout();
    }, 120);
    previousWidth = width;
    previousHeight = height;
    onResize();
  });
  observer.observe(container);

  return () => {
    observer.disconnect();
    clearTimeout(resizeTimer);
  };
}
