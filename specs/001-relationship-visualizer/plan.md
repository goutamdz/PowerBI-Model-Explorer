# Implementation Plan: Power BI Semantic Model Explorer

**Branch**: `[001-relationship-visualizer]` | **Date**: 2026-04-07 | **Spec**: `/specs/001-relationship-visualizer/spec.md`
**Input**: Feature specification from `/specs/001-relationship-visualizer/spec.md`

## Summary

Build a monorepo web application with an Express TypeScript backend and a React TypeScript frontend. The backend parses TMDL semantic model files, normalizes the semantic graph, computes graph metrics and simple paths, and exposes REST endpoints. The frontend loads a local model by path, renders metrics and an interactive Cytoscape graph, and supports path analysis, search, and inspection panels.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 20+, React 19-compatible toolchain  
**Primary Dependencies**: Express, Zod, Cytoscape.js, React, Vite, Tailwind CSS, Vitest  
**Storage**: File system only, with in-memory cache for parsed model results  
**Testing**: Vitest for parser and graph/path analysis logic  
**Target Platform**: Local desktop browser with Node.js backend on Windows/macOS/Linux  
**Project Type**: Web application with separate frontend and backend workspaces  
**Performance Goals**: Parse 100+ tables / 300+ relationships quickly; path search under 1 second for standard models  
**Constraints**: Must handle cycles safely, malformed inputs defensively, and local folder-path analysis without database dependencies  
**Scale/Scope**: Single-user local analysis tool for PBIP semantic models up to mid-sized enterprise models

## Constitution Check

The repository constitution is currently a template without enforceable project-specific principles. No additional constitutional gates block implementation. Quality gates for this feature are local build success, backend test success, and documented quickstart instructions.

## Project Structure

### Documentation (this feature)

```text
specs/001-relationship-visualizer/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── model-api.yaml
└── tasks.md
```

### Source Code (repository root)

```text
apps/
├── server/
│   ├── src/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   └── tests/
└── web/
    └── src/
        ├── api/
        ├── components/
        └── lib/
```

**Structure Decision**: Use a two-workspace monorepo. The backend owns TMDL parsing, graph normalization, caching, and path analysis because it requires file-system access. The frontend owns visualization, interaction, and panel-based exploration. This keeps the browser code thin while preserving a clean separation of concerns.

## Complexity Tracking

No constitution violations require formal justification.
