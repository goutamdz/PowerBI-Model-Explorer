# Tasks: Power BI Semantic Model Explorer

**Input**: Design documents from `/specs/001-relationship-visualizer/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/model-api.yaml

## Phase 1: Setup (Shared Infrastructure)

- [x] T001 Create the web application in `apps/web`
- [x] T002 Initialize root workspace scripts and TypeScript base config in `package.json` and `tsconfig.base.json`
- [x] T003 Configure frontend workspace dependencies

## Phase 2: Foundational (Blocking Prerequisites)

- [x] T004 Implement domain types in `apps/web/src/types.ts`
- [x] T005 Implement TMDL parsing and normalization in `apps/web/src/lib/tmdl/tmdlCore.ts`
- [x] T006 Implement graph analysis and path traversal utilities in `apps/web/src/lib/tmdl/pathAnalysis.ts`
- [x] T007 Run model processing locally in `apps/web/src/lib/modelWorker.ts`
- [ ] T008 Implement frontend API client and shared graph transformation logic in `apps/web/src/api/client.ts` and `apps/web/src/lib/graph.ts`

## Phase 3: User Story 1 - Load and Understand the Model (Priority: P1)

**Goal**: Load a `.SemanticModel` folder and render the graph plus metrics.

**Independent Test**: Enter a valid folder path and confirm metrics and graph render correctly.

- [x] T009 [US1] Build local model loading in `apps/web/src/lib/localModel.ts`
- [ ] T010 [US1] Build metrics dashboard and folder loader UI in `apps/web/src/App.tsx`
- [ ] T011 [US1] Render Cytoscape graph with table and relationship styles in `apps/web/src/components/ModelGraph.tsx`

## Phase 4: User Story 2 - Explore Filter Paths Between Tables (Priority: P1)

**Goal**: Compute and display all simple paths between selected tables.

**Independent Test**: Select a source and target table and verify the path list and graph highlight behavior.

- [x] T012 [US2] Build local path analysis in `apps/web/src/lib/localModel.ts`
- [ ] T013 [US2] Build selectors and path query flow in `apps/web/src/App.tsx`
- [ ] T014 [US2] Build clickable path list and graph highlight state in `apps/web/src/components/PathPanel.tsx` and `apps/web/src/components/ModelGraph.tsx`

## Phase 5: User Story 3 - Inspect Relationships and Measures (Priority: P2)

**Goal**: Inspect table measures and relationship metadata.

**Independent Test**: Click tables and relationships and verify the inspector contents.

- [ ] T015 [US3] Build relationship inspector panel in `apps/web/src/components/RelationshipInspector.tsx`
- [ ] T016 [US3] Build table details and measures panel in `apps/web/src/components/TableDetails.tsx`

## Phase 6: User Story 4 - Identify Structural Risks Quickly (Priority: P3)

**Goal**: Surface disconnected tables and ambiguity warnings.

**Independent Test**: Load a model with ambiguity or disconnected nodes and verify the warning indicators.

- [x] T017 [US4] Add local graph-analysis warnings to the model response
- [ ] T018 [US4] Add warning cards and search/filter UI in `apps/web/src/App.tsx`

## Phase 7: Validation & Polish

- [x] T019 Add fixture-based tests in `apps/web/tests`
- [ ] T020 Add documentation and quickstart validation in `README.md` and `specs/001-relationship-visualizer/quickstart.md`
- [ ] T021 Run `npm run test` and `npm run build` and fix any blocking issues
