import assert from 'node:assert/strict';
import type { RelationshipEdge, SemanticModelResponse, TableNode } from '../../src/model/types.js';
import { parseSemanticModelFiles } from '../../src/model/tmdl/tmdlCore.js';

function quoteIdentifier(name: string): string {
  return `'${name.replace(/'/g, "''")}'`;
}

function serializeTable(table: TableNode): string {
  const lines = [`table ${quoteIdentifier(table.name)}`];
  for (const column of table.columns) {
    lines.push(`\tcolumn ${quoteIdentifier(column)}`);
  }
  for (const measure of table.measures) {
    lines.push(`\tmeasure ${quoteIdentifier(measure.name)} =`);
    for (const line of measure.expression.split('\n')) {
      lines.push(`\t\t\t${line}`);
    }
  }
  return lines.join('\n');
}

function serializeRelationship(relationship: RelationshipEdge, index: number): string {
  const [fromCardinality, toCardinality] = relationship.cardinality.split(':');
  return [
    `relationship ${quoteIdentifier(relationship.name ?? `Relationship${index + 1}`)}`,
    `\tisActive: ${relationship.isActive}`,
    `\tcrossFilteringBehavior: ${relationship.direction === 'both' ? 'bothDirections' : 'oneDirection'}`,
    `\tfromCardinality: ${fromCardinality === '1' ? 'one' : 'many'}`,
    `\ttoCardinality: ${toCardinality === '1' ? 'one' : 'many'}`,
    `\tfromColumn: ${quoteIdentifier(relationship.fromTable)}.${quoteIdentifier(relationship.fromColumn)}`,
    `\ttoColumn: ${quoteIdentifier(relationship.toTable)}.${quoteIdentifier(relationship.toColumn)}`,
  ].join('\n');
}

export function serializeDemo(model: SemanticModelResponse) {
  // Rebuild from parsed fields so source partitions and connection metadata stay out.
  const blocks = Object.values(model.tables).map(serializeTable);
  blocks.push(...model.relationships.map(serializeRelationship));
  return {
    name: 'Demo.SemanticModel',
    files: [{ path: 'definition/demo.tmdl', content: `${blocks.join('\n\n')}\n` }],
  };
}

export function validateDemoRoundTrip(demo: ReturnType<typeof serializeDemo>, original: SemanticModelResponse): SemanticModelResponse {
  const parsed = parseSemanticModelFiles(demo.name, demo.files);
  assert.deepEqual(parsed.metrics, original.metrics);
  assert.deepEqual(parsed.tables, original.tables);
  assert.deepEqual(parsed.analysis, original.analysis);
  // Export changes file locations, not relationship semantics.
  assert.deepEqual(
    parsed.relationships.map(({ sourceFile, ...relationship }) => relationship),
    original.relationships.map(({ sourceFile, ...relationship }) => relationship),
  );
  return parsed;
}
