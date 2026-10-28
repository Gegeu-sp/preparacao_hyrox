# Tasks: Simulação Preditiva Dinâmica Guiada pela Periodização & Evolução HYRESULT Treino a Treino

**Input**: Design documents from `/specs/004-live-periodization-evolution/`  
**Prerequisites**: [plan.md](file:///c:/Users/MUSCULA%C3%87%C3%83O/Downloads/workspace-f9fd82ab-0436-4680-8383-a190be649738/specs/004-live-periodization-evolution/plan.md), [spec.md](file:///c:/Users/MUSCULA%C3%87%C3%83O/Downloads/workspace-f9fd82ab-0436-4680-8383-a190be649738/specs/004-live-periodization-evolution/spec.md), [research.md](file:///c:/Users/MUSCULA%C3%87%C3%83O/Downloads/workspace-f9fd82ab-0436-4680-8383-a190be649738/specs/004-live-periodization-evolution/research.md), [data-model.md](file:///c:/Users/MUSCULA%C3%87%C3%83O/Downloads/workspace-f9fd82ab-0436-4680-8383-a190be649738/specs/004-live-periodization-evolution/data-model.md), [contracts/](file:///c:/Users/MUSCULA%C3%87%C3%83O/Downloads/workspace-f9fd82ab-0436-4680-8383-a190be649738/specs/004-live-periodization-evolution/contracts/)

**Organization**: Tasks are grouped by user story (`US1`, `US2`, `US3`) to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (`US1`, `US2`, `US3`)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Types & Contracts)

**Purpose**: Expand strict TypeScript interfaces and domain contracts required by the live periodization simulation and workout-by-workout evolution engine.

- [X] T001 Expand `src/lib/types.ts` with `SessionEvolutionPointDTO` (`index`, `sessionId`, `date`, `dateFormatted`, `weekNumber`, `phaseCode`, `sessionType`, `sessionTitle`, `stimulusSummary`, `primaryFocus: 'BASELINE' | 'RUNNING' | 'STRENGTH' | 'STATIONS' | 'RECOVERY'`, `executionQualityPct`, `totalRunSec`, `totalWorkSec`, `totalRoxSec`, `totalTimeSec`, `totalTimeFormatted`, `deltaFromPrevSec`, `cumulativeGainSec`, `overallPercentile`, `fadeIndexPct`), `PeriodizationWeekSimulationPointDTO` (`W1..W28` planned vs simulated vs projected), and `PeriodizationProgressionSummaryDTO` (`periodizationStatus: 'ADIANTADO' | 'NO_ALVO' | 'ATRASADO'`)
- [X] T002 Update `RacePredictionDTO`, `HyresultSourceType` (adding `'LIVE_EVOLUTION'`), and `HyresultAnalysisDTO` (adding `progression`, `sessionEvolution`, and `baselinePercentile` on `radarData`) in `src/lib/types.ts`

---

## Phase 2: Foundational (Unified Live Evolution & Periodization Simulation Engine)

**Purpose**: Core server-side calculation engine (`src/lib/live-evolution.ts`) that processes completed sessions chronologically and generates the 28-week periodization simulation curve.

**⚠️ CRITICAL**: Must be complete before `US1`, `US2`, and `US3` integration tasks.

- [X] T003 Create `src/lib/live-evolution.ts` implementing the 28-week scientific adaptation curve ($P(w) \in [0, 1]$ across `DIAG`, `GPP1`, `GPP2`, `SPP1`, `SPP2`, `COMP`, `TAPER`) and baseline/target state extraction (`baselineSplits` from `#LR3MS4JI5A0E80` or diagnostic test battery vs `targetW28Splits`)
- [X] T004 Implement the chronological session-by-session evolution processor in `src/lib/live-evolution.ts` (`computeLivePeriodizationEvolution(athleteId?: string)`) evaluating `CORRIDA`, `FORCA`, `HIBRIDO`, `TESTE`, and `RECUPERACAO` sessions (`CONCLUIDO` / `MODIFICADO`), updating `runSplits[0..7]`, `workSplits[8 stations]`, `roxSplits[0..7]`, compromised run fatigue factors (`Run 3` post-Sled Push and `Run 8` post-Lunges), `SessionEvolutionPointDTO[]`, `PeriodizationWeekSimulationPointDTO[]`, and `PeriodizationProgressionSummaryDTO` with strict chronometric consistency ($\text{Running} + \text{Workouts} + \text{Roxzone} = \text{Total}$)
- [X] T005 Enrich `prisma/seed.ts` (and `generatePeriodizationForAthlete` in `src/lib/periodization-generator.ts`) so demo athletes (**Rafael Nogueira** `OPEN_M` and **Helena Costa** `OPEN_F`) have realistic completed sessions across Week 1 (`FORCA`, `TESTE`, `HIBRIDO` with station splits, `CORRIDA` Z2→Z3, `FORCA` B, and Saturday Hybrid Brick), and execute `npx tsx prisma/seed.ts` to populate `db/custom.db`

**Checkpoint**: Unified engine `computeLivePeriodizationEvolution()` ready and database populated with multi-session workout history.

---

## Phase 3: User Story 1 - Previsão de Prova Dinâmica Acoplada à Execução da Periodização (Priority: P1) 🎯 MVP

**Goal**: Make the HYROX Race Predictor dynamically follow the execution of the 28-week periodization, updating predicted splits and displaying the 28-week simulation curve (`S1 → S28`).

**Independent Test**: Complete or edit any training session in the Diário de Treino and verify in **Previsão de Prova** that the realistic predicted time, segment splits, progression summary cards, and the 28-week simulation curve update immediately.

### Implementation for User Story 1

- [X] T006 [US1] Update `computeRacePrediction(athleteId?: string)` in `src/lib/predictions.ts` and `simulatePredictionScenario()` in `src/lib/predictions-calc.ts` to use the live evolved splits (`runSplits`, `workSplits`, `roxSplits`, and dynamic fatigue factors) and attach `progression`, `weeklySimulationCurve`, and `sessionEvolution` from `src/lib/live-evolution.ts`
- [X] T007 [P] [US1] Create `src/components/training/predictor-periodization-curve.tsx` displaying the 4-milestone Periodization Progression Bar (`Diagnóstico S1`, `Estado Atual Simulado`, `Esperado na Semana Atual`, `Meta Final S28`), status badge (`Adiantado` / `No Alvo` / `Atrasado`), and the interactive 28-week Recharts `ComposedChart` (`Curva Planejada` vs `Simulação Real Executada` vs `Projeção Reancorada até S28`) with click-to-week navigation
- [X] T008 [US1] Update `src/components/training/predictor-tab.tsx` and `src/components/training/predictor-cards.tsx` to render `PredictorPeriodizationCurve`, pass `onGoToWeek`, and display the live workout count and cumulative time shaved since Week 1

**Checkpoint**: User Story 1 is complete and independently verifiable in the **Previsão de Prova** tab.

---

## Phase 4: User Story 2 - Análise HYRESULT Viva Acompanhando a Evolução Treino a Treino (Priority: P1)

**Goal**: Make **Análise HYRESULT** track the athlete's real workout-by-workout evolution (`LIVE_EVOLUTION` default source) and render a dedicated session-by-session evolution chart and impact feed.

**Independent Test**: Open **Análise HYRESULT**, verify that `"Evolução Atual — Treino a Treino (Ao Vivo)"` is the active default source, inspect the workout-by-workout evolution chart and table showing the exact time delta (`-Xs`) of each completed workout, and verify live recalculation after saving a workout in the Diário de Treino.

### Implementation for User Story 2

- [X] T009 [US2] Update `computeHyresultAnalysis(requestedAthleteId?: string, requestedSourceId?: string)` in `src/lib/hyresult-analytics.ts` to register `id: 'live-evolution'` (`sourceType: 'LIVE_EVOLUTION'`, title `"Evolução Atual — Treino a Treino (Ao Vivo)"`) as the default first source, populate `progression` and `sessionEvolution`, and include `baselinePercentile` on all 10 `radarData` axes
- [X] T010 [P] [US2] Create `src/components/training/hyresult-evolution-timeline.tsx` rendering the Workout-by-Workout Evolution Chart (Recharts `ComposedChart` tracking Total Time, Running, Workouts, Roxzone, and Division Percentile across completed sessions `#0..#N`) and the Chronological Session Impact Feed (with stimulus summary, execution quality `%`, time delta badge `-Xs`, and jump-to-week action)
- [X] T011 [US2] Update `src/components/training/hyresult-tab.tsx` to default to the `LIVE_EVOLUTION` source, display the live status header badge (`AO VIVO · N TREINOS COMPUTADOS`), and render `HyresultEvolutionTimeline`

