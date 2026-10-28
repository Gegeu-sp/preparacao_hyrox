# Feature Specification: Gestão Multi-Atleta, Periodização Individualizada por Testes e Análise de Performance Padrão HYRESULT

**Feature Branch**: `003-multi-athlete-hyresult-analytics`

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "analisar este site https://www.hyresult.com/result/LR3MS4JI5A0E80 e implementar no nosso projeto de acordo com a periodização proposta. alem disso, criar um campo para cadastra novos atletas, cada uma com sua periodização de acordo com os testes feitos"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastro de Novos Atletas e Geração Automática de Periodização Baseada em Testes (Priority: P1)

O treinador (ou próprio atleta) precisa cadastrar novos atletas na plataforma informando dados de perfil (nome, sexo, data de nascimento, peso, altura, percentual de gordura, categoria HYROX Open/Pro Masculino/Feminino, nome e data da prova-alvo, meta de tempo) e os resultados da bateria de testes diagnósticos (VO₂max, limiares ventilatórios VT1 e VT2, FC repouso/máxima, PB de 5 km, testes de força máxima 3RM em Agachamento, Levantamento Terra e Supino, salto vertical CMJ e tomadas de tempo de SkiErg 1.000m e Remo 500m). A partir desses testes, o sistema gera automaticamente toda a periodização individualizada do atleta (mesociclos, microciclos semanais, zonas de frequência cardíaca e ritmo Z1–Z5, cargas prescritas nos exercícios de força/LPO e splits-alvo nas estações HYROX) e permite alternar entre atletas ativos no cabeçalho da aplicação.

**Why this priority**: Atualmente o sistema é estático para um único atleta pré-cadastrado. Permitir o cadastro de múltiplos atletas e calibrar matematicamente a periodização de cada um a partir dos seus testes diagnósticos é a base para que todas as demais abas (Painel, Periodização, Diário, Previsão e Análise HYRESULT) funcionem de forma individualizada.

**Independent Test**: Pode ser testado abrindo o formulário de novo atleta, preenchendo os dados biométricos e resultados de testes diagnósticos de uma nova atleta (ex.: categoria Open Feminino com VT2 em 10,8 km/h e 3RM de agachamento em 80 kg), salvando o cadastro e verificando que o seletor de atletas passa a exibi-la e que todo o seu plano de semanas, zonas de ritmo, cargas de exercícios e pesos oficiais das estações foram gerados proporcionalmente aos seus testes.

**Acceptance Scenarios**:

1. **Given** o treinador em qualquer tela da aplicação, **When** ele aciona a opção "Novo Atleta" no seletor do cabeçalho e preenche os dados pessoais, a categoria da prova e os resultados da bateria de testes diagnósticos, **Then** o sistema cria o registro do atleta e gera automaticamente os 7 mesociclos (DIAG, GPP1, GPP2, SPP1, SPP2, COMP, TAPER) e todos os microciclos semanais até a data da prova, com zonas Z1–Z5, ritmos de corrida e cargas de musculação/estações calibrados pelos testes informados.
2. **Given** dois ou mais atletas cadastrados no sistema, **When** o usuário alterna o atleta selecionado no seletor global, **Then** todos os painéis (Dashboard, Periodização, Diário de Treino, Bem-Estar, Previsão de Prova e Análise HYRESULT) passam a exibir e editar exclusivamente os dados, treinos e métricas do atleta selecionado.
3. **Given** um atleta já cadastrado que realiza uma nova bateria de re-teste ao longo do ciclo (ex.: Semana 11 ou Semana 17), **When** o treinador atualiza os indicadores de teste no perfil do atleta e solicita a recalibração, **Then** o sistema atualiza as zonas de treinamento (Z1–Z5) e recalibra as cargas e ritmos prescritos das sessões futuras (status "Planejado") sem alterar o histórico de sessões já concluídas.

---

### User Story 2 - Painel de Análise de Prova e Simulações no Padrão HYRESULT (Priority: P2)

