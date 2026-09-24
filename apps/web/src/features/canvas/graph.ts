import type { ElementDefinition } from 'cytoscape';
import type { PathResult, SemanticModelResponse, TableNode } from '../../model/types';

export function buildGraphElements(model: SemanticModelResponse): ElementDefinition[] {
  const tables = Object.values(model.tables).map(createTableElement);
  const relationships = createRelationshipElements(model.relationships);
  return [...tables, ...relationships];
}

function createTableElement(table: TableNode): ElementDefinition {
  return {
    data: {
      id: table.name,
      label: table.name,
      kind: table.kind,
      measures: table.measures.length,
      columns: table.columns.length,
      degree: table.degree,
    },
  };
}

function createRelationshipElements(relationships: SemanticModelResponse['relationships']): ElementDefinition[] {
  return relationships.map((relationship) => {
    // Power BI filters flow from the referenced "to" table to the referencing "from" table.
    const source = relationship.toTable;
    const target = relationship.fromTable;
    const fromColumn = relationship.toColumn;
    const toColumn = relationship.fromColumn;

    // Cardinality labels must follow the same reversed direction as the arrow.
    const [fromCardinality, toCardinality] = relationship.cardinality.split(':');
    const cardinality = `${toCardinality}:${fromCardinality}`;
    const [sourceCard, targetCard] = cardinality.split(':');

    return {
      data: {
        id: relationship.id,
        label: cardinality,
        source,
        target,
        active: relationship.isActive ? 'true' : 'false',
        direction: relationship.direction,
        cardinality,
        sourceCard,
        targetCard,
        fromColumn,
        toColumn,
      },
    };
  });
}

export function formatPath(path: PathResult): string {
  return path.nodes.join('  →  ');
}

export function collectAllPathElements(paths: PathResult[]): { nodes: Set<string>; edges: Set<string> } {
  const nodes = new Set<string>();
  const edges = new Set<string>();
  for (const path of paths) {
    for (const tableName of path.nodes) {
      nodes.add(tableName);
    }
    for (const relationshipId of path.edges) {
      edges.add(relationshipId);
    }
  }
  return { nodes, edges };
}
