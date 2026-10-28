# Feature Specification: Simulação Preditiva Dinâmica Guiada pela Periodização & Evolução HYRESULT Treino a Treino

**Feature Branch**: `004-live-periodization-evolution`

**Created**: 2026-10-28

**Status**: Approved

**Input**: User description: "a previsão de prova precisa seguir a periodização, conforme for sendo executada ela ira fazendo a simulação. a analise HYRESULT precisa tbm acompanhar a evolução do atleta treino a treino. para ter uma analise mais real e fidedigna"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Previsão de Prova Dinâmica Acoplada à Execução da Periodização (Priority: P1)

Como treinador ou atleta utilizando o painel de treinamento, quero que a **Previsão de Prova HYROX** evolua automaticamente conforme as sessões da periodização de 28 semanas são concluídas no Diário de Treino (corridas, treinos de força, sessões híbridas/bricks e simulações), projetando tanto o **tempo de prova na condição atlética atual (hoje)** quanto a **curva de progressão semana a semana (S1 → S28)** com base na aderência real, evolução de ritmo de corrida, ganho de força/tonelagem e splits realizados nas estações.

**Why this priority**: Uma previsão estática baseada apenas no teste inicial da Semana 1 não reflete a adaptação fisiológica real do atleta ao longo dos 7 mesociclos (`DIAG`, `GPP1`, `GPP2`, `SPP1`, `SPP2`, `COMP`, `TAPER`). Conectar o motor preditivo à execução diária transforma cada sessão registrada em feedback imediato sobre o tempo final projetado na prova.

**Independent Test**: Pode ser testado registrando ou editando uma sessão como concluída no Diário de Treino (por exemplo, informando distância e duração reais em uma sessão de corrida, cargas reais nos exercícios de força ou splits de estações em um treino híbrido) e verificando imediatamente na aba **Previsão de Prova** a atualização do tempo projetado, dos indicadores de evolução fisiológica e do gráfico de progressão ao longo das 28 semanas.

**Acceptance Scenarios**:

1. **Given** um atleta com sessões planejadas na periodização de 28 semanas, **When** o atleta conclui uma sessão de corrida ou treino híbrido informando distância e duração realizadas (ou splits de corrida `1.000 m`), **Then** o motor preditivo recalcula automaticamente o ritmo base de corrida e ajusta os 8 segmentos de corrida da prova considerando a relação entre o ritmo executado e o prescrito naquela fase da periodização.
2. **Given** um atleta que registra cargas e repetições reais nos exercícios de força ou tempos reais nas estações funcionais durante qualquer semana do ciclo, **When** o usuário abre a aba **Previsão de Prova**, **Then** os tempos previstos das 8 estações (`SkiErg`, `Sled Push`, `Sled Pull`, `Burpee Broad Jumps`, `Rowing`, `Farmers Carry`, `Sandbag Lunges` e `Wall Balls`) e os fatores de fadiga de corrida comprometida (`Run 3` pós-Sled Push e `Run 8` pós-Lunges) refletem o ganho ou déficit real acumulado nos treinos concluídos.
3. **Given** o ciclo de 28 semanas do atleta, **When** o usuário visualiza a aba **Previsão de Prova**, **Then** é exibida uma **Curva de Evolução da Periodização (S1 a S28)** comparando a **Trajetória Planejada** (curva científica esperada do diagnóstico até o taper) contra a **Trajetória Real Simulada** (construída a partir das sessões executadas até o momento e reancorada para as semanas futuras).

---

### User Story 2 - Análise HYRESULT Viva Acompanhando a Evolução Treino a Treino (Priority: P1)

Como treinador ou atleta, quero que a aba **Análise HYRESULT** tenha como fonte principal de análise a **Evolução Real Treino a Treino (Estado Atual da Periodização)** — e não apenas resultados estáticos ou simulações tardias das Semanas 24/26 — consolidando cada treino concluído (corridas, bricks de estações, força específica e transições) para recalcular os **3 Pilares (Running, Workouts, Roxzone)**, o **Radar de 10 Eixos**, o **Fade Index (%)** e os **Percentis da Divisão** a cada sessão realizada.

**Why this priority**: Na prática do treinamento, o atleta realiza dezenas de treinos de corrida, força e estações entre a Semana 1 e a Semana 24. Sem uma síntese treino a treino na Análise HYRESULT, o atleta ficaria meses vendo apenas o resultado antigo de diagnóstico. A análise contínua garante fidelidade ao estado real do atleta em qualquer dia da preparação.

