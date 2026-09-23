# Feature Specification: Relationship Visualizer for Power BI Semantic Models

**Feature Branch**: `[001-relationship-visualizer]`  
**Created**: 2026-04-07  
**Status**: Draft  
**Input**: User description: "Build a production-grade web application that analyzes a Power BI PBIP Semantic Model (TMDL format) and visualizes relationships, paths, and optimization insights."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Load and Understand the Model (Priority: P1)

A data modeler loads a local PBIP `.SemanticModel` folder and immediately sees the table graph, table counts, relationship counts, and measure counts so they can understand the structure of the model without opening raw TMDL files.

**Why this priority**: The core value of the product is the ability to inspect a semantic model visually. Without reliable parsing and graph rendering, none of the deeper analysis matters.

**Independent Test**: Can be fully tested by providing a valid `.SemanticModel` path and verifying that the UI renders the correct tables, relationships, measures, and top-level metrics from the source TMDL.

**Acceptance Scenarios**:

1. **Given** a valid PBIP `.SemanticModel` folder containing TMDL tables and relationships, **When** the user loads the folder, **Then** the system displays the parsed table graph and summary metrics.
2. **Given** a model with active and inactive relationships, **When** the graph renders, **Then** active relationships are visually distinct from inactive relationships and table nodes are labeled correctly.

---

### User Story 2 - Explore Filter Paths Between Tables (Priority: P1)

A data modeler selects a source table and a target table to compute every valid simple path between them, review ambiguous routing, and highlight one path at a time in the visual graph.

**Why this priority**: Path analysis is the differentiating feature for ambiguity detection and filter propagation reasoning in semantic models.

**Independent Test**: Can be fully tested by selecting two connected tables in a loaded model and verifying that the system returns all simple paths, displays them in a path list, and highlights the selected path in the graph.

**Acceptance Scenarios**:

1. **Given** a loaded model with multiple possible routes between two tables, **When** the user requests path analysis, **Then** the system lists every simple path and surfaces an ambiguity warning.
2. **Given** a listed path, **When** the user clicks that path, **Then** only the path's nodes and edges remain emphasized while unrelated graph elements fade.

---

### User Story 3 - Inspect Relationships and Measures (Priority: P2)

A semantic model reviewer clicks a relationship or table to inspect cardinality, direction, active state, and table measures so they can diagnose modeling problems and understand table responsibilities.

**Why this priority**: Once the graph is visible, users need precise inspection details to validate modeling quality and investigate why filters behave unexpectedly.

**Independent Test**: Can be fully tested by selecting a table and a relationship in the rendered graph and verifying that the inspector panels display the expected metadata and measures.

**Acceptance Scenarios**:

1. **Given** a graph edge is selected, **When** the relationship inspector opens, **Then** it shows the connected columns, cardinality, cross-filter direction, and active state.
2. **Given** a table node is selected, **When** the table detail panel opens, **Then** it lists the table measures and columns associated with that table.

---

### User Story 4 - Identify Structural Risks Quickly (Priority: P3)

A model optimization reviewer uses built-in analysis signals such as disconnected tables, multiple paths, and table classification hints to identify potential ambiguity and cleanup opportunities.

**Why this priority**: These insights make the tool more than a diagram viewer and directly support model optimization.

**Independent Test**: Can be fully tested by loading a model containing disconnected tables or ambiguous routes and verifying that warning panels and analysis counts are surfaced without requiring manual graph inspection.

**Acceptance Scenarios**:

1. **Given** a model contains disconnected tables, **When** the user loads it, **Then** the system identifies and lists the disconnected tables.
2. **Given** a selected table pair has more than one path, **When** paths are calculated, **Then** the system displays the number of possible paths and their hop counts.

### Edge Cases