**Checkpoint**: User Story 2 is complete and independently verifiable in the **Análise HYRESULT** tab.

---

## Phase 5: User Story 3 - Comparativo Entre Linha de Base (Diagnóstico), Estado Atual Executado e Meta Final S28 (Priority: P2)

**Goal**: Provide a 3-layer visual comparison (`Diagnóstico Inicial S1` vs. `Estado Atual Executado` vs. `Meta Final S28`) across the 10-axis Spider/Radar chart and main navigation shell.

**Independent Test**: Verify the 3-layer Spider/Radar comparison in **Análise HYRESULT** (`Baseline S1` vs `Estado Atual` vs `Meta S28`) and confirm that editing a session in the Diário de Treino triggers seamless synchronization across all tabs in `src/app/page.tsx`.

### Implementation for User Story 3

- [X] T012 [P] [US3] Update `src/components/training/hyresult-radar-and-pillars.tsx` to display the 3-layer Spider/Radar comparison (`Diagnóstico Inicial S1`, `Fonte Ativa / Ao Vivo`, and `Meta S28`) and highlight the cumulative time gained (`gainAchievedFormatted`) and periodization status badge in the hero summary card
- [X] T013 [US3] Update `src/app/page.tsx` so `PredictorTab` receives `onGoToWeek` for direct navigation from the 28-week simulation curve to the Diário de Treino, and ensure a `refreshVersion` counter increments on session/wellness edits so both `PredictorTab` and `HyresultTab` re-fetch automatically

**Checkpoint**: All user stories (`US1`, `US2`, `US3`) are integrated and reactive.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: End-to-end verification, strict TypeScript/ESLint validation, and documentation in `worklog.md`.

- [X] T014 Run `npx tsc --noEmit` and `npm run lint` to verify zero TypeScript or ESLint errors across all modified and new files
- [X] T015 Validate chronometric consistency ($\text{Running} + \text{Workouts} + \text{Roxzone} = \text{Total}$) across all session evolution points and 28 weekly simulation points, and document Feature `004-live-periodization-evolution` in `worklog.md`

---

## Dependencies & Execution Order

### Phase Dependencies
- **Phase 1 (Setup: `T001`–`T002`)**: No dependencies — starts immediately.
- **Phase 2 (Foundational: `T003`–`T005`)**: Depends on Phase 1 — **BLOCKS** all user stories.
- **Phase 3 (`US1`: `T006`–`T008`)**: Depends on Phase 2.
- **Phase 4 (`US2`: `T009`–`T011`)**: Depends on Phase 2 (can run in parallel with `US1`).
- **Phase 5 (`US3`: `T012`–`T013`)**: Depends on `US1` and `US2`.
- **Phase 6 (Polish: `T014`–`T015`)**: Depends on all user stories being complete.

### Parallel Opportunities
- `T007` (`predictor-periodization-curve.tsx`), `T010` (`hyresult-evolution-timeline.tsx`), and `T012` (`hyresult-radar-and-pillars.tsx`) operate on independent UI component files and can be built in parallel once Phase 2 is complete.

---

## Parallel Example: User Stories 1 & 2

```bash
# Once Phase 2 (src/lib/live-evolution.ts) is complete, launch in parallel:
Task T006: "Update computeRacePrediction in src/lib/predictions.ts"
Task T007: "Create PredictorPeriodizationCurve in src/components/training/predictor-periodization-curve.tsx"
Task T009: "Update computeHyresultAnalysis in src/lib/hyresult-analytics.ts"
Task T010: "Create HyresultEvolutionTimeline in src/components/training/hyresult-evolution-timeline.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 + User Story 2 Core)
1. Complete Phase 1 (`types.ts`) and Phase 2 (`live-evolution.ts` + enriched multi-session seed).
2. Complete Phase 3 (`US1` — Dynamic Periodization-Guided Race Predictor + 28-Week Curve).
3. Complete Phase 4 (`US2` — Live Workout-by-Workout HYRESULT Analytics + Session Impact Timeline).
4. Complete Phase 5 (`US3` — 3-Layer Radar Comparison & Cross-Tab Reactivity) and Phase 6 (`tsc` + `lint` + `worklog.md`).

