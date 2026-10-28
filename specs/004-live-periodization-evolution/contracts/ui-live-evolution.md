# UI Contracts: Simulação Preditiva Dinâmica & Evolução HYRESULT Treino a Treino

**Feature**: `004-live-periodization-evolution`  
**Date**: 2026-10-28

## 1. Aba "Previsão de Prova" (`src/components/training/predictor-tab.tsx` & `predictor-periodization-curve.tsx`)

### 1.1 Barra de Progresso na Periodização (S1 → Hoje → S28)
- Exibe 4 indicadores lado a lado:
  1. **Diagnóstico Inicial (S1)**: Tempo de partida antes dos treinos;
  2. **Estado Atual Simulado (Hoje)**: Tempo recalculado com base nas `N` sessões concluídas (com badge do ganho já conquistado, ex.: `-1m18s conquistados`);
  3. **Alvo da Semana Atual (Curva Científica)**: Onde o atleta deveria estar na semana corrente e badge de status (`Adiantado`, `No Alvo da Periodização` ou `Atenção: Atrasado`);
  4. **Meta Final (Semana 28)**: Tempo-alvo para o dia da prova e barra percentual do ganho total já atingido.

### 1.2 Gráfico da Curva de Simulação das 28 Semanas (`ComposedChart` Recharts)
- Eixo X: `S1` a `S28` com marcação das fases (`DIAG`, `GPP1`, `GPP2`, `SPP1`, `SPP2`, `COMP`, `TAPER`).
- Séries:
  - **Curva Planejada pela Periodização** (linha tracejada âmbar/zinc);
  - **Simulação Real Executada** (área/linha sólida esmeralda nas semanas com treinos concluídos);
  - **Projeção Reancorada até S28** (linha pontilhada lime projetando o efeito acumulado dos treinos até o dia da prova).
- Botão/Clique em uma semana permite navegar diretamente para aquela semana no Diário de Treino (`onGoToWeek`).

---

## 2. Aba "Análise HYRESULT" (`src/components/training/hyresult-tab.tsx` & `hyresult-evolution-timeline.tsx`)

### 2.1 Fonte Padrão "Evolução Atual — Treino a Treino (Ao Vivo)"
- Selecionada por padrão ao abrir a aba **Análise HYRESULT**, exibindo um badge pulsante **"AO VIVO · N TREINOS COMPUTADOS"**.
- Atualiza todos os 3 Pilares (`Total Running`, `Total Workouts`, `Total Roxzone`), o Radar de 10 Eixos (mostrando `Diagnóstico Inicial` vs. `Evolução Atual` vs. `Meta S28`), o `Fade Index (%)` e o ranking de estações.

### 2.2 Painel e Gráfico de Evolução Treino a Treino (`HyresultEvolutionTimeline`)
- **Gráfico de Evolução Treino a Treino**: Mostra a trajetória do Tempo Total HYRESULT e dos 3 Pilares (`Running`, `Workouts`, `Roxzone`) + Percentil Geral ponto a ponto, desde o `Diagnóstico Inicial (#0)` passando por cada sessão concluída (`#1..#N`).
- **Feed/Tabela de Impacto por Sessão Concluída**:
  - Lista cada treino realizado (`CONCLUIDO` / `MODIFICADO`) com:
    - Semana e Fase (`S1 · DIAG`, `S1 · GPP1`, etc.);
    - Tipo e Título da Sessão;
    - Resumo do estímulo executado (ex.: distância/pace real, tonelagem real ou splits de estações);
    - Qualidade de execução (`%` frente ao prescrito);
    - Delta gerado no tempo HYRESULT (ex.: `-12s` em esmeralda) e novo Tempo Total projetado após a sessão;
    - Ação rápida para abrir a semana correspondente no Diário de Treino.

