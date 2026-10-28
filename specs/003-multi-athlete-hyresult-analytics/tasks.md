# Tasks: Gestão Multi-Atleta, Periodização Individualizada por Testes e Análise de Performance Padrão HYRESULT

**Input**: Design documents from `/specs/003-multi-athlete-hyresult-analytics/`
**Prerequisites**: [plan.md](plan.md) (required), [spec.md](spec.md) (required for user stories), [research.md](research.md), [data-model.md](data-model.md), [contracts/](contracts/)

**Tests**: Validação contratual via `curl.exe`, verificação estrita de tipos (`bunx tsc --noEmit`) e linter (`bun run lint`) conforme definido em [quickstart.md](quickstart.md).

**Organization**: Tarefas agrupadas por história de usuário (`[US1]`, `[US2]`, `[US3]`) para permitir implementação, validação e entrega incremental independente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode ser executada em paralelo (arquivos distintos, sem dependências de tarefas incompletas)
- **[Story]**: História de usuário associada (`[US1]`, `[US2]`, `[US3]`)
- Caminhos exatos de arquivos incluídos em todas as descrições

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Definição dos DTOs compartilhados, constantes de divisões oficiais HYROX (`OPEN_M`, `OPEN_F`, `PRO_M`, `PRO_F`) e curvas de percentis normativos do HYRESULT.

- [X] T001 Expand shared TypeScript interfaces in src/lib/types.ts adding `HyroxDivision = 'OPEN_M' | 'OPEN_F' | 'PRO_M' | 'PRO_F'`, `DynamicZoneDTO`, expanded `AthleteDTO` (with `id`, `gender`, `division`, `ageGroup`, `squat3rmKg`, `deadlift3rmKg`, `bench3rmKg`, `cmjCm`, `skiErg1kTtSec`, `row500mTtSec`, `zones`), and HYRESULT contracts (`HyresultSourceType`, `HyresultPillarBreakdownDTO`, `HyresultStationSplitDTO`, `HyresultRunSplitDTO`, `HyresultRoxzoneSplitDTO`, `HyresultPeriodizationPrescriptionDTO`, `HyresultAnalysisDTO`)
- [X] T002 [P] Add HYROX division official station weights, normative split curves, and HYRESULT percentile tables (`OPEN_M`, `OPEN_F`, `PRO_M`, `PRO_F`) in src/lib/constants.ts (including official loads: Sled Push 152/102/202/152 kg, Sled Pull 103/78/153/103 kg, Farmers Carry 2x24/2x16/2x32/2x24 kg, Sandbag Lunges 20/10/30/20 kg, Wall Balls 6/4/9/6 kg)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Evolução do banco de dados SQLite multi-atleta (`prisma/schema.prisma`), motor gerador de periodização parametrizado por testes (`src/lib/periodization-generator.ts`) e isolamento por `athleteId` nos módulos analíticos existentes.

**⚠️ CRITICAL**: Nenhuma história de usuário pode ser iniciada antes da conclusão desta fase.

- [X] T003 Update Prisma schema in prisma/schema.prisma adding `gender` (`"M" | "F"`), `division` (`"OPEN_M" | "OPEN_F" | "PRO_M" | "PRO_F"`), `ageGroup`, `planStartDate`, `squat3rmKg`, `deadlift3rmKg`, `bench3rmKg`, `cmjCm`, `skiErg1kTtSec`, `row500mTtSec` to `Athlete`; adding `athleteId` foreign key (`onDelete: Cascade`) to `Mesocycle` and `Wellness` (`@@unique([athleteId, date])`); creating `HyresultRaceResult` model; and pushing schema to SQLite via `bun run db:push`
- [X] T004 Implement deterministic test-based periodization generator in src/lib/periodization-generator.ts (`computeDynamicZones`, `generatePeriodizationForAthlete`, `recalibrateFutureSessionsForAthlete`) scaling HR/Pace zones Z1–Z5 from `maxHr`/`vt1SpeedKmh`/`vt2SpeedKmh`, strength/LPO loads from `squat3rmKg`/`deadlift3rmKg`/`bench3rmKg`, and station loads/splits from `division`, `skiErg1kTtSec`, `row500mTtSec`, and `goalRaceTime`
- [X] T005 [P] Update server-side analytics and prediction engines in src/lib/analytics.ts and src/lib/predictions.ts to accept `athleteId?: string` (filtering `Mesocycle`, `Microcycle`, `Wellness`, and `StationResult` by the selected athlete and using `athlete.division` normative benchmarks)
- [X] T006 Update database seed script in prisma/seed.ts to populate initial athlete Rafael Nogueira using `generatePeriodizationForAthlete` from src/lib/periodization-generator.ts and seed the official reference HYRESULT record `LR3MS4JI5A0E80` in `HyresultRaceResult`

