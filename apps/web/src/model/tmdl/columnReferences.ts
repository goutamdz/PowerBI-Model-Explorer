import type { ColumnReference, ParsedTableDraft } from '../types.js';

interface MeasureExpression {
  sourceTable: string;
  name: string;
  expression: string;
}

function collectMeasureExpressions(tables: Record<string, ParsedTableDraft>): MeasureExpression[] {
  const expressions: MeasureExpression[] = [];
  for (const table of Object.values(tables)) {
    for (const measure of table.measures) {
      if (measure.expression) {
        expressions.push({ sourceTable: table.name, name: measure.name, expression: measure.expression });
      }
    }
  }
  return expressions;
}

export function buildColumnReferences(tables: Record<string, ParsedTableDraft>): Record<string, ColumnReference[]> {
  // The parser records calculated-column names, but only measures have captured expressions.
  const expressions = collectMeasureExpressions(tables);
  const references: Record<string, ColumnReference[]> = {};

  for (const [tableName, table] of Object.entries(tables)) {
    references[tableName] = [];
    for (const column of table.columns) {
      const escapedTable = tableName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedColumn = column.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const pattern = new RegExp(`'?${escapedTable}'?\\s*\\[${escapedColumn}\\]`, 'i');

      for (const expression of expressions) {
        if (pattern.test(expression.expression)) {
          references[tableName].push({
            column,
            referencedIn: expression.name,
            referenceType: 'measure',
            sourceTable: expression.sourceTable,
            expression: expression.expression,
          });
        }
      }
    }
  }

  return references;
}
