import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEMO_MODEL_PATH } from '../scripts/config.js';
import { collectFilesRecursive } from '../scripts/lib/fs.js';
import { parseSemanticModel } from '../scripts/lib/tmdlParser.js';
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
});
