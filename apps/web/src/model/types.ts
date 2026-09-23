export type TableKind = 'fact' | 'dimension';
export type RelationshipDirection = 'single' | 'both';

export interface MeasureDefinition {
  name: string;
  expression: string;
}

export interface ColumnReference {
  column: string;
  referencedIn: string;
  referenceType: 'measure' | 'calculated-column';
  sourceTable: string;
  expression: string;
}

export interface TableNode {
  name: string;
  columns: string[];
  measures: MeasureDefinition[];
  columnReferences: ColumnReference[];
  kind: TableKind;
  degree: number;
}

export interface RelationshipEdge {
  id: string;
  name?: string;
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  cardinality: string;
  direction: RelationshipDirection;
  isActive: boolean;
  sourceFile: string;
}

export interface MetricsSummary {
  totalTables: number;
  totalRelationships: number;
  totalActiveRelationships: number;
  totalInactiveRelationships: number;
  totalMeasures: number;
}

export interface GraphAnalysis {
  disconnectedTables: string[];
  factTables: string[];
  dimensionTables: string[];
  relationshipIssues: {
    inactiveCount: number;
    bidirectionalCount: number;
    multipleRelationshipPairs: string[];
  };
}

export interface PathResult {
  nodes: string[];
  edges: string[];
  hopCount: number;
  containsInactiveRelationship: boolean;
}

export interface PathsResponse {
  source: string;
  target: string;
  totalPaths: number;
  ambiguous: boolean;
  paths: PathResult[];
}

export interface SemanticModelResponse {
  folderPath: string;
  tables: Record<string, TableNode>;
  relationships: RelationshipEdge[];
  metrics: MetricsSummary;
  analysis: GraphAnalysis;
}

export interface ParsedTableDraft {
  name: string;
  columns: string[];
  measures: MeasureDefinition[];
}

export interface RelationshipSnapshot {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  cardinality: string;
  direction: string;
  isActive: boolean;
}

export type DiffKind = 'only-in-a' | 'only-in-b' | 'different';

export interface RelationshipDiff {
  kind: DiffKind;
  key: string;
  a?: RelationshipSnapshot;
  b?: RelationshipSnapshot;
  differences?: string[];
}

export interface CompareResponse {
  folderA: string;
  folderB: string;
  totalA: number;
  totalB: number;
  totalDiffs: number;
  diffs: RelationshipDiff[];
}
