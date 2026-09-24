import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CompareResponse, RelationshipSnapshot } from '../../model/types';
import { ComparisonResults } from './ComparisonResults';

const relationship: RelationshipSnapshot = {
  fromTable: 'Sales',
  fromColumn: 'ProductKey',
  toTable: 'Product',
  toColumn: 'ProductKey',
  cardinality: '*:1',
  direction: 'single',
  isActive: true,
};

const result: CompareResponse = {
  folderA: 'Original',
  folderB: 'Revised',
  totalA: 2,
  totalB: 2,
  totalDiffs: 3,
  diffs: [
    { key: 'Removed relationship', kind: 'only-in-a', a: relationship },
    { key: 'Added relationship', kind: 'only-in-b', b: { ...relationship, isActive: false } },
    { key: 'Changed relationship', kind: 'different', differences: ['direction: single vs both'] },
  ],
};

describe('comparison results', () => {
  it('shows added, removed, and changed settings with their original labels', () => {
    const html = renderToStaticMarkup(<ComparisonResults result={result} filter="all" onFilter={() => {}} />);
    for (const label of ['Only in Model A', 'Only in Model B', 'Changed settings', 'Cardinality: *:1', 'Active', 'Inactive']) {
      expect(html).toContain(label);
    }
    expect(html).toContain('single');
    expect(html).toContain('both');
    expect(html).toContain('→');
    expect(html).toContain('(3)');
  });

  it('filters cards without changing the summary or filter counts', () => {
    const html = renderToStaticMarkup(<ComparisonResults result={result} filter="only-in-b" onFilter={() => {}} />);
    expect(html).toContain('Added relationship');
    expect(html).not.toContain('Removed relationship');
    expect(html).not.toContain('Changed relationship');
    expect(html).toContain('2 relationships');
    expect(html).toContain('(3)');
    expect(html.match(/\(1\)/g)).toHaveLength(3);
  });

  it('keeps the scope warning when there are no relationship differences', () => {
    const identical = { ...result, totalDiffs: 0, diffs: [] };
    const html = renderToStaticMarkup(<ComparisonResults result={identical} filter="all" onFilter={() => {}} />);
    expect(html).toContain('No relationship differences found');
    expect(html).toContain('Other model content may differ.');
    expect(html).not.toContain('All changes');
  });
});
