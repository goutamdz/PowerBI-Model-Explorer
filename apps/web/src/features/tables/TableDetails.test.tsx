import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { TableNode } from '../../model/types';
import demo from '../../demo/model.json';
import { parseSemanticModelFiles } from '../../model/tmdl/tmdlCore';
import { ColumnUsageList } from './ColumnUsageList';
import { TableDetailPopup } from './TableDetailPopup';
import { TableInspector } from './TableInspector';

const table: TableNode = {
  name: 'Sales (Local)',
  kind: 'fact',
  degree: 2,
  columns: ['Amount+Tax'],
  measures: [{ name: 'Total', expression: "SUM('Sales (Local)'[Amount+Tax])" }],
  columnReferences: [
    {
      column: 'Amount+Tax',
      referencedIn: 'Total',
      referenceType: 'measure',
      sourceTable: 'Summary',
      expression: "VAR unrelated = 1\nRETURN SUM('Sales (Local)'[Amount+Tax])",
    },
    {
      column: 'Amount+Tax',
      referencedIn: 'Copy',
      referenceType: 'calculated-column',
      sourceTable: 'Sales (Local)',
      expression: '[Amount+Tax]',
    },
  ],
};

describe('table detail sections', () => {
  it('groups references and shows relevant lines for names containing regex symbols', () => {
    const html = renderToStaticMarkup(<ColumnUsageList table={table} />);
    expect(html.match(/2 usages/g)).toHaveLength(1);
    expect(html).toContain('RETURN SUM(');
    expect(html).not.toContain('VAR unrelated');
    expect(html).toContain('Summary');
    expect(html).toContain('Calc Column');
    expect(html).toContain('>[Amount+Tax]</pre>');
  });

  it('keeps the table statistics, columns, formulas, and close button', () => {
    const html = renderToStaticMarkup(<TableDetailPopup table={table} onClose={() => {}} />);
    for (const text of ['Columns', 'Measures', 'Relationships', 'Formula references', 'Total', 'Amount+Tax', 'Formulas are shown, not executed.']) {
      expect(html).toContain(text);
    }
    expect(html).toContain('aria-label="Close table details"');
    expect(html).toContain('Where these columns are used');
  });

  it('omits empty measure and usage sections', () => {
    const empty = { ...table, measures: [], columnReferences: [] };
    const html = renderToStaticMarkup(<TableDetailPopup table={empty} onClose={() => {}} />);
    expect(html).not.toContain('Measures — DAX calculations');
    expect(html).not.toContain('Where these columns are used');
    expect(html).toContain('Columns — fields in this table');
  });

  it('counts distinct neighbors separately from relationships in the inspector', () => {
    const model = parseSemanticModelFiles(demo.name, demo.files);
    const relationship = model.relationships[0];
    model.relationships = [relationship, { ...relationship, id: 'duplicate-link' }];
    const html = renderToStaticMarkup(
      <TableInspector model={model} selectedTable={relationship.fromTable} onSelectTable={() => {}} />,
    );
    expect(html).toContain('Directly connected tables:</span><span class="font-mono font-semibold text-emerald-300">1</span>');
    expect(html).toContain('Relationships:</span><span class="font-mono font-semibold text-emerald-300">2</span>');
    expect(html).toContain(relationship.toTable);
    expect(html).toContain('Clear Selection');
  });
});
