import type { MetricsSummary, ParsedTableDraft, RelationshipEdge, SemanticModelResponse, TableNode } from '../types.js';
import { analyzeGraph, enrichTables } from '../analysis/pathAnalysis.js';
import { buildColumnReferences } from './columnReferences.js';
import { deduplicateRelationships, parseRelationships } from './relationshipParser.js';
import { parseTableFile } from './tableParser.js';

export interface TmdlSourceFile {
  path: string;
  content: string;
}

function mergeTable(tables: Record<string, ParsedTableDraft>, table: ParsedTableDraft): void {
  const existingTable = tables[table.name] ?? { name: table.name, columns: [], measures: [] };
  const uniqueColumns = new Set([...existingTable.columns, ...table.columns]);
  tables[table.name] = {
    name: table.name,
    columns: Array.from(uniqueColumns).sort((left, right) => left.localeCompare(right)),
    measures: [...existingTable.measures, ...table.measures],
  };
}

function summarizeModel(tables: Record<string, TableNode>, relationships: RelationshipEdge[]): MetricsSummary {
  return {
    totalTables: Object.keys(tables).length,
    totalRelationships: relationships.length,
    totalActiveRelationships: relationships.filter((relationship) => relationship.isActive).length,
    totalInactiveRelationships: relationships.filter((relationship) => !relationship.isActive).length,
    totalMeasures: Object.values(tables).reduce((sum, table) => sum + table.measures.length, 0),
  };
}

export function parseSemanticModelFiles(folderPath: string, files: TmdlSourceFile[]): SemanticModelResponse {
  if (files.length === 0) {
    throw new Error('No TMDL files were found under the definition folder.');
  }

  const tableDrafts: Record<string, ParsedTableDraft> = {};
  const relationshipDrafts: RelationshipEdge[] = [];
  for (const file of files) {
    for (const table of parseTableFile(file.content)) {
      if (!table.name.startsWith('LocalDate')) {
        mergeTable(tableDrafts, table);
      }
    }
    relationshipDrafts.push(...parseRelationships(file.content, file.path));
  }

  // Auto-generated date tables are omitted together with links pointing to them.
  const visibleRelationships = relationshipDrafts.filter((relationship) =>
    !relationship.fromTable.startsWith('LocalDate') && !relationship.toTable.startsWith('LocalDate'),
  );
  const relationships = deduplicateRelationships(visibleRelationships);
  const columnReferences = buildColumnReferences(tableDrafts);
  const referencedTables: Record<string, Omit<TableNode, 'kind' | 'degree'>> = {};
  for (const [name, table] of Object.entries(tableDrafts)) {
    referencedTables[name] = { ...table, columnReferences: columnReferences[name] ?? [] };
  }

  const tables = enrichTables(referencedTables, relationships);
  return {
    folderPath,
    tables,
    relationships,
    metrics: summarizeModel(tables, relationships),
    analysis: analyzeGraph({ tables, relationships }),
  };
}
