import type { CompareResponse, RelationshipDiff, RelationshipEdge, RelationshipSnapshot, SemanticModelResponse } from '../types';

function relationshipKey(relationship: RelationshipEdge): string {
  const endpoints = [
    `${relationship.fromTable}[${relationship.fromColumn}]`,
    `${relationship.toTable}[${relationship.toColumn}]`,
  ];
  return endpoints.sort().join(' \u2192 ');
}

function indexRelationships(relationships: RelationshipEdge[]): Map<string, RelationshipSnapshot> {
  const indexed = new Map<string, RelationshipSnapshot>();
  for (const relationship of relationships) {
    const { fromTable, fromColumn, toTable, toColumn, cardinality, direction, isActive } = relationship;
    indexed.set(relationshipKey(relationship), { fromTable, fromColumn, toTable, toColumn, cardinality, direction, isActive });
  }
  return indexed;
}

function describeDifferences(first: RelationshipSnapshot, second: RelationshipSnapshot): string[] {
  const swapped = first.fromTable === second.toTable && first.fromColumn === second.toColumn
    && first.toTable === second.fromTable && first.toColumn === second.fromColumn;
  // The same endpoint pair can be declared in either order.
  const secondCardinality = swapped ? second.cardinality.split(':').reverse().join(':') : second.cardinality;
  const differences: string[] = [];
  if (first.cardinality !== secondCardinality) {
    differences.push(`cardinality: ${first.cardinality} vs ${secondCardinality}`);
  }
  if (first.direction !== second.direction) {
    differences.push(`direction: ${first.direction} vs ${second.direction}`);
  }
  if (first.isActive !== second.isActive) {
    differences.push(`active: ${first.isActive} vs ${second.isActive}`);
  }
  return differences;
}

export function compareLocalModels(modelA: SemanticModelResponse, modelB: SemanticModelResponse): CompareResponse {
  const relationshipsA = indexRelationships(modelA.relationships);
  const relationshipsB = indexRelationships(modelB.relationships);
  const diffs: RelationshipDiff[] = [];

  for (const [key, relationshipA] of relationshipsA) {
    const relationshipB = relationshipsB.get(key);
    if (!relationshipB) {
      diffs.push({ kind: 'only-in-a', key, a: relationshipA });
      continue;
    }
    const differences = describeDifferences(relationshipA, relationshipB);
    if (differences.length > 0) {
      diffs.push({ kind: 'different', key, a: relationshipA, b: relationshipB, differences });
    }
  }
  for (const [key, relationshipB] of relationshipsB) {
    if (!relationshipsA.has(key)) {
      diffs.push({ kind: 'only-in-b', key, b: relationshipB });
    }
  }

  return {
    folderA: modelA.folderPath,
    folderB: modelB.folderPath,
    totalA: modelA.relationships.length,
    totalB: modelB.relationships.length,
    totalDiffs: diffs.length,
    diffs,
  };
}
