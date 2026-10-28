# Feature Specification: Sincronização Unificada de Dados entre Abas, Zero Treinos Pré-Confirmados e Acompanhamento da Periodização no HYRESULT

**Feature Branch**: `005-unified-periodization-sync`

**Created**: 2026-10-28

**Status**: Approved

**Input**: User description: "analise HYRESULT precisa tbm acompanhar a periodização esta marcando 6 treinos sendo que nao confirmei nenhum tudo precisa esta interligado para nao ter desvio de informação, analisar e arrumar isso para todas as abas"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Integridade Absoluta de Confirmação de Treinos (Zero Treinos Pré-Confirmados sem Ação do Usuário) (Priority: P1)

Como treinador ou atleta, quero que **nenhum treino apareça como concluído sem que eu o tenha confirmado explicitamente**, garantindo que um atleta recém-cadastrado ou inicializado comece com **0 treinos concluídos (`100% PLANEJADO`)** em todas as 5 abas (**Painel**, **Periodização**, **Diário de Treino**, **Previsão de Prova** e **Análise HYRESULT**), e que ao confirmar ou desmarcar um treino no Diário de Treino todas as abas reflitam exatamente a mesma contagem, quilometragem, tonelagem, carga sRPE e tempo de prova simulado, sem qualquer desvio de informação.

**Why this priority**: Dados pré-marcados artificialmente ou métricas que misturam sessões planejadas (`PLANEJADO`) com sessões realizadas (`CONCLUIDO`) geram desconfiança e divergência entre as abas. A única fonte da verdade deve ser as sessões efetivamente confirmadas pelo usuário.

**Independent Test**: Pode ser testado inicializando a base ou criando um atleta, verificando que todas as 5 abas exibem exatamente `0 treinos concluídos`, `0 km realizados`, `0 kg de tonelagem realizada` e `0:00 de ganho acumulado`; em seguida, confirmando 1 sessão no Diário de Treino e verificando que todas as 5 abas passam a exibir simultaneamente `1 treino concluído` com os mesmos valores numéricos.

**Acceptance Scenarios**:

1. **Given** a aplicação inicializada ou um novo atleta cadastrado, **When** o usuário navega pelas abas **Painel**, **Periodização**, **Diário de Treino**, **Previsão de Prova** e **Análise HYRESULT** antes de confirmar qualquer sessão, **Then** todas as 5 abas exibem exatamente **0 treinos concluídos**, **0 km realizados**, **0 kg de tonelagem realizada**, **0 UA de carga realizada** e **0s de ganho sobre a Linha de Base**.
2. **Given** uma sessão com status `PLANEJADO` no Diário de Treino, **When** o usuário confirma a sessão (seja pelo botão rápido **"Confirmar Treino"** no card do dia ou alterando o status para `CONCLUIDO` na janela de edição da sessão), **Then** o sistema preenche automaticamente os valores realizados a partir dos valores prescritos (caso o usuário não tenha digitado valores customizados) para que quilometragem, duração, tonelagem, carga sRPE e splits de estações nunca fiquem nulos ou zerados por omissão.
3. **Given** uma sessão previamente marcada como `CONCLUIDO`, **When** o usuário altera seu status de volta para `PLANEJADO` ou `NAO_REALIZADO`, **Then** todos os valores realizados daquela sessão são limpos e todas as 5 abas subtraem imediatamente aquela sessão de seus cálculos.

---

### User Story 2 - Análise HYRESULT Acompanhando a Curva Completa da Periodização (S1 a S28) (Priority: P1)

Como treinador ou atleta, quero que a aba **Análise HYRESULT** também acompanhe visualmente e analiticamente as **28 semanas da periodização (`S1 → S28`)**, exibindo a curva semanal de evolução HYRESULT (Tempo Total, *Running*, *Workouts*, *Roxzone* e Percentil por fase `DIAG`, `GPP1`, `GPP2`, `SPP1`, `SPP2`, `COMP`, `TAPER`) e permitindo selecionar qualquer semana da periodização para inspecionar como os 3 Pilares, o Radar de 10 Eixos, o `Fade Index` e a `Roxzone` se comportam naquela fase.

**Why this priority**: O usuário precisa visualizar na própria aba **Análise HYRESULT** como a periodização proposta conduz o atleta desde o diagnóstico inicial (`S1`) até a meta da prova (`S28`), lado a lado com a evolução real dos treinos que vão sendo confirmados.

