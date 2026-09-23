import type { Core } from 'cytoscape';
import { arrangeGraph } from './graphLayout';

export function zoomGraph(cy: Core, factor: number) {
  cy.zoom({
    level: cy.zoom() * factor,
    renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
  });
}

export function observeGraphResize(cy: Core, container: HTMLElement, onResize: () => void) {
  let previousWidth = container.clientWidth;
  let previousHeight = container.clientHeight;
  let resizeTimer: ReturnType<typeof setTimeout> | undefined;

  const observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (!width || !height || (width === previousWidth && height === previousHeight)) return;
    cy.resize();
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => arrangeGraph(cy), 120);
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
