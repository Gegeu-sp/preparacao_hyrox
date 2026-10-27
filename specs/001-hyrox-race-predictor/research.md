# Research & Architectural Decisions: Módulo Preditivo HYROX

**Feature**: `001-hyrox-race-predictor`
**Data**: 2026-10-27
**Status**: Concluído

## 1. Modelo Fisiológico e Formulação Matemática

### Decisão
Utilizar um modelo determinístico híbrido composto por:
1. **Velocidade Base de Corrida ($V_{base}$)**: derivada do limiar anaeróbico ($VT2$) e da melhor marca de 5 km do atleta ($PB_{5k}$), calibrada pela velocidade associada ao $VO_2max$ ($vVO_2max$).
2. **Coeficiente de Interferência Neuromuscular por Estação ($C_{int}$)**: decaimento de pace específico aplicado aos 8 trechos de corrida com base no impacto biomecânico da estação imediatamente anterior:
   - **Run 1 (Pós-aquecimento)**: $1.00 \times P_0$ (ritmo controlado, sem fadiga residual).
   - **Run 2 (Pós-SkiErg)**: $+3\%$ a $+5\%$ (fadiga de membros superiores e tronco).
   - **Run 3 (Pós-Sled Push)**: $+10\%$ a $+14\%$ (acúmulo agudo de lactato e queima de quadríceps - "pernas pesadas").
   - **Run 4 (Pós-Sled Pull)**: $+6\%$ a $+8\%$ (fadiga de posteriores de coxa e pegada).
   - **Run 5 (Pós-Burpee Broad Jumps)**: $+7\%$ a $+10\%$ (pico de frequência cardíaca e fadiga excêntrica).
   - **Run 6 (Pós-Rowing)**: $+5\%$ a $+7\%$ (fadiga de extensores de tronco e membros inferiores).
   - **Run 7 (Pós-Farmers Carry)**: $+3\%$ a $+5\%$ (fadiga de antebraço/trapézio com corrida estável).
   - **Run 8 (Pós-Sandbag Lunges)**: $+12\%$ a $+18\%$ (exaustão periférica máxima de membros inferiores antes dos Wall Balls).
3. **Tempos de Estações Funcionais**:
   - Prioridade 1: Tempos reais executados em sessões de teste e simulações registradas no banco (`StationResult`).
   - Prioridade 2 (fallback): Normas de desempenho da categoria HYROX Open M indexadas ao perfil do atleta (tonelagem e $VO_2max$).
4. **Roxzone**:
   - Tempo de transição estimado em 8 passagens (média de 35s a 50s por transição em arena padrão, totalizando 04:40 a 06:40).
5. **Cenários de Projeção**:
   - **Realista**: Fatores nominais de calibração baseados no histórico recente.
   - **Otimista**: $-3\%$ nas estações funcionais, $-2.5\%$ nas corridas, transições agressivas na Roxzone ($-15\%$).
   - **Conservador**: $+5\%$ nas estações funcionais, $+4\%$ de decaimento adicional nas corridas 7 e 8, Roxzone de recuperação controlada ($+15\%$).

### Racional
Essa formulação reflete diretamente o Princípio I da Constituição (*Sports Science First*). No HYROX, os atletas raramente falham por falta de capacidade aeróbica isolada, mas sim pelo "efeito de pernas pesadas" gerado pelo Sled Push e pelos Sandbag Lunges. Um modelo que considera apenas o pace de 5 km plano seria impreciso em mais de 10 minutos.

### Alternativas Consideradas
- **Regressão Linear Simples**: Rejeitada por ignorar a fadiga não linear entre estações antagonistas.
- **Modelo de IA Black-Box / Rede Neural**: Rejeitada por violar o Princípio I da Constituição (falta de explicabilidade e rastreabilidade para o treinador e atleta).

---

## 2. Arquitetura de Software e Local de Execução

### Decisão
Implementar o motor preditivo como módulo desacoplado em `src/lib/predictions.ts`:
- O cálculo base e agregação de histórico ocorrem no servidor via rota REST `GET /api/predictions`.
- A reatividade para simulações instantâneas "What-If" (User Story 3) é exposta tanto via endpoint `POST /api/predictions/simulate` quanto por função utilitária pura no cliente para resposta sub-50ms aos controles deslizantes (sliders).

### Racional
Garante conformidade com o Princípio II (*Integridade e Reatividade de Dados*) e o Princípio V (*Desempenho Local e Simplicidade*). O servidor fornece os dados consolidados e a calibração com o banco SQLite, enquanto a função pura no front-end permite que o atleta arraste os controles de ritmo sem latência de rede.

### Alternativas Consideradas
- **Execução Exclusiva via Chamada de API em cada movimento de slider**: Rejeitada por gerar tráfego desnecessário e potencial atraso perceptível de UI.
- **Cálculo inteiramente no cliente sem endpoint**: Rejeitada porque viola o princípio de centralização de regras analíticas no servidor e impediria relatórios futuros em background.

---

## 3. Estratégia de Interface (UI/UX)

### Decisão
Adicionar uma nova aba ou sub-painel no HYROX CONTROL com:
1. **Cards de KPI de Projeção**: Tempo Total Projetado (hh:mm:ss), Cenário Otimista / Realista / Conservador, Gap para o Tempo Alvo (com badges em emerald/amber/red).
2. **Gráfico e Tabela de 16 Segmentos**: Barras horizontais ou tabela densa com tempo de cada corrida de 1km e estação funcional, destacando em vermelho/âmbar as estações de maior criticidade/gargalo.
3. **Painel Interativo "What-If"**: Controles de ajuste fino de ritmo base de corrida e tempo em estações-chave, com feedback imediato no tempo final e alerta de viabilidade fisiológica.

### Racional
Atende ao Princípio III (*UX Esportiva de Alta Performance*) com a paleta visual Zinc + Emerald/Amber/Lime e feedback tático rápido para tomada de decisão pré-prova.
