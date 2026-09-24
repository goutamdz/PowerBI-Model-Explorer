import { SearchableSelect } from '../../shared/ui/SearchableSelect';
import { ToolIcon } from '../../shared/ui/ToolIcon';

interface FocusTablesPanelProps {
  tableNames: string[];
  focusedTables: string[];
  onAddTable: (name: string) => void;
  onRemoveTable: (name: string) => void;
  onClear: () => void;
}

export function FocusTablesPanel({ tableNames, focusedTables, onAddTable, onRemoveTable, onClear }: FocusTablesPanelProps) {
  const availableTables = tableNames.filter((name) => !focusedTables.includes(name));

  return (
    <div className="space-y-3">
      <SearchableSelect value="" options={availableTables} placeholder="Add table to view..." onChange={onAddTable} />
      {focusedTables.map((name) => (
        <div key={name} className="flex items-center justify-between gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-slate-200">
          <span className="break-all">{name}</span>
          <button type="button" aria-label={`Remove ${name} from focus`} onClick={() => onRemoveTable(name)} className="rounded p-1 hover:bg-white/10">
            <ToolIcon name="close" />
          </button>
        </div>
      ))}
      {focusedTables.length ? (
        <button type="button" onClick={onClear} className="text-xs text-accent">Show all tables</button>
      ) : (
        <p className="text-xs text-slate-500">All tables are currently shown.</p>
      )}
    </div>
  );
}
