import { describe, expect, it } from 'vitest';
import type { RelationshipEdge } from '../types';
import { analyzeGraph, enrichTables, findAllPaths } from './pathAnalysis';

function createTables(names: string[], relationships: RelationshipEdge[] = []) {
  const drafts = Object.fromEntries(names.map((name) => [
    name, { name, columns: [], measures: [], columnReferences: [] },
  ]));
  return enrichTables(drafts, relationships);
}

function link(fromTable: string, toTable: string, overrides: Partial<RelationshipEdge> = {}): RelationshipEdge {
  return {
    id: `${fromTable}->${toTable}`, fromTable, toTable, fromColumn: 'Key', toColumn: 'Key',
    cardinality: '*:1', direction: 'single', isActive: true, sourceFile: 'test.tmdl', ...overrides,
  };
}

describe('path and graph analysis', () => {
  it('follows filter direction, includes inactive links, and prevents cycles', () => {
    const relationships = [
      link('B', 'A', { direction: 'both' }),
      link('C', 'B', { direction: 'both', isActive: false }),
      link('C', 'A'),
    ];
    const tables = createTables(['A', 'B', 'C'], relationships);
    const paths = findAllPaths(tables, relationships, 'A', 'C');
    expect(paths.map((path) => path.nodes)).toEqual([['A', 'C'], ['A', 'B', 'C']]);
    expect(paths.map((path) => path.containsInactiveRelationship)).toEqual([false, true]);
    expect(findAllPaths(tables, relationships, 'C', 'A').map((path) => path.nodes)).toEqual([['C', 'B', 'A']]);
    for (const path of paths) {
      expect(new Set(path.nodes).size).toBe(path.nodes.length);
    }
  });

  it('limits raw routes before deduplication and retains the first parallel edge', () => {
    const relationships = [
      link('B', 'A', { id: 'first' }),
      link('B', 'A', { id: 'second', isActive: false }),
      link('C', 'B'),
      link('C', 'A'),
    ];
    const tables = createTables(['A', 'B', 'C']);
    const limited = findAllPaths(tables, relationships, 'A', 'C', 2);
    expect(limited).toEqual([{
      nodes: ['A', 'B', 'C'], edges: ['first', 'C->B'], hopCount: 2, containsInactiveRelationship: false,
    }]);
    expect(findAllPaths(tables, relationships, 'A', 'C')).toHaveLength(2);
    expect(findAllPaths(tables, relationships, 'A', 'C', 0)).toEqual([]);
    expect(findAllPaths(tables, relationships, 'missing', 'missing')).toEqual([]);
    expect(findAllPaths(tables, relationships, 'A', 'A', 0)).toEqual([{
      nodes: ['A'], edges: [], hopCount: 0, containsInactiveRelationship: false,
    }]);
  });

  it('uses all links for connectivity, keeps tied groups stable, and counts each relationship', () => {
    const relationships = [
      link('B', 'A', { isActive: false }),
      link('B', 'A', { direction: 'both' }),
      link('D', 'C'),
    ];
    const tables = createTables(['A', 'B', 'C', 'D', 'Bridge Helper'], relationships);
    expect(tables.B.degree).toBe(2);
    expect(tables.B.kind).toBe('fact');
    expect(tables.A.kind).toBe('dimension');
    expect(tables['Bridge Helper'].kind).toBe('fact');
    expect(analyzeGraph({ tables, relationships })).toEqual({
      disconnectedTables: ['C', 'D', 'Bridge Helper'],
      factTables: ['B', 'D', 'Bridge Helper'],
      dimensionTables: ['A', 'C'],
      relationshipIssues: { inactiveCount: 1, bidirectionalCount: 1, multipleRelationshipPairs: ['A::B'] },
    });
  });
});
