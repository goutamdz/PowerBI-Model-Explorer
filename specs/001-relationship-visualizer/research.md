# Research: Relationship Visualizer

## Decision 1: Use Express + TypeScript for the backend

- **Why**: The backend only needs lightweight REST endpoints, local filesystem access, and fast iteration. Express provides the smallest useful surface for this.
- **Alternatives considered**:
  - Fastify: Strong performance, but the additional plugin structure is unnecessary for this app size.
  - Next.js full-stack: Would complicate local filesystem access and blur the backend/frontend separation.

## Decision 2: Use Cytoscape.js for graph rendering

- **Why**: Cytoscape provides mature graph layout, styling, element selection, edge labels, and imperative highlighting support needed for path interaction.
- **Alternatives considered**:
  - D3.js: Flexible, but would require significantly more custom graph interaction work.
  - React Flow: Optimized more for node-editor flows than dense relationship graphs.

## Decision 3: Parse TMDL with a tolerant line-oriented parser

- **Why**: TMDL files are structured text with stable keywords, but models may vary in formatting. A targeted parser focused on `table`, `column`, `measure`, and `relationship` blocks is easier to control than attempting to generalize all TMDL semantics.
- **Alternatives considered**:
  - Full grammar parser: More accurate but disproportionately complex for the immediate functional needs.
  - Regex-only parsing without block awareness: Too brittle for multiline measures and nested indentation.

## Decision 4: Cache parsed model results in memory by folder path

- **Why**: Users may request `/model` and `/paths` repeatedly for the same folder during a session. Simple caching avoids duplicate parsing and keeps the UI responsive.
- **Alternatives considered**:
  - No cache: Simpler, but re-parses the entire model for every interaction.
  - Persistent cache: Not needed for local session-based use.

## Decision 5: Compute all simple paths with DFS and cycle protection

- **Why**: The requirement is to compute every path between two tables. DFS with visited-node tracking is the simplest correct method for enumerating simple paths.
- **Alternatives considered**:
  - BFS for all paths: Less natural for path enumeration.
  - Shortest-path only: Does not satisfy the ambiguity and multi-path requirements.

## Decision 6: Include heuristic analysis signals in the backend response

- **Why**: Disconnected tables, multi-path ambiguity, inactive edges, and table classification are derived model insights that belong near the graph model rather than being recomputed in the UI.
- **Alternatives considered**:
  - Frontend-only analysis: Duplicates logic and weakens API usefulness.