**Checkpoint**: Fundação multi-atleta e gerador de periodização prontos — implementação das histórias de usuário desbloqueada.

---

## Phase 3: User Story 1 - Cadastro de Novos Atletas e Geração Automática de Periodização Baseada em Testes (Priority: P1) 🎯 MVP

**Goal**: Permitir cadastrar novos atletas com sua bateria de testes diagnósticos, gerar automaticamente as 28 semanas e 196 sessões calibradas para os testes e divisão de cada atleta, recalibrar sessões futuras após re-testes e alternar entre atletas ativos em toda a aplicação.

**Independent Test**: Executar `POST /api/athletes` criando uma nova atleta na divisão `OPEN_F` com seus testes de corrida, força (3RM) e ergômetros; verificar a criação das 28 semanas e 196 sessões calibradas via `GET /api/plan?athleteId=<id>`; e alternar entre atletas no cabeçalho da aplicação confirmando a atualização imediata de todas as abas.

### Implementation for User Story 1

- [X] T007 [US1] Create athletes collection route handler in src/app/api/athletes/route.ts implementing `GET` (list all athletes with diagnostic test summary) and `POST` (validate payload with Zod constraints: `name` 2..80 chars, `gender` `'M' | 'F'`, `division` `'OPEN_M' | 'OPEN_F' | 'PRO_M' | 'PRO_F'`, `heightCm` 120..230, `weightKg` 35..180, `bodyFatPct` 3..50, optional `vt1SpeedKmh`/`vt2SpeedKmh` 5..25 with `vt2 > vt1`, `squat3rmKg`/`deadlift3rmKg`/`bench3rmKg` 15..350, `skiErg1kTtSec` 150..480, `row500mTtSec` 70..240, `cmjCm` 15..90; create athlete and invoke `generatePeriodizationForAthlete`)
- [X] T008 [P] [US1] Create single athlete route handler in src/app/api/athletes/[id]/route.ts implementing `PATCH` (update athlete profile/tests and optionally invoke `recalibrateFutureSessionsForAthlete` on `"PLANEJADO"` sessions) and `DELETE`
- [X] T009 [P] [US1] Update existing API endpoints in src/app/api/plan/route.ts, src/app/api/dashboard/route.ts, src/app/api/wellness/route.ts, src/app/api/predictions/route.ts, and src/app/api/predictions/simulate/route.ts to read `athleteId` from query/body and scope all queries and dynamic `zones` to that athlete
- [X] T010 [P] [US1] Create global athlete switcher and diagnostic test registration/recalibration dialog component in src/components/training/athlete-switcher-dialog.tsx with 3 sections (Perfil & Prova, Testes Cardiorrespiratórios VT1/VT2/VO2max/5km, Testes de Força 3RM/CMJ/Ergômetros) and physiological auto-estimation helper
- [X] T011 [US1] Update periodization view in src/components/training/plan-tab.tsx and wellness modal in src/components/training/wellness-dialog.tsx to render the active athlete's dynamic `athlete.zones` (Z1–Z5), 3RM/CMJ/Ergometer test badges, division label, and pass `athleteId` when saving wellness records

**Checkpoint**: User Story 1 (MVP Multi-Atleta + Periodização Individualizada por Testes) funcional e testável de forma independente.

---

## Phase 4: User Story 2 - Painel de Análise de Prova e Simulações no Padrão HYRESULT (Priority: P2)

**Goal**: Disponibilizar a aba analítica no padrão **HYRESULT** (`hyresult.com/result/LR3MS4JI5A0E80`), decompondo o desempenho do atleta nos 3 Pilares (`Total Running` vs. `Total Workouts` vs. `Total Roxzone`), Percentis Comparativos por Divisão, Gráfico de Radar de 10 eixos, Análise de Pacing & Fade Index das 8 corridas e Raio-X das 8 passagens de Roxzone.