**Independent Test**: Pode ser testado selecionando a fonte **"Evolução Atual (Treino a Treino)"** na aba **Análise HYRESULT**, concluindo um treino no Diário de Treino (ex.: sessão de quarta ou sábado com estações ou quinta com corrida longa) e verificando que os tempos, percentis, Fade Index e histórico de evolução treino a treino na aba HYRESULT foram atualizados de forma determinística.

**Acceptance Scenarios**:

1. **Given** um atleta em qualquer semana da periodização, **When** o usuário acessa a aba **Análise HYRESULT**, **Then** existe uma fonte dinâmica **"Estado Atual — Evolução Treino a Treino"** (selecionada por padrão ou destacada no seletor) que sintetiza o desempenho atual nos 8 splits de corrida, 8 estações e 8 transições de Roxzone a partir de todas as sessões concluídas até a data atual.
2. **Given** o histórico de sessões concluídas (`CONCLUIDO` ou `MODIFICADO`) pelo atleta, **When** o usuário inspeciona o painel de evolução na aba **Análise HYRESULT**, **Then** o sistema exibe a **Linha do Tempo Treino a Treino** (mostrando cada sessão concluída que impactou Corrida, Estações ou Resistência à Fadiga, o delta em segundos gerado na projeção HYRESULT e a evolução do percentil geral).
3. **Given** que o atleta realiza um treino específico de estação (ex.: Sled Push, Wall Balls ou Brick de Sábado) com split ou tonelagem superior ao esperado para a fase atual, **When** a Análise HYRESULT é recalculada, **Then** o percentil daquela estação no Radar de 10 Eixos sobe proporcionalmente e a prescrição de gargalos (`Primary/Secondary Limiter`) se ajusta automaticamente caso outra estação passe a ser o maior limitador.

---

### User Story 3 - Comparativo Entre Linha de Base (Diagnóstico), Estado Atual Executado e Meta Final S28 (Priority: P2)

Como treinador ou atleta, quero comparar visualmente três marcos fundamentais tanto na **Previsão de Prova** quanto na **Análise HYRESULT**:
1. **Ponto de Partida (Semana 1 / Benchmark Inicial `#LR3MS4JI5A0E80`)**,
2. **Estado Atual Executado (Simulado com base nos treinos já concluídos)**, e
3. **Alvo Final da Periodização (Semana 28 — Prova HYROX)**,
incluindo o percentual do ganho planejado que já foi conquistado através dos treinos realizados.

**Why this priority**: Permite responder com precisão se o atleta está adiantado, no ritmo esperado ou atrasado em relação à curva da periodização proposta para atingir a meta de prova.

**Independent Test**: Pode ser testado verificando nos cartões de resumo e gráficos de evolução os indicadores de "Tempo Inicial (S1)", "Tempo Atual Simulado (Treinos Concluídos)", "Meta S28" e o indicador de "Aderência à Curva da Periodização (Adianto/Atraso em segundos)".

**Acceptance Scenarios**:

1. **Given** um atleta com sessões concluídas no Diário de Treino, **When** visualiza o painel comparativo na Previsão de Prova ou na Análise HYRESULT, **Then** vê claramente quanto tempo já ganhou em relação à Semana 1 (ex.: `-1m42s conquistados nos treinos concluídos`) e quanto falta para atingir a Meta da Semana 28, além do status em relação ao esperado para a semana corrente (`Acima do Esperado`, `No Alvo da Periodização` ou `Atenção: Abaixo da Curva`).

---

### Edge Cases

