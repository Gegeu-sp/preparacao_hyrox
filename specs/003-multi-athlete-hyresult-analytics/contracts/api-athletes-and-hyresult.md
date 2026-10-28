# API Contracts: Multi-Atleta, Gerador de Periodização e Análise HYRESULT

**Feature**: `003-multi-athlete-hyresult-analytics`
**Date**: 2026-10-28

## 1. Gestão de Atletas e Geração Automática de Periodização

### `GET /api/athletes`
Retorna a lista de todos os atletas cadastrados no sistema, ordenada por data de criação, para popular o seletor global no cabeçalho.

- **Response `200 OK`**:
```json
{
  "athletes": [
    {
      "id": "clx...",
      "name": "Rafael Nogueira",
      "gender": "M",
      "division": "OPEN_M",
      "ageGroup": "20-24",
      "raceName": "HYROX — 8/9 Maio 2027",
      "raceDate": "2027-05-08T00:00:00.000Z",
      "goalRaceTime": 4140,
      "vo2max": 47.2,
      "vt1SpeedKmh": 10.0,
      "vt2SpeedKmh": 11.9,
      "squat3rmKg": 95,
      "deadlift3rmKg": 125,
      "bench3rmKg": 70
    }
  ]
}
```

### `POST /api/athletes`
Cadastra um novo atleta com sua bateria de testes diagnósticos e **gera transacionalmente sua periodização completa** (7 mesociclos, 28 microciclos, 196 sessões com zonas `Z1–Z5`, cargas de força/LPO e splits de estações calibrados pelos testes informados, além do benchmark HYRESULT inicial).

- **Request Body (`application/json`)**:
```json
{
  "name": "Camila Soares",
  "gender": "F",
  "division": "OPEN_F",
  "ageGroup": "25-29",
  "birthDate": "1998-04-15",
  "heightCm": 166,
  "weightKg": 61.5,
  "bodyFatPct": 16.5,
  "raceName": "HYROX São Paulo 2027",
  "raceDate": "2027-05-08",
  "restingHr": 54,
  "maxHr": 196,
  "vo2max": 45.8,
  "vdot": 44,
  "vt1SpeedKmh": 9.6,
  "vt2SpeedKmh": 11.4,
  "fiveKmPbSec": 1510,
  "squat3rmKg": 72.5,
  "deadlift3rmKg": 95.0,
  "bench3rmKg": 45.0,
  "cmjCm": 34.0,
  "skiErg1kTtSec": 262,
  "row500mTtSec": 118,
  "goalRaceTime": 4500,
  "notes": "Atleta Open Feminino — foco em força de empurrar (Sled Push) e consistência de corrida."
}
```

- **Response `201 Created`**:
```json
{
  "athlete": { "id": "clx_camila...", "name": "Camila Soares", "division": "OPEN_F" },
  "generatedWeeks": 28,
  "generatedSessions": 196
}
```

### `PATCH /api/athletes/[id]`
Atualiza o perfil e os resultados de testes diagnósticos de um atleta existente. Se `recalibrateFutureSessions: true` for enviado, recalibra automaticamente as zonas, ritmos e cargas prescritas de todas as sessões futuras com status `"PLANEJADO"`, preservando intactas as sessões já concluídas.

- **Response `200 OK`**: Retorna o `AthleteDTO` atualizado e a contagem de sessões futuras recalibradas.

---

## 2. Rotas de Treinamento Parametrizadas por `athleteId`

Todas as rotas existentes passam a aceitar `?athleteId=<id>` na query string (usando o primeiro atleta cadastrado como fallback padrão):
- `GET /api/plan?athleteId=<id>` — Retorna o `PlanResponse` do atleta selecionado, incluindo `athlete.zones` (as 5 zonas `Z1–Z5` calculadas dinamicamente a partir dos testes daquele atleta).
- `GET /api/dashboard?athleteId=<id>` — Calcula KPIs, sRPE, ACWR, EWMA Fitness-Fadiga, aderência e wellness exclusivamente para o atleta selecionado.
- `GET /api/wellness?athleteId=<id>` e `POST /api/wellness` (com `athleteId` no body) — Leitura e upsert diário de bem-estar isolado por atleta.
- `GET /api/predictions?athleteId=<id>` e `POST /api/predictions/simulate` — Projeção de tempo de prova e simulador What-If calibrados pelos parâmetros e divisão do atleta selecionado.

---

## 3. Análise de Performance Padrão HYRESULT

### `GET /api/hyresult?athleteId=<id>&sourceId=<optional>`
Calcula e retorna o diagnóstico completo no padrão **HYRESULT** (`HyresultAnalysisDTO`) para o atleta selecionado.
- Quando `sourceId` não é informado, seleciona prioritariamente o resultado HYRESULT oficial do atleta (ex.: código `LR3MS4JI5A0E80`), ou a simulação realizada mais recente, ou o alvo da Semana 28.
- Inclui `availableSources` permitindo alternar na interface entre:
  1. Resultado HYRESULT Oficial (`LR3MS4JI5A0E80` ou outros resultados salvos);
  2. Simulações da Periodização (`S21 Meia-Simulação`, `S24 Simulação #1`, `S26 Simulação #2`);
  3. Meta Final da Periodização (`S28 Prova HYROX`).

### `POST /api/hyresult`
Registra ou importa um novo resultado no formato HYRESULT (código da prova/resultado, evento, data, 8 splits de corrida, 8 splits de estações e tempos de Roxzone) para o atleta ativo.

- **Request Body (`application/json`)**:
```json
{
  "athleteId": "clx...",
  "resultCode": "LR3MS4JI5A0E80",
  "eventName": "HYROX Official Result — LR3MS4JI5A0E80",
  "eventDate": "2026-10-18",
  "runSplits": [272, 286, 308, 296, 301, 298, 294, 315],
  "workSplits": {
    "SKIERG": 242,
    "SLED_PUSH": 178,
    "SLED_PULL": 248,
    "BBJ": 265,
    "ROWING": 246,
    "FARMERS": 124,
    "SANDBAG": 288,
    "WALLBALLS": 324
  },
  "roxSplits": [36, 44, 48, 42, 40, 38, 46, 41],
  "notes": "Resultado importado do HYRESULT para calibração da periodização."
}
```

- **Response `201 Created`**: Retorna o `HyresultAnalysisDTO` recém-calculado com a nova fonte ativa.

