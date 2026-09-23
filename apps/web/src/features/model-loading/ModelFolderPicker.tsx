import { useRef } from 'react';

interface ModelFolderPickerProps {
  label: string;
  folderName?: string;
  disabled?: boolean;
  onSelect: (files: File[]) => void;
}

export function ModelFolderPicker({ label, folderName, disabled, onSelect }: ModelFolderPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-w-0 space-y-2">
      <input
        ref={inputRef}
        type="file"
        aria-label={label}
        accept=".tmdl"
        multiple
        {...{ webkitdirectory: '' }}
        disabled={disabled}
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.currentTarget.files ?? []);
          event.currentTarget.value = '';
          if (files.length > 0) onSelect(files);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="w-full rounded-lg border border-accent/40 bg-accent/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent/20 focus-visible:outline focus-visible:outline-accent disabled:opacity-50"
      >
        {label}
      </button>
      {folderName ? <p className="break-all font-mono text-xs text-slate-400">{folderName}</p> : null}
    </div>
  );
}