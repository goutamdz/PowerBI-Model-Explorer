export const featureHelp = {
  load: {
    title: 'Open your Power BI model',
    description: 'Choose a .SemanticModel folder. Files stay on your device.',
  },
  demo: {
    title: 'Explore demo model',
    description: 'Open the sample model to try tools without choosing files.',
  },
  search: {
    title: 'Find a table',
    description: 'Search by name, then select a result to locate its table.',
  },
  focus: {
    title: 'Focus on selected tables',
    description: 'Add tables to highlight them and the links between them.',
  },
  inspect: {
    title: 'Table Deep Dive',
    description: 'Choose a table to highlight its direct neighbors and linked columns.',
  },
  paths: {
    title: 'Trace filter paths',
    description: 'Choose start and destination; Trace paths highlights connecting routes.',
  },
  relationships: {
    title: 'Browse relationships',
    description: 'View linked columns, filter directions, and active or inactive status.',
  },
  details: {
    title: 'Inspect columns and formulas',
    description: 'Click a table on the map to read columns and DAX.',
  },
  checks: {
    title: 'Check model structure',
    description: 'Select Run model checks to get local, advisory suggestions.',
  },
  compare: {
    title: 'Compare two models',
    description: 'Choose two folders; Compare relationships lists added, removed, or changed links.',
  },
} as const;