**Independent Test**: Pode ser testado abrindo a aba **Análise HYRESULT**, verificando o gráfico da **Curva HYRESULT na Periodização (S1 a S28)** com os 4 marcos sincronizados (`Linha de Base S1`, `Estado Atual Confirmado`, `Previsto na Semana Atual` e `Meta S28`) e selecionando diferentes marcos da periodização no seletor para inspecionar a evolução projetada e realizada.

**Acceptance Scenarios**:

1. **Given** um atleta com sua periodização de 28 semanas, **When** o usuário abre a aba **Análise HYRESULT**, **Then** visualiza o painel **Acompanhamento da Periodização no Padrão HYRESULT (S1 → S28)** com a curva das 28 semanas (comparando a Curva Planejada pela Periodização, os Pontos Reais das Semanas com Treinos Confirmados e a Trajetória Reancorada até S28).
2. **Given** a aba **Análise HYRESULT** e a aba **Previsão de Prova**, **When** o usuário compara o Tempo Inicial (S1), o Tempo Atual Simulado (baseado nos treinos confirmados), o Ganho Conquistado e a Meta S28 entre as duas abas, **Then** todos os tempos em segundos e contadores de treinos confirmados são **100% idênticos**.

---

### User Story 3 - Eliminação de Desvios Analíticos no Painel Geral e Diário de Treino (Priority: P2)

Como treinador ou atleta, quero que os indicadores do **Painel Geral (Dashboard)** — incluindo Carga Aguda/Crônica, Fitness/Fadiga/Forma (EWMA), Distribuição por Modalidade e Resumo Semanal — diferenciem estritamente o que foi **Realizado (Confirmado)** do que é apenas **Prescrito (Planejado)**, sem contabilizar sessões `PLANEJADO` como se tivessem sido executadas.

**Why this priority**: No painel anterior, a distribuição por modalidade e a série futura misturavam carga prescrita de treinos `PLANEJADO` com carga realizada, gerando números diferentes do Diário de Treino e da Análise HYRESULT.

**Independent Test**: Pode ser testado verificando no **Painel Geral** que, com `0` treinos confirmados, os KPIs de realizado (`kmWeekA`, `tonnageWeekA`, `acuteLoad`, `modalitySplit` realizado) exibem `0`, e que ao confirmar 1 treino de `5 km` e `75 min @ RPE 4 (300 UA)`, o Painel mostra exatamente `5,0 km`, `300 UA` e `1 treino concluído`, em total sincronia com o Diário de Treino, a Previsão de Prova e o HYRESULT.

**Acceptance Scenarios**:

1. **Given** um atleta com `0` sessões confirmadas, **When** o usuário abre a aba **Painel**, **Then** os KPIs de execução real (`Km Realizado`, `Tonelagem Realizada`, `Carga Aguda Realizada`, `Treinos Concluídos`) mostram `0`, deixando claro o comparativo `0 realizado / X prescrito`.
2. **Given** o usuário na aba **Diário de Treino**, **When** clica no botão rápido **"Confirmar Concluído"** diretamente no card de uma sessão (ou dentro da gaveta de edição), **Then** a sessão é confirmada com seus parâmetros prescritos (ou editados) e um banner/resumo no topo confirma a sincronização imediata com o Painel, Previsão de Prova e Análise HYRESULT.

---

### Edge Cases