O atleta e o treinador necessitam de uma visão analítica aprofundada no padrão do portal internacional **HYRESULT** (`hyresult.com/result/...`) integrada à periodização do projeto. Essa visão decompõe o resultado de provas oficiais, simulações completas (Semanas 24 e 26), meia-simulação (Semana 21) ou projeções alvo nos três grandes pilares do HYROX (**Tempo Total de Corrida vs. Tempo Total de Estações/Workouts vs. Tempo Total de Roxzone**), apresentando o ranking em percentis comparativos da divisão do atleta (ex.: Top 10%, Top 25%, Média da Divisão), gráfico de radar (spider chart) das 8 estações mais corrida e transição, índice de consistência de ritmo (*Pace Degradation / Fade Index* ao longo dos 8 km) e detalhamento individual de cada passagem de Roxzone.

**Why this priority**: O modelo analítico do HYRESULT é a referência mundial para identificar onde o atleta ganha ou perde tempo real em uma prova HYROX (especialmente perdas ocultas na Roxzone e quebra de ritmo após Sled Push e Lunges). Integrar esse diagnóstico diretamente com a fase atual da periodização transforma dados de resultado em ajustes práticos de treinamento.

**Independent Test**: Pode ser testado acessando a visão de Análise HYRESULT para o atleta ativo, selecionando uma simulação registrada (ou meta/resultado importado) e verificando a exibição da distribuição percentual (Corrida / Workouts / Roxzone), dos percentis comparativos por estação, do gráfico de radar de performance e da curva de degradação de pace nos 8 trechos de 1 km.

**Acceptance Scenarios**:

1. **Given** um atleta com dados de simulação, resultado de prova ou projeção alvo, **When** o usuário acessa a aba/painel de Análise HYRESULT, **Then** o sistema exibe o cartão de resumo oficial com Tempo Total, divisão percentual e cronométrica entre **Corrida (Runs 1–8)**, **Workouts (Estações 1–8)** e **Roxzone (Transições 1–8)**, além da classificação estimada em percentil dentro da sua categoria/divisão.
2. **Given** os tempos das 8 corridas e 8 estações do atleta, **When** o gráfico de radar e a tabela de benchmark HYRESULT são renderizados, **Then** cada estação e o bloco de corrida mostram o score de percentil (0 a 100%) frente aos benchmarks normativos da categoria (Open/Pro Masculino/Feminino), destacando visualmente os pontos fortes (ex.: Top 15% no SkiErg) e os limitadores críticos (ex.: Bottom 30% no Sled Pull ou Wall Balls).
3. **Given** os 8 splits de 1 km de corrida, **When** a seção de Análise de Pacing e Roxzone é consultada, **Then** o sistema calcula o **Índice de Degradação de Pace (Fade Index)** comparando o 1º km com a média dos últimos quilômetros (Runs 3, 7 e 8 pós-estações pesadas), detalha os tempos de Roxzone e emite recomendações diretas vinculadas ao mesociclo atual da periodização do atleta (ex.: foco em *Compromised Running* no SPP1/SPP2 ou transição rápida no COMP).

---

### User Story 3 - Importação/Registro de Resultado HYRESULT e Diagnóstico Prescritivo na Periodização (Priority: P3)

O usuário deseja registrar ou importar os 16 splits + Roxzone de um resultado oficial do HYRESULT (como um código/relatório de prova anterior ou simulação) para estabelecer a linha de base (*baseline*) do atleta ou comparar a evolução entre a Simulação #1 (Semana 24), Simulação #2 (Semana 26) e a Prova Alvo (Semana 28), recebendo prescrições de ajuste automático de foco nas semanas seguintes da periodização.

**Why this priority**: Conecta o histórico competitivo real do atleta (como um link/resultado do HYRESULT) diretamente ao motor de periodização, permitindo comparar lado a lado "Prova Anterior / Simulação #1 vs. Meta da Periodização" e ajustar os treinos específicos.

**Independent Test**: Pode ser testado inserindo um resultado completo no padrão HYRESULT (tempos de Run 1–8, 8 estações e Roxzone) para o atleta ativo e verificando a comparação direta com os splits prescritos na periodização e a geração do plano de ação para as estações deficitárias.

**Acceptance Scenarios**:

