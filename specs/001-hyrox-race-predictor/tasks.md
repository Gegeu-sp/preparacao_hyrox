# Tasks: Módulo Preditivo de Tempo de Prova HYROX

**Feature**: `001-hyrox-race-predictor` | **Date**: 2026-10-27 | **Branch**: `001-hyrox-race-predictor`
**Spec**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Definição das interfaces e constantes compartilhadas para o motor de predição.

- [X] T001 Setup types and prediction interfaces in src/lib/types.ts (`RacePredictionDTO`, `SegmentPredictionSplitDTO`, `PredictionScenarioInput`, and `SegmentType = 'RUN' | 'STATION' | 'ROXZONE'`)
- [X] T002 [P] Add Hyrox prediction constants and default pacing coefficients in src/lib/constants.ts (ordem oficial dos 16 segmentos, tempo padrão de Roxzone de 35-50s por transição e fatores nominais de fadiga neuromuscular)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestrutura analítica e consultas ao banco SQLite que bloqueiam todas as histórias de usuário.

**CRITICAL**: Nenhuma história de usuário pode ser iniciada antes da conclusão desta fase.

- [X] T003 Implement core physiological prediction engine in src/lib/predictions.ts (cálculo de velocidade base a partir de VT2 e PB 5km, tempos de estação nominais e multiplicadores de fadiga para as corridas 1 a 8: Run 1 = 1.0, Run 2 = 1.04, Run 3 = 1.12, Run 4 = 1.07, Run 5 = 1.08, Run 6 = 1.06, Run 7 = 1.04, Run 8 = 1.15)
- [X] T004 [P] Implement database querying helper in src/lib/predictions.ts to fetch athlete physiological metrics (`vo2max`, `vt1SpeedKmh`, `vt2SpeedKmh`, `fiveKmPbSec`, `goalRaceTime`) and previous station splits from `StationResult` in prisma/schema.prisma

**Checkpoint**: Base analítica pronta - implementação das histórias de usuário desbloqueada.

---

## Phase 3: User Story 1 - Visualização da Previsão de Tempo Total e Zonas de Confiança (Priority: P1) 🎯 MVP

**Goal**: Atleta e comissão técnica visualizam o tempo total projetado em formato `hh:mm:ss`, com cenários Realista, Otimista e Conservador, além do delta em relação à meta cadastrada.

**Independent Test**: Executar requisição `GET /api/predictions` e confirmar retorno de `realisticTotalSec`, `optimisticTotalSec`, `conservativeTotalSec` e `deltaSec`, verificando a renderização dos KPI Cards no dashboard.

### Implementation for User Story 1

- [X] T005 [US1] Create GET route handler in src/app/api/predictions/route.ts returning `RacePredictionDTO` with realistic, optimistic, and conservative total times, delta vs goal, and confidence level
- [X] T006 [P] [US1] Implement KPI cards component for prediction summary in src/components/training/predictor-cards.tsx displaying total realistic time, confidence badge, delta badge (`bg-emerald-500/15` or `bg-amber-500/15`), and scenario breakdown cards
- [X] T007 [US1] Integrate prediction overview and tab trigger in src/app/page.tsx adding "Previsão" tab with Timer icon and loading skeleton

**Checkpoint**: User Story 1 (MVP) funcional e testável de forma independente.

---

## Phase 4: User Story 2 - Decomposição Segmentada dos 16 Splits da Prova e Roxzone (Priority: P2)

**Goal**: Exibição da tabela e gráfico ordenado dos 16 segmentos da prova (8x 1km de corrida intercalados com as 8 estações funcionais) e tempo de Roxzone, identificando estações críticas.

**Independent Test**: Verificar se a soma dos 16 segmentos mais a Roxzone é estritamente igual a `realisticTotalSec` e conferir a tabela com visualização dos paces (min/km), tempos em mm:ss e badges de estações críticas.

### Implementation for User Story 2

