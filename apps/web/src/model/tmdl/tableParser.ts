import type { MeasureDefinition, ParsedTableDraft } from '../types.js';
import { extractDeclarationName, getIndentation } from './syntax.js';

function endsMeasureExpression(line: string, measureIndent: number): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  // Metadata and KPI formulas belong to the measure, but not to its DAX expression.
  return getIndentation(line) <= measureIndent
    || /^[A-Za-z]\w*\s*:/.test(trimmed)
    || /^(?:annotation|changedProperty|extendedProperty|kpi|formatStringDefinition|isHidden|isSimpleMeasure)\b/.test(trimmed);
}

function parseMeasure(
  lines: string[],
  startIndex: number,
  initialExpression: string,
): { measure: MeasureDefinition; lastExpressionIndex: number } {
  const measureIndent = getIndentation(lines[startIndex]);
  const expressionLines: string[] = [];
  let currentIndex = startIndex + 1;

  while (currentIndex < lines.length) {
    const line = lines[currentIndex];
    if (endsMeasureExpression(line, measureIndent)) {
      break;
    }
    expressionLines.push(line);
    currentIndex += 1;
  }

  const declaration = lines[startIndex].replace(/=.*/, '').trim();
  const name = extractDeclarationName(declaration, 'measure') ?? 'Unnamed Measure';
  const nonEmptyLines = expressionLines.filter((line) => line.trim());
  const expressionIndent = nonEmptyLines.length > 0
    ? Math.min(...nonEmptyLines.map(getIndentation))
    : 0;
  const expression = [
    initialExpression.trim(),
    ...expressionLines.map((line) => line.slice(expressionIndent)),
  ].join('\n').trim();

  return { measure: { name, expression }, lastExpressionIndex: currentIndex - 1 };
}

export function parseTableFile(content: string): ParsedTableDraft[] {
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

    const tableName = extractDeclarationName(trimmed, 'table');
    if (tableName) {
      currentTable = { name: tableName, columns: [], measures: [] };
      tableIndent = getIndentation(line);
      tables.push(currentTable);
      continue;
    }

    if (!currentTable || getIndentation(line) <= tableIndent) {
      continue;
    }

    const columnName = extractDeclarationName(trimmed, 'column')
      ?? extractDeclarationName(trimmed, 'calculatedColumn');
    if (columnName) {
      currentTable.columns.push(columnName);
      continue;
    }

    const measureMatch = trimmed.match(/^measure\s+(.+?)(?:\s*=\s*(.*))?$/i);
    if (measureMatch) {
      const { measure, lastExpressionIndex } = parseMeasure(lines, index, measureMatch[2] ?? '');
      currentTable.measures.push(measure);
      index = lastExpressionIndex;
    }
  }

  return tables;
}
