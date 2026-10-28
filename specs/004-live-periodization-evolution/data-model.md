# Phase 1 Data Model: Simulação Preditiva Dinâmica Guiada pela Periodização & Evolução HYRESULT Treino a Treino

**Feature**: `004-live-periodization-evolution`  
**Date**: 2026-10-28

## 1. Modelo de Persistência (Prisma / SQLite)

O schema existente (`prisma/schema.prisma`) já armazena com granularidade completa todas as entidades necessárias para a simulação treino a treino:
- `Athlete`: Bateria diagnóstica inicial (`vt1SpeedKmh`, `vt2SpeedKmh`, `fiveKmPbSec`, `vo2max`, `squat3rmKg`, `deadlift3rmKg`, `bench3rmKg`, `cmjCm`, `skiErg1kTtSec`, `row500mTtSec`, `goalRaceTime`, `division`).
- `Mesocycle` & `Microcycle`: Estrutura das 28 semanas (`weekNumber` 1..28, `code` de `DIAG` a `TAPER`, `weekType`).
- `TrainingSession`: Sessões diárias (`status`, `type`, `durationPrescribedMin`, `durationActualMin`, `kmPrescribed`, `kmActual`, `tonnagePrescribedKg`, `tonnageActualKg`, `rpePrescribed`, `rpeActual`, `loadActual`, `hrZone`, `paceTarget`).
- `Exercise`: Séries, repetições e cargas prescritas vs. realizadas (`loadPrescribedKg`, `loadActualKg`, `setsActual`, `repsActual`).
- `StationResult`: Splits de corrida e das 8 estações HYROX (`station`, `splitPrescribedSec`, `splitActualSec`).
- `HyresultRaceResult`: Resultados HYRESULT de linha de base (`#LR3MS4JI5A0E80`) e importados.

> Não é necessária migração destrutiva de banco; o `prisma/seed.ts` será enriquecido com sessões concluídas nas Semanas 1 e 2 (abrangendo `FORCA`, `TESTE`, `CORRIDA` e `HIBRIDO` com splits realizados) para demonstrar imediatamente a evolução treino a treino nos dois atletas pré-cadastrados.

---

## 2. Entidades Analíticas & DTOs (`src/lib/types.ts`)

### 2.1 `SessionEvolutionPointDTO` (Snapshot Treino a Treino)
Representa o estado de performance HYROX/HYRESULT do atleta imediatamente após cada sessão concluída:

```ts
export interface SessionEvolutionPointDTO {
  index: number // 0 = Linha de Base (Diagnóstico Inicial), 1..N = Treinos concluídos
  sessionId: string | null // null para o ponto 0 (Linha de Base)
  date: string // ISO date
  dateFormatted: string // dd/MM
  weekNumber: number
  phaseCode: string
  sessionType: string // 'BASELINE' | 'CORRIDA' | 'FORCA' | 'HIBRIDO' | 'TESTE' | 'RECUPERACAO'
  sessionTitle: string
  stimulusSummary: string // ex.: "6,5 km @ 4:52/km · Z3" ou "Brick Sled Push 2:34 + Wall Balls 4:48"
  primaryFocus: 'BASELINE' | 'RUNNING' | 'STRENGTH' | 'STATIONS' | 'RECOVERY'
  executionQualityPct: number // ex.: 103% do prescrito
  totalRunSec: number
  totalWorkSec: number
  totalRoxSec: number
  totalTimeSec: number // = totalRunSec + totalWorkSec + totalRoxSec
  totalTimeFormatted: string
  deltaFromPrevSec: number // negativo = ganho de tempo (mais rápido)
  cumulativeGainSec: number // total economizado desde a Linha de Base (S1)
  overallPercentile: number // 1..99 na divisão oficial
  fadeIndexPct: number // Fade Index de corrida após este treino
}
```

### 2.2 `PeriodizationWeekSimulationPointDTO` (Curva das 28 Semanas)
Representa a simulação semana a semana (`W1` a `W28`) acoplada à periodização:

```ts
export interface PeriodizationWeekSimulationPointDTO {
  weekId: string
  weekNumber: number
  label: string // "S1" .. "S28"
  phaseCode: string // 'DIAG' | 'GPP1' | 'GPP2' | 'SPP1' | 'SPP2' | 'COMP' | 'TAPER'
  weekType: string
  isCurrent: boolean
  isExecuted: boolean // true se possui sessões concluídas ou se é passada/atual
  sessionsDone: number
  sessionsTotal: number
  adherencePct: number | null
  plannedTotalSec: number // Curva científica planejada para a semana W
  plannedFormatted: string
  simulatedTotalSec: number | null // Tempo real simulado para semanas já executadas (null no futuro)
  simulatedFormatted: string | null
  projectedTotalSec: number // Trajetória reancorada do estado atual até S28
  projectedFormatted: string
  plannedRunSec: number
  plannedWorkSec: number
  plannedRoxSec: number
  activeRunSec: number // simulated (se executada) ou projected (se futura)
  activeWorkSec: number
  activeRoxSec: number
}
```

### 2.3 `PeriodizationProgressionSummaryDTO` (Resumo de Acompanhamento da Periodização)
Compartilhado entre `RacePredictionDTO` e `HyresultAnalysisDTO`:

```ts
export interface PeriodizationProgressionSummaryDTO {
  currentWeekNumber: number
  currentPhaseCode: string
  currentPhaseName: string
  completedSessionsCount: number
  totalPlannedSessionsToDate: number
  adherenceToDatePct: number
  baselineTotalSec: number
  baselineFormatted: string
  currentSimulatedTotalSec: number
  currentSimulatedFormatted: string
  expectedForCurrentWeekSec: number
  expectedForCurrentWeekFormatted: string
  targetWeek28TotalSec: number
  targetWeek28Formatted: string
  gainAchievedSec: number // baselineTotalSec - currentSimulatedTotalSec (positivo = melhoria)
  gainAchievedFormatted: string
  remainingToGoalSec: number // currentSimulatedTotalSec - targetWeek28TotalSec
  remainingToGoalFormatted: string
  goalProgressPct: number // % do ganho total planejado (S1 -> S28) já conquistado nos treinos
  deltaVsExpectedWeekSec: number // currentSimulatedTotalSec - expectedForCurrentWeekSec (negativo = adiantado)
  periodizationStatus: 'ADIANTADO' | 'NO_ALVO' | 'ATRASADO'
  periodizationStatusLabel: string
}
```

### 2.4 Expansão de `RacePredictionDTO` e `HyresultAnalysisDTO`
- `RacePredictionDTO` passa a incluir:
  - `progression: PeriodizationProgressionSummaryDTO`
  - `weeklySimulationCurve: PeriodizationWeekSimulationPointDTO[]`
  - `sessionEvolution: SessionEvolutionPointDTO[]`
- `HyresultSourceType` adiciona `'LIVE_EVOLUTION'` (id `'live-evolution'`, selecionado por padrão quando nenhum `sourceId` explícito é informado).
- `HyresultAnalysisDTO` passa a incluir:
  - `progression: PeriodizationProgressionSummaryDTO`
  - `sessionEvolution: SessionEvolutionPointDTO[]`
  - `radarData` expandido com `baselinePercentile: number` além de `athletePercentile` e `targetPercentile`.

