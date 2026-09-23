import type { ElementDefinition } from 'cytoscape';
import type { PathResult, SemanticModelResponse } from '../../model/types';

export function buildGraphElements(model: SemanticModelResponse): ElementDefinition[] {
  const nodeElements: ElementDefinition[] = Object.values(model.tables).map((table) => ({
    data: {
      id: table.name,
      label: table.name,
      kind: table.kind,
      measures: table.measures.length,
      columns: table.columns.length,
      degree: table.degree,
    },
  }));

  const edgeElements: ElementDefinition[] = model.relationships.map((relationship) => {
    // In Power BI TMDL, cross-filter direction is always toColumn's table → fromColumn's table.
    // The "to" side (primary key / dimension) filters the "from" side (foreign key / fact).
    // So the Cytoscape edge source = toTable, target = fromTable.
    const source = relationship.toTable;
    const target = relationship.fromTable;
    const fromColumn = relationship.toColumn;
    const toColumn = relationship.fromColumn;
    // Swap cardinality sides to match the new source→target order
    const [origFrom, origTo] = relationship.cardinality.split(':');
    const cardinality = `${origTo}:${origFrom}`;
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

  return [...nodeElements, ...edgeElements];
}

export function formatPath(path: PathResult): string {
  return path.nodes.join('  →  ');
}

export function collectAllPathElements(paths: PathResult[]): { nodes: Set<string>; edges: Set<string> } {
  const nodes = new Set<string>();
  const edges = new Set<string>();
  for (const p of paths) {
    for (const n of p.nodes) nodes.add(n);
    for (const e of p.edges) edges.add(e);
  }
  return { nodes, edges };
}