- Circular relationships must not cause infinite loops during path discovery.
- Models with no relationships must still render tables and show zero-path results safely.
- Models with no path between the selected tables must show an explicit no-path state instead of a blank panel.
- Inactive relationships may appear in path results and must be visually distinguishable so users do not misread them as active filter routes.
- Relationships defined outside `relationships.tmdl` must still be discovered by scanning all TMDL files under the semantic model definition.
- Invalid or inaccessible folder paths must return actionable validation errors.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST accept a local `.SemanticModel` folder path and validate that the folder exists before parsing.
- **FR-002**: System MUST parse all TMDL files under the semantic model definition to extract table names, columns, and measures.
- **FR-003**: System MUST parse relationships from `relationships.tmdl` when present and from any other TMDL files containing relationship definitions.
- **FR-004**: System MUST normalize relationship metadata into `fromTable`, `toTable`, `fromColumn`, `toColumn`, `cardinality`, `direction`, and `isActive` fields.
- **FR-005**: System MUST expose a `GET /model` API that returns tables, relationships, graph analysis, and summary metrics for the requested folder.
- **FR-006**: System MUST expose a `GET /paths` API that returns all simple paths between a source table and a target table for the requested folder.
- **FR-007**: System MUST compute paths using graph traversal with visited-node tracking to prevent infinite loops.
- **FR-008**: System MUST render a graph where nodes represent tables and edges represent relationships.
- **FR-009**: System MUST classify tables heuristically as fact or dimension tables and render them with distinct node colors.
- **FR-010**: System MUST render active relationships as visually distinct from inactive relationships, including a dashed style for inactive edges.
- **FR-011**: Users MUST be able to select source and target tables from the UI and request path analysis without reloading the page.
- **FR-012**: Users MUST be able to click a returned path to highlight that path in the graph and fade unrelated nodes and edges.
- **FR-013**: Users MUST be able to click a relationship to inspect from-column, to-column, cardinality, direction, and active state.
- **FR-014**: Users MUST be able to click a table to inspect its columns and measures.
- **FR-015**: System MUST display metrics for total tables, total relationships, total active relationships, total inactive relationships, and total measures.
- **FR-016**: System SHOULD provide search or filtering to focus the graph on matching tables quickly.
- **FR-017**: System SHOULD identify disconnected tables and ambiguous table pairs with multiple paths.
- **FR-018**: System MUST return meaningful error responses for invalid folders, malformed requests, or parsing failures.

### Key Entities *(include if feature involves data)*

- **Semantic Model**: The parsed PBIP `.SemanticModel` folder represented as tables, relationships, metrics, and derived graph analysis.
- **Table**: A semantic model table with a name, columns, measures, heuristic classification, and relationship participation.
- **Measure**: A DAX calculation associated with a table, including its name and expression.
- **Relationship**: A directed or bidirectional connection between two table columns with active state and cardinality metadata.
- **Path Result**: A simple ordered traversal between a source table and target table, including ordered nodes, ordered edges, hop count, and inactive-edge usage.
- **Graph Analysis**: Derived insights such as disconnected tables, ambiguous path counts, and table classification totals.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can load and visualize a semantic model containing up to 100 tables and 300 relationships in under 3 seconds on a typical developer workstation.
- **SC-002**: Path computation between two tables completes in under 1 second for the target model size under normal conditions.
- **SC-003**: Users can identify relationship state, direction, and cardinality from the graph and inspector without opening raw TMDL files.
- **SC-004**: The system correctly returns zero-path, single-path, and multi-path outcomes for representative test models.
- **SC-005**: Local builds and automated tests complete successfully before release.

## Assumptions

- Users run the backend locally on the same machine that can access the target `.SemanticModel` folder path.
- Version 1 targets desktop-class browsers and local analysis workflows rather than hosted multi-user deployments.
- TMDL files follow common PBIP indentation and keyword patterns for `table`, `column`, `measure`, and `relationship` blocks.
- Path analysis returns all simple paths, with internal safety limits only if a graph becomes path-explosive.
- Authentication is out of scope for the initial local-only release.
