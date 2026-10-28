# Phase 1 Data Model & Contracts: Sincronização Unificada de Dados entre Abas & Periodização no HYRESULT

**Feature**: `005-unified-periodization-sync`  
**Date**: 2026-10-28

## 1. Expansão de Tipos (`src/lib/types.ts`)

- **`DashboardResponse['kpis']`**:
  - Adiciona `completedSessionsTotal: number` e `plannedSessionsTotal: number` (ex.: `0 / 196`) para exibir no cabeçalho global e no Painel exatamente o mesmo contador de treinos confirmados exibido no Diário, na Previsão de Prova e na Análise HYRESULT.
- **`HyresultSourceType`**:
  - Adiciona `'PERIODIZATION_MILESTONE'` para permitir inspecionar na Análise HYRESULT qualquer marco dos mesociclos da periodização (`S6`, `S11`, `S17`, `S21`, `S24`, `S26`, `S28`) além de `'LIVE_EVOLUTION'` e `'HYRESULT_OFFICIAL'`.
- **`HyresultAnalysisDTO`**:
  - Adiciona `weeklySimulationCurve: PeriodizationWeekSimulationPointDTO[]` (idêntica à de `RacePredictionDTO`) para renderizar a Curva de Evolução da Periodização (`S1 → S28`) diretamente na aba **Análise HYRESULT**.

## 2. Regras de Consistência entre as 5 Abas

| Indicador | Com `0` Treinos Confirmados | Ao Confirmar `N` Treinos no Diário |
|---|---|---|
| **Cabeçalho Global & Todas as Abas** | `0 / 196 treinos confirmados` | `N / 196 treinos confirmados` (idêntico em todas as abas) |
| **Aba 1: Painel (`DashboardTab`)** | `0,0 km` realizados, `0 kg` tonelagem realizada, `0 UA` carga realizada | Soma exata de `kmActual`, `tonnageActualKg` e `loadActual` dos `N` treinos confirmados |
| **Aba 2: Periodização (`PlanTab`)** | `0/7` em todas as semanas (`100% PLANEJADO`) | Contador `sessionsDone`, `kmA` e `tonnageA` atualizados na semana do treino |
| **Aba 3: Diário (`WeekTab`)** | Todos os cards `PLANEJADO` com botão **"Confirmar Treino"** | Card marcado como `CONCLUIDO` com métricas preenchidas e botão **"Desmarcar"** |
| **Aba 4: Previsão (`PredictorTab`)** | Tempo Atual = Linha de Base S1 (`0:00` ganhos, `0` treinos) + Curva S1–S28 | Tempo Atual recalculado pelos `N` treinos (`-Xs` ganhos) + Curva S1–S28 atualizada |
| **Aba 5: HYRESULT (`HyresultTab`)** | Tempo Atual = Linha de Base S1 (`0:00` ganhos, `0` treinos) + Curva S1–S28 | Tempo Atual **idêntico** à Previsão de Prova (`-Xs` ganhos) + Curva S1–S28 + Feed dos `N` treinos |

