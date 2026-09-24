import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import demo from '../demo/model.json';
import { analyzeLocalPaths, compareLocalModels, loadLocalModel, suggestLocalImprovements } from './localModel';
import { parseSemanticModelFiles } from './tmdl/tmdlCore';
import { collectFilesRecursive } from '../../scripts/lib/fs';

const fixturePath = fileURLToPath(new URL('../../tests/fixtures/sample.SemanticModel/', import.meta.url));

async function sampleFiles() {
  const paths = await collectFilesRecursive(path.join(fixturePath, 'definition'), '.tmdl');
  return Promise.all(paths.map(async (filePath) => ({
    path: `sample.SemanticModel/${path.relative(fixturePath, filePath).replace(/\\/g, '/')}`,
    file: new Blob([await readFile(filePath, 'utf8')]),
  })));
}

afterEach(() => vi.unstubAllGlobals());

describe('local model processing', () => {
  it('bundles the Demo.SemanticModel names, DAX, and relationship features', () => {
    const model = parseSemanticModelFiles(demo.name, demo.files);
    expect(demo.name).toBe('Demo.SemanticModel');
    expect(model.metrics).toEqual({
      totalTables: 13,
      totalRelationships: 11,
      totalActiveRelationships: 10,
      totalInactiveRelationships: 1,
      totalMeasures: 16,
    });
    expect(Object.keys(model.tables).sort()).toEqual([
      'About', 'Calendar', 'Country', 'Customer', 'Field Parameter', 'Product', 'Product Category',
      'Product Subcategory', 'Region', 'Sales', 'Store', 'Supplier', 'Time Intelligence',
    ]);
    expect(model.tables.Sales.columns).toContain('Net Price');
    expect(model.tables.Sales.measures.find((measure) => measure.name === 'Sales Amount')?.expression)
      .toBe("SUMX('Sales', 'Sales'[Quantity] * 'Sales'[Net Price])");
    expect(model.tables.Sales.columnReferences).toContainEqual(expect.objectContaining({
      column: 'Net Price', referencedIn: 'Sales Amount', sourceTable: 'Sales',
    }));
    expect(model.relationships.find((relationship) => !relationship.isActive)).toMatchObject({
      fromTable: 'Sales', fromColumn: 'Delivery Date', toTable: 'Calendar', toColumn: 'Date',
    });
    expect(JSON.stringify(demo)).not.toMatch(/https?:|lineageTag|partition |Sql\.Database|Web\.Contents|formatString:|targetExpression/);
  });

  it('connects five additional demo tables using existing endpoint columns', () => {
    const model = parseSemanticModelFiles(demo.name, demo.files);
    const additions = {
      'Product Category': ['Category Code', 'Category', 'Description'],
      'Product Subcategory': ['Subcategory Code', 'Subcategory', 'Category Code', 'Description'],
      Supplier: ['SupplierKey', 'Supplier', 'Contact Name', 'Lead Time Days'],
      Region: ['RegionKey', 'Region', 'Sales Manager'],
      Country: ['Country Code', 'Country', 'Currency Code', 'RegionKey'],
    };
    for (const [name, columns] of Object.entries(additions)) {
      expect(model.tables[name].columns).toEqual(expect.arrayContaining(columns));
      expect(model.tables[name].degree).toBeGreaterThan(0);
      expect(model.analysis.disconnectedTables).not.toContain(name);
    }
    for (const relationship of model.relationships) {
      expect(model.tables[relationship.fromTable].columns).toContain(relationship.fromColumn);
      expect(model.tables[relationship.toTable].columns).toContain(relationship.toColumn);
    }
  });

  it('traces transitive demo paths in the filter direction', () => {
    const model = parseSemanticModelFiles(demo.name, demo.files);
    const categoryPaths = analyzeLocalPaths(model, 'Product Category', 'Sales');
    expect(categoryPaths.totalPaths).toBe(1);
    expect(categoryPaths.ambiguous).toBe(false);
    expect(categoryPaths.paths[0]).toMatchObject({
      nodes: ['Product Category', 'Product Subcategory', 'Product', 'Sales'],
      hopCount: 3,
      containsInactiveRelationship: false,
    });
    expect(categoryPaths.paths[0].edges).toHaveLength(3);
    const supplierPaths = analyzeLocalPaths(model, 'Supplier', 'Sales');
    expect(supplierPaths.totalPaths).toBe(1);
    expect(supplierPaths.paths[0]).toMatchObject({
      nodes: ['Supplier', 'Product', 'Sales'],
      hopCount: 2,
      containsInactiveRelationship: false,
    });
    expect(analyzeLocalPaths(model, 'Sales', 'Product Category').totalPaths).toBe(0);
  });

  it('demonstrates multiple transitive demo routes to the same fact table', () => {
    const model = parseSemanticModelFiles(demo.name, demo.files);
    const paths = analyzeLocalPaths(model, 'Region', 'Sales');
    expect(paths.totalPaths).toBe(2);
    expect(paths.ambiguous).toBe(true);
    expect(paths.paths.map((path) => path.nodes)).toEqual(expect.arrayContaining([
      ['Region', 'Country', 'Store', 'Sales'],
      ['Region', 'Country', 'Customer', 'Sales'],
    ]));
    for (const path of paths.paths) {
      expect(path.hopCount).toBe(3);
      expect(path.edges).toHaveLength(3);
      expect(path.containsInactiveRelationship).toBe(false);
    }
  });

  it('loads, traces paths, compares and suggests without a network request', async () => {
    const network = vi.fn(() => { throw new Error('Network access is forbidden'); });
    vi.stubGlobal('fetch', network);
    const model = await loadLocalModel(await sampleFiles());

    expect(model.folderPath).toBe('sample.SemanticModel');
    expect(model.metrics.totalTables).toBe(4);
    expect(model.metrics.totalRelationships).toBe(4);
    expect(model.relationships.every((relationship) => relationship.sourceFile.startsWith('definition/'))).toBe(true);
    expect(analyzeLocalPaths(model, 'Customer', 'Sales').totalPaths).toBe(2);
    expect(compareLocalModels(model, model).totalDiffs).toBe(0);
    expect(suggestLocalImprovements(model).suggestions.map((suggestion) => suggestion.title)).toContain('Check inactive relationships');
    expect(suggestLocalImprovements(model).suggestions.find((suggestion) => suggestion.title === 'Check inactive relationships')?.description).toMatch(/^1 relationship is inactive\./);
    expect(network).not.toHaveBeenCalled();
  });

  it('reads only definition TMDL and rejects invalid folder selections', async () => {
    const unreadableFile = { text: vi.fn(() => { throw new Error('Unrelated file was read'); }) } as unknown as Blob;
    const files = await sampleFiles();
    const model = await loadLocalModel([...files,
      { path: 'sample.SemanticModel/.pbi/cache.abf', file: unreadableFile },
      { path: 'sample.SemanticModel/DAXQueries/query.tmdl', file: unreadableFile },
    ]);
    expect(model.metrics.totalTables).toBe(4);
    expect(unreadableFile.text).not.toHaveBeenCalled();
    await expect(loadLocalModel([])).rejects.toThrow('Select one semantic model folder');
    await expect(loadLocalModel([{ path: 'Sales.tmdl', file: new Blob(['table Sales']) }])).rejects.toThrow('Select one semantic model folder');
    await expect(loadLocalModel([{ path: 'Empty/definition/model.tmdl', file: new Blob(['model Model']) }])).rejects.toThrow('No table definitions');
  });

  it('reports changed, added and removed relationships', async () => {
    const model = await loadLocalModel(await sampleFiles());
    const modified = structuredClone(model);
    modified.folderPath = 'changed.SemanticModel';
    modified.relationships[0].isActive = !modified.relationships[0].isActive;
    modified.relationships.pop();
    modified.relationships.push({ ...model.relationships[0], fromColumn: 'OtherKey' });

    const comparison = compareLocalModels(model, modified);
    expect(comparison.totalDiffs).toBe(3);
    expect(comparison.diffs.map((diff) => diff.kind).sort()).toEqual(['different', 'only-in-a', 'only-in-b']);
  });

  it('matches reversed endpoints and cardinalities for bidirectional relationships', async () => {
    const model = await loadLocalModel(await sampleFiles());
    const modified = structuredClone(model);
    const relationship = modified.relationships.find((candidate) => candidate.direction === 'both')!;
    [relationship.fromTable, relationship.toTable] = [relationship.toTable, relationship.fromTable];
    [relationship.fromColumn, relationship.toColumn] = [relationship.toColumn, relationship.fromColumn];
    relationship.cardinality = relationship.cardinality.split(':').reverse().join(':');
    expect(compareLocalModels(model, modified).totalDiffs).toBe(0);
  });

  it('rejects multiple selected folders before reading and reports missing tables in discovery order', async () => {
    const unreadableFile = { text: vi.fn() } as unknown as Blob;
    await expect(loadLocalModel([
      { path: 'First/definition/table.tmdl', file: unreadableFile },
      { path: 'Second/definition/table.tmdl', file: unreadableFile },
    ])).rejects.toThrow('Select one semantic model folder');
    expect(unreadableFile.text).not.toHaveBeenCalled();
    await expect(loadLocalModel([{
      path: 'First/definition/model.tmdl',
      file: new Blob(['table Sales\nrelationship Missing\n\tfromColumn: Z.Key\n\ttoColumn: A.Key']),
    }])).rejects.toThrow('The model is missing table definitions: Z, A.');
  });

  it('keeps comparison difference ordering and uses the last link for duplicate endpoint pairs', async () => {
    const model = await loadLocalModel(await sampleFiles());
    const modified = structuredClone(model);
    modified.relationships[0] = {
      ...modified.relationships[0], cardinality: '1:1', direction: 'both', isActive: false,
    };
    const original = model.relationships[0];
    const comparison = compareLocalModels(model, modified);
    expect(comparison.diffs[0].differences).toEqual([
      `cardinality: ${original.cardinality} vs 1:1`,
      `direction: ${original.direction} vs both`,
      `active: ${original.isActive} vs false`,
    ]);
    modified.relationships.push({ ...original });
    expect(compareLocalModels(model, modified).totalDiffs).toBe(0);
  });

  it('returns deterministic suggestions in rule order without changing the model', async () => {
    const model = await loadLocalModel(await sampleFiles());
    model.relationships[0].cardinality = '*:*';
    model.analysis.disconnectedTables = ['Helper'];
    model.analysis.relationshipIssues.multipleRelationshipPairs = ['Customer::Sales'];
    const before = structuredClone(model);
    const result = suggestLocalImprovements(model);
    expect(result.suggestions.map(({ title }) => title)).toEqual([
      'Review bidirectional filtering',
      'Review many-to-many relationships',
      'Check inactive relationships',
      'Review separate table groups',
      'Review multiple links between the same tables',
    ]);
    expect(suggestLocalImprovements(model)).toEqual(result);
    expect(model).toEqual(before);
  });
});