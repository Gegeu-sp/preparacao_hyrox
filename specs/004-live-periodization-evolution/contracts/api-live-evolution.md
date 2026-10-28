# API Contracts: Simulação Preditiva Dinâmica & Evolução HYRESULT Treino a Treino

**Feature**: `004-live-periodization-evolution`  
**Date**: 2026-10-28

## 1. `GET /api/predictions?athleteId=<id>`

Retorna o `RacePredictionDTO` atualizado dinamicamente a partir das sessões concluídas da periodização do atleta.

### Campos Adicionados ao Payload de Resposta (`RacePredictionDTO`)
- `progression: PeriodizationProgressionSummaryDTO`
  - Compara **Linha de Base (S1)** $\to$ **Estado Atual Executado (Treinos Concluídos)** $\to$ **Esperado para a Semana Atual** $\to$ **Meta Final (S28)**.
  - Inclui `periodizationStatus`: `'ADIANTADO' | 'NO_ALVO' | 'ATRASADO'` e `gainAchievedSec`.
- `weeklySimulationCurve: PeriodizationWeekSimulationPointDTO[]`
  - 28 pontos (`S1` a `S28`) com `plannedTotalSec`, `simulatedTotalSec` (semanas executadas) e `projectedTotalSec` (trajetória reancorada até a prova).
- `sessionEvolution: SessionEvolutionPointDTO[]`
  - Lista cronológica começando na Linha de Base (`index: 0`) seguida por cada sessão concluída (`CONCLUIDO` / `MODIFICADO`), com o tempo simulado e o delta em segundos gerado pelo treino.

---

## 2. `GET /api/hyresult?athleteId=<id>&sourceId=<optional>`

Retorna o `HyresultAnalysisDTO` com suporte à nova fonte primária padrão `'live-evolution'`.

### Comportamento do Seletor de Fontes (`availableSources`)
1. **`id: "live-evolution"` (`sourceType: "LIVE_EVOLUTION"`)** — **Padrão quando `sourceId` é omitido**:
   - Consolida o estado real atualizado treino a treino nos 8 splits de corrida, 8 estações e 8 transições de Roxzone.
2. **`id: "<hyresultRecordId>"` (`sourceType: "HYRESULT_OFFICIAL"`)**:
   - Resultado oficial de referência (ex.: `#LR3MS4JI5A0E80`) ou resultados importados.
3. **`id: "week-21" | "week-24" | "week-26" | "week-28"`**:
   - Simulações da periodização (`S21`, `S24`, `S26`) e Meta Final (`S28`).

### Campos Adicionados ao Payload de Resposta (`HyresultAnalysisDTO`)
- `progression: PeriodizationProgressionSummaryDTO`
- `sessionEvolution: SessionEvolutionPointDTO[]`
- `radarData`: Cada um dos 10 eixos inclui:
  - `baselinePercentile`: Percentil no Diagnóstico Inicial (S1 / `#LR3MS4JI5A0E80`)
  - `athletePercentile`: Percentil da fonte ativa (ex.: Evolução Atual Ao Vivo)
  - `targetPercentile`: Percentil Alvo da Semana 28

