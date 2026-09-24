import type { BoundingBox12, Core, NodeCollection, Position } from 'cytoscape';

interface ComponentBlock {
  nodes: NodeCollection;
  bounds: BoundingBox12;
  width: number;
  height: number;
}

interface FreeSpace extends Position {
  width: number;
  height: number;
}

const componentGap = 32;

export function packComponents(graph: Core, components: NodeCollection[]) {
  if (components.length < 2) return;

  const blocks = components.map((nodes): ComponentBlock => {
    const bounds = nodes.boundingBox();
    return {
      nodes,
      bounds,
      width: bounds.w + componentGap,
      height: bounds.h + componentGap,
    };
  });
  blocks.sort((first, second) => second.width * second.height - first.width * first.height);

  const canvasAspectRatio = graph.width() / graph.height();
  const totalArea = blocks.reduce((sum, block) => sum + block.width * block.height, 0);
  const minimumWidths = blocks.map((block) => Math.max(block.width, block.height * canvasAspectRatio));
  let packingWidth = Math.max(Math.sqrt(totalArea * canvasAspectRatio), ...minimumWidths);

  // Small groups fill the spare space beside the main graph instead of a separate top band.
  let placements = tryPackBlocks(blocks, packingWidth, canvasAspectRatio);
  while (placements === null) {
    packingWidth *= 1.1;
    placements = tryPackBlocks(blocks, packingWidth, canvasAspectRatio);
  }

  blocks.forEach((block, index) => {
    const position = placements[index];
    block.nodes.positions((node) => ({
      x: node.position('x') - block.bounds.x1 + position.x,
      y: node.position('y') - block.bounds.y1 + position.y,
    }));
  });
}

function tryPackBlocks(blocks: ComponentBlock[], width: number, aspectRatio: number): Position[] | null {
  const spaces: FreeSpace[] = [{ x: 0, y: 0, width, height: width / aspectRatio }];
  const placements: Position[] = [];

  for (const block of blocks) {
    const spaceIndex = findSmallestFittingSpace(block, spaces);
    if (spaceIndex < 0) return null;

    const [space] = spaces.splice(spaceIndex, 1);
    placements.push({ x: space.x, y: space.y });

    if (space.width > block.width) {
      spaces.push({
        x: space.x + block.width,
        y: space.y,
        width: space.width - block.width,
        height: space.height,
      });
    }
    if (space.height > block.height) {
      spaces.push({
        x: space.x,
        y: space.y + block.height,
        width: block.width,
        height: space.height - block.height,
      });
    }
  }

  return placements;
}

function findSmallestFittingSpace(block: ComponentBlock, spaces: FreeSpace[]) {
  let bestIndex = -1;

  for (let index = 0; index < spaces.length; index++) {
    const space = spaces[index];
    if (space.width < block.width || space.height < block.height) continue;

    if (bestIndex < 0 || space.width * space.height < spaces[bestIndex].width * spaces[bestIndex].height) {
      bestIndex = index;
    }
  }

  return bestIndex;
}
