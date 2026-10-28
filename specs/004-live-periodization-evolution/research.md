# Phase 0 Research: Simulação Preditiva Dinâmica Guiada pela Periodização & Evolução HYRESULT Treino a Treino

**Feature**: `004-live-periodization-evolution`  
**Date**: 2026-10-28

## 1. Modelo Matemático de Adaptação ao Longo da Periodização (S1 → S28)

- **Decision**: Modelar a trajetória científica planejada da periodização de 28 semanas como uma função determinística de progressão fisiológica $P(w) \in [0, 1]$ ($w = 1 \dots 28$) que interpola o **Estado Inicial de Diagnóstico ($S_0$)** até o **Alvo Final da Semana 28 ($S_{28}$)** respeitando a especificidade de cada um dos 7 mesociclos (`DIAG`, `GPP1`, `GPP2`, `SPP1`, `SPP2`, `COMP`, `TAPER`) e os microciclos de deload (`W6`, `W11`, `W17`, `W22`).
- **Rationale**: Na fisiologia do treinamento esportivo (modelos de Banister e periodização em blocos de Issurin), os ganhos não são puramente lineares:
  - Em `GPP1/GPP2` (Semanas 2–11), o ganho predomina na base aeróbica (`VT1/VT2`) e na força máxima estrutural (`3RM`), iniciando a queda do tempo de corrida e das estações de carga pesada (`Sled Push`, `Sled Pull`, `Farmers`).
  - Em `SPP1/SPP2` (Semanas 12–22), os *Bricks* (`1 km + estação`) aceleram a queda do `Fade Index (%)` nas corridas comprometidas (`Run 3` e `Run 8`) e elevam os percentis das estações metabólicas (`BBJ`, `Sandbag Lunges`, `Wall Balls`).
  - Em `COMP/TAPER` (Semanas 23–28), as simulações calibram a `Roxzone` e a dissipação da fadiga aguda no taper revela o pico de forma na Semana 28.
- **Alternatives Considered**:
  - *Interpolação linear simples de S1 a S28*: Rejeitada por ignorar a especificidade de cada mesociclo e o efeito de supercompensação nas semanas de deload e taper.

---

## 2. Motor de Evolução Treino a Treino (`Session-by-Session Evolution Engine`)

- **Decision**: Construir um motor determinístico unificado (`src/lib/live-evolution.ts`) que percorre cronologicamente todas as sessões executadas pelo atleta (`status IN ('CONCLUIDO', 'MODIFICADO')` ou com métricas reais preenchidas) e atualiza o vetor de estado HYROX do atleta:
  $$\mathbf{E}_k = \left(\text{runSplits}_k[1..8],\; \text{workSplits}_k[\text{8 estações}],\; \text{roxSplits}_k[1..8]\right)$$
  a cada sessão concluída $k = 1 \dots N$.
- **Rationale**:
  - Cada sessão prescrita possui uma fração esperada de contribuição para a adaptação daquela semana ($\Delta_{\text{plan}, k}$).
  - O ganho real conquistado na sessão $k$ é modulado pelo **Índice de Qualidade de Execução ($Q_k$)**:
    1. **Sessões de Corrida (`CORRIDA`)**: Compara a velocidade média realizada ($v_{\text{real}} = \text{kmActual} / (\text{durationActualMin}/60)$) contra a velocidade-alvo da zona prescrita (`Z1`, `Z2`, `Z3`, `Z4`) e a razão de volume ($\text{kmActual} / \text{kmPrescribed}$). Se o atleta executa o treino dentro ou acima do alvo da zona, $Q_{\text{run}, k} \ge 1.0$, reduzindo os splits de corrida e o `Fade Index`.
    2. **Sessões de Força (`FORCA`)**: Compara a tonelagem realizada contra a prescrita ($\text{tonnageActualKg} / \text{tonnagePrescribedKg}$) e as cargas reais nos exercícios básicos. Eleva a eficiência nas estações neuromusculares (`SLED_PUSH`, `SLED_PULL`, `FARMERS`, `SANDBAG`, `WALLBALLS`) e reduz o fator de fadiga excêntrica nas corridas comprometidas (`Run 3` e `Run 8`).
    3. **Sessões Híbridas e Testes (`HIBRIDO`, `TESTE`) com Splits de Estação (`StationResult`)**: Quando o atleta registra `splitActualSec` em uma estação, o motor normaliza o tempo para o volume oficial da prova usando a proporção $\text{splitActualSec} / \text{splitPrescribedSec}$ multiplicada pelo alvo daquela semana na periodização, aplicando suavização exponencial ($\alpha = 0.45$) para atualizar imediatamente o split projetado daquela estação sem ruído excessivo.
- **Alternatives Considered**:
  - *Atualizar apenas quando houver Simulação Completa (S24 e S26)*: Rejeitada porque deixa o atleta sem visibilidade de evolução durante as primeiras 23 semanas do ciclo e descarta a riqueza dos dados diários de corrida, força e bricks.

---

## 3. Unificação entre Previsão de Prova (`PredictorTab`) e Análise HYRESULT (`HyresultTab`)

- **Decision**:
  1. Em `computeRacePrediction(athleteId)` (`src/lib/predictions.ts`): O estado atual realista (`realisticTotalSec` e os 16 `segments`) passa a ser alimentado pelo estado acumulado mais recente $\mathbf{E}_N$ do motor `computeLivePeriodizationEvolution(athleteId)`, enriquecido com:
     - Comparativo triplo: **Linha de Base (S1)** $\to$ **Estado Atual Executado (Hoje)** $\to$ **Meta Final (S28)**;
     - **Status frente à Curva da Periodização** (`AHEAD` / `ON_TRACK` / `BEHIND`, com delta em segundos frente ao esperado na semana corrente);
     - **Série Semanal Completa (`weeklySimulationCurve`: W1..W28)**;
     - **Últimos Impactos de Treino (`recentSessionImpacts`)**.
  2. Em `computeHyresultAnalysis(athleteId, sourceId)` (`src/lib/hyresult-analytics.ts`):
     - Adicionar a nova fonte primária padrão `id: 'live-evolution'` (`sourceType: 'LIVE_EVOLUTION'`, título `"Evolução Atual — Treino a Treino (Ao Vivo)"`), que reflete $\mathbf{E}_N$ e se atualiza a cada treino salvo no Diário de Treino;
     - Incluir no `HyresultAnalysisDTO` o bloco `evolutionTimeline` contendo a série histórica treino a treino (`sessionPoints`) e o resumo de ganho acumulado desde a Linha de Base (`baselineTotalSec`, `currentLiveTotalSec`, `totalGainSec`, `periodizationExpectedSec`, `deltaVsPeriodizationSec`).
- **Rationale**: Garante 100% de coerência matemática entre a aba **Previsão de Prova** e a aba **Análise HYRESULT**, mantendo toda a inteligência analítica no servidor (`Single Source of Truth` no SQLite) conforme exigido pela Constituição.

