# Relationship Visualizer

Relationship Visualizer analyzes Power BI PBIP semantic models in the browser. Users select a local `.SemanticModel` folder; its TMDL files are read and processed on their device, not uploaded to a server.

## What it does

- Parses TMDL table, column, measure, and relationship definitions from a PBIP `.SemanticModel` directory.
- Builds a graph of tables and relationships with active/inactive and direction metadata.
- Computes all simple paths between two selected tables with cycle protection.
- Visualizes the model with Cytoscape.js, searchable navigation, path highlighting, and inspector panels.
- Compares two selected models locally and provides deterministic, rule-based model checks.

## Local processing and privacy

- A browser directory picker grants access to the selected files. A typed filesystem path cannot be opened by an internet-hosted backend.
- Parsing, metrics, column-reference analysis, path finding, comparison, and model checks run in a browser Web Worker. Graph rendering also runs locally.
- Only `.tmdl` files under the selected folder's `definition/` directory are read. DAX and Power Query expressions are not executed, and data sources are never contacted.
- User models stay in browser memory. The app does not upload files, paths, names, expressions, or results, and does not store them in local storage or a database.
- Model checks use local rules, not a cloud AI service. No API key is needed.
- The production Content Security Policy blocks `fetch`, XHR, WebSocket, and beacon connections, including from the worker. Fonts and the demo are bundled with the app.
- The website and its static assets must be downloaded initially. Model processing works without a network connection after the app and worker have loaded; this is not an installable offline/PWA cache.
- Development mode still uses Vite's local module requests and hot-reload connection. Use the production preview to verify the deployment policy.

## Project structure

```text
apps/web/     # React UI, browser worker, parser/graph code, tests, tools, and demos
  src/
    app/                  # Routing, workspace coordination, global styles
    features/
      canvas/             # Graph rendering, adaptive layout, bottom legend
      workspace/          # Tool rail, docked panels, workspace state
      tables/             # Search, focus, Table Deep Dive, column/DAX details
      relationships/      # Relationship list and edge details
      paths/              # Filter-path controls and results
      comparison/         # Compare two models
      model-checks/       # Local advisory-check UI
      model-loading/      # Semantic-model folder picker
      help/               # Feature guide, feature names, glossary
    model/
      tmdl/               # Syntax helpers, table/relationship parsing, column references
      analysis/           # Graph analysis, paths, comparison, and local suggestions
      worker/             # Worker client, message protocol, worker entry
      localModel.ts       # Loading, comparison, and rule-check operations
      types.ts            # Shared model contracts
    shared/ui/            # Reusable controls and dismissible-panel behavior
    demo/                 # Generated bundled demo (unchanged location)
    main.tsx              # React bootstrap only
  scripts/                # Node-only tools and demo exporter
  tests/                  # Parser integration tests and fixtures
  demo-source/            # Saved, portable source for the bundled demo
```

Keep feature-specific components and tests together. The app layer coordinates features and owns selections that must survive panel changes. Reusable UI must not depend on features; model processing must not import React or UI code. Browser features access background processing through `src/model/worker/client.ts`; Node-only filesystem helpers stay under `scripts/`.

Unit tests are colocated with their feature or model module. Cross-feature UI smoke tests remain with the feature guide, and filesystem/parser integration tests remain under `apps/web/tests/`. Prefer direct module imports rather than broad barrel files that can accidentally pull worker code into the UI bundle.

### Reading the code for the first time

Start with [App.tsx](apps/web/src/app/App.tsx), then follow the feature you want to understand:

1. **Open a model:** [ModelWelcome.tsx](apps/web/src/features/model-loading/ModelWelcome.tsx) renders the welcome screen. The folder picker supplies files to the worker; [localModel.ts](apps/web/src/model/localModel.ts) coordinates parsing and analysis.
2. **Use the workspace:** [ModelWorkspace.tsx](apps/web/src/app/ModelWorkspace.tsx) composes the screen. [useModelWorkspace.ts](apps/web/src/app/useModelWorkspace.ts) owns selections and worker requests, while [WorkspaceToolPanel.tsx](apps/web/src/app/WorkspaceToolPanel.tsx) chooses which tool to display. [WorkspaceChrome.tsx](apps/web/src/features/workspace/WorkspaceChrome.tsx) contains the header, toolbar, and status components.
3. **Explore details:** table and relationship features render their own panels. [ColumnUsageList.tsx](apps/web/src/features/tables/ColumnUsageList.tsx) shares column-reference presentation, and [useDismissiblePanel.ts](apps/web/src/shared/ui/useDismissiblePanel.ts) shares dismissal behavior.
4. **Compare models:** [useModelComparison.ts](apps/web/src/features/comparison/useModelComparison.ts) manages requests and loading state. [ComparisonResults.tsx](apps/web/src/features/comparison/ComparisonResults.tsx) displays the results.

Components describe what appears on screen; hooks manage state and effects; model helpers calculate results without React. Named helpers break longer operations into steps, and short comments explain non-obvious reasons rather than repeating the code.

### Canvas component responsibilities

The following modules live in [features/canvas](apps/web/src/features/canvas):

