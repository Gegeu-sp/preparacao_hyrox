# UI Contract: Componente e Visualização do Preditor HYROX

**Feature**: `001-hyrox-race-predictor`
**Data**: 2026-10-27

---

## 1. Estrutura de Navegação e Tab no Dashboard

O preditor é integrado como uma nova aba ou subpainel acessível no cabeçalho ou no interior do painel principal:
- **Aba no Header**: `<TabsTrigger value="preditor"> <Timer /> Previsão de Prova</TabsTrigger>`
- **Visual Padrão**: Dark mode atlético (fundo zinc-950, bordas zinc-800, textos zinc-100/400).

---

## 2. Blocos de Conteúdo da Tela

### 2.1 Bloco de Resumo Executivo (KPIs de Projeção)
- **Card Principal**: Tempo Total Projetado em destaque (`text-3xl font-black font-mono`).
- **Badge de Status**:
  - `isWithinGoal === true`: Badge verde esmeralda (`bg-emerald-500/15 text-emerald-400 border-emerald-500/30`), ícone de check.
  - `isWithinGoal === false`: Badge âmbar (`bg-amber-500/15 text-amber-400 border-amber-500/30`), ícone de alerta com o delta (ex: `+01:30 da meta`).
- **Mini-Cards Secundários**:
  1. Cenário Otimista (`hh:mm:ss`)
  2. Cenário Conservador (`hh:mm:ss`)
  3. Total de Corrida (8 km)
  4. Total de Estações (8 estações)
  5. Tempo de Roxzone (transições)

### 2.2 Tabela Segmentada dos 16 Splits da Prova
Tabela responsiva de 16 linhas (com separadores visuais para cada par Corrida + Estação):
- **Colunas**:
  1. `#` (1 a 16)
  2. Segmento (Ícone + Nome)
  3. Tempo Alvo (hh:mm:ss)
  4. Projeção (hh:mm:ss)
  5. Pace Estimado (min/km, visível para corridas)
  6. Dif / Gap (diferença colorida verde/vermelho)
  7. Status / Risco (Badge "Crítico" se identificado como gargalo)

### 2.3 Simulador Tático "What-If" (Controles Deslizantes)
Painel colapsável ou lateral para ajuste de ritmo:
- **Slider 1**: Ajuste de Pace de Corrida base ($-30\text{s}$ a $+30\text{s}$ por km, com passo de 1s).
- **Slider 2**: Eficiência na Roxzone ($-60\text{s}$ a $+60\text{s}$ total).
- **Seletores de Estação**: Ajuste rápido para Sled Push, Sled Pull e Sandbag Lunges.
- **Botão de Reset**: Retorna aos valores nominais da previsão em 1 clique.
