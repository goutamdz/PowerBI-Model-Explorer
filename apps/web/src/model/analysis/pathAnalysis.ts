import type { GraphAnalysis, PathResult, RelationshipEdge, SemanticModelResponse, TableNode, TableKind } from '../types.js';

interface AdjacencyEntry {
  nextTable: string;
  relationship: RelationshipEdge;
}

function createAdjacencyMap(tableNames: string[], relationships: RelationshipEdge[], directed = false): Map<string, AdjacencyEntry[]> {
  const adjacency = new Map<string, AdjacencyEntry[]>();

  for (const tableName of tableNames) {
    adjacency.set(tableName, []);
  }

  for (const relationship of relationships) {
    // In Power BI TMDL, toTable (PK/dimension) filters fromTable (FK/fact).
    // Directed traversal follows the cross-filter direction: toTable → fromTable.
    adjacency.get(relationship.toTable)?.push({
      nextTable: relationship.fromTable,
      relationship,
    });

    // In undirected mode, always add the reverse.
    // In directed mode, only add the reverse for bidirectional relationships.
    if (!directed || relationship.direction === 'both') {
      adjacency.get(relationship.fromTable)?.push({
        nextTable: relationship.toTable,
        relationship,
      });
    }
  }

  return adjacency;
}

function detectTableKind(tableName: string, table: Pick<TableNode, 'measures'>, relationships: RelationshipEdge[]): TableKind {
  const name = tableName.toLowerCase();
  const manySideCount = relationships.filter((relationship) => {
    const [fromCardinality] = relationship.cardinality.split(':');
    const [, toCardinality] = relationship.cardinality.split(':');
    return (relationship.fromTable === tableName && fromCardinality === '*') ||
      (relationship.toTable === tableName && toCardinality === '*');
  }).length;

  if (name.includes('fact') || name.includes('bridge') || table.measures.length > 0 || manySideCount > 0) {
    return 'fact';
  }

  return 'dimension';
}

export function enrichTables(tables: Record<string, Omit<TableNode, 'kind' | 'degree'>>, relationships: RelationshipEdge[]): Record<string, TableNode> {
  return Object.fromEntries(Object.entries(tables).map(([tableName, table]) => {
    const degree = relationships.filter((relationship) => relationship.fromTable === tableName || relationship.toTable === tableName).length;

    return [
      tableName,
      {
        ...table,
        degree,
        kind: detectTableKind(tableName, table, relationships),
      },
    ];
  }));
}

export function analyzeGraph(model: Pick<SemanticModelResponse, 'tables' | 'relationships'>): GraphAnalysis {
  const tableNames = Object.keys(model.tables);
  const adjacency = createAdjacencyMap(tableNames, model.relationships);
  const visited = new Set<string>();
  const components: string[][] = [];

  for (const tableName of tableNames) {
    if (visited.has(tableName)) {
      continue;
    }

    const queue = [tableName];
    const component: string[] = [];
    visited.add(tableName);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) {
        continue;
      }

      component.push(current);

      for (const entry of adjacency.get(current) ?? []) {
        if (visited.has(entry.nextTable)) {
          continue;
        }

        visited.add(entry.nextTable);
        queue.push(entry.nextTable);
      }
    }

    components.push(component);
  }

  const largestComponent = components.sort((left, right) => right.length - left.length)[0] ?? [];
  const largestComponentSet = new Set(largestComponent);
  const disconnectedTables = tableNames.filter((tableName) => !largestComponentSet.has(tableName));
  const pairCounts = new Map<string, number>();

  for (const relationship of model.relationships) {
    const pairKey = [relationship.fromTable, relationship.toTable].sort().join('::');
    pairCounts.set(pairKey, (pairCounts.get(pairKey) ?? 0) + 1);
  }

  const factTables = tableNames.filter((tableName) => model.tables[tableName].kind === 'fact');
  const dimensionTables = tableNames.filter((tableName) => model.tables[tableName].kind === 'dimension');

  return {
    disconnectedTables,
    factTables,
    dimensionTables,
    relationshipIssues: {
      inactiveCount: model.relationships.filter((relationship) => !relationship.isActive).length,
      bidirectionalCount: model.relationships.filter((relationship) => relationship.direction === 'both').length,
      multipleRelationshipPairs: Array.from(pairCounts.entries())
        .filter(([, count]) => count > 1)
        .map(([pair]) => pair),
    },
  };
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

  const dfs = (current: string, nodePath: string[], edgePath: RelationshipEdge[]) => {
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
      dfs(entry.nextTable, nodePath, edgePath);
      edgePath.pop();
      nodePath.pop();
      visited.delete(entry.nextTable);
    }
  };

  dfs(source, [source], []);

  // Deduplicate by node sequence so bidirectional traversals
  // of the same table chain are treated as one unique path.
  const seen = new Set<string>();
  const uniquePaths: PathResult[] = [];

  for (const p of paths) {
    const key = p.nodes.join('>');
    if (!seen.has(key)) {
      seen.add(key);
      uniquePaths.push(p);
    }
  }

  return uniquePaths.sort((left, right) => {
    if (left.hopCount !== right.hopCount) {
      return left.hopCount - right.hopCount;
    }

    return left.nodes.join('>').localeCompare(right.nodes.join('>'));
  });
}
