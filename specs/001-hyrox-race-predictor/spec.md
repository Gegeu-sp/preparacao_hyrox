# Feature Specification: Módulo Preditivo de Tempo de Prova HYROX

**Feature Branch**: `001-hyrox-race-predictor`

**Created**: 2026-10-27

**Status**: Draft

**Input**: User description: "Módulo preditivo de tempo de prova HYROX (estimativa de tempo final e pace por estação com base em simulações e limiares)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visualização da Previsão de Tempo Total e Zonas de Confiança (Priority: P1)

O atleta e o treinador precisam consultar uma estimativa precisa e fundamentada do tempo final de prova no HYROX (ex.: 01:14:30), com faixas de confiança (cenário conservador, realista e agressivo), calculada a partir dos parâmetros fisiológicos do atleta (VO₂max, limiares VT1/VT2 e PB de 5 km) combinados com os tempos executados em simulações de treino.

**Why this priority**: É a entrega de valor central da funcionalidade. Sem um tempo total projetado e fundamentado cientificamente, o atleta não tem baliza para definir sua estratégia geral de ritmo e validar se a meta estabelecida para o dia da prova é realista.

**Independent Test**: Pode ser testado fornecendo o perfil fisiológico e os tempos de simulação mais recentes de um atleta, verificando se o sistema projeta um tempo total consistente em minutos/segundos com intervalos de confiança e compara com a meta de tempo estabelecida.

**Acceptance Scenarios**:

1. **Given** um atleta com perfil fisiológico preenchido e pelo menos uma sessão de simulação ou teste de estações com splits registrados, **When** o atleta abre o módulo preditivo, **Then** o sistema exibe o tempo total projetado no formato horas:minutos:segundos (hh:mm:ss) acompanhado dos três cenários (conservador, realista e agressivo) e do delta em relação à meta cadastrada.
2. **Given** um atleta cuja previsão indica tempo superior à meta cadastrada, **When** o resumo é apresentado, **Then** o sistema destaca visualmente o gap de tempo e indica a diferença percentual de desempenho exigida para atingir a meta.

---

### User Story 2 - Decomposição Segmentada dos 16 Splits da Prova e Roxzone (Priority: P2)

O atleta e a comissão técnica necessitam de uma visão detalhada, estação por estação e corrida por corrida (8 corridas de 1 km intercaladas com as 8 estações funcionais do HYROX: SkiErg, Sled Push, Sled Pull, Burpee Broad Jumps, Rowing, Farmers Carry, Sandbag Lunges e Wall Balls, além do tempo estimado de trânsito em Roxzone), indicando o pace/tempo alvo de cada segmento para atingir a meta sem quebra de rendimento.

**Why this priority**: HYROX é uma prova combinada onde a distribuição de esforço define o resultado; correr rápido demais na primeira metade costuma gerar quebra exponencial nos Lunges e Wall Balls. A decomposição permite uma execução tática disciplinada.

**Independent Test**: Pode ser testado inspecionando a tabela de 16 segmentos projetados: a soma dos tempos dos 16 segmentos mais o tempo de Roxzone deve corresponder exatamente ao tempo total projetado da User Story 1.

**Acceptance Scenarios**:

1. **Given** o cálculo de projeção concluído, **When** o usuário consulta o detalhamento de segmentos, **Then** o sistema exibe uma tabela ordenada com os 8 trechos de 1 km de corrida (com pace min/km projetado), as 8 estações de força/resistência (com tempo estimado em mm:ss) e o tempo total de Roxzone.
2. **Given** a identificação das estações com maior taxa de decaimento de rendimento baseada no histórico de treinos, **When** a tabela de segmentos é exibida, **Then** o sistema sinaliza com indicador de risco as estações críticas onde o atleta tem maior propensão à fadiga acentuada.

---

### User Story 3 - Análise de Sensibilidade e Simulação de Cenários "What-If" (Priority: P3)

O treinador ou atleta deseja simular ajustes manuais pontuais (ex.: "e se eu correr cada quilômetro 5 segundos mais lento para economizar energia para o Sled Push e Lunges?") e observar instantaneamente a redistribuição da fadiga estimada e o novo tempo final projetado.

**Why this priority**: Permite tomar decisões táticas pré-prova conjuntas entre técnico e competidor, testando diferentes abordagens de ritmo e identificando o ponto de equilíbrio de conservação de energia.

**Independent Test**: Pode ser testado alterando um parâmetro de ritmo (ex.: pace de corrida base) e confirmando que os tempos das estações e o tempo total são recalculados instantaneamente de acordo com o modelo de interação fadiga-estação.

**Acceptance Scenarios**:

1. **Given** a projeção base de prova, **When** o usuário altera a meta de pace de corrida através de um controle de ajuste, **Then** o sistema recalcula em tempo real os tempos dos 8 trechos de corrida, o tempo final e a estimativa de impacto na fadiga muscular para as estações de trenó e pernas.
2. **Given** um cenário simulado com risco elevado de quebra fisiológica (ex.: pace inicial muito próximo do limiar anaeróbico VT2), **When** o usuário aplica o cenário, **Then** o sistema emite um alerta de sustentabilidade de ritmo indicando alto risco de exaustão prematura.

---

### Edge Cases

