# Phase 0 Research: Gestão Multi-Atleta, Periodização por Testes e Analytics HYRESULT

**Feature**: `003-multi-athlete-hyresult-analytics`
**Date**: 2026-10-28

## 1. Anatomia Analítica do HYRESULT (`hyresult.com/result/LR3MS4JI5A0E80`)

### Decision
Implementar um motor analítico dedicado (`src/lib/hyresult-analytics.ts`) e uma aba interativa (`src/components/training/hyresult-tab.tsx`) que reproduzem fielmente os blocos de telemetria de resultado do **HYRESULT** e os conectam diretamente aos mesociclos da periodização do atleta:
1. **Cabeçalho de Resultado Oficial / Simulação**: Código identificador (ex.: `LR3MS4JI5A0E80`), evento, data, divisão (`OPEN_M`, `OPEN_F`, `PRO_M`, `PRO_F`), faixa etária (*Age Group*), Tempo Total Oficial e Percentil Geral na divisão.
2. **Decomposição nos 3 Pilares (Three Pillars Breakdown)**:
   - **Total Running (Corridas 1 a 8)**: Soma dos 8 trechos de 1.000m, percentual sobre o tempo total (tipicamente 48%–55%), pace médio global (`/km`) e percentil de corrida.
   - **Total Workouts (Estações 1 a 8)**: Soma das 8 estações funcionais, percentual sobre o tempo total (tipicamente 38%–45%) e percentil de estações.
   - **Total Roxzone (Transições 1 a 8)**: Soma do tempo gasto na área de transição, percentual sobre o tempo total (meta ideal `< 6,5%` ou `< 5:00`) e percentil de transição.
3. **Gráfico de Radar Simétrico (HYRESULT Spider Chart) & Tabela de Percentis**:
   - Normalização de cada uma das 8 estações + Corrida + Roxzone em um score de percentil de `1` a `99` (onde `90+` = Elite / Top 10%, `75–89` = Forte / Top 25%, `50–74` = Mediano, `< 50` = Gargalo / Limitador).
   - Contraste visual no gráfico de radar entre o **Resultado Analisado** (prova `LR3MS4JI5A0E80` ou simulação realizada) e o **Alvo da Periodização (Semana 28)**.
4. **Análise de Pacing e Degradação de Corrida (*Run Splits & Fade Index*)**:
   - Cálculo do ritmo individual das Corridas 1 a 8, comparando com o ritmo médio de corrida da prova.
   - **Fade Index (%)**: $\text{Fade Index} = \frac{\text{Média}(\text{Run}_6, \text{Run}_7, \text{Run}_8) - \text{Média}(\text{Run}_1, \text{Run}_2)}{\text{Média}(\text{Run}_1, \text{Run}_2)} \times 100$.
   - **Índice de Interferência Pós-Trenó e Pós-Lunges**: Destaque específico do custo metabólico e neuromuscular na `Run 3` (pós-Sled Push) e `Run 8` (pós-Sandbag Lunges).
   - Classificação automática da estratégia de ritmo: *Negative/Even Split* ($\text{Fade} \le 3\%$), *Controlled Positive Split* ($3\% < \text{Fade} \le 7\%$) ou *Fly and Die / Quebra Acentuada* ($\text{Fade} > 7\%$).
5. **Raio-X da Roxzone (8 Transições In/Out) e Economia Potencial (*Time Savings*)**:
   - Detalhamento das 8 passagens de Roxzone (`Rox 1` a `Rox 8`), sinalizando transições onde o atleta usou a Roxzone como "zona de descanso passivo" (> 45s por passagem).
   - Cálculo de **Time Savings Potential**: soma dos segundos que o atleta economizará se elevar suas 3 estações/transições de menor percentil até o seu próprio percentil mediano.
6. **Diagnóstico Prescritivo Integrado à Periodização**:
   - Mapeamento automático dos limitadores encontrados no HYRESULT para ajustes diretos nos mesociclos (`DIAG`, `GPP1`, `GPP2`, `SPP1`, `SPP2`, `COMP`, `TAPER`) da periodização do atleta.