**Independent Test**: Executar `GET /api/hyresult?athleteId=<id>` e inspecionar a aba "Análise HYRESULT" verificando que a soma de Corrida + Workouts + Roxzone corresponde a 100% do Tempo Total, que o gráfico de radar exibe os percentis da divisão do atleta e que o *Fade Index* destaca o decaimento nas Corridas 3 e 8.

### Implementation for User Story 2

- [X] T012 [US2] Implement HYRESULT analytics engine in src/lib/hyresult-analytics.ts computing 3-Pillar breakdown (`RUNNING`, `WORKOUTS`, `ROXZONE`), division percentiles (`1..99`), 10-axis radar data vs Week 28 target, Run Splits pacing consistency (`fadeIndexPct`, `'EVEN_PACING' | 'CONTROLLED_FADE' | 'FLY_AND_DIE'`, post-Sled Push and post-Lunges drop), and 8 Roxzone transitions
- [X] T013 [P] [US2] Create 3-Pillars breakdown cards, proportional stacked bar, and 10-axis HYRESULT Spider/Radar chart component in src/components/training/hyresult-radar-and-pillars.tsx using Recharts (`RadarChart`, `PolarGrid`, `PolarAngleAxis`, `Radar`) and semantic percentile badges
- [X] T014 [P] [US2] Create Run Splits degradation chart (`ComposedChart`), Station Percentiles benchmark table with Time Savings badges, and 8-Transition Roxzone grid in src/components/training/hyresult-splits-and-roxzone.tsx

**Checkpoint**: Motor e visualizações centrais do padrão HYRESULT prontos.

---

## Phase 5: User Story 3 - Importação/Registro de Resultado HYRESULT e Diagnóstico Prescritivo na Periodização (Priority: P3)

**Goal**: Permitir alternar a análise HYRESULT entre o resultado oficial (`LR3MS4JI5A0E80`), simulações reais da periodização (`S21`, `S24`, `S26`) e meta da Semana 28 (`S28`), importar novos resultados HYRESULT e exibir recomendações prescritivas conectadas ao mesociclo atual do atleta.

**Independent Test**: Registrar um resultado oficial via `POST /api/hyresult` (ou alternar entre `LR3MS4JI5A0E80`, `Simulação #1 S24` e `Alvo S28` na interface), verificar o cálculo de *Time Savings Potential* e acionar o atalho de prescrição para navegar diretamente à semana correspondente da periodização.

### Implementation for User Story 3

- [X] T015 [US3] Create HYRESULT API route handler in src/app/api/hyresult/route.ts implementing `GET` (resolve active source among `HYRESULT_OFFICIAL`, `SIMULATION_W21`, `SIMULATION_W24`, `SIMULATION_W26`, `TARGET_W28` and return `HyresultAnalysisDTO`) and `POST` (validate with Zod constraints: `resultCode` 4..32 chars, `runSplits` array of 8 ints 150..600s, `workSplits` 8 official stations 60..900s, `roxSplits` 8 ints 15..180s; persist in `HyresultRaceResult` and return updated analysis)
- [X] T016 [US3] Implement main HYRESULT tab and result import dialog in src/components/training/hyresult-tab.tsx integrating source switcher (`LR3MS4JI5A0E80` / Simulações S21-S26 / Meta S28), import modal, 3-Pillars, Radar, Splits/Roxzone, and Periodization Prescription panel with direct jump to training weeks
- [X] T017 [US3] Integrate `AthleteSwitcherDialog`, `activeAthleteId` state, and the new "Análise HYRESULT" tab into the main application shell in src/app/page.tsx and pass `athleteId` to `PredictorTab` in src/components/training/predictor-tab.tsx

**Checkpoint**: Todas as 3 histórias de usuário integradas ponta a ponta na SPA.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificação de integridade de código, tipagem estrita, seed multi-cenário e validação final do guia quickstart.

- [X] T018 [P] Run TypeScript compiler (`bunx tsc --noEmit`) and ESLint (`bun run lint`) to verify zero type or lint errors across all new and updated files
- [X] T019 Execute end-to-end validation scenarios from specs/003-multi-athlete-hyresult-analytics/quickstart.md (creating a new athlete with custom test battery, verifying generated periodization and HYRESULT `LR3MS4JI5A0E80` analysis) and record summary in worklog.md
