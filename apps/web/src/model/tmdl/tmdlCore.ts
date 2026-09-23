import type { ColumnReference, MeasureDefinition, ParsedTableDraft, RelationshipDirection, RelationshipEdge, SemanticModelResponse, TableNode } from '../types.js';
import { analyzeGraph, enrichTables } from '../analysis/pathAnalysis.js';

export interface TmdlSourceFile {
  path: string;
  content: string;
}

function normalizeIdentifier(rawValue: string): string {
  return rawValue.trim().replace(/^['"]|['"]$/g, '').replace(/^\[(.+)\]$/, '$1');
}

function normalizePathValue(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function getIndentation(line: string): number {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function isBlockBoundary(line: string): boolean {
  return /^(table|column|measure|hierarchy|relationship|partition|annotation|culture|role)\b/i.test(line.trim());
}

function extractDeclarationName(line: string, keyword: string): string | undefined {
  const trimmed = line.trim();
  const pattern = new RegExp(`^${keyword}\\s+(.+?)(?:\\s*=)?$`, 'i');
  const match = trimmed.match(pattern);
  if (!match) {
    return undefined;
  }

  return normalizeIdentifier(match[1]);
}

function splitColumnReference(reference: string): { table: string; column: string } | undefined {
  const cleaned = normalizeIdentifier(reference.replace(/;$/, ''));
  const bracketMatch = cleaned.match(/^(.*?)\[(.+)\]$/);

  if (bracketMatch) {
    return {
      table: normalizeIdentifier(bracketMatch[1]),
      column: normalizeIdentifier(bracketMatch[2]),
    };
  }

  const dottedParts = cleaned.split('.');
  if (dottedParts.length >= 2) {
    return {
      table: normalizeIdentifier(dottedParts.slice(0, -1).join('.')),
      column: normalizeIdentifier(dottedParts.at(-1) ?? ''),
    };
  }

  return undefined;
}

function normalizeCardinality(fromCardinality?: string, toCardinality?: string): string {
  const normalize = (value?: string): string => {
    const lowered = value?.trim().toLowerCase();
    if (lowered === 'one' || lowered === 'single') {
      return '1';
    }

    if (lowered === 'many') {
      return '*';
    }

    return undefined as unknown as string;
  };

  const from = normalize(fromCardinality);
  const to = normalize(toCardinality);

  // If neither side is specified, default to Power BI's default: many-to-one (*:1)
  if (!from && !to) return '*:1';
  
  return `${from ?? '*'}:${to ?? '1'}`;
}

function normalizeSingleCardinality(rawValue: string): string {
  const lowered = rawValue.trim().toLowerCase().replace(/[^a-z]/g, '');
  if (lowered === 'manytomany') return '*:*';
  if (lowered === 'manytoone') return '*:1';
  if (lowered === 'onetomany') return '1:*';
  if (lowered === 'onetoone') return '1:1';
  // Already in *:1 / 1:* format
  if (/^[1*]:[1*]$/.test(rawValue.trim())) return rawValue.trim();
  return '*:*';
}

function normalizeDirection(rawValue?: string): RelationshipDirection {
  return rawValue?.toLowerCase().includes('both') ? 'both' : 'single';
}

function normalizeBoolean(rawValue?: string, defaultValue = true): boolean {
  if (!rawValue) {
    return defaultValue;
  }

  return rawValue.trim().toLowerCase() === 'true';
}

function parseMeasures(lines: string[], startIndex: number, measureIndent: number, initialExpression: string): { measure: MeasureDefinition; nextIndex: number } {
  const expressionLines: string[] = [];
  let currentIndex = startIndex + 1;

  while (currentIndex < lines.length) {
    const line = lines[currentIndex];
    const trimmed = line.trim();
    const indent = getIndentation(line);

    if (trimmed && (indent <= measureIndent
      || /^[A-Za-z]\w*\s*:/.test(trimmed)
      || /^(?:annotation|changedProperty|extendedProperty|kpi|formatStringDefinition|isHidden|isSimpleMeasure)\b/.test(trimmed))) {
      break;
    }

    expressionLines.push(line);

    currentIndex += 1;
  }

  const declaration = lines[startIndex];
  const name = extractDeclarationName(declaration.replace(/=.*/, '').trim(), 'measure') ?? 'Unnamed Measure';
  const nonEmptyLines = expressionLines.filter((line) => line.trim());
  const expressionIndent = nonEmptyLines.length ? Math.min(...nonEmptyLines.map(getIndentation)) : 0;
  const expression = [
    initialExpression.trim(),
    ...expressionLines.map((line) => line.slice(expressionIndent)),
  ].join('\n').trim();

  return {
    measure: {
      name,
      expression,
    },
    nextIndex: currentIndex - 1,
  };
}

function parseTableFile(content: string): ParsedTableDraft[] {
  const lines = content.split(/\r?\n/);
  const tables: ParsedTableDraft[] = [];
  let currentTable: ParsedTableDraft | undefined;
  let tableIndent = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      continue;
    }

    const possibleTableName = extractDeclarationName(trimmed, 'table');
    if (possibleTableName) {
      currentTable = {
        name: possibleTableName,
        columns: [],
        measures: [],
      };
      tableIndent = getIndentation(line);
      tables.push(currentTable);
      continue;
    }

    if (!currentTable || getIndentation(line) <= tableIndent) {
      continue;
    }

    const possibleColumnName = extractDeclarationName(trimmed, 'column') ?? extractDeclarationName(trimmed, 'calculatedColumn');
    if (possibleColumnName) {
      currentTable.columns.push(possibleColumnName);
      continue;
    }

    const measureMatch = trimmed.match(/^measure\s+(.+?)(?:\s*=\s*(.*))?$/i);
    if (measureMatch) {
      const initialExpression = measureMatch[2] ?? '';
      const { measure, nextIndex } = parseMeasures(lines, index, getIndentation(line), initialExpression);
      currentTable.measures.push(measure);
      index = nextIndex;
    }
  }

  return tables;
}

function parseRelationships(content: string, sourceFile: string): RelationshipEdge[] {
  const lines = content.split(/\r?\n/);
  const relationships: RelationshipEdge[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();
    const relationshipName = extractDeclarationName(trimmed, 'relationship');

    if (!relationshipName) {
      continue;
    }

    const relationshipIndent = getIndentation(line);
    const properties = new Map<string, string>();
    let innerIndex = index + 1;

    while (innerIndex < lines.length) {
      const innerLine = lines[innerIndex];
      const innerTrimmed = innerLine.trim();
      if (innerTrimmed && getIndentation(innerLine) <= relationshipIndent && isBlockBoundary(innerLine)) {
        break;
      }

      const propertyMatch = innerTrimmed.match(/^([A-Za-z]+):\s*(.+)$/);
      if (propertyMatch) {
        properties.set(propertyMatch[1].toLowerCase(), propertyMatch[2]);
      }

      innerIndex += 1;
    }

    const fromReference = splitColumnReference(properties.get('fromcolumn') ?? '');
    const toReference = splitColumnReference(properties.get('tocolumn') ?? '');
    if (fromReference && toReference) {
      const cardinality = properties.get('cardinality')
        ? normalizeSingleCardinality(properties.get('cardinality') ?? '*:*')
        : normalizeCardinality(properties.get('fromcardinality'), properties.get('tocardinality'));

      relationships.push({
        id: `${fromReference.table}.${fromReference.column}->${toReference.table}.${toReference.column}`,
        name: relationshipName,
        fromTable: fromReference.table,
        fromColumn: fromReference.column,
        toTable: toReference.table,
        toColumn: toReference.column,
        cardinality,
        direction: normalizeDirection(properties.get('crossfilteringbehavior')),
        isActive: normalizeBoolean(properties.get('isactive'), true),
        sourceFile: normalizePathValue(sourceFile),
      });
    }

    index = innerIndex - 1;
  }

  return relationships;
}

function deduplicateRelationships(relationships: RelationshipEdge[]): RelationshipEdge[] {
  const deduplicated = new Map<string, RelationshipEdge>();

  for (const relationship of relationships) {
    const key = `${relationship.name ?? ''}|${relationship.id}|${relationship.cardinality}|${relationship.direction}|${relationship.isActive}`;
    if (!deduplicated.has(key)) {
      deduplicated.set(key, relationship);
    }
  }

  return Array.from(deduplicated.values());
}

/**
 * Scan all DAX expressions across the model to find where each table's columns are referenced.
 * Looks for patterns like TableName[ColumnName] in measure and calculated-column expressions.
 */
function buildColumnReferences(
  tables: Record<string, { name: string; columns: string[]; measures: MeasureDefinition[] }>,
): Record<string, ColumnReference[]> {
  // Collect all DAX expressions across the model: { sourceTable, name, type, expression }
  const allExpressions: { sourceTable: string; name: string; type: 'measure' | 'calculated-column'; expression: string }[] = [];

  for (const table of Object.values(tables)) {
    for (const measure of table.measures) {
      if (measure.expression) {
        allExpressions.push({ sourceTable: table.name, name: measure.name, type: 'measure', expression: measure.expression });
      }
    }
  }

  const references: Record<string, ColumnReference[]> = {};

  for (const tableName of Object.keys(tables)) {
    references[tableName] = [];
    const table = tables[tableName];

    for (const column of table.columns) {
      // Build regex to find TableName[ColumnName] (case-insensitive, handles quotes/spaces)
      const escapedTable = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedColumn = column.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`'?${escapedTable}'?\\s*\\[${escapedColumn}\\]`, 'gi');

      for (const expr of allExpressions) {
        if (pattern.test(expr.expression)) {
          references[tableName].push({
            column,
            referencedIn: expr.name,
            referenceType: expr.type,
            sourceTable: expr.sourceTable,
            expression: expr.expression,
          });
        }
        // Reset regex lastIndex since we're reusing the pattern with 'g' flag
        pattern.lastIndex = 0;
      }
    }
  }

  return references;
}

export function parseSemanticModelFiles(folderPath: string, files: TmdlSourceFile[]): SemanticModelResponse {
  if (files.length === 0) {
    throw new Error('No TMDL files were found under the definition folder.');
  }

  const tablesDraft: Record<string, Omit<TableNode, 'kind' | 'degree' | 'columnReferences'>> = {};
  const relationshipsDraft: RelationshipEdge[] = [];

  for (const { path: filePath, content } of files) {

    for (const table of parseTableFile(content)) {
      if (table.name.startsWith('LocalDate')) {
        continue;
      }

      const existingTable = tablesDraft[table.name] ?? { name: table.name, columns: [], measures: [] };
      tablesDraft[table.name] = {
        name: table.name,
        columns: Array.from(new Set([...existingTable.columns, ...table.columns])).sort((left, right) => left.localeCompare(right)),
        measures: [...existingTable.measures, ...table.measures],
      };
    }

    relationshipsDraft.push(...parseRelationships(content, filePath));
  }

  // Remove relationships that reference skipped LocalDate tables
  const filteredRelationships = relationshipsDraft.filter(
    (rel) => !rel.fromTable.startsWith('LocalDate') && !rel.toTable.startsWith('LocalDate'),
  );

  const relationships = deduplicateRelationships(filteredRelationships);
  const columnReferences = buildColumnReferences(tablesDraft);

  // Attach column references to each table draft
  const tablesDraftWithRefs: Record<string, Omit<TableNode, 'kind' | 'degree'>> = {};
  for (const [name, draft] of Object.entries(tablesDraft)) {
    tablesDraftWithRefs[name] = { ...draft, columnReferences: columnReferences[name] ?? [] };
  }

  const tables = enrichTables(tablesDraftWithRefs, relationships);
  const metrics = {
    totalTables: Object.keys(tables).length,
    totalRelationships: relationships.length,
    totalActiveRelationships: relationships.filter((relationship) => relationship.isActive).length,
    totalInactiveRelationships: relationships.filter((relationship) => !relationship.isActive).length,
    totalMeasures: Object.values(tables).reduce((sum, table) => sum + table.measures.length, 0),
  };

  return {
    folderPath,
    tables,
    relationships,
    metrics,
    analysis: analyzeGraph({ tables, relationships }),
  };
}
