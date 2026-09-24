import type { BoundingBox12 } from 'cytoscape';
import { scoreRelationships, type LayoutGeometry } from './layoutGeometry';

const maximumSwapWork = 20_000_000;
const maximumPasses = 2;
const minimumTableGap = 12;

export function untangleRelationships(geometry: LayoutGeometry, initialScore: number) {
  if (initialScore === 0) return;

  const { positions, bounds, components, links } = geometry;
  let bestScore = initialScore;
  const workPerSwap = links.length * (bounds.length + links.length);

  // A fixed work budget keeps dense models from blocking every sidebar resize.
  let remainingSwaps = Math.floor(maximumSwapWork / workPerSwap);

  for (let pass = 0; pass < maximumPasses && remainingSwaps > 0; pass++) {
    const scoreBeforePass = bestScore;

    for (let first = 0; first < positions.length && remainingSwaps > 0; first++) {
      for (let second = first + 1; second < positions.length && remainingSwaps > 0; second++) {
        // Keep disconnected groups together after they have been packed.
        if (components[first] !== components[second]) continue;
        remainingSwaps--;

        const firstPosition = positions[first];
        const secondPosition = positions[second];
        const firstBounds = bounds[first];
        const secondBounds = bounds[second];

        positions[first] = secondPosition;
        positions[second] = firstPosition;
        bounds[first] = translateBounds(
          firstBounds,
          secondPosition.x - firstPosition.x,
          secondPosition.y - firstPosition.y,
        );
        bounds[second] = translateBounds(
          secondBounds,
          firstPosition.x - secondPosition.x,
          firstPosition.y - secondPosition.y,
        );

        let candidateScore = Infinity;
        if (swappedTablesAreSeparated(bounds, first, second)) {
          candidateScore = scoreRelationships(geometry, bestScore);
        }

        if (candidateScore < bestScore) {
          bestScore = candidateScore;
          if (bestScore === 0) return;
          continue;
        }

        positions[first] = firstPosition;
        positions[second] = secondPosition;
        bounds[first] = firstBounds;
        bounds[second] = secondBounds;
      }
    }

    if (bestScore === scoreBeforePass) return;
  }
}

function swappedTablesAreSeparated(bounds: BoundingBox12[], first: number, second: number) {
  return bounds.every((other, index) => {
    const overlapsFirst = index !== first && overlappingTables(bounds[first], other);
    const overlapsSecond = index !== second && overlappingTables(bounds[second], other);
    return !overlapsFirst && !overlapsSecond;
  });
}

function translateBounds(bounds: BoundingBox12, offsetX: number, offsetY: number): BoundingBox12 {
  return {
    x1: bounds.x1 + offsetX,
    x2: bounds.x2 + offsetX,
    y1: bounds.y1 + offsetY,
    y2: bounds.y2 + offsetY,
  };
}

function overlappingTables(first: BoundingBox12, second: BoundingBox12) {
  return first.x1 < second.x2 + minimumTableGap
    && first.x2 + minimumTableGap > second.x1
    && first.y1 < second.y2 + minimumTableGap
    && first.y2 + minimumTableGap > second.y1;
}