- `ModelGraph.tsx` renders the canvas container and hover card.
- `useModelGraph.ts` connects React to Cytoscape and owns graph creation, updates, controls, and cleanup.
- `graph.ts` converts semantic-model relationships into correctly oriented graph elements.
- `graphStyles.ts` owns node/edge styles and shared relationship-label styling.
- `graphLayout.ts` coordinates table sizing and layout candidates.
- `layoutGeometry.ts` measures crossings and links passing behind table cards.
- `layoutOptimization.ts` tries a bounded number of table-position swaps.
- `layoutPacking.ts` fits disconnected groups into spare canvas space.
- `layoutSpacing.ts` separates cards and expands the arrangement to use the canvas.
- `graphHighlights.ts` applies inspection, path, focus, and search highlights in priority order.
- `graphInteractions.ts` binds hover/click handlers and shares one relationship-detail mapping.
- `graphViewport.ts` handles centered zoom, exact-table navigation, and debounced resize updates.
- `EdgeHoverCard.tsx` renders relationship hover details independently of the graph lifecycle.

Selection callbacks can change without recreating the graph. Hover movement is coalesced into one React update per animation frame; pending frames, listeners, resize timers, and the graph are cleaned up on unmount. Search, focus, path-finding, and model-check panels accept values and callbacks as props so the same UI can be reused without duplicating workspace state.

### Model-processing responsibilities

Follow the data from selected files through the worker into [tmdlCore.ts](apps/web/src/model/tmdl/tmdlCore.ts):

- [syntax.ts](apps/web/src/model/tmdl/syntax.ts) handles identifiers, indentation, declarations, and column references.
- [tableParser.ts](apps/web/src/model/tmdl/tableParser.ts) reads tables, columns, and measure expressions; [relationshipParser.ts](apps/web/src/model/tmdl/relationshipParser.ts) reads and deduplicates relationships.
- [columnReferences.ts](apps/web/src/model/tmdl/columnReferences.ts) detects column references in measures without executing DAX.
- [graphAnalysis.ts](apps/web/src/model/analysis/graphAnalysis.ts) builds adjacency and computes structural metrics. [pathAnalysis.ts](apps/web/src/model/analysis/pathAnalysis.ts) keeps the public graph/path operations.
- [modelComparison.ts](apps/web/src/model/analysis/modelComparison.ts) compares relationships; [modelSuggestions.ts](apps/web/src/model/analysis/modelSuggestions.ts) applies deterministic advisory rules.

Node tools reuse the same browser-safe parsing logic. [demoSerialization.ts](apps/web/scripts/lib/demoSerialization.ts) handles portable demo output and semantic round-trip checks separately from filesystem access. None of these modules upload a model or contact its data sources.

## Run locally

### Find the right feature

Use **Feature guide** on the welcome screen, map, or comparison screen for one short instruction per feature, basic map controls, and essential limitations. It is a quick reference, not a glossary or tutorial.

The canvas opens with no panels and an icon-only left toolbar. Use the compact **Expand feature bar** icon at the top to show icons and feature names in single-line rows, similar to Azure portal navigation; **Collapse feature bar** restores the slim icon rail. Descriptions remain in the tool panels and feature guide rather than the navigation. Changing the toolbar width resizes the graph without clearing the selected tool or highlights. The toolbar scrolls when its contents exceed the available height, while its expand/collapse control stays available. Hover over icons or truncated names to see their full names.

Selecting a tool opens one panel at a time in a docked right panel, resizing the graph rather than covering it. On narrow screens, the panel docks below the graph.

Tables automatically rearrange to use both the width and height of the available canvas when a panel opens or closes, or the window resizes. Compact table cards reduce empty space between relationships without stretching their shapes. **Show whole map** also rearranges the tables; manual positions and zoom are reset on the next canvas resize. Large models and small screens may still require zooming to read individual names.

Automatic layout compares deterministic arrangements and improves table ordering to reduce edge crossings and links passing behind unrelated tables. Disconnected groups are packed into the available space beside or below the connected graph instead of reserving a separate band above it. Parallel relationships use separate curves so active and inactive links remain individually visible. Dense models can still have unavoidable crossings; use focus or path highlighting to isolate the relationships you need.

Table boxes progressively shrink as the model grows beyond 13 tables, from 156 x 64 down to a minimum of 120 x 52 in graph coordinates. Names wrap within the smaller boxes; their base font size stays unchanged. Automatic zoom still adapts the entire map to the canvas.

Close a panel, or select its icon again, to reclaim the space. Tool selections and highlights remain; **Clear view** resets search, focus, inspection, and path selections. Opening another graph tool switches the highlighted view without losing previous selections.

The top bar contains zoom and **Show whole map** controls. **Feature guide**, **Hover details**, and comparison are available from the left toolbar. **Hover details** has an on/off switch in the expanded bar (green means on); the eye icon toggles the same setting when collapsed. An open eye means on; a crossed-out eye means off, in either toolbar mode. Use a click, Enter, or Space to toggle relationship tooltips. A compact legend sits in the center of the bottom status bar with only Active link, Inactive link, Fact table, Dimension table, and Search match. Model metrics remain on the right on wide screens and move below the legend on smaller screens. The path swap button sits beside the stacked inputs. Relationship lists and model checks open inside the tool panel instead of floating over the graph.

