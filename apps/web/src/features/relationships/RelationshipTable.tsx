import type { RelationshipEdge } from '../../model/types';

interface RelationshipTableProps {
  relationships: RelationshipEdge[];
  selectedTable?: string;
}

export function RelationshipTable({ relationships, selectedTable }: RelationshipTableProps) {
  return (
    <section aria-label="Relationship list" className="space-y-3">
      <p className="text-xs text-slate-400">{relationships.length} relationships</p>
      <p className="text-[11px] leading-relaxed text-slate-500">Row matching: 1 = unique key, * = repeated values.</p>
      {relationships.length === 0 ? <p className="text-xs text-slate-400">No relationships to show for this selection.</p> : null}
      {relationships.map((relationship) => (
        <RelationshipCard key={`${relationship.id}-${relationship.name}`} relationship={relationship} selectedTable={selectedTable} />
      ))}
    </section>
  );
}

function RelationshipCard({ relationship, selectedTable }: { relationship: RelationshipEdge; selectedTable?: string }) {
  const { fromTable, fromColumn, toTable, toColumn, isActive, direction } = relationship;
  // Put the inspected table first without changing the relationship's filter direction.
  const showTargetFirst = !!selectedTable && toTable === selectedTable && fromTable !== selectedTable;
  const firstTable = showTargetFirst ? toTable : fromTable;
  const firstColumn = showTargetFirst ? toColumn : fromColumn;
  const secondTable = showTargetFirst ? fromTable : toTable;
  const secondColumn = showTargetFirst ? fromColumn : toColumn;
  const cardinality = showTargetFirst
    ? relationship.cardinality.split(':').reverse().join(':')
    : relationship.cardinality;

  return (
    <article className="space-y-3 rounded-lg border border-border bg-surface/60 p-3">
      <div className="space-y-1.5 text-xs">
        <p className="break-words font-medium text-slate-200">{firstTable}<span className="text-slate-400">[{firstColumn}]</span></p>
        <p className="break-words font-medium text-slate-200">{secondTable}<span className="text-slate-400">[{secondColumn}]</span></p>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-[10px]">
        <span className="rounded bg-white/5 px-2 py-1 font-mono text-cyan-300">{cardinality}</span>
        <span className={isActive ? 'text-emerald-400' : 'text-red-400'}>{isActive ? 'Active' : 'Inactive'}</span>
        <span className="text-slate-500">{direction === 'both' ? 'Both ways' : 'One way'}</span>
      </div>
      <p className="break-words text-[11px] leading-relaxed text-slate-400">
        Filters: {toTable} {direction === 'both' ? '\u2194' : '\u2192'} {fromTable}
      </p>
    </article>
  );
}
