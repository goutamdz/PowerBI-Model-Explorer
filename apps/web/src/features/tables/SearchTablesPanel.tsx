interface SearchTablesPanelProps {
  searchTerm: string;
  searchMatches: string[];
  selectedTable?: string | null;
  onSearch: (term: string) => void;
  onSelectTable: (name: string) => void;
}

export function SearchTablesPanel({ searchTerm, searchMatches, selectedTable, onSearch, onSelectTable }: SearchTablesPanelProps) {
  return (
    <div className="space-y-3">
      <input
        autoFocus
        aria-label="Find a table by name"
        placeholder="Search tables..."
        value={searchTerm}
        onChange={(event) => onSearch(event.target.value)}
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-white outline-none focus:border-accent"
      />
      <p className="text-xs text-slate-500">{searchMatches.length} matching tables</p>
      <ul className="space-y-1">
        {searchMatches.map((name) => (
          <li key={name}>
            <button
              type="button"
              title={`Locate ${name} on the map`}
              aria-current={selectedTable === name ? 'true' : undefined}
              onClick={() => onSelectTable(name)}
              className={`w-full rounded-lg px-3 py-2 text-left text-xs ${selectedTable === name ? 'bg-accent/15 text-accent' : 'text-slate-300 hover:bg-white/5 hover:text-white'}`}
            >
              {name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
