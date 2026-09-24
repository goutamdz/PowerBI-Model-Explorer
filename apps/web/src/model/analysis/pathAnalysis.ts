import type { PathResult, RelationshipEdge, TableNode } from '../types.js';
import { createAdjacencyMap } from './graphAnalysis.js';

export { analyzeGraph, enrichTables } from './graphAnalysis.js';

function deduplicateAndSortPaths(paths: PathResult[]): PathResult[] {
  const seen = new Set<string>();
  const uniquePaths: PathResult[] = [];
  for (const path of paths) {
    // Parallel relationships count as one table route; retain the first edge sequence.
    const key = path.nodes.join('>');
    if (!seen.has(key)) {
      seen.add(key);
      uniquePaths.push(path);
    }
  }

  return uniquePaths.sort((left, right) => {
    if (left.hopCount !== right.hopCount) {
      return left.hopCount - right.hopCount;
    }
    return left.nodes.join('>').localeCompare(right.nodes.join('>'));
  });
}

export function findAllPaths(
  tables: Record<string, TableNode>,
  relationships: RelationshipEdge[],
  source: string,
  target: string,
  maxPaths = 2000,
): PathResult[] {
  if (!tables[source] || !tables[target]) {
    return [];
  }
  if (source === target) {
    return [{ nodes: [source], edges: [], hopCount: 0, containsInactiveRelationship: false }];
  }

  const adjacency = createAdjacencyMap(Object.keys(tables), relationships, true);
  const paths: PathResult[] = [];
  const visited = new Set<string>([source]);

  function visitTable(current: string, nodePath: string[], edgePath: RelationshipEdge[]): void {
    // The limit applies before deduplication to bound exploration of parallel links.
    if (paths.length >= maxPaths) {
      return;
    }
    if (current === target) {
      paths.push({
        nodes: [...nodePath],
        edges: edgePath.map((relationship) => relationship.id),
        hopCount: edgePath.length,
        containsInactiveRelationship: edgePath.some((relationship) => !relationship.isActive),
      });
      return;
    }

    for (const entry of adjacency.get(current) ?? []) {
      if (visited.has(entry.nextTable)) {
        continue;
      }

      visited.add(entry.nextTable);
      nodePath.push(entry.nextTable);
      edgePath.push(entry.relationship);
      visitTable(entry.nextTable, nodePath, edgePath);
      edgePath.pop();
      nodePath.pop();
      // A table may occur in another route, but never twice in the current route.
      visited.delete(entry.nextTable);
    }
  }

  visitTable(source, [source], []);
  return deduplicateAndSortPaths(paths);
}