### Rationale
O portal HYRESULT é o padrão ouro utilizado por atletas e treinadores de HYROX porque isola a corrida pura, o trabalho de estações e o tempo oculto na Roxzone, contextualizando cada split por meio de percentis da divisão (pois 2:30 no Sled Push é lento no Open Masculino, mas excelente no Pro Masculino, enquanto 4:00 nos Wall Balls pode ser um gargalo severo). Como o ambiente de execução é *Local-First* e páginas dinâmicas externas não devem ser chamadas em tempo de execução para evitar falhas de rede/CORS, incluímos o resultado `LR3MS4JI5A0E80` pré-carregado como benchmark oficial detalhado e permitimos importar/registrar qualquer resultado HYRESULT ou analisar diretamente as simulações da periodização (`S21`, `S24`, `S26`, `S28`).

### Alternatives Considered
- *Scraping ao vivo de hyresult.com via backend*: Rejeitado porque viola o Princípio V da Constituição (*Local-First Simplicity*, sub-100ms sem dependência de rede externa) e fica sujeito a bloqueios de Cloudflare/mudanças de DOM. Em vez disso, o sistema oferece suporte nativo ao modelo de dados do HYRESULT (com preset `LR3MS4JI5A0E80` + formulário de importação rápida de splits + integração direta com as sessões de simulação do banco SQLite).

---

## 2. Parametrização Científica da Periodização por Testes de Cada Atleta

### Decision
Extrair a lógica de construção das 28 semanas de `prisma/seed.ts` para o motor `src/lib/periodization-generator.ts`, parametrizado pelos resultados da bateria diagnóstica do atleta:

1. **Calibração Dinâmica das 5 Zonas de Treinamento (`Z1` a `Z5`)**:
   - Baseada em $FC_{máx}$, $VT_1$ (km/h) e $VT_2$ (km/h) obtidos no teste incremental (ou derivados do PB de 5 km / $VO_2max$ caso o atleta ainda não tenha feito espirometria/lactato):
     - Se $VT_2$ não for informado, estima-se a partir do PB de 5 km: $v_{5k} = \frac{18000}{\text{fiveKmPbSec}}$, $VT_2 \approx 0,93 \times v_{5k}$ e $VT_1 \approx 0,79 \times v_{5k}$.
     - **Z1 (Recuperação)**: $< 70\% FC_{máx}$ | Pace mais lento que $\frac{3600}{0,88 \times VT_1}$
     - **Z2 (Aeróbia Extensiva)**: $70\text{–}80\% FC_{máx}$ | Pace entre $\frac{3600}{0,88 \times VT_1}$ e $\frac{3600}{1,03 \times VT_1}$
     - **Z3 (Limiar Moderado / Ritmo Dominante HYROX)**: $80\text{–}90\% FC_{máx}$ | Pace entre $\frac{3600}{1,03 \times VT_1}$ e $\frac{3600}{VT_2}$
     - **Z4 (Limiar Alto / VO₂max)**: $90\text{–}95\% FC_{máx}$ | Pace entre $\frac{3600}{VT_2}$ e $\frac{3600}{1,09 \times VT_2}$
     - **Z5 (Capacidade Anaeróbica / Tiros)**: $> 95\% FC_{máx}$ | Pace mais rápido que $\frac{3600}{1,09 \times VT_2}$

