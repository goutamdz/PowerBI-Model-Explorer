import type { GraphAnalysis, RelationshipEdge, SemanticModelResponse, TableKind, TableNode } from '../types.js';

interface AdjacencyEntry {
  nextTable: string;
  relationship: RelationshipEdge;
}

export function createAdjacencyMap(
  tableNames: string[],
  relationships: RelationshipEdge[],
  directed = false,
): Map<string, AdjacencyEntry[]> {
  const adjacency = new Map<string, AdjacencyEntry[]>();
  for (const tableName of tableNames) {
    adjacency.set(tableName, []);
  }

  for (const relationship of relationships) {
    // TMDL stores the FK first, but the PK side filters the FK side.
    adjacency.get(relationship.toTable)?.push({ nextTable: relationship.fromTable, relationship });
    if (!directed || relationship.direction === 'both') {
      adjacency.get(relationship.fromTable)?.push({ nextTable: relationship.toTable, relationship });
    }
  }

  return adjacency;
}

function detectTableKind(tableName: string, table: Pick<TableNode, 'measures'>, relationships: RelationshipEdge[]): TableKind {
  const name = tableName.toLowerCase();
  const hasManySide = relationships.some((relationship) => {
    const [fromCardinality, toCardinality] = relationship.cardinality.split(':');
    return (relationship.fromTable === tableName && fromCardinality === '*')
      || (relationship.toTable === tableName && toCardinality === '*');
  });

  if (name.includes('fact') || name.includes('bridge') || table.measures.length > 0 || hasManySide) {
    return 'fact';
  }
  return 'dimension';
}

export function enrichTables(
  tables: Record<string, Omit<TableNode, 'kind' | 'degree'>>,
  relationships: RelationshipEdge[],
): Record<string, TableNode> {
  const enrichedEntries: [string, TableNode][] = [];
  for (const [tableName, table] of Object.entries(tables)) {
    const degree = relationships.filter((relationship) =>
      relationship.fromTable === tableName || relationship.toTable === tableName,
    ).length;
    enrichedEntries.push([tableName, { ...table, degree, kind: detectTableKind(tableName, table, relationships) }]);
  }
  return Object.fromEntries(enrichedEntries);
}

function findConnectedComponents(adjacency: Map<string, AdjacencyEntry[]>): string[][] {
  const visited = new Set<string>();
  const components: string[][] = [];
  for (const tableName of adjacency.keys()) {
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
        if (!visited.has(entry.nextTable)) {
          visited.add(entry.nextTable);
          queue.push(entry.nextTable);
        }
      }
    }
    components.push(component);
  }
  return components;
}

function findMultipleRelationshipPairs(relationships: RelationshipEdge[]): string[] {
  const pairCounts = new Map<string, number>();
  for (const relationship of relationships) {
    const pair = [relationship.fromTable, relationship.toTable].sort().join('::');
    pairCounts.set(pair, (pairCounts.get(pair) ?? 0) + 1);
  }

  const multiplePairs: string[] = [];
  for (const [pair, count] of pairCounts) {
    if (count > 1) {
      multiplePairs.push(pair);
    }
  }
  return multiplePairs;
}

export function analyzeGraph(model: Pick<SemanticModelResponse, 'tables' | 'relationships'>): GraphAnalysis {
  const tableNames = Object.keys(model.tables);
  const adjacency = createAdjacencyMap(tableNames, model.relationships);
  const components = findConnectedComponents(adjacency);
  // Stable sorting keeps the first discovered group when sizes tie.
  const largestComponent = components.sort((left, right) => right.length - left.length)[0] ?? [];
  const largestComponentSet = new Set(largestComponent);

  return {
    disconnectedTables: tableNames.filter((tableName) => !largestComponentSet.has(tableName)),
    factTables: tableNames.filter((tableName) => model.tables[tableName].kind === 'fact'),
    dimensionTables: tableNames.filter((tableName) => model.tables[tableName].kind === 'dimension'),
    relationshipIssues: {
      inactiveCount: model.relationships.filter((relationship) => !relationship.isActive).length,
      bidirectionalCount: model.relationships.filter((relationship) => relationship.direction === 'both').length,
      multipleRelationshipPairs: findMultipleRelationshipPairs(model.relationships),
    },
  };
}