1. **Given** o painel de Análise HYRESULT do atleta, **When** o treinador registra um resultado de referência (ou seleciona os splits realizados nas semanas de Simulação da periodização), **Then** o sistema compara split a split o tempo realizado contra o split prescrito pela periodização e calcula o ganho potencial de tempo (*Time Savings Potential*) caso as estações abaixo do percentil médio do atleta sejam elevadas ao seu percentil mediano.
2. **Given** a identificação de um déficit acentuado em um pilar específico (ex.: Roxzone representando mais de 8% do tempo total ou perda severa no Sled Push), **When** o diagnóstico integrado à periodização é gerado, **Then** o sistema indica quais sessões-chave dos mesociclos atuais/futuros (GPP2, SPP1, SPP2, COMP) atacam diretamente aquele gargalo.

---

### Edge Cases

- **Cadastro de atleta com bateria de testes incompleta**: O que acontece se um novo atleta for cadastrado apenas com o teste de corrida (ex.: PB de 5 km ou VT1/VT2), mas ainda sem os testes de 3RM de força ou tomadas de tempo de SkiErg/Remo? O sistema deve estimar os parâmetros faltantes com base na categoria/peso corporal e nos índices normativos da divisão, gerar a periodização completa e sinalizar na Semana 1 (Mesociclo DIAG) que as cargas de força são estimativas iniciais aguardando a realização da bateria diagnóstica.
- **Data da prova com prazo diferente de 28 semanas**: O que ocorre quando um novo atleta é cadastrado para uma prova que ocorrerá em menos ou mais de 28 semanas (ex.: 12, 16, 20 ou 32 semanas)? O motor de periodização deve adaptar proporcionalmente a duração dos mesociclos (mantendo obrigatoriamente Diagnóstico inicial, fases Preparatórias Gerais/Específicas, Competitiva e Tapering final) ou adotar o ciclo padrão de 28 semanas quando a data de início do ciclo permitir.
- **Atleta sem simulações ou provas anteriores registradas**: Como o painel de Análise HYRESULT se comporta para um atleta recém-cadastrado na Semana 1? O painel deve operar no modo "Alvo da Periodização / Baseline Diagnóstico", exibindo a decomposição HYRESULT (Corrida / Workouts / Roxzone, Radar de Percentis e Pacing) com base nos splits-alvo calculados pela periodização do atleta a partir dos seus testes iniciais.
- **Diferença de cargas e pesos oficiais por categoria HYROX**: Ao cadastrar uma atleta na categoria Open Feminino, Pro Feminino, Open Masculino ou Pro Masculino, todas as cargas das estações oficiais (Sled Push, Sled Pull, Farmers Carry, Sandbag Lunges e Wall Balls) e os benchmarks de percentil HYRESULT devem respeitar estritamente o regulamento oficial da respectiva divisão.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir o cadastro de múltiplos atletas, armazenando dados demográficos e antropométricos (nome, data de nascimento, sexo/gênero, altura, peso, percentual de gordura), categoria oficial HYROX (Open Masculino, Open Feminino, Pro Masculino, Pro Feminino), faixa etária (*Age Group*), prova-alvo (nome e data) e meta de tempo final.
- **FR-002**: O formulário de cadastro e edição de atleta DEVE contemplar os campos da bateria de testes diagnósticos:
  - **Cardiorrespiratórios/Corrida**: VO₂max, VDOT, velocidade de VT1 (km/h), velocidade de VT2 (km/h), FC de repouso (bpm), FC máxima (bpm) e Personal Best (PB) de 5 km.
  - **Força e Potência Neuromuscular**: Cargas de 3RM (ou 1RM estimado) para Agachamento (*Back Squat*), Levantamento Terra (*Deadlift*) e Supino (*Bench Press*), além de altura do salto vertical (*Countermovement Jump* — CMJ em cm).
  - **Ergômetros e Capacidade Específica**: Tempo de 1.000m no SkiErg, tempo de 500m (ou 1.000m) no Remo e avaliação técnica/tempo base de transição (Roxzone).
