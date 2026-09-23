import { findAllPaths } from './analysis/pathAnalysis';
import { parseSemanticModelFiles } from './tmdl/tmdlCore';
import type { CompareResponse, PathsResponse, RelationshipDiff, RelationshipEdge, RelationshipSnapshot, SemanticModelResponse } from './types';

export interface SelectedModelFile {
  path: string;
  file: Blob;
}

export interface ModelSuggestion {
  title: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  tables: string[];
}

export async function loadLocalModel(files: SelectedModelFile[]): Promise<SemanticModelResponse> {
  const definitions = files.filter(({ path }) => {
    const segments = path.split('/');
    return segments.length >= 3 && segments[1] === 'definition' && path.toLowerCase().endsWith('.tmdl');
  });
  const folders = new Set(definitions.map(({ path }) => path.split('/')[0]));
  if (definitions.length === 0 || folders.size !== 1) {
    throw new Error('Select one semantic model folder containing a definition directory with TMDL files.');
  }

  const folder = definitions[0].path.split('/')[0];
  const sources = await Promise.all(definitions.map(async ({ path, file }) => ({
    path: path.slice(folder.length + 1),
    content: await file.text(),
  })));
  const model = parseSemanticModelFiles(folder, sources);
  if (model.metrics.totalTables === 0) {
    throw new Error('No table definitions were found in the selected model.');
  }
  const missingTables = new Set(model.relationships.flatMap((relationship) =>
    [relationship.fromTable, relationship.toTable].filter((table) => !model.tables[table]),
  ));
  if (missingTables.size > 0) {
    throw new Error(`The model is missing table definitions: ${Array.from(missingTables).join(', ')}.`);
  }
  return model;
}

export function analyzeLocalPaths(model: SemanticModelResponse, source: string, target: string): PathsResponse {
  const paths = findAllPaths(model.tables, model.relationships, source, target);
  return { source, target, totalPaths: paths.length, ambiguous: paths.length > 1, paths };
}

function relationshipKey(relationship: RelationshipEdge): string {
  const endpoints = [
    `${relationship.fromTable}[${relationship.fromColumn}]`,
    `${relationship.toTable}[${relationship.toColumn}]`,
  ];
  return endpoints.sort().join(' \u2192 ');
}

function snapshot(relationship: RelationshipEdge): RelationshipSnapshot {
  const { fromTable, fromColumn, toTable, toColumn, cardinality, direction, isActive } = relationship;
  return { fromTable, fromColumn, toTable, toColumn, cardinality, direction, isActive };
}

export function compareLocalModels(modelA: SemanticModelResponse, modelB: SemanticModelResponse): CompareResponse {
  const relationshipsA = new Map(modelA.relationships.map((relationship) => [relationshipKey(relationship), snapshot(relationship)]));
  const relationshipsB = new Map(modelB.relationships.map((relationship) => [relationshipKey(relationship), snapshot(relationship)]));
  const diffs: RelationshipDiff[] = [];

  for (const [key, relationshipA] of relationshipsA) {
    const relationshipB = relationshipsB.get(key);
    if (!relationshipB) {
      diffs.push({ kind: 'only-in-a', key, a: relationshipA });
      continue;
    }
    const swapped = relationshipA.fromTable === relationshipB.toTable && relationshipA.fromColumn === relationshipB.toColumn &&
      relationshipA.toTable === relationshipB.fromTable && relationshipA.toColumn === relationshipB.fromColumn;
    const cardinalityB = swapped ? relationshipB.cardinality.split(':').reverse().join(':') : relationshipB.cardinality;
    const differences: string[] = [];
    if (relationshipA.cardinality !== cardinalityB) differences.push(`cardinality: ${relationshipA.cardinality} vs ${cardinalityB}`);
    if (relationshipA.direction !== relationshipB.direction) differences.push(`direction: ${relationshipA.direction} vs ${relationshipB.direction}`);
    if (relationshipA.isActive !== relationshipB.isActive) differences.push(`active: ${relationshipA.isActive} vs ${relationshipB.isActive}`);
    if (differences.length > 0) diffs.push({ kind: 'different', key, a: relationshipA, b: relationshipB, differences });
  }
  for (const [key, relationshipB] of relationshipsB) {
    if (!relationshipsA.has(key)) diffs.push({ kind: 'only-in-b', key, b: relationshipB });
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

export function suggestLocalImprovements(model: SemanticModelResponse): { suggestions: ModelSuggestion[] } {
  const suggestions: ModelSuggestion[] = [];
  const tableNames = (relationships: RelationshipEdge[]) => Array.from(new Set(
    relationships.flatMap((relationship) => [relationship.fromTable, relationship.toTable]),
  ));
  const bidirectional = model.relationships.filter((relationship) => relationship.direction === 'both');
  if (bidirectional.length > 0) {
    suggestions.push({
      title: 'Review bidirectional filtering',
      severity: 'warning',
      description: `${bidirectional.length} relationship${bidirectional.length === 1 ? ' filters' : 's filter'} both ways. Review whether one-way filtering would avoid extra filter routes.`,
      tables: tableNames(bidirectional),
    });
  }
  const manyToMany = model.relationships.filter((relationship) => relationship.cardinality === '*:*');
  if (manyToMany.length > 0) {
    suggestions.push({
      title: 'Review many-to-many relationships',
      severity: 'warning',
      description: `${manyToMany.length} relationship${manyToMany.length === 1 ? ' allows' : 's allow'} repeated keys on both sides (*:*). Check whether this is intended.`,
      tables: tableNames(manyToMany),
    });
  }
  const inactive = model.relationships.filter((relationship) => !relationship.isActive);
  if (inactive.length > 0) {
    suggestions.push({
      title: 'Check inactive relationships',
      severity: 'info',
      description: `${inactive.length} relationship${inactive.length === 1 ? ' is' : 's are'} inactive. DAX may enable these links; check formulas before changing them.`,
      tables: tableNames(inactive),
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