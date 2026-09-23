export const featureHelp = {
  load: {
    title: 'Open your Power BI model',
    description: 'Choose a .SemanticModel folder. Files stay on your device.',
  },
  demo: {
    title: 'Explore demo model',
    description: 'Try a 13-table sample model. No setup needed.',
  },
  search: {
    title: 'Find a table',
    description: 'Search by name to highlight tables on the map.',
  },
  focus: {
    title: 'Focus on selected tables',
    description: 'Explore your selected tables and the relationships between them.',
  },
  inspect: {
    title: 'Table Deep Dive',
    description: 'Inspect direct relationships, matching columns, and filter directions for a table.',
  },
  paths: {
    title: 'Trace filter paths',
    description: 'Follow filters between tables, directly or through other tables.',
  },
  relationships: {
    title: 'Browse relationships',
    description: 'List linked columns, filter directions, and relationship settings.',
  },
  details: {
    title: 'Inspect columns and formulas',
    description: 'Click a table to explore its columns and DAX calculations.',
  },
  checks: {
    title: 'Check model structure',
    description: 'Review relationship settings. AI integration is a potential future enhancement.',
  },
  compare: {
    title: 'Compare model relationships',
    description: 'Find added, missing, or changed relationships between two models.',
  },
} as const;

export const modelTerms = [
  { term: 'Relationship', definition: 'A link between columns in two tables. It allows a filter on one table to affect related rows in another.' },
  { term: 'Filter path / transitive connection', definition: 'A route through one or more relationships. Category -> Product -> Sales is a two-hop path; each hop is one relationship.' },
  { term: 'Multiple paths', definition: 'More than one table route connects your chosen start and destination. Review which relationships are active before deciding whether filters are ambiguous.' },
  { term: 'Active / inactive', definition: 'An active relationship is used by default. An inactive one needs to be enabled for a calculation, for example with USERELATIONSHIP in DAX.' },
  { term: 'Cardinality (row matching)', definition: '1 means a unique key; * means values can repeat. *:1 means many rows on the first side can match one row on the second.' },
  { term: 'Filter direction', definition: 'An arrow shows which table can filter the other. A two-way relationship allows filtering in both directions.' },
  { term: 'Fact / dimension', definition: 'A fact table usually holds events or transactions; a dimension describes things such as products or dates. The map guesses these roles from structure, names, and measures.' },
  { term: 'Measure / DAX', definition: 'A measure is a calculation such as total sales. DAX is the formula language used by Power BI. This app displays formulas; it does not run them.' },
] as const;