- **Confirmação de sessão sem preenchimento manual dos campos de "Realizado"**: Quando o usuário muda o status de `PLANEJADO` para `CONCLUIDO` sem preencher manualmente duração, km, cargas de exercícios ou splits de estações realizados, o sistema deve assumir automaticamente 100% dos valores prescritos daquela sessão (duração, km, RPE, séries/reps/cargas de exercícios e splits de estações), evitando sessões `CONCLUIDO` com métricas vazias (`null`).
- **Reversão de sessão de `CONCLUIDO` para `PLANEJADO` ou `NAO_REALIZADO`**: Deve zerar/limpar os campos realizados (`durationActualMin`, `kmActual`, `tonnageActualKg`, `rpeActual`, `loadActual`, `setsActual`, `repsActual`, `loadActualKg`, `splitActualSec`) para que nenhuma métrica órfã contamine os gráficos.
- **Consistência entre Previsão de Prova e Análise HYRESULT**: Ambas devem consumir exatamente o mesmo estado vivo (`liveState`), o mesmo `baselineState` e o mesmo `targetW28State` do motor unificado, garantindo `0 segundos` de diferença entre os tempos exibidos nas duas abas.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O seed inicial e o gerador de periodização para novos atletas DEVEM criar todas as 196 sessões das 28 semanas exclusivamente com status `PLANEJADO` e campos realizados nulos (`0` treinos pré-confirmados).
- **FR-002**: O endpoint de atualização de sessão e a interface de edição DEVEM preencher automaticamente os campos realizados (`durationActualMin`, `kmActual`, `rpeActual`, `tonnageActualKg`, `loadActual`, `exercises[*].setsActual/repsActual/loadActualKg` e `stations[*].splitActualSec`) com os respectivos valores prescritos sempre que uma sessão for marcada como `CONCLUIDO` e esses campos ainda estiverem vazios.
- **FR-003**: Sempre que o status de uma sessão for alterado para `PLANEJADO` ou `NAO_REALIZADO`, o sistema DEVE limpar (`null`) todos os campos realizados daquela sessão, de seus exercícios e de suas estações.
- **FR-004**: Os cartões diários na aba **Diário de Treino** DEVEM oferecer uma ação direta de 1 clique (**"Confirmar Treino"** / **"Desmarcar"**) além da edição detalhada na gaveta lateral, facilitando a confirmação rápida conforme a periodização é executada.
- **FR-005**: O motor do **Painel Geral** DEVE calcular `acuteLoad`, `chronicLoad`, `fitness`, `fatigue`, `form` e `modalitySplit` realizados estritamente a partir das sessões confirmadas (`CONCLUIDO`, `PARCIAL`, `AJUSTADO`), sem injetar cargas de sessões `PLANEJADO` como se tivessem sido executadas.
- **FR-006**: O motor unificado de evolução DEVE usar a mesma Linha de Base (`baselineState`), o mesmo Estado Atual Confirmado (`liveState`) e o mesmo Alvo Final (`targetW28State`) tanto na **Previsão de Prova** quanto na **Análise HYRESULT**, garantindo que quando `0` treinos estiverem confirmados, `currentSimulatedTotalSec === baselineTotalSec` e `gainAchievedSec === 0` em ambas as abas.
- **FR-007**: A aba **Análise HYRESULT** DEVE exibir a **Curva de Acompanhamento da Periodização (S1 → S28)** (mostrando a evolução prevista e realizada ao longo dos 7 mesociclos e 28 semanas) e permitir selecionar no seletor de fonte qualquer marco da periodização (`Evolução Atual Ao Vivo`, `Diagnóstico S1 / #LR3MS4JI5A0E80`, `Fim do GPP1 - S6`, `Fim do GPP2 - S11`, `Fim do SPP1 - S17`, `Meia-Simulação - S21`, `Simulação #1 - S24`, `Simulação #2 - S26` e `Meta Final - S28`).
- **FR-008**: Todas as 5 abas DEVEM exibir um indicador sincronizado do progresso de execução da periodização (`X de 196 sessões confirmadas` e semana/fase atual), atualizando-se instantaneamente após qualquer confirmação ou edição de treino.

### Key Entities

- **Estado Unificado de Execução da Periodização (`UnifiedPeriodizationState`)**: Representa a verdade única sobre quantas sessões foram confirmadas no ciclo e na semana atual, os totais realizados vs. prescritos (km, tonelagem, carga sRPE) e os vetores de splits (`baselineState`, `liveState`, `targetW28State`) compartilhados entre Dashboard, Periodização, Diário, Previsão de Prova e Análise HYRESULT.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Ao inicializar o banco ou cadastrar um novo atleta, 100% das 5 abas reportam exatamente `0` sessões concluídas, `0,0 km` realizados, `0 kg` de tonelagem realizada e `0:00` de tempo ganho até que o usuário confirme manualmente um treino.
- **SC-002**: A diferença entre o Tempo Total Atual Simulado na aba **Previsão de Prova** e o Tempo Total da fonte **Evolução Atual (Ao Vivo)** na aba **Análise HYRESULT** é de **0 segundos** em 100% dos estados (com 0, 1 ou N treinos confirmados).
- **SC-003**: Ao confirmar um treino em 1 clique no **Diário de Treino**, o contador de treinos concluídos, a quilometragem/tonelagem/carga sRPE no **Painel**, a **Previsão de Prova** e a **Análise HYRESULT** atualizam-se em menos de 1 segundo com 100% de consistência numérica.

## Assumptions

- O resultado oficial `#LR3MS4JI5A0E80` de Rafael Nogueira (e o diagnóstico inicial de qualquer novo atleta) representa o **Marco Zero (Diagnóstico S1 — Pré-Treinos)**, servindo como ponto de partida da curva das 28 semanas antes da confirmação do 1º treino da periodização.
- Ao clicar em "Confirmar Treino" sem editar valores individuais, considera-se que o atleta cumpriu 100% do prescrito para aquela sessão (duração, distância, RPE, séries/repetições/cargas e splits-alvo das estações da sessão).

