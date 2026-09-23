const legendItems = [
  { label: 'Active link', hint: 'Used by default.', swatch: 'h-0.5 w-4 bg-[#3b82f6]' },
  { label: 'Inactive link', hint: 'Not used by default.', swatch: 'h-0.5 w-4 border-t-2 border-dashed border-[#ef4444]' },
  { label: 'Fact table', hint: 'Events or calculations (estimated).', swatch: 'h-3 w-3 rounded-sm border border-[#10b981] bg-[#065f46]' },
  { label: 'Dimension table', hint: 'Descriptive or lookup table (estimated).', swatch: 'h-3 w-3 rounded-sm border border-[#3b82f6] bg-[#1e40af]' },
  { label: 'Search match', hint: 'A table matching your search.', swatch: 'h-3 w-3 rounded-sm border border-[#f59e0b] bg-[#92400e]' },
];

export function MapLegend() {
  return (
    <section aria-label="Map legend" className="flex min-h-7 items-center justify-center">
      <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-1">
        {legendItems.map(({ label, hint, swatch }) => (
          <li key={label} title={hint} className="flex items-center gap-1.5 whitespace-nowrap text-[10px] text-slate-400">
            <span aria-hidden="true" className="flex w-4 shrink-0 justify-center"><span className={swatch} /></span>
            <span>{label}</span><span className="sr-only">: {hint}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
