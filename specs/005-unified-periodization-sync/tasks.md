# Tasks: Sincronização Unificada de Dados entre Abas, Zero Treinos Pré-Confirmados e Acompanhamento da Periodização no HYRESULT

**Input**: Design documents from `/specs/005-unified-periodization-sync/`

---

## Phase 1: Setup & Types

- [X] T001 Update `src/lib/types.ts` to add `completedSessionsTotal` and `plannedSessionsTotal` to `DashboardResponse['kpis']`, add `'PERIODIZATION_MILESTONE'` to `HyresultSourceType`, and add `weeklySimulationCurve: PeriodizationWeekSimulationPointDTO[]` to `HyresultAnalysisDTO`

---

## Phase 2: Foundational — Zero Pre-Confirmed Workouts & Smart Session Confirmation API

- [X] T002 Update `src/lib/periodization-generator.ts` and `prisma/seed.ts` so `seedSampleActuals` defaults to `false` and creates all 196 sessions strictly with `status: 'PLANEJADO'` and `0` pre-confirmed workouts or wellness entries
- [X] T003 Update `PATCH` in `src/app/api/sessions/[id]/route.ts` so confirming a session (`CONCLUIDO`, `PARCIAL`, `AJUSTADO`) auto-populates any missing actual fields (`durationActualMin`, `kmActual`, `rpeActual`, `tonnageActualKg`, `loadActual`, exercise actuals, and station `splitActualSec`) from the prescribed values, while reverting to `PLANEJADO` or `NAO_REALIZADO` clears all actual fields to `null`
- [X] T004 Update `src/lib/analytics.ts` (`computeDashboard` and `weekSummary`) so `dailyA`, `acuteLoad`, `chronicLoad`, `fitness`, `fatigue`, `form`, and `modalitySplit` use strictly confirmed sessions (`DONE`), never counting `PLANEJADO` sessions as executed, and include `completedSessionsTotal` and `plannedSessionsTotal` in `kpis`

---

## Phase 3: User Story 1 & 2 — Unified Periodization Curve & Milestone Tracking in HYRESULT

- [X] T005 [US1] [US2] Update `src/lib/live-evolution.ts` and `src/lib/hyresult-analytics.ts` so `baselineState` is 100% consistent across `Previsão de Prova` and `Análise HYRESULT`, `weeklySimulationCurve` (`S1..S28`) is included in `HyresultAnalysisDTO`, and `availableSources` in HYRESULT exposes periodization phase milestones (`Evolução Atual Ao Vivo`, `Diagnóstico S1 / #LR3MS4JI5A0E80`, `Semana 6 — Fim do GPP1`, `Semana 11 — Fim do GPP2`, `Semana 17 — Fim do SPP1`, `Semana 21 — Meia-Simulação SPP2`, `Semana 24 — Simulação #1 COMP`, `Semana 26 — Simulação #2 COMP`, `Semana 28 — Meta Final TAPER`)
- [X] T006 [US2] Update `src/components/training/hyresult-tab.tsx` and `src/components/training/hyresult-evolution-timeline.tsx` to render the **28-Week Periodization Curve (`PredictorPeriodizationCurve`)** inside the **Análise HYRESULT** tab and handle the `"0 treinos confirmados"` initial state clearly with a call-to-action to confirm workouts in the Diário de Treino

---

## Phase 4: User Story 3 — 1-Click Workout Confirmation in Diário de Treino & Cross-Tab Sync Header

- [X] T007 [P] [US1] [US3] Update `src/components/training/session-sheet.tsx` and `src/components/training/week-tab.tsx` to add a 1-click **"Confirmar Concluído"** / **"Desmarcar"** button on each day card and auto-fill prescribed values in `SessionSheet` when changing status to `CONCLUIDO`
- [X] T008 [US3] Update `src/app/page.tsx` and `src/components/training/dashboard-tab.tsx` to display the unified confirmed workout counter (`X / 196 treinos confirmados`) in the global header and dashboard KPIs, ensuring all 5 tabs stay 100% synchronized

---

## Phase 5: Polish & Validation

- [X] T009 Execute `npx tsx prisma/seed.ts`, `npx tsc --noEmit`, and `npm run lint`, and record Task ID 14 in `worklog.md`
