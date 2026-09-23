const paths = {
  search: 'M21 21l-5-5M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  focus: 'M4 4h16l-6 7v7l-4 3V11L4 4',
  inspect: 'M9 12h6M12 9v6M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  paths: 'M5 4h9a4 4 0 0 1 0 8H9a4 4 0 0 0 0 8h10M16 17l3 3-3 3M5 2v4',
  relationships: 'M3 5h18v14H3V5m0 5h18M9 5v14M15 5v14',
  checks: 'M9 5H5v16h14V5h-4M9 3h6v4H9V3m-1 11 3 3 5-6',
  compare: 'M4 7h16m-4-4 4 4-4 4M20 17H4m4-4-4 4 4 4',
  hover: 'M3 12s3-7 9-7 9 7 9 7-3 7-9 7-9-7-9-7m12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
  help: 'M9 9a3 3 0 1 1 5 2c-2 1-2 2-2 3m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
  close: 'm6 6 12 12M6 18 18 6',
  fit: 'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  clear: 'M3 11a9 9 0 1 1 3 8M3 4v7h7',
  swap: 'M7 20V4m-4 4 4-4 4 4m6-4v16m-4-4 4 4 4-4',
};

export function ToolIcon({ name }: { name: keyof typeof paths }) {
  return (
    <svg aria-hidden="true" className="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}
