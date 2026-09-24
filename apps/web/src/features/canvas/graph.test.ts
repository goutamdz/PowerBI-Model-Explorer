import { describe, expect, it } from 'vitest';
import demo from '../../demo/model.json';
import { parseSemanticModelFiles } from '../../model/tmdl/tmdlCore';
import { buildGraphElements, collectAllPathElements, formatPath } from './graph';

const model = parseSemanticModelFiles(demo.name, demo.files);

describe('model-to-canvas conversion', () => {
  it('preserves table metadata and relationship counts', () => {
    const elements = buildGraphElements(model);
    const tables = elements.filter((element) => element.data.source === undefined);
    const relationships = elements.filter((element) => element.data.source !== undefined);

    expect(tables).toHaveLength(Object.keys(model.tables).length);
    expect(relationships).toHaveLength(model.relationships.length);
    expect(tables.find((element) => element.data.id === 'Sales')?.data).toEqual({
      id: 'Sales',
      label: 'Sales',
      kind: model.tables.Sales.kind,
      measures: model.tables.Sales.measures.length,
      columns: model.tables.Sales.columns.length,
      degree: model.tables.Sales.degree,
    });
  });

  it('points filter arrows and cardinalities from Calendar to Sales', () => {
    const elements = buildGraphElements(model);
    const orderDate = elements.find((element) => element.data.id === 'Sales.Order Date->Calendar.Date');
    const deliveryDate = elements.find((element) => element.data.id === 'Sales.Delivery Date->Calendar.Date');

    expect(orderDate?.data).toMatchObject({
      source: 'Calendar',
      target: 'Sales',
      fromColumn: 'Date',
      toColumn: 'Order Date',
      cardinality: '1:*',
      sourceCard: '1',
      targetCard: '*',
      active: 'true',
    });
    expect(deliveryDate?.data).toMatchObject({
      source: 'Calendar',
      target: 'Sales',
      fromColumn: 'Date',
      toColumn: 'Delivery Date',
      active: 'false',
    });
  });

  it('combines overlapping paths without duplicate tables or links', () => {
    const firstPath = {
      nodes: ['A', 'B', 'C'], edges: ['ab', 'bc'], hopCount: 2, containsInactiveRelationship: false,
    };
    const secondPath = {
      nodes: ['B', 'C', 'D'], edges: ['bc', 'cd'], hopCount: 2, containsInactiveRelationship: true,
    };
    const selection = collectAllPathElements([firstPath, secondPath]);

    expect([...selection.nodes]).toEqual(['A', 'B', 'C', 'D']);
    expect([...selection.edges]).toEqual(['ab', 'bc', 'cd']);
    expect(formatPath(firstPath)).toBe('A  \u2192  B  \u2192  C');
    expect(collectAllPathElements([])).toEqual({ nodes: new Set(), edges: new Set() });
  });
});
