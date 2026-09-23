# Data Model: Relationship Visualizer

## SemanticModelResponse

- **folderPath**: Absolute path to the `.SemanticModel` folder that was parsed.
- **tables**: Map keyed by table name.
- **relationships**: Array of normalized relationship objects.
- **metrics**: Aggregated counts used by the dashboard.
- **analysis**: Derived model insights such as disconnected tables and ambiguity summary.

## TableNode

- **name**: Table name.
- **columns**: Array of column names.
- **measures**: Array of measures.
- **kind**: `fact` or `dimension`, determined heuristically.
- **degree**: Relationship count for display and analysis.

## MeasureDefinition

- **name**: Measure name.
- **expression**: Raw DAX expression captured from the TMDL block.

## RelationshipEdge

- **id**: Stable ID derived from endpoints.
- **name**: Optional TMDL relationship name.
- **fromTable**: Source table name.
- **fromColumn**: Source column name.
- **toTable**: Target table name.
- **toColumn**: Target column name.
- **cardinality**: Normalized string such as `1:*`, `*:1`, or `*:*`.
- **direction**: `single` or `both`.
- **isActive**: Boolean active-state flag.
- **sourceFile**: TMDL file path where the relationship was discovered.

## MetricsSummary

- **totalTables**
- **totalRelationships**
- **totalActiveRelationships**
- **totalInactiveRelationships**
- **totalMeasures**

## GraphAnalysis

- **disconnectedTables**: Array of table names with zero graph connectivity to the main component or no edges at all.
- **factTables**: Array of table names heuristically classified as facts.
- **dimensionTables**: Array of table names heuristically classified as dimensions.
- **relationshipIssues**: Derived warnings such as inactive count and bidirectional count.

## PathResult

- **nodes**: Ordered list of table names from source to target.
- **edges**: Ordered list of relationship IDs used in the path.
- **hopCount**: Number of relationship hops.
- **containsInactiveRelationship**: Whether any edge in the path is inactive.
