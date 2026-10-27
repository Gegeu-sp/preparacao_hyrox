# API Contract: Previsão de Prova HYROX

**Feature**: `001-hyrox-race-predictor`
**Data**: 2026-10-27

---

## 1. GET `/api/predictions`

Retorna a previsão base atual do atleta calculada a partir dos parâmetros fisiológicos e histórico de treinos.

### Requisição
- **Método**: `GET`
- **Headers**: `Accept: application/json`
- **Query Params**: Nenhum (carrega atleta ativo e simulações do banco).

### Resposta de Sucesso (200 OK)
```json
{
  "generatedAt": "2026-10-27T16:00:00.000Z",
  "athleteName": "Rafael Nogueira",
  "targetGoalTimeSec": 4500,
  "targetGoalTimeFormatted": "01:15:00",
  "realisticTotalSec": 4560,
  "realisticFormatted": "01:16:00",
  "optimisticTotalSec": 4380,
  "optimisticFormatted": "01:13:00",
  "conservativeTotalSec": 4800,
  "conservativeFormatted": "01:20:00",
  "totalRunSec": 2420,
  "totalRunFormatted": "00:40:20",
  "totalStationsSec": 1820,
  "totalStationsFormatted": "00:30:20",
  "roxzoneSec": 320,
  "roxzoneFormatted": "00:05:20",
  "deltaSec": 60,
  "deltaFormatted": "+01:00",
  "deltaPct": 1.3,
  "isWithinGoal": false,
  "confidenceLevel": "MEDIA",
  "simulationCountUsed": 2,
  "criticalStations": ["SLED_PUSH", "SANDBAG"],
  "warnings": [
    "Run 8 (pós-Sandbag) projeta queda de 14% de velocidade devido à fadiga muscular"
  ],
  "segments": [
    {
      "order": 1,
      "segmentKey": "RUN_1",
      "type": "RUN",
      "name": "Corrida 1 (1.000 m)",
      "distanceM": 1000,
      "reps": null,
      "predictedSec": 290,
      "predictedFormatted": "04:50",
      "targetSec": 285,
      "targetFormatted": "04:45",
      "paceMinKmFormatted": "4:50/km",
      "fatigueFactorApplied": 1.0,
      "isCritical": false,
      "historicalBestSec": 280
    },
    {
      "order": 2,
      "segmentKey": "SKIERG",
      "type": "STATION",
      "name": "SkiErg (1.000 m)",
      "distanceM": 1000,
      "reps": null,
      "predictedSec": 235,
      "predictedFormatted": "03:55",
      "targetSec": 230,
      "targetFormatted": "03:50",
      "paceMinKmFormatted": null,
      "fatigueFactorApplied": 1.0,
      "isCritical": false,
      "historicalBestSec": 228
    }
  ]
}
```

### Resposta de Erro (404 Not Found)
```json
{
  "error": "Atleta não encontrado para cálculo preditivo"
}
```

---

## 2. POST `/api/predictions/simulate`

Recalcula instantaneamente a projeção com base em ajustes manuais do simulador "What-If".

### Requisição
- **Método**: `POST`
- **Headers**: `Content-Type: application/json`
- **Body**:
```json
{
  "basePaceAdjustmentSec": -5,
  "stationAdjustments": {
    "SLED_PUSH": -10,
    "SANDBAG": 5
  },
  "roxzoneAdjustmentSec": -20,
  "customGoalTimeSec": 4440
}
```

### Resposta de Sucesso (200 OK)
Retorna a mesma estrutura `RacePredictionDTO` recalculada com os deltas aplicados.