- **Atleta recém-cadastrado com 0 sessões concluídas**: O "Estado Atual — Evolução Treino a Treino" deve partir exatamente da linha de base diagnóstica (Semana 1) calibrada pelos testes iniciais (`VT1`, `VT2`, `5km PB`, `3RM`, `SkiErg 1k`, `Remo 500m`), indicando 0 sessões computadas e convidando o usuário a registrar o primeiro treino.
- **Sessões de corrida concluídas sem splits de estação (`CORRIDA` pura)**: O motor deve extrair o ritmo médio realizado (`durationMinActual / distanceKmActual`) ponderado pelo tipo e zona da sessão (ex.: rodagem Z2 vs. intervalado Z4 vs. tempo run Z3) para atualizar o pilar de corrida e o `Fade Index`, mantendo as estações ancoradas nos dados mais recentes de força e sessões híbridas.
- **Sessões de força concluídas sem estações (`FORCA` pura)**: O cumprimento e a progressão da tonelagem realizada versus prescrita nos exercícios básicos (Agachamento, Terra, Lunges, Empurrar/Puxar) devem modular a eficiência projetada nas estações dependentes de força (`Sled Push`, `Sled Pull`, `Farmers Carry`, `Sandbag Lunges`) e reduzir o decaimento de corrida comprometida (`Run 3` e `Run 8`).
- **Sessões híbridas com apenas parte das estações executadas (ex.: Brick com 3 ou 4 estações)**: Apenas as estações praticadas recebem atualização direta de split real (com ponderação exponencial para os treinos mais recentes), enquanto as demais estações preservam sua estimativa atualizada pela evolução geral de condicionamento e força do atleta.
- **Consistência cronométrica obrigatória**: Em todos os pontos da linha do tempo treino a treino e em todas as simulações da periodização, a soma $\text{Total Running} + \text{Total Workouts} + \text{Total Roxzone}$ deve ser 100% idêntica ao $\text{Tempo Total Simulado}$.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O motor de **Previsão de Prova** DEVE calcular o tempo projetado integrando três camadas de dados: (a) a bateria diagnóstica do atleta, (b) a fase/semana atual na periodização de 28 semanas e (c) o histórico real de **todas as sessões concluídas ou modificadas** (`CORRIDA`, `FORCA`, `HIBRIDO`, `TESTE` e `RECUPERACAO`).
- **FR-002**: O sistema DEVE calcular o **Ritmo Base Realizado de Corrida** ponderando os treinos de corrida e híbridos concluídos (comparando o pace realizado `durationMinActual / distanceKmActual` e os splits `RUN_1KM` realizados contra o prescrito da respectiva semana), aplicando ponderação maior aos treinos mais recentes (média móvel exponencial).
- **FR-003**: O sistema DEVE calcular a **Evolução por Estação (8 Workouts)** combinando:
  1. Splits reais registrados na estação (`StationResult.splitActualSec`) em qualquer sessão da periodização (normalizando distâncias/repetições parciais para a distância oficial da prova quando aplicável), e
  2. O índice de evolução de força específica e tonelagem (`actualTonnageKg / prescribedTonnageKg` e progressão de carga nos exercícios correlatos) para estações ainda sem split completo recente.
- **FR-004**: O sistema DEVE recalcular dinamicamente os **fatores de fadiga de corrida comprometida** (`Run 1` a `Run 8`) e o **`Fade Index (%)`** conforme o atleta acumula volume de corrida longa (`Z2/Z3`), sessões híbridas (`Brick`) e carga crônica (Fitness EWMA 42 dias), reduzindo o decaimento pós-*Sled Push* (`Run 3`) e pós-*Sandbag Lunges* (`Run 8`) à medida que a adaptação específica avança.
- **FR-005**: A aba **Previsão de Prova** DEVE exibir a **Curva de Simulação da Periodização (Semanas 1 a 28)** contendo, para cada microciclo:
  - Tempo planejado pela curva científica da periodização para aquela semana;
  - Tempo real simulado nas semanas já executadas (com base nos treinos concluídos até aquela semana);
  - Projeção reancorada para as semanas futuras até a Semana 28 (Prova).
- **FR-006**: A aba **Análise HYRESULT** DEVE disponibilizar como primeira opção (padrão) a fonte dinâmica **"Evolução Atual — Treino a Treino (Ao Vivo)"**, permitindo também alternar para o benchmark inicial (`#LR3MS4JI5A0E80`), simulações de marco (`S21`, `S24`, `S26`), meta final (`S28`) ou qualquer resultado oficial importado.
- **FR-007**: A aba **Análise HYRESULT** DEVE incluir uma seção dedicada de **Evolução Treino a Treino (Histórico de Impacto das Sessões)** que lista cronologicamente os treinos concluídos pelo atleta e exibe, para cada treino: data, semana/mesociclo, título e tipo da sessão, métricas realizadas (km, pace, tonelagem, RPE ou splits de estações), o tempo HYRESULT simulado após o treino e o delta de evolução em segundos (ex.: `-14s`).
- **FR-008**: A aba **Análise HYRESULT** DEVE exibir um **Gráfico de Evolução Contínua dos 3 Pilares e Tempo Total** ao longo dos treinos concluídos (mostrando a queda progressiva nos tempos de *Running*, *Workouts* e *Roxzone* e a subida do Percentil Geral da divisão conforme os treinos avançam).
- **FR-009**: O **Gráfico Radar de 10 Eixos** e as barras de **Percentil por Estação** na Análise HYRESULT DEVEM suportar a comparação tripla ou dupla entre **Diagnóstico Inicial (Linha de Base)**, **Estado Atual (Treino a Treino)** e **Alvo Final (Semana 28)**, permitindo visualizar o ganho já consolidado em cada estação.
- **FR-010**: Qualquer alteração registrada no Diário de Treino (concluir uma sessão, editar distância/duração real, alterar carga/repetições de exercícios ou salvar splits de estações) DEVE refletir imediatamente na **Previsão de Prova** e na **Análise HYRESULT** sem exigir recarregamento manual da página.
- **FR-011**: O sistema DEVE exibir um indicador claro de **Status frente à Periodização** (`Adiantado`, `No Alvo da Periodização` ou `Abaixo do Esperado para a Semana Atual`), comparando o tempo simulado atual com o tempo que a periodização prescrevia para o microciclo corrente.
- **FR-012**: A soma dos 3 pilares ($\text{Running} + \text{Workouts} + \text{Roxzone}$) DEVE permanecer estritamente igual ao tempo total projetado em todos os pontos da série histórica treino a treino e da curva semanal S1–S28.