2. **Calibração das Cargas Prescritas de Força e LPO**:
   - A partir dos testes de 3RM informados no cadastro do atleta:
     - `squat3rmKg` (referência base: 95 kg) → fator de escala $k_{\text{squat}} = \frac{\text{squat3rmKg}}{95}$ (aplicado a Agachamento livre, Front squat, Step-up, Trap bar jumps).
     - `deadlift3rmKg` (referência base: 125 kg) → fator de escala $k_{\text{hinge}} = \frac{\text{deadlift3rmKg}}{125}$ (aplicado a Levantamento terra, Terra romeno, Hip thrust, KB swing).
     - `bench3rmKg` (referência base: 70 kg) → fator de escala $k_{\text{upper}} = \frac{\text{bench3rmKg}}{70}$ (aplicado a Supino, Push press, Remada curvada, Thruster).
   - Caso algum 3RM não seja informado no cadastro inicial, o sistema estima de forma segura a partir do peso corporal e categoria do atleta (ex.: Agachamento 3RM $\approx 1,25 \times \text{peso}$ para Masculino e $0,95 \times \text{peso}$ para Feminino), arredondando todas as cargas prescritas para múltiplos práticos de $2,5\text{ kg}$ ou $1\text{ kg}$.

3. **Pesos Oficiais das Estações HYROX e Curvas de Percentil por Divisão**:
   - O gerador aplica automaticamente as cargas regulamentares da divisão do atleta nas sessões híbridas, simulações (`S21`, `S24`, `S26`) e prova (`S28`):

| Estação | Open Masculino (`OPEN_M`) | Open Feminino (`OPEN_F`) | Pro Masculino (`PRO_M`) | Pro Feminino (`PRO_F`) |
| :--- | :---: | :---: | :---: | :---: |
| **SkiErg (1.000m)** | Damper livre | Damper livre | Damper livre | Damper livre |
| **Sled Push (50m)** | 152 kg | 102 kg | 202 kg | 152 kg |
| **Sled Pull (50m)** | 103 kg | 78 kg | 153 kg | 103 kg |
| **Burpee Broad Jump (80m)** | Peso corporal | Peso corporal | Peso corporal | Peso corporal |
| **Rowing (1.000m)** | Damper livre | Damper livre | Damper livre | Damper livre |
| **Farmer's Carry (200m)** | 2 × 24 kg | 2 × 16 kg | 2 × 32 kg | 2 × 24 kg |
| **Sandbag Lunges (100m)** | 20 kg | 10 kg | 30 kg | 20 kg |
| **Wall Balls (100 reps)** | 6 kg (alvo 3,0m) | 4 kg (alvo 2,7m) | 9 kg (alvo 3,0m) | 6 kg (alvo 2,7m) |

4. **Escalonamento dos Splits-Alvo das Estações pelos Testes Modais (`SkiErg 1km TT`, `Row 500m TT`) e Meta**:
   - Os splits prescritos para `SKIERG` e `ROWING` na periodização são calibrados diretamente a partir dos testes de `skiErg1kTtSec` (adicionando margem de fadiga de prova de ~8–10%) e `row500mTtSec` ($\times 2,12$ pela relação de distância e pré-fadiga na estação 5), enquanto as demais estações são escalonadas proporcionalmente ao `goalRaceTime` e à relação força/peso do atleta.

### Rationale
Garante cumprimento integral do Princípio I da Constituição (*Sports Science First*) e do critério de sucesso `SC-002`: cada atleta cadastrado recebe uma periodização matematicamente individualizada segundo os seus próprios testes fisiológicos, neuromusculares e ergométricos.

---

## 3. Isolamento Multi-Atleta no Banco SQLite / Prisma

### Decision
- Adicionar `athleteId` em `Mesocycle`, `Wellness` e na nova tabela `HyresultRaceResult`, com `onDelete: Cascade`.
- Em `Wellness`, substituir `@unique` global em `date` por `@@unique([athleteId, date])`, permitindo que múltiplos atletas registrem o diário de bem-estar no mesmo dia.
- Atualizar todas as rotas de leitura (`GET /api/plan`, `GET /api/dashboard`, `GET /api/wellness`, `GET /api/predictions`, `GET /api/hyresult`) para aceitar `?athleteId=<id>` na query string (com fallback para o primeiro atleta cadastrado se omitido, preservando retrocompatibilidade total).

### Rationale
Simples, relacionalmente íntegro, sem necessidade de autenticação multi-tenant complexa e 100% compatível com o fluxo rápido de um treinador gerenciando sua carteira de atletas.

