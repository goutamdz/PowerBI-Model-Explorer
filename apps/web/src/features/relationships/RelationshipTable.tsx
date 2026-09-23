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
      {relationships.map((rel) => {
        const swap = !!selectedTable && rel.toTable === selectedTable && rel.fromTable !== selectedTable;
        const leftTable = swap ? rel.toTable : rel.fromTable;
        const leftColumn = swap ? rel.toColumn : rel.fromColumn;
        const rightTable = swap ? rel.fromTable : rel.toTable;
        const rightColumn = swap ? rel.fromColumn : rel.toColumn;
        const cardinality = swap ? rel.cardinality.split(':').reverse().join(':') : rel.cardinality;
        return (
          <article key={`${rel.id}-${rel.name}`} className="space-y-3 rounded-lg border border-border bg-surface/60 p-3">
            <div className="space-y-1.5 text-xs">
              <p className="break-words font-medium text-slate-200">{leftTable}<span className="text-slate-400">[{leftColumn}]</span></p>
              <p className="break-words font-medium text-slate-200">{rightTable}<span className="text-slate-400">[{rightColumn}]</span></p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[10px]">
              <span className="rounded bg-white/5 px-2 py-1 font-mono text-cyan-300">{cardinality}</span>
              <span className={rel.isActive ? 'text-emerald-400' : 'text-red-400'}>{rel.isActive ? 'Active' : 'Inactive'}</span>
              <span className="text-slate-500">{rel.direction === 'both' ? 'Both ways' : 'One way'}</span>
            </div>
            <p className="break-words text-[11px] leading-relaxed text-slate-400">
              Filters: {rel.toTable} {rel.direction === 'both' ? '\u2194' : '\u2192'} {rel.fromTable}
            </p>
          </article>
        );
      })}
    </section>
  );
}