### Key Entities

- **Snapshot de Evolução por Sessão (`SessionEvolutionPoint`)**: Representa o estado de performance HYROX/HYRESULT do atleta imediatamente após a conclusão de uma sessão de treino específica, contendo metadados da sessão (ID, data, semana, fase, tipo, título), resumo do estímulo realizado (distância, pace, tonelagem, carga sRPE, splits de estações executados), tempos simulados dos 3 pilares (`Running`, `Workouts`, `Roxzone`), tempo total projetado, percentil na divisão e delta em segundos frente à sessão anterior.
- **Ponto da Curva Semanal da Periodização (`PeriodizationWeekSimulationPoint`)**: Representa a simulação da prova HYROX para cada uma das 28 semanas (`W1..W28`), contendo código da fase (`DIAG` a `TAPER`), aderência da semana (%), tempo planejado pela periodização para aquela semana, tempo simulado real (para semanas com treinos concluídos) e tempo projetado reancorado (para semanas futuras).
- **Fonte Dinâmica HYRESULT (`LIVE_EVOLUTION`)**: Fonte analítica viva na aba HYRESULT que consolida o estado acumulado mais recente de todos os treinos concluídos do atleta nos 8 runs, 8 workouts e 8 transições de Roxzone, mantendo comparativo direto contra a Linha de Base (`S1` / `#LR3MS4JI5A0E80`) e o Alvo da Semana 28 (`TARGET_W28`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das sessões marcadas como `CONCLUIDO` ou `MODIFICADO` no Diário de Treino são contabilizadas na linha do tempo de evolução e atualizam deterministicamente a Previsão de Prova e a Análise HYRESULT em menos de 1 segundo após o salvamento.
- **SC-002**: A soma $\text{Total Running} + \text{Total Workouts} + \text{Total Roxzone}$ apresenta erro de arredondamento de **0 segundos** em 100% dos pontos da evolução treino a treino e das 28 semanas da curva de periodização.
- **SC-003**: O treinador ou atleta consegue identificar em uma única visualização (sem trocar de tela) o **Tempo Inicial (Diagnóstico)**, o **Tempo Atual Simulado (Pós-Treinos Concluídos)**, o **Tempo Esperado na Semana Atual da Periodização** e a **Meta Final da Semana 28**, com o delta exato em segundos e percentual de progresso.
- **SC-004**: Ao registrar melhoria real em uma sessão de corrida (pace mais rápido que o prescrito para a zona) ou em uma sessão de estações/força (splits menores ou tonelagem superior), o tempo projetado e o percentil correspondente melhoram na direção fisiologicamente coerente em 100% dos casos de teste.
- **SC-005**: Atletas recém-cadastrados (sem treinos concluídos) e atletas com histórico parcial em qualquer semana (`W1` a `W28`) visualizam a curva completa de 28 semanas e a Análise HYRESULT sem erros, valores `NaN` ou quebras de layout em desktop e mobile.

## Assumptions

- Sessões com status `CONCLUIDO` ou `MODIFICADO` representam treinos efetivamente realizados pelo atleta e entram no cálculo cronológico da evolução treino a treino.
- Em treinos de corrida contínua (`Z1/Z2`) ou regenerativos, o ritmo realizado não é tratado diretamente como ritmo de prova (`Race Pace`), mas sim normalizado pela relação fisiológica entre a zona prescrita da sessão e o ritmo de limiar (`VT2`), evitando que uma corrida leve regenerativa piore artificialmente a projeção de ritmo de prova.
- Em treinos híbridos nos quais uma estação é executada com volume parcial (por exemplo, meia-simulação ou blocos de `50 reps` de Wall Balls), o sistema normaliza o split realizado pelo volume prescrito da sessão frente ao volume oficial da prova antes de atualizar a projeção da estação.
- Para demonstração imediata da evolução treino a treino nos atletas pré-cadastrados, as sessões já concluídas no banco de dados geram automaticamente pontos visíveis na linha do tempo de evolução desde o primeiro acesso.

