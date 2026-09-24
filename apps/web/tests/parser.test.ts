import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEMO_MODEL_PATH } from '../scripts/config.js';
import { collectFilesRecursive } from '../scripts/lib/fs.js';
import { parseSemanticModel } from '../scripts/lib/tmdlParser.js';
import { serializeDemo, validateDemoRoundTrip } from '../scripts/lib/demoSerialization.js';
import { findAllPaths } from '../src/model/analysis/pathAnalysis.js';
import { parseSemanticModelFiles } from '../src/model/tmdl/tmdlCore.js';
import demo from '../src/demo/model.json';

const sampleModelPath = path.resolve(process.cwd(), 'tests/fixtures/sample.SemanticModel');

describe('parseSemanticModel', () => {
  it('parses in-memory TMDL exactly like the filesystem adapter', async () => {
    const paths = await collectFilesRecursive(path.join(sampleModelPath, 'definition'), '.tmdl');
    const files = await Promise.all(paths.map(async (filePath) => ({
      path: filePath,
      content: await readFile(filePath, 'utf8'),
    })));

    expect(parseSemanticModelFiles(sampleModelPath, files)).toEqual(await parseSemanticModel(sampleModelPath));
    expect(() => parseSemanticModelFiles('empty', [])).toThrow('No TMDL files');
  });

  it('parses tables, measures, relationships, and metrics', async () => {
    const model = await parseSemanticModel(sampleModelPath);

    expect(Object.keys(model.tables)).toHaveLength(4);
    expect(model.metrics.totalRelationships).toBe(4);
    expect(model.metrics.totalMeasures).toBe(1);
    expect(model.analysis.relationshipIssues.inactiveCount).toBe(1);
    expect(model.tables.Sales.kind).toBe('fact');
    expect(model.tables.Product.kind).toBe('dimension');
  });

  it('finds all simple paths without looping', async () => {
    const model = await parseSemanticModel(sampleModelPath);
    // Directed traversal follows cross-filter direction (dimension → fact).
    // Customer → Returns (via Customer_Returns) → Product (via Returns_Product, bidirectional)
    const paths = findAllPaths(model.tables, model.relationships, 'Customer', 'Product');

    expect(paths).toHaveLength(1);
    expect(paths[0].nodes[0]).toBe('Customer');
    expect(paths[0].containsInactiveRelationship).toBe(true);
    expect(findAllPaths(model.tables, model.relationships, 'Customer', 'Sales')).toHaveLength(2);
    expect(findAllPaths(model.tables, model.relationships, 'Customer', 'Sales', 1)).toHaveLength(1);
  });

  it('keeps the bundled demo in sync with the extracted source fixture', async () => {
    const model = await parseSemanticModel(DEMO_MODEL_PATH);
    const bundled = parseSemanticModelFiles(demo.name, demo.files);

    expect(bundled.metrics).toEqual(model.metrics);
    expect(bundled.tables).toEqual(model.tables);
    expect(bundled.analysis).toEqual(model.analysis);
    expect(bundled.relationships.map(({ sourceFile, ...relationship }) => relationship))
      .toEqual(model.relationships.map(({ sourceFile, ...relationship }) => relationship));
    expect(model.analysis.disconnectedTables).toEqual(['About', 'Field Parameter', 'Time Intelligence']);
    expect(model.analysis.relationshipIssues.inactiveCount).toBe(1);
    expect(model.relationships.every((relationship) => relationship.direction === 'single' && relationship.cardinality === '*:1')).toBe(true);
  });

  it('extracts inline and multiline DAX without measure properties or KPI expressions', () => {
    const model = parseSemanticModelFiles('test', [{
      path: 'definition/tables/Sales.tmdl',
      content: [
        'table Sales',
        '\tmeasure Total = SUM(Sales[Quantity])',
        '\t\tformatString: #,##0',
        '\t\tlineageTag: excluded-tag',
        '\t\tannotation PBI_FormatHint = {"isCustom":true}',
        '\t/// Description of the next measure',
        '\tmeasure Margin =',
        '\t\t\tSUMX (',
        '\t\t\t    Sales,',
        '\t\t\t    Sales[Quantity] * Sales[Price]',
        '\t\t\t)',
        '\t\tformatString: $ #,##0',
        '\t\tkpi',
        '\t\t\ttargetExpression = 0.3',
        '\tcolumn Quantity',
        '\tcolumn Price',
      ].join('\n'),
    }]);
    expect(model.tables.Sales.measures).toEqual([
      { name: 'Total', expression: 'SUM(Sales[Quantity])' },
      { name: 'Margin', expression: 'SUMX (\n    Sales,\n    Sales[Quantity] * Sales[Price]\n)' },
    ]);
    expect(model.tables.Sales.columns).toEqual(['Price', 'Quantity']);
  });

  it.each([
    ['', '*:1'],
    ['fromCardinality: one', '1:1'],
    ['toCardinality: many', '*:*'],
    ['fromCardinality: single\n\ttoCardinality: many', '1:*'],
    ['fromCardinality: unsupported\n\ttoCardinality: unsupported', '*:1'],
    ['cardinality: ManyToMany', '*:*'],
    ['cardinality: many-to-one', '*:1'],
    ['cardinality: OneToMany', '1:*'],
    ['cardinality: OneToOne', '1:1'],
    ['cardinality: 1:*', '1:*'],
    ['cardinality: unsupported', '*:*'],
    ['cardinality: manyToOne\n\tfromCardinality: one\n\ttoCardinality: many', '*:1'],
  ])('preserves cardinality normalization for %j', (properties, cardinality) => {
    const model = parseSemanticModelFiles('test', [{
      path: 'definition\\relationships.tmdl',
      content: `relationship Link\n\tfromColumn: Sales.Key\n\ttoColumn: Product[Key]\n\t${properties}`,
    }]);
    expect(model.relationships[0]).toMatchObject({
      id: 'Sales.Key->Product.Key', cardinality, direction: 'single', isActive: true,
      sourceFile: 'definition/relationships.tmdl',
    });
  });

  it('merges table fragments, excludes auto-date tables, and retains distinct parallel links', () => {
    const relationship = [
      'relationship Link',
      "\tfromColumn: 'Order Lines'.'Product Key'",
      '\ttoColumn: Product[Key]',
      '\tcrossFilteringBehavior: bothDirections',
      '\tisActive: FALSE',
    ].join('\n');
    const model = parseSemanticModelFiles('test', [
      { path: 'first.tmdl', content: [
        "table 'Order Lines'", "\tcolumn 'Product Key'", '\tcolumn Z',
        '\tmeasure Total = 1', 'table Product', '\tcolumn Key',
        'table LocalDateTable_1', '\tcolumn Date', relationship,
        'relationship AutoDate', '\tfromColumn: LocalDateTable_1.Date', '\ttoColumn: Product.Key',
        'relationship Incomplete', '\tfromColumn: Product.Key',
      ].join('\n') },
      { path: 'second.tmdl', content: [
        "table 'Order Lines'", '\tcolumn A', '\tcolumn Z', '\tmeasure Total = 2',
        relationship, relationship.replace('Link', 'Alternate'),
      ].join('\n') },
    ]);
    expect(Object.keys(model.tables)).toEqual(['Order Lines', 'Product']);
    expect(model.tables['Order Lines'].columns).toEqual(['A', 'Product Key', 'Z']);
    expect(model.tables['Order Lines'].measures).toEqual([
      { name: 'Total', expression: '1' }, { name: 'Total', expression: '2' },
    ]);
    expect(model.relationships.map((relationship) => relationship.name)).toEqual(['Link', 'Alternate']);
    expect(model.relationships[0]).toMatchObject({ isActive: false, direction: 'both', sourceFile: 'first.tmdl' });
    expect(model.analysis.relationshipIssues.multipleRelationshipPairs).toEqual(['Order Lines::Product']);
  });

  it('finds quoted and case-insensitive DAX references once per measure with literal regex characters', () => {
    const model = parseSemanticModelFiles('test', [{
      path: 'model.tmdl',
      content: [
        "table 'Sales.2026'", "\tcolumn 'Net+Price'",
        "\tmeasure First = SUM('Sales.2026'[Net+Price]) + SUM('Sales.2026'[Net+Price])",
        'table Other',
        "\tmeasure Second = SUM('sales.2026' [net+price])",
        "\tmeasure NotAMatch = SUM('SalesX2026'[NetPrice])",
      ].join('\n'),
    }]);
    expect(model.tables['Sales.2026'].columnReferences.map(({ column, referencedIn, sourceTable, referenceType }) =>
      ({ column, referencedIn, sourceTable, referenceType }),
    )).toEqual([
      { column: 'Net+Price', referencedIn: 'First', sourceTable: 'Sales.2026', referenceType: 'measure' },
      { column: 'Net+Price', referencedIn: 'Second', sourceTable: 'Other', referenceType: 'measure' },
    ]);
  });

  it('serializes and validates the demo without source metadata or filesystem writes', async () => {
    const model = await parseSemanticModel(DEMO_MODEL_PATH);
    const exported = serializeDemo(model);
    expect(exported).toEqual(demo);
    expect(validateDemoRoundTrip(exported, model).metrics).toEqual(model.metrics);
    const changed = structuredClone(exported);
    changed.files[0].content += '\ntable Unexpected\n';
    expect(() => validateDemoRoundTrip(changed, model)).toThrow();
  });

  it('preserves filesystem adapter error messages for invalid input', async () => {
    await expect(parseSemanticModel('   ')).rejects.toThrow('Folder path is required.');
    await expect(parseSemanticModel(path.join(sampleModelPath, 'missing'))).rejects.toThrow();
  });
});
