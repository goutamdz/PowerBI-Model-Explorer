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
api/          # Optional Vercel health endpoint; no model-processing API
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
      tmdl/               # Browser-safe TMDL parsing
      analysis/           # Graph analysis and directed path finding
      worker/             # Worker client, message protocol, worker entry
      localModel.ts       # Loading, comparison, and rule-check operations
      types.ts            # Shared model contracts
    shared/ui/            # Reusable select and icon components
    demo/                 # Generated bundled demo (unchanged location)
    main.tsx              # React bootstrap only
  scripts/                # Node-only tools and demo exporter
  tests/                  # Parser integration tests and fixtures
  demo-source/            # Saved, portable source for the bundled demo
```

Keep feature-specific components and tests together. The app layer coordinates features and owns selections that must survive panel changes. Reusable UI must not depend on features; model processing must not import React or UI code. Browser features access background processing through `src/model/worker/client.ts`; Node-only filesystem helpers stay under `scripts/`.

Unit tests are colocated with their feature or model module. Cross-feature UI smoke tests remain with the feature guide, and filesystem/parser integration tests remain under `apps/web/tests/`. Prefer direct module imports rather than broad barrel files that can accidentally pull worker code into the UI bundle.

### Canvas component responsibilities

- `ModelGraph.tsx` connects React to Cytoscape and owns creation/cleanup.
- `graph.ts` converts semantic-model relationships into correctly oriented graph elements.
- `graphStyles.ts` owns node/edge styles and shared relationship-label styling.
- `graphLayout.ts` sizes, separates, and arranges tables.
- `graphHighlights.ts` applies inspection, path, focus, and search highlights in priority order.
- `graphInteractions.ts` binds hover/click handlers and shares one relationship-detail mapping.
- `graphViewport.ts` handles centered zoom and debounced resize updates.
- `EdgeHoverCard.tsx` renders relationship hover details independently of the graph lifecycle.

Selection callbacks can change without recreating the graph. Hover movement is coalesced into one React update per animation frame; pending frames, listeners, resize timers, and the graph are cleaned up on unmount. Search, focus, path-finding, and model-check panels accept values and callbacks as props so the same UI can be reused without duplicating workspace state.

## Run locally

### Find the right feature

Use **Feature guide** on the welcome screen, map, or comparison screen for a plain-language glossary and step-by-step demo examples.

The canvas opens with no panels. A slim left toolbar opens one tool at a time in a docked right panel, resizing the graph rather than covering it. On narrow screens, the panel docks below the graph. Hover over icons to see their names.

Tables automatically rearrange to use both the width and height of the available canvas when a panel opens or closes, or the window resizes. Compact table cards reduce empty space between relationships without stretching their shapes. **Show whole map** also rearranges the tables; manual positions and zoom are reset on the next canvas resize. Large models and small screens may still require zooming to read individual names.

Table boxes progressively shrink as the model grows beyond 13 tables, from 156 x 64 down to a minimum of 120 x 52 in graph coordinates. Names wrap within the smaller boxes; their base font size stays unchanged. Automatic zoom still adapts the entire map to the canvas.

Close a panel, or select its icon again, to reclaim the space. Tool selections and highlights remain; **Clear view** resets search, focus, inspection, and path selections. Opening another graph tool switches the highlighted view without losing previous selections.

The top bar contains zoom and **Show whole map** controls. **Feature guide**, **Hover details**, and comparison are available from the left toolbar. A compact legend sits in the center of the bottom status bar with only Active link, Inactive link, Fact table, Dimension table, and Search match. Model metrics remain on the right on wide screens and move below the legend on smaller screens. The path swap button sits beside the stacked inputs. Relationship lists and model checks open inside the tool panel instead of floating over the graph.

| Feature | What it does |
| --- | --- |
| Find a table | Highlights matching names and centers the map. |
| Focus on selected tables | Emphasizes selected tables and their connecting lines without removing other tables. |
| Table Deep Dive | Shows one table's directly connected neighbors and their relationship columns. |
| Trace filter paths | Highlights routes from a starting table to a destination, including connections through intermediate tables. |
| Browse relationships | Lists linked columns, filter direction, row matching, and active/inactive status. |
| Inspect columns and formulas | Click a table to read columns, DAX measures, and detected column references in measures. |
| Check model structure | Runs advisory checks locally without changing the model. |
| Compare model relationships | Compares relationships between two model folders, not row data or DAX formulas. |

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
