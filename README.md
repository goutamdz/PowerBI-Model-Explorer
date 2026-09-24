# Power BI Semantic Model Explorer

## Start Here: PBIX vs. PBIP

### What Is a PBIX File?

A `.pbix` file is the standard Power BI Desktop file. It packages the report, semantic model, Power Query definitions, DAX calculations, visuals, formatting, and any locally imported data into one binary file. Reports connected to an existing remote semantic model may not contain a local model.

### What Is a PBIP Project?

A Power BI Project stores report and semantic model definitions as separate folders of readable text files. The `.pbip` file is a small entry-point file pointing to the report folder, not a container for the entire model.

**This explorer cannot open `.pbix` or `.pbip` files directly.** Save your model as a PBIP project.

### Convert PBIX to PBIP

1. Open your `.pbix` file in Power Bi Desktop App.
2. Select **File > Save As** and choose **Power BI Project (.pbip)**.

Power BI Desktop creates a structure similar to:

```text
MyProject/
|-- MyProject.pbip
|-- MyProject.Report/
|   |-- definition.pbir
|   `-- definition/
|-- MyProject.SemanticModel/        <-- choose this folder
|   |-- definition.pbism
|   |-- definition/
|   |   |-- database.tmdl
|   |   |-- model.tmdl
|   |   |-- relationships.tmdl
|   |   |-- expressions.tmdl
|   |   |-- tables/
|   |   |-- roles/
|   |   |-- cultures/
|   |   `-- perspectives/
|   |-- diagramLayout.json
|   `-- .pbi/
`-- .gitignore
```

The exact files and folders depend on the model. Some optional folders may not exist.

- `MyProject.pbip`: the project entry point for Power BI Desktop.
- `MyProject.Report`: report pages, visuals, and report configuration.
- `MyProject.SemanticModel`: model metadata; its `definition` folder holds TMDL definitions for tables, columns, measures, relationships, and other model objects.
- `.pbi`: local settings and cache files; the explorer does not read these.
- `.gitignore`: rules that keep local settings and cached data out of Git.

### Which Folder Should You Choose?

In the explorer, click **Choose model folder** and select the entire `MyProject.SemanticModel` folder. Do **not** select:

- The original `.pbix` file.
- The `.pbip` entry-point file.
- The `MyProject` PBIP root folder.
- The `MyProject.Report` folder.
- The inner `definition` folder.

The selected `.SemanticModel` folder must contain a `definition` folder with TMDL files. For more information, see Microsoft's [Power BI Desktop projects documentation](https://learn.microsoft.com/power-bi/developer/projects/projects-overview).

## The Problem

As a Power BI semantic model grows, answering basic questions becomes difficult:

- Which tables are connected, and through which columns?
- Is a relationship active or inactive, single-direction or bidirectional?
- Why can filters travel between two tables in more than one way?
- Are any tables disconnected from the rest of the model?
- What changed between two versions of the model?

The answers exist in TMDL, but reviewing many files manually is slow and error-prone. A model diagram helps, but dense diagrams still make filter paths and structural risks hard to investigate.

## What It Solves

Power BI Semantic Model Explorer turns a local `.SemanticModel` folder into an interactive map. **Everything runs locally** in your browser. **Your model stays on your device and is never uploaded to the cloud.**

- **A visual model map** for tables and relationships.
- **Model metrics** for tables, relationships, measures, and active or inactive links.
- **Table search and focus tools** for navigating large models.
- **Table details** for columns, DAX measures, and detected column references.
- **Relationship details** for linked columns, cardinality, filter direction, and active status.
- **Filter-path tracing** to explore structural routes between two tables.
- **Local model checks** for disconnected tables and other advisory findings.
- **Model comparison** to find added, removed, or changed relationships.

## Example: Find an Ambiguous Route to Sales

The bundled demo contains two routes from `Region` to `Sales`:

```text
Region -> Country -> Store -> Sales
Region -> Country -> Customer -> Sales
```

To investigate:

1. Select **Explore demo model**.
2. Open **Trace filter paths**.
3. Choose `Region` as the starting table and `Sales` as the destination.
4. Run the trace to see both routes.
5. Select either route to highlight it on the map.
6. Inspect its relationships to review columns, direction, cardinality, and active status.

Instead of manually following relationships across a large diagram or several TMDL files, you can see the competing routes and inspect each one in context.

Other useful demo paths include:

- `Product Category -> Product Subcategory -> Product -> Sales`
- `Supplier -> Product -> Sales`

## Privacy

Model analysis happens locally in a browser Web Worker:

- Only `.tmdl` files inside the selected model's `definition/` folder are read.
- Your model stays on your device and is never uploaded to the cloud.
- Model files, names, paths, expressions, and results are not stored by the application.
- DAX and Power Query expressions are not executed.
- Data sources are not contacted.
- Model checks use local deterministic rules, not a cloud AI service.
- No API key or backend is required.

After the application has loaded, model processing does not require a network connection. The application is not an installable offline PWA.

## Current Scope

- The folder must be a PBIP `.SemanticModel` project that contains TMDL definitions.
- Filter-path results can include inactive relationships; a displayed path does not prove that filters actively propagate through it.
- Fact and dimension classifications are heuristic.
- Column-reference detection is helpful for exploration but is not a complete DAX dependency analysis.
- Model comparison currently compares relationships, not row data or DAX formulas.
- Model checks are advisory and never modify the selected model.

## Developer Guide

### Prerequisites

- Git
- Node.js 22.12 or newer
- npm

### Run Locally

```bash
git clone https://github.com/goutamdz/PowerBI-Model-Explorer.git
cd PowerBI-Model-Explorer
cd apps/web
npm i
npm run dev
```

Open `http://localhost:5173`, then choose a local `.SemanticModel` folder or select **Explore demo model**.

### Validate Changes

Run these commands from `apps/web`:

```bash
npm test
npm run lint
npm run build
```

To preview the production build locally:

```bash
npm run preview
```

### Available Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm test` | Run the Vitest test suite. |
| `npm run lint` | Type-check application, test, and script code. |
| `npm run build` | Type-check and create a production build. |
| `npm run preview` | Serve the production build locally. |
| `npm run demo:export` | Rebuild the bundled public demo from `demo-source`. |

## Should Know Information

| Path | What it contains |
| --- | --- |
| `apps/web/src` | React UI, browser worker, TMDL parsing, and model analysis. |
| `apps/web/tests` | Parser integration tests and test fixtures. |
| `apps/web/scripts` | Developer utilities, including the bundled-demo exporter. |
| `apps/web/demo-source` | Portable source model used to generate the public demo. |
| `specs` | Feature specifications, plans, and task history created with GitHub Spec Kit. These files document decisions and are not used at runtime. |
| `.specify` | GitHub Spec Kit templates, memory, configuration, and helper scripts. |

The bundled demo intentionally contains public model metadata. Its export process rebuilds the demo from parsed model fields so source partitions and connection metadata are not included.
