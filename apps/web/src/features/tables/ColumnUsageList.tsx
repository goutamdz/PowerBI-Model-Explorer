import { useMemo } from 'react';
import type { TableNode } from '../../model/types';

type ColumnReference = TableNode['columnReferences'][number];

function groupReferencesByColumn(references: ColumnReference[]) {
  const groups = new Map<string, ColumnReference[]>();
  for (const reference of references) {
    const group = groups.get(reference.column) ?? [];
    group.push(reference);
    groups.set(reference.column, group);
  }
  return groups;
}

function findRelevantLines(expression: string, tableName: string, column: string) {
  // Table and column names may contain regex symbols; match those names literally.
  const escapePattern = (name: string) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const pattern = new RegExp(`'?${escapePattern(tableName)}'?\\s*\\[${escapePattern(column)}\\]`, 'i');
  return expression.split('\n').filter((line) => pattern.test(line)).map((line) => line.trim());
}

export function ColumnUsageList({ table }: { table: TableNode }) {
  const referencesByColumn = useMemo(
    () => groupReferencesByColumn(table.columnReferences),
    [table.columnReferences],
  );

  if (table.columnReferences.length === 0) return null;

  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-slate-200">Where these columns are used</h3>
      <p className="mb-2 text-xs text-slate-400">Detected column references in measures, not a full dependency analysis.</p>
      <div className="space-y-3">
        {Array.from(referencesByColumn.entries()).map(([column, references]) => (
          <div key={column} className="rounded-xl border border-white/[0.06] bg-surface p-3">
            <p className="mb-2 text-xs font-semibold text-white">
              <span className="text-slate-500">{table.name}</span>
              <span className="text-accent">[{column}]</span>
              <span className="ml-2 rounded-full bg-white/[0.06] px-2 py-0.5 font-mono text-[10px] text-slate-400">{references.length} usage{references.length > 1 ? 's' : ''}</span>
            </p>
            <div className="space-y-2">
              {references.map((reference, index) => (
                <ColumnUsage
                  key={`${reference.referencedIn}-${reference.sourceTable}-${index}`}
                  tableName={table.name}
                  column={column}
                  reference={reference}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ColumnUsage({ tableName, column, reference }: {
  tableName: string;
  column: string;
  reference: ColumnReference;
}) {
  const matchingLines = findRelevantLines(reference.expression, tableName, column);
  const expression = matchingLines.length > 0 ? matchingLines.join('\n') : reference.expression;

  return (
    <div className="rounded-lg bg-panel p-2.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`rounded-md px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${reference.referenceType === 'measure' ? 'bg-accent/15 text-accent' : 'bg-amber-400/15 text-amber-400'}`}>
          {reference.referenceType === 'measure' ? 'Measure' : 'Calc Column'}
        </span>
        <span className="text-xs font-semibold text-white">{reference.referencedIn}</span>
        <span className="rounded-md bg-white/[0.06] px-1.5 py-0.5 text-[10px] text-slate-400">
          Table: <span className="text-slate-300">{reference.sourceTable}</span>
        </span>
      </div>
      <pre className="mt-1.5 overflow-x-auto whitespace-pre-wrap font-mono text-[10px] leading-relaxed text-slate-400">{expression}</pre>
    </div>
  );
}
