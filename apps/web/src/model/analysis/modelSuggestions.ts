import type { RelationshipEdge, SemanticModelResponse } from '../types';

export interface ModelSuggestion {
  title: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  tables: string[];
}

function relatedTableNames(relationships: RelationshipEdge[]): string[] {
  const tableNames = new Set<string>();
  for (const relationship of relationships) {
    tableNames.add(relationship.fromTable);
    tableNames.add(relationship.toTable);
  }
  return Array.from(tableNames);
}

export function suggestLocalImprovements(model: SemanticModelResponse): { suggestions: ModelSuggestion[] } {
  const suggestions: ModelSuggestion[] = [];
  const bidirectional = model.relationships.filter((relationship) => relationship.direction === 'both');
  if (bidirectional.length > 0) {
    suggestions.push({
      title: 'Review bidirectional filtering',
      severity: 'warning',
      description: `${bidirectional.length} relationship${bidirectional.length === 1 ? ' filters' : 's filter'} both ways. Review whether one-way filtering would avoid extra filter routes.`,
      tables: relatedTableNames(bidirectional),
    });
  }
  const manyToMany = model.relationships.filter((relationship) => relationship.cardinality === '*:*');
  if (manyToMany.length > 0) {
    suggestions.push({
      title: 'Review many-to-many relationships',
      severity: 'warning',
      description: `${manyToMany.length} relationship${manyToMany.length === 1 ? ' allows' : 's allow'} repeated keys on both sides (*:*). Check whether this is intended.`,
      tables: relatedTableNames(manyToMany),
    });
  }
  const inactive = model.relationships.filter((relationship) => !relationship.isActive);
  if (inactive.length > 0) {
    suggestions.push({
      title: 'Check inactive relationships',
      severity: 'info',
      description: `${inactive.length} relationship${inactive.length === 1 ? ' is' : 's are'} inactive. DAX may enable these links; check formulas before changing them.`,
      tables: relatedTableNames(inactive),
    });
  }
  if (model.analysis.disconnectedTables.length > 0) {
    suggestions.push({
      title: 'Review separate table groups',
      severity: 'info',
      description: `${model.analysis.disconnectedTables.length} table${model.analysis.disconnectedTables.length === 1 ? ' is' : 's are'} outside the main connected group. Helper tables may be intentionally separate.`,
      tables: model.analysis.disconnectedTables,
    });
  }
  if (model.analysis.relationshipIssues.multipleRelationshipPairs.length > 0) {
    suggestions.push({
      title: 'Review multiple links between the same tables',
      severity: 'warning',
      description: 'Some table pairs have several links. Check their columns and which link is active.',
      tables: Array.from(new Set(model.analysis.relationshipIssues.multipleRelationshipPairs.flatMap((pair) => pair.split('::')))),
    });
  }
  return { suggestions };
}