- **FR-003**: Ao criar um novo atleta, o sistema DEVE gerar automaticamente no banco de dados toda a sua estrutura de periodização individualizada (Mesociclos, Microciclos semanais e Sessões diárias de segunda a domingo com exercícios e estações), calibrando:
  - As 5 zonas de treinamento (Z1 a Z5) de frequência cardíaca e pace de corrida com base na FCmáx, VT1 e VT2 do atleta;
  - As cargas prescritas (em kg) dos exercícios de musculação e LPO proporcionalmente aos testes de 3RM e peso corporal do atleta;
  - Os volumes semanais de corrida (km) e os splits-alvo das 8 estações e 8 corridas de acordo com os testes ergométricos, categoria (pesos oficiais Open/Pro M/F) e meta de prova.
- **FR-004**: O sistema DEVE disponibilizar um seletor global de atleta ativo na barra superior da aplicação, permitindo alternar instantaneamente entre quaisquer atletas cadastrados, atualizar os resultados de testes de um atleta existente e recalibrar suas sessões futuras planejadas.
- **FR-005**: O sistema DEVE implementar o módulo de **Análise HYRESULT** (inspirado na estrutura analítica de `hyresult.com/result/...`), exibindo para o atleta selecionado:
  - **Decomposição dos 3 Pilares**: Tempo acumulado e percentual do tempo total gasto em **Corrida (Total Running)**, **Estações Funcionais (Total Workouts)** e **Transições (Total Roxzone)**;
  - **Ranking de Percentis por Divisão**: Comparação do tempo total, do bloco de corrida, da Roxzone e de cada uma das 8 estações contra as curvas normativas de percentil (Top 1%, Top 5%, Top 10%, Top 25%, Top 50%, etc.) da divisão do atleta;
  - **Gráfico de Radar de Performance (Spider Chart)**: Visualização simétrica (0–100 score/percentil) contrastando o desempenho do atleta nas 8 estações, na corrida e na Roxzone contra o perfil alvo da sua meta de periodização;
  - **Análise de Consistência de Corrida e Degradação (Run Splits & Fade Index)**: Gráfico e métricas comparando os 8 splits de 1 km, destacando o desvio de cada corrida em relação ao ritmo médio, a queda percentual de velocidade após estações críticas (especialmente pós-Sled Push na Run 3 e pós-Lunges na Run 8) e a classificação do perfil de ritmo (*Even Pacing*, *Positive Split* ou *Fly and Die*);
  - **Raio-X da Roxzone (In/Out Transitions)**: Decomposição do tempo total de Roxzone nas 8 transições entre corrida e estação, identificando desperdícios de tempo em transição e recuperação passiva;
  - **Potencial de Economia de Tempo (Time Savings / Weakest Links)**: Cálculo objetivo de quantos segundos/minutos o atleta economizaria ao elevar suas 2 ou 3 piores estações (ou Roxzone) para o nível do seu percentil mediano.