| Feature | What it does |
| --- | --- |
| Find a table | Highlights matching names; selecting a result centers and zooms to that table. |
| Focus on selected tables | Emphasizes selected tables and their connecting lines without removing other tables. |
| Table Deep Dive | Shows one table's directly connected neighbors and their relationship columns. |
| Trace filter paths | Highlights routes from a starting table to a destination, including connections through intermediate tables. |
| Browse relationships | Lists linked columns, filter direction, row matching, and active/inactive status. |
| Inspect columns and formulas | Click a table to read columns, DAX measures, and detected column references in measures. |
| Check model structure | Runs advisory checks locally without changing the model. |
| Compare two models | Compares relationships between two model folders, not row data or DAX formulas. |

Search result selection stays in view after the canvas resizes. Select the same result again to return to it after panning. Click a table on the canvas to inspect its columns and formulas; selecting a search result does not open that dialog.

Paths include inactive relationships and show up to 2,000 unique table routes. A highlighted path does not prove a filter is active. Fact/dimension labels are estimates, and column-reference detection is not a complete dependency analysis.

### Start the app

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the frontend (no backend is required):

   ```bash
   npm run dev
   ```

3. Open the frontend at `http://localhost:5173`.

4. Select **Choose model folder** and choose the `.SemanticModel` directory containing `definition/`, or select **Explore demo model**.

For a production-style local preview, run `npm run build`, then `npm run preview --workspace apps/web`. The preview applies the same security headers as Vercel.

## Deploy on Vercel

Import the repository with the repository root as the Vercel Root Directory. Use Node.js 22.12+ or 24. The root `vercel.json` supplies the Vite build command, `apps/web/dist` output directory, and production security headers. The optional `api/health.ts` function is the only backend endpoint. No model-processing server, AI token, or environment variables are needed.

Do not reintroduce upload endpoints, cloud AI calls, or analytics that collect model metadata without changing the privacy contract. Hosting the frontend and health function together does not move user-model processing off the device.

## Bundled demo

The public demo is based on `Demo.SemanticModel`, extended with five synthetic tables and six relationships: **13 tables, 11 relationships (10 active and 1 inactive), and 16 measures**. It preserves the original table, column, and measure names, measure DAX, and relationship metadata. These names and expressions are intentionally public in the browser bundle.

The added tables are `Product Category`, `Product Subcategory`, `Supplier`, `Region`, and `Country`, each with key and descriptive columns. `Product.SupplierKey` and `Store.Country Code` connect the existing tables to the additions; existing product subcategory and customer country codes are reused.

After selecting **Explore demo model**, use these source/target pairs to explore transitive filter paths:

| Source | Target | Filter paths |
| --- | --- | --- |
| Product Category | Sales | Product Category -> Product Subcategory -> Product -> Sales (3 hops) |
| Supplier | Sales | Supplier -> Product -> Sales (2 hops) |
| Region | Sales | Region -> Country -> Store -> Sales, and Region -> Country -> Customer -> Sales (two 3-hop paths) |

All added relationships are active, single-direction, many-to-one. The region routes deliberately demonstrate multiple filter paths/ambiguity; this is a visualization example, not a recommendation for a production Power BI model. The existing inactive delivery-date relationship and disconnected helper tables remain available for inspection. No row data is generated, and the original Desktop model is unchanged.

Only the details used by the visualizer are saved. Power Query partitions, connection definitions, caches, lineage tags, measure formatting/KPI metadata, cultures, roles, and perspectives are excluded. Calculation-group expressions and calculated-column expressions are not currently represented by the visualizer.

To replace the demo from a local model, run:

```powershell
npm run demo:export --workspace apps/web -- "C:\Users\DELL\Desktop\Demo.SemanticModel"
```

This reads table and relationship definitions without modifying the supplied folder. It replaces the extracted fixture at `apps/web/demo-source/Demo.SemanticModel/definition/demo.tmdl` and updates the bundled `apps/web/src/demo/model.json`, removing the synthetic extensions unless they are present in the supplied model. Review names and DAX before using another model as the public demo.

To regenerate it locally after deliberately changing the source fixture:

```bash
npm run demo:export --workspace apps/web
```

The extracted fixture is excluded from Vercel deployment uploads by `.vercelignore`; the generated browser demo is bundled with the app. No access to the original local model folder is needed to build, test, or regenerate the saved demo.

## Available scripts

- `npm run dev`: starts the frontend only
- `npm run build`: builds the frontend and browser worker into `apps/web/dist`
- `npm run test`: runs workspace tests
- `npm run lint`: type-checks the frontend, shared parser, tests, and local tools

## API

Only `GET /api/health` remains. The previous `/api/model`, `/api/demo`, `/api/paths`, `/api/compare`, and `/api/suggestions` endpoints have been removed. Historical specs describe the original server-processing design, not the current local-only runtime.