- [X] T008 [US2] Implement 16-segment generation and Roxzone calculation logic in src/lib/predictions.ts ensuring $\sum_{i=1}^{16} \text{SegmentSec}_i + \text{RoxzoneSec} = \text{TotalTimeSec}$ and flagging critical stations (`isCritical = true` when exceeding target by $>15\%$)
- [X] T009 [P] [US2] Create 16-segment table component in src/components/training/predictor-segments-table.tsx with formatted paces (`paceMinKmFormatted`), times (`predictedFormatted`), target comparison, and critical station badges
- [X] T010 [US2] Embed segments table into main predictor view in src/components/training/predictor-tab.tsx and connect to src/app/page.tsx

**Checkpoint**: User Stories 1 e 2 funcionais e integradas de forma independente.

---

## Phase 5: User Story 3 - Análise de Sensibilidade e Simulação de Cenários "What-If" (Priority: P3)

**Goal**: Treinador e atleta ajustam controles de ritmo de corrida, Roxzone e estações pontuais para simular cenários táticos pré-prova com recálculo instantâneo.

**Independent Test**: Ajustar os sliders de pace de corrida e tempos de estação e comprovar o recálculo em tempo real do tempo total sem recarregar a página, além de validar a rota `POST /api/predictions/simulate`.

### Implementation for User Story 3

- [X] T011 [US3] Implement pure recalculation function simulateScenario in src/lib/predictions.ts accepting `PredictionScenarioInput` and recalculating all splits and totals
- [X] T012 [P] [US3] Create POST route handler in src/app/api/predictions/simulate/route.ts validating input with Zod and returning updated `RacePredictionDTO`
- [X] T013 [US3] Implement interactive What-If slider panel and reset button in src/components/training/predictor-simulator.tsx with client-side reactive recalculation and physiological alerts
- [X] T014 [US3] Integrate simulator panel into src/components/training/predictor-tab.tsx allowing instant preview of scenario changes

**Checkpoint**: Todas as 3 histórias de usuário concluídas e integradas com sucesso.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Qualidade de código, validação de tipos e conformidade visual.

- [X] T015 [P] Run linter validation and fix any type errors in src/lib/predictions.ts
- [X] T016 Execute end-to-end quickstart validation scenarios from specs/001-hyrox-race-predictor/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sem dependências - inicia imediatamente.
- **Foundational (Phase 2)**: Depende do Setup (Phase 1) - BLOQUEIA todas as histórias de usuário.
- **User Story 1 (Phase 3)**: Depende da Foundational (Phase 2).
- **User Story 2 (Phase 4)**: Depende da User Story 1 (Phase 3) e da Foundational (Phase 2).
- **User Story 3 (Phase 5)**: Depende das User Stories 1 e 2.
- **Polish (Phase 6)**: Depende da conclusão de todas as histórias desejadas.

### Parallel Opportunities

- **Fase 1**: T001 e T002 implementados em paralelo.
- **Fase 2**: T003 e T004 desenvolvidos em paralelo dentro de `src/lib/predictions.ts`.
- **Fase 3**: T006 (componente de cards) criado em paralelo com T005 (endpoint de API).
- **Fase 4**: T009 (tabela de segmentos) criada em paralelo com T008 (lógica de decomposição).
- **Fase 5**: T012 (endpoint de simulação) desenvolvido em paralelo com T013 (componente de sliders).

---

## Parallel Example: User Story 1

```bash
# Executar em paralelo componentes da User Story 1:
Task: "Create GET route handler in src/app/api/predictions/route.ts"
Task: "Implement KPI cards component for prediction summary in src/components/training/predictor-cards.tsx"
```

---

## Implementation Strategy

### MVP First (Apenas User Story 1)

1. Concluir Phase 1 (Setup de tipos e constantes).
2. Concluir Phase 2 (Foundational - motor de cálculo).
3. Concluir Phase 3 (User Story 1 - KPIs e tempo total).
4. **Validar MVP**: Executar `curl http://localhost:3000/api/predictions` e confirmar exibição do tempo total e cenários.

### Entrega Incremental

1. **Incremento 1 (MVP)**: Projeção macro de tempo total (US1) - [CONCLUÍDO]
2. **Incremento 2**: Decomposição em 16 splits e análise de gargalos (US2) - [CONCLUÍDO]
3. **Incremento 3**: Simulador tático "What-If" com controles deslizantes (US3) - [CONCLUÍDO]
4. **Incremento 4**: Validação final de linter e roteiro quickstart - [CONCLUÍDO]
