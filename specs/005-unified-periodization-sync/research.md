# Phase 0 Research: Sincronização Unificada de Dados entre Abas, Zero Treinos Pré-Confirmados e Acompanhamento da Periodização no HYRESULT

**Feature**: `005-unified-periodization-sync`  
**Date**: 2026-10-28

## 1. Eliminação de Treinos Pré-Confirmados (`0` Treinos até Confirmação do Usuário)

- **Decision**: Remover qualquer pré-marcação de `CONCLUIDO` em `prisma/seed.ts` e `src/lib/periodization-generator.ts`. Todas as 196 sessões das 28 semanas são criadas com `status: 'PLANEJADO'` e campos realizados `null`.
- **Rationale**: O usuário relatou que o sistema mostrava 6 treinos concluídos sem que ele tivesse confirmado nenhum. Iniciar com `0/196` treinos concluídos garante que o sistema reflita fielmente apenas o que o usuário confirmar.

## 2. Sincronização de Métricas Realizadas ao Confirmar/Desmarcar Sessão (`PATCH /api/sessions/[id]`)

- **Decision**:
  1. No backend (`src/app/api/sessions/[id]/route.ts`) e no frontend (`src/components/training/session-sheet.tsx` + botão de confirmação rápida em `src/components/training/week-tab.tsx`):
     - Quando uma sessão transiciona para `CONCLUIDO`, `PARCIAL` ou `AJUSTADO`, qualquer campo realizado não informado (`durationActualMin`, `kmActual`, `rpeActual`, `exercises[*].setsActual/repsActual/loadActualKg`, `stations[*].splitActualSec`) é preenchido automaticamente com o respectivo valor prescrito da sessão (ajustado por `0.7` se `PARCIAL`).
     - Quando uma sessão transiciona para `PLANEJADO` ou `NAO_REALIZADO`, todos os campos realizados (`durationActualMin`, `kmActual`, `tonnageActualKg`, `rpeActual`, `loadActual`, `setsActual`, `repsActual`, `loadActualKg`, `splitActualSec`) são limpos (`null`).
- **Rationale**: Impede que uma sessão marcada como `CONCLUIDO` tenha `loadActual = null` ou `kmActual = null` no Painel Geral, e garante que desmarcar um treino remova 100% do seu efeito em todas as 5 abas.

## 3. Alinhamento entre Painel Geral (`analytics.ts`), Previsão (`predictions.ts`) e HYRESULT (`hyresult-analytics.ts`)

- **Decision**:
  1. Em `src/lib/analytics.ts`:
     - Calcular `dailyA`, `acuteLoad`, `chronicLoad`, `fitness`, `fatigue`, `form` e `modalitySplit` **exclusivamente** a partir de sessões confirmadas (`DONE = ['CONCLUIDO', 'PARCIAL', 'AJUSTADO']`), sem substituir dias futuros ou `PLANEJADO` por `loadPrescribed`.
     - Calcular `adherenceWeekPct` e `adherenceOverallPct` de forma consistente: quando `0` treinos foram confirmados, `kmWeekA = 0`, `tonnageWeekA = 0`, `acuteLoad = 0` e `sessionsDoneTotal = 0`.
  2. Em `src/lib/hyresult-analytics.ts` e `src/components/training/hyresult-tab.tsx`:
     - Incluir `weeklySimulationCurve: PeriodizationWeekSimulationPointDTO[]` em `HyresultAnalysisDTO` e renderizar a **Curva de Acompanhamento da Periodização (S1 → S28)** também na aba **Análise HYRESULT**.
     - Disponibilizar no seletor de fontes da Análise HYRESULT os marcos de cada mesociclo da periodização (`Evolução Atual Ao Vivo`, `Diagnóstico S1 / #LR3MS4JI5A0E80`, `S6 — Fim do GPP1`, `S11 — Fim do GPP2`, `S17 — Fim do SPP1`, `S21 — Meia-Simulação SPP2`, `S24 — Simulação Completa #1`, `S26 — Simulação Completa #2`, `S28 — Alvo Final da Periodização`) para que a análise HYRESULT acompanhe toda a periodização.

