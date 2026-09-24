import { findAllPaths } from './analysis/pathAnalysis';
import { parseSemanticModelFiles } from './tmdl/tmdlCore';
import type { PathsResponse, SemanticModelResponse } from './types';

export { compareLocalModels } from './analysis/modelComparison';
export { suggestLocalImprovements } from './analysis/modelSuggestions';
export type { ModelSuggestion } from './analysis/modelSuggestions';

export interface SelectedModelFile {
  path: string;
  file: Blob;
}

function isDefinitionFile({ path }: SelectedModelFile): boolean {
  const segments = path.split('/');
  return segments.length >= 3 && segments[1] === 'definition' && path.toLowerCase().endsWith('.tmdl');
}

function validateLoadedModel(model: SemanticModelResponse): void {
  if (model.metrics.totalTables === 0) {
    throw new Error('No table definitions were found in the selected model.');
  }
  const missingTables = new Set<string>();
  for (const relationship of model.relationships) {
    for (const tableName of [relationship.fromTable, relationship.toTable]) {
      if (!model.tables[tableName]) {
        missingTables.add(tableName);
      }
    }
  }
  if (missingTables.size > 0) {
    throw new Error(`The model is missing table definitions: ${Array.from(missingTables).join(', ')}.`);
  }
}

export async function loadLocalModel(files: SelectedModelFile[]): Promise<SemanticModelResponse> {
  // Read only definition TMDL, never caches, report data, or query files in the selection.
  const definitions = files.filter(isDefinitionFile);
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
  validateLoadedModel(model);
  return model;
}

export function analyzeLocalPaths(model: SemanticModelResponse, source: string, target: string): PathsResponse {
  const paths = findAllPaths(model.tables, model.relationships, source, target);
  return { source, target, totalPaths: paths.length, ambiguous: paths.length > 1, paths };
}
