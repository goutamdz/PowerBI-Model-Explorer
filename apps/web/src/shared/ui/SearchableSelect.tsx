import { useEffect, useRef, useState } from 'react';

interface SearchableSelectProps {
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
}

export function SearchableSelect({ value, options, placeholder, onChange }: SearchableSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const matchingOptions = query
    ? options.filter((option) => option.toLowerCase().includes(query.toLowerCase()))
    : options;

  useEffect(() => {
    setQuery('');
  }, [value]);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  function handleSelect(option: string) {
    onChange(option);
    setQuery('');
    setOpen(false);
  }

  function handleInputChange(text: string) {
    setQuery(text);
    setOpen(true);
    if (!text) onChange('');
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        type="text"
        aria-label={placeholder}
        value={query || value}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-500/50 bg-surface px-3 py-2 text-xs text-white outline-none transition focus:border-accent focus:ring-1 focus:ring-accent/30"
      />
      {open && matchingOptions.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-slate-600/50 bg-panel shadow-lg">
          {matchingOptions.map((option) => (
            <li key={option}>
              <button
                type="button"
                onClick={() => handleSelect(option)}
                className={`w-full px-3 py-1.5 text-left text-xs transition hover:bg-accent/20 ${option === value ? 'bg-accent/10 text-accent' : 'text-white'}`}
              >
                {option}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && matchingOptions.length === 0 && query && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-slate-600/50 bg-panel px-3 py-2 text-xs text-slate-500">
          No tables match "{query}"
        </div>
      )}
    </div>
  );
}