- **FR-006**: O módulo de Análise HYRESULT DEVE estar conectado à periodização do atleta, permitindo alternar a fonte de dados analisada entre:
  1. **Alvo da Periodização (Semana 28 / Meta de Prova)**: Splits prescritos para o pico de forma do atleta;
  2. **Simulações da Periodização (Meia-Simulação S21, Simulação #1 S24, Simulação #2 S26)**: Splits reais registrados no diário de treino;
  3. **Resultado HYRESULT Externo / Baseline**: Registro ou importação rápida de um resultado de prova oficial HYROX (com código/identificador de resultado, evento, data e splits de corrida, estações e Roxzone) para comparação evolutiva.
- **FR-007**: A partir dos gargalos detectados na Análise HYRESULT, o sistema DEVE apresentar recomendações prescritivas vinculadas ao mesociclo atual do atleta (DIAG, GPP1, GPP2, SPP1, SPP2, COMP ou TAPER), indicando os ajustes prioritários de treino (ex.: volume Z2, força máxima de cadeia posterior, corrida comprometida sob fadiga ou eficiência de transição).
- **FR-008**: Todas as entidades de dados (Mesociclos, Microciclos, Sessões de Treino, Registros de Bem-Estar/Wellness e Resultados/Análises HYRESULT) DEVEM ser isoladas por atleta, garantindo que edições no treino ou bem-estar de um atleta jamais afetem outro atleta cadastrado.

### Key Entities

- **Atleta (Athlete)**: Representa um competidor gerenciado na plataforma. Inclui dados pessoais, sexo, categoria HYROX (`OPEN_M`, `OPEN_F`, `PRO_M`, `PRO_F`), dados da prova-alvo, indicadores cardiorrespiratórios (VO₂max, VDOT, VT1, VT2, FCrep, FCmáx, 5km PB), indicadores neuromusculares e ergométricos da bateria de testes (Agachamento 3RM, Terra 3RM, Supino 3RM, CMJ, SkiErg 1km TT, Row 500m TT) e relacionamento `1:N` com seus Mesociclos, Registros de Bem-Estar e Resultados HYRESULT.
- **Periodização do Atleta (Mesocycle / Microcycle / TrainingSession)**: A estrutura completa de macro, meso e microciclos pertencente a um atleta específico, com volumes, zonas, cargas de exercícios e splits de estações parametrizados pelos testes diagnósticos do respectivo atleta.
- **Resultado / Benchmark HYRESULT (RaceResultAnalysis)**: Registro estruturado de uma prova oficial HYROX (ex.: código de resultado `LR3MS4JI5A0E80`, nome do evento, divisão, faixa etária) ou simulação da periodização, contendo os 8 splits de corrida (Run 1–8), os 8 splits de estações funcionais, os tempos de Roxzone (Transições 1–8), tempo total, percentis calculados por segmento, índice de degradação de corrida (*Fade Index*) e recomendações vinculadas à periodização.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O treinador consegue cadastrar um novo atleta com sua bateria de testes diagnósticos e visualizar sua periodização completa gerada automaticamente em menos de 2 minutos.
- **SC-002**: 100% das sessões, zonas de treinamento (Z1–Z5), cargas de exercícios prescritas e pesos oficiais das estações HYROX gerados para um novo atleta refletem matematicamente seus testes diagnósticos e sua divisão (Open/Pro Masculino/Feminino), sem valores fixos herdados de outro atleta.
- **SC-003**: A alternância entre atletas cadastrados no seletor global atualiza todos os dados do painel (Dashboard, Periodização, Diário, Previsão e Análise HYRESULT) em menos de 1 segundo, mantendo isolamento total dos registros de treino e bem-estar por atleta.
- **SC-004**: O painel de Análise HYRESULT apresenta 100% dos indicadores analíticos de referência (Decomposição Corrida/Workouts/Roxzone, Percentis por Estação, Gráfico de Radar, Degradação de Pace das 8 corridas, Eficiência de Roxzone e Recomendações de Periodização) com consistência cronométrica exata (soma de Corridas + Workouts + Roxzone = Tempo Total).
- **SC-005**: Atletas e treinadores conseguem identificar os 3 principais gargalos de performance (estações ou transições com menor percentil) e visualizar o ajuste correspondente na periodização em uma única tela, sem necessidade de planilhas externas.

## Assumptions

- Como a plataforma opera em arquitetura *Local-First* para uso ágil por treinadores e atletas sem burocracia de múltiplos logins complexos, a gestão multi-atleta é disponibilizada através de um seletor rápido de atletas e modal de cadastro/edição diretamente na interface principal.
- Quando o usuário informar ou consultar o código de referência do HYRESULT (`LR3MS4JI5A0E80` ou outro resultado oficial), o sistema disponibiliza tanto um preset de análise detalhada completo quanto a possibilidade de inserir/importar qualquer conjunto de splits de prova real ou simulação para análise imediata offline/local.
- Os pesos e distâncias oficiais das estações seguem estritamente o livro de regras global da HYROX para as categorias Open Masculino, Open Feminino, Pro Masculino e Pro Feminino.
- Caso o usuário cadastre um atleta preenchendo apenas parte dos testes diagnósticos (ex.: informando VT1/VT2 ou PB 5km, mas deixando 3RM em branco), o gerador de periodização deriva estimativas fisiológicas seguras baseadas no peso corporal e categoria do atleta para que o plano nasça 100% funcional desde o primeiro segundo.

