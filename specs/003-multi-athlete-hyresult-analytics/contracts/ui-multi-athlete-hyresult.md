# UI Contracts: Seletor Multi-Atleta, Cadastro com Testes e Aba HYRESULT

**Feature**: `003-multi-athlete-hyresult-analytics`
**Date**: 2026-10-28

## 1. Seletor Global de Atletas e Modal de Cadastro/Testes (`athlete-switcher-dialog.tsx`)

### Localização
Integrado diretamente ao cabeçalho sticky (`src/app/page.tsx`), ao lado do título **HYROX CONTROL**.

### Comportamento e Interações
1. **Dropdown / Seletor Rápido de Atleta Ativo**:
   - Exibe o nome do atleta ativo, badge da sua divisão (`OPEN M`, `OPEN F`, `PRO M`, `PRO F`) e meta de prova.
   - Ao clicar, lista todos os atletas cadastrados permitindo alternar com 1 clique.
2. **Botão "Novo Atleta" e Botão "Editar Testes / Recalibrar"**:
   - Abre um `Dialog` estruturado em 3 seções claras:
     - **Aba/Seção 1 — Perfil & Prova-Alvo**: Nome, Sexo (`M`/`F`), Divisão HYROX (`OPEN_M`, `OPEN_F`, `PRO_M`, `PRO_F`), Faixa Etária, Data de Nascimento, Altura (cm), Peso (kg), % Gordura, Nome da Prova, Data da Prova e Meta de Tempo (`hh:mm:ss` ou minutos).
     - **Aba/Seção 2 — Testes Cardiorrespiratórios & Corrida**: VO₂max (`mL/kg/min`), VDOT, Velocidade de VT1 (`km/h`), Velocidade de VT2 (`km/h`), FC Repouso (`bpm`), FC Máxima (`bpm`) e PB de 5 km (`mm:ss`). Inclui botão de "Preencher Estimativa Fisiológica" caso o atleta tenha apenas o PB de 5 km.
     - **Aba/Seção 3 — Testes de Força (3RM), Potência & Ergômetros**: Agachamento Livre 3RM (`kg`), Levantamento Terra 3RM (`kg`), Supino Reto 3RM (`kg`), Salto Vertical CMJ (`cm`), SkiErg 1.000m TT (`mm:ss`) e Remo 500m TT (`mm:ss`).
   - Ao submeter um novo atleta, exibe feedback via `toast` (Sonner) informando a geração das 28 semanas e 196 sessões personalizadas e seleciona o novo atleta imediatamente.

---

## 2. Nova Aba Principal: "Análise HYRESULT" (`hyresult-tab.tsx`)

### Localização
Quinta aba na navegação principal (`TabsList` em `src/app/page.tsx`):
`Painel` · `Periodização` · `Diário de Treino` · `Previsão de Prova` · `Análise HYRESULT`

### Estrutura Visual dos Blocos (Padrão `hyresult.com/result/LR3MS4JI5A0E80`)

1. **Barra de Controle Superior (Header HYRESULT)**:
   - Badge de identificação do resultado ativo (ex.: `HYRESULT #LR3MS4JI5A0E80`, Divisão, Faixa Etária e Arquétipo do Atleta).
   - Seletor de Fonte Analisada (`Select` / Chips): permite alternar instantaneamente entre o **Resultado Oficial `LR3MS4JI5A0E80`**, **Simulação #1 (S24)**, **Simulação #2 (S26)** e **Alvo da Periodização (S28)**.
   - Botão **"Importar / Registrar Resultado HYRESULT"** que abre um modal prático para colar/digitar o código HYRESULT e os splits de uma prova ou bateria simulada.

2. **Bloco 1 — Os 3 Pilares do HYROX (Three Pillars Breakdown Cards + Stacked Bar)**:
   - 3 cartões de destaque + barra proporcional horizontal mostrando:
     - **Total Running (Corridas 1–8)**: Tempo acumulado, `%` do tempo total, pace médio (`/km`), badge de percentil na divisão (ex.: `Top 18%`) e delta contra a meta da periodização.
     - **Total Workouts (Estações 1–8)**: Tempo acumulado nas 8 estações, `%` do tempo total, badge de percentil e delta contra a meta.
     - **Total Roxzone (Transições 1–8)**: Tempo total de transição, `%` do tempo total, média por transição (`s`) e alerta caso ultrapasse `6,5%` do tempo total.

3. **Bloco 2 — Radar de Performance HYRESULT (Spider Chart) & Ranking de Percentis por Estação**:
   - Lado esquerdo: `RadarChart` (Recharts) de 10 eixos (Corrida, Roxzone e as 8 estações oficiais) comparando o polígono do **Resultado Atual (Emerald)** contra o **Alvo da Periodização (Lime tracejado)**.
   - Lado direito: Tabela/Lista de Percentis por Estação com barras de progresso horizontais coloridas semanticamente:
     - `Emerald` ($\ge \text{P75}$ — Ponto Forte / Elite)
     - `Lime` ($\text{P50–P74}$ — Competitivo)
     - `Amber` ($\text{P30–P49}$ — Atenção)
     - `Red` ($< \text{P30}$ — Limitador Crítico + badge de *Time Savings Potential* em segundos).

4. **Bloco 3 — Consistência de Corrida & Degradação (*Run Splits & Fade Index*)**:
   - Gráfico de barras/linha (`ComposedChart`) dos 8 trechos de 1 km (`Run 1` a `Run 8`) com linha de referência do ritmo médio e destaque especial nos trechos comprometidos (`Run 3` pós-Sled Push e `Run 8` pós-Sandbag Lunges).
   - KPIs de corrida: **Fade Index (%)**, **Classificação de Pacing** (*Even Pacing*, *Controlled Fade* ou *Fly & Die*) e **Perda Pós-Trenó / Pós-Lunges**.

5. **Bloco 4 — Raio-X da Roxzone (8 Transições) & Diagnóstico Prescritivo para a Periodização**:
   - Grade compacta das 8 passagens de Roxzone (`Rox 1` a `Rox 8`) indicando eficiência de entrada/saída.
   - Painel **"Ajustes Recomendados na Periodização (Mesociclo Atual)"**: conecta os gargalos encontrados na análise HYRESULT diretamente às sessões-chave do mesociclo do atleta (com botão de atalho para abrir a semana correspondente no Diário de Treino).

