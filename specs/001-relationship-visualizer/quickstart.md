# Quickstart: Relationship Visualizer

## Prerequisites

- Node.js 20 or later
- npm 10 or later
- A local Power BI PBIP `.SemanticModel` folder to analyze

## Setup

```bash
npm install
```

## Run in development

```bash
npm run dev
```

This starts the frontend app on `http://localhost:5173`. Model processing runs locally in a browser worker; no backend is required.

## Analyze a model

1. Open the frontend in the browser.
2. Choose a local `.SemanticModel` folder.
3. Allow the browser to read the selected folder.
4. Select source and target tables to analyze paths.
5. Click a path in the list to highlight it in the graph.

## Validation

```bash
npm run test
npm run build
```