- **Ausência de simulações recentes**: O que acontece quando o atleta ainda não realizou simulações completas de prova (ex.: início da periodização nas semanas GPP)? O sistema deve basear a predição exclusivamente nos parâmetros cardiorrespiratórios (VO₂max, VT1, VT2, 5km PB) e médias normativas da categoria HYROX, identificando claramente a projeção como "estimativa inicial por perfil fisiológico".
- **Dados parciais de estações**: Como o sistema lida quando o atleta possui registros de apenas algumas estações (ex.: SkiErg e Remo registrados, mas sem histórico recente de Sled Pull)? O modelo deve usar dados empíricos do perfil para as estações faltantes sem interromper a previsão global.
- **Valores extremos ou inconsistentes**: O que ocorre quando um split registrado possui valor fisicamente anômalo (ex.: 1km registrado em 1 minuto por erro de digitação)? O sistema deve detectar o valor como outlier, descartá-lo do cálculo preditivo e alertar o usuário sobre a inconsistência.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE calcular a projeção de tempo total de prova HYROX combinando parâmetros fisiológicos do atleta (VO₂max, velocidades de limiar aeróbico VT1 e anaeróbico VT2, tempo de 5 km) e resultados de treinos e simulações.
- **FR-002**: O sistema DEVE gerar três faixas de projeção de tempo: Cenário Realista (mais provável), Cenário Otimista (execução perfeita com baixa perda em transição) e Cenário Conservador (margem de segurança contra fadiga acumulada).
- **FR-003**: O sistema DEVE decompor a projeção completa em 16 segmentos individuais (8 corridas de 1.000m e 8 estações funcionais na ordem oficial da prova: SkiErg 1.000m, Sled Push 50m, Sled Pull 50m, Burpee Broad Jumps 80m, Rowing 1.000m, Farmers Carry 200m, Sandbag Lunges 100m, Wall Balls 100/75 reps) mais o tempo acumulado de Roxzone.
- **FR-004**: Para cada um dos 8 segmentos de corrida, o sistema DEVE apresentar o tempo previsto em minutos/segundos e o pace médio equivalente em min/km, considerando o fator de decaimento de velocidade por fadiga ao longo da prova.
- **FR-005**: Para cada uma das 8 estações funcionais, o sistema DEVE apresentar o tempo previsto de execução em minutos/segundos e a comparação com os melhores tempos atingidos pelo atleta nos treinos preparatórios.
- **FR-006**: O sistema DEVE calcular o tempo total estimado de Roxzone (área de transição entre corridas e estações) com base no padrão atlético de transição e histórico do atleta.
- **FR-007**: O sistema DEVE calcular o delta (diferença absoluta e percentual) entre a projeção calculada e o objetivo de prova (Goal Race Time) cadastrado no perfil do atleta.
- **FR-008**: O sistema DEVE permitir a simulação interativa de cenários alternativos de ritmo, atualizando os tempos parciais e o tempo total de forma imediata quando o usuário ajustar o ritmo de corrida ou o tempo de estações específicas.
- **FR-009**: O sistema DEVE identificar e destacar as estações de maior criticidade e risco para o atleta (gargalos onde há maior desvio em relação ao tempo ideal).
- **FR-010**: O sistema DEVE emitir alertas de sustentabilidade fisiológica caso o atleta simule um ritmo de corrida ou de transição incompatível com seus limiares de esforço documentados.

### Key Entities

- **Projeção de Prova (Race Prediction)**: Representa a predição global para um determinado momento da periodização. Contém tempo total estimado, data de cálculo, nível de confiança, cenário (conservador, realista, otimista), meta associada e delta de tempo.
- **Split Preditivo de Segmento (Segment Prediction Split)**: Representa a previsão de um dos 16 trechos da prova ou da Roxzone. Contém ordem do segmento (1 a 16), tipo (Corrida vs. Estação Funcional vs. Transição), nome do segmento, tempo projetado, pace correspondente (se corrida), split alvo e fator de fadiga aplicado.
- **Perfil de Calibração Preditiva (Prediction Calibration Profile)**: Parâmetros consolidados do atleta utilizados no modelo (VO₂max, VT1, VT2, 5km PB, fator de perda em corrida pós-trenó, tempo médio de transição em Roxzone).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O tempo de cálculo e renderização da projeção completa com seus 16 segmentos DEVE ocorrer em menos de 1 segundo após o carregamento da tela ou alteração de cenário.
- **SC-002**: A soma matemática dos 16 segmentos projetados mais a Roxzone DEVE ter consistência de 100% (erro absoluto de 0 segundos) em relação ao tempo total projetado exibido.
- **SC-003**: 100% dos 16 segmentos da prova e a Roxzone DEVEM ser contemplados com tempos válidos e formatados no padrão cronométrico esportivo (mm:ss ou hh:mm:ss).
- **SC-004**: Em testes com atletas com histórico de simulações completas, a diferença entre o tempo projetado no cenário realista e o tempo da simulação mais recente DEVE ter desvio inferior a 3%, confirmando a acurácia do modelo preditivo.
- **SC-005**: Atletas e treinadores conseguem identificar visualmente seus principais gargalos e definir sua estratégia de prova em menos de 2 minutos de interação com o módulo.

## Assumptions

- O atleta possui perfil cadastrado com seus dados básicos e parâmetros de teste incremental (VO₂max, VT1, VT2) previamente preenchidos ou estimados.
- A ordem e as metragens/cargas das estações seguem o regulamento oficial internacional do HYROX Open/Pro Masculino ou Feminino correspondente à categoria do atleta.
- A Roxzone varia entre provas e arenas esportivas, de modo que uma estimativa base de transição (entre 30s e 60s por transição) é adotada como padrão inicial configurável.
- As unidades de medida adotadas são o sistema métrico internacional (km/h, min/km, metros, quilogramas e segundos).
