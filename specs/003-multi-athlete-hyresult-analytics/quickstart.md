# Quickstart & Validation Guide: Multi-Atleta, Periodização por Testes e Análise HYRESULT

**Feature**: `003-multi-athlete-hyresult-analytics`
**Date**: 2026-10-28

## Pré-requisitos e Setup do Banco de Dados

1. Aplicar as alterações do schema Prisma no banco SQLite local (`db/custom.db`):
   ```powershell
   bun run db:push
   ```
2. Executar o seed atualizado (que popula o atleta inicial Rafael Nogueira usando o gerador parametrizado e registra o resultado oficial de referência `LR3MS4JI5A0E80`):
   ```powershell
   bunx tsx prisma/seed.ts
   ```

## Cenários de Validação Ponta a Ponta

### Cenário 1: Verificação da API de Atletas e Criação de Novo Atleta com Periodização Baseada em Testes

1. Listar os atletas existentes:
   ```powershell
   curl.exe -s http://localhost:3000/api/athletes
   ```
   - **Resultado esperado**: JSON com `athletes` contendo Rafael Nogueira (`OPEN_M`) e seus indicadores de testes diagnósticos.

2. Criar uma nova atleta (ex.: categoria `OPEN_F`) com sua própria bateria de testes via `POST /api/athletes`:
   ```powershell
   curl.exe -s -X POST http://localhost:3000/api/athletes -H "Content-Type: application/json" -d "{\"name\":\"Helena Costa\",\"gender\":\"F\",\"division\":\"OPEN_F\",\"ageGroup\":\"25-29\",\"birthDate\":\"1997-08-20\",\"heightCm\":168,\"weightKg\":62,\"bodyFatPct\":16,\"raceName\":\"HYROX Maio 2027\",\"raceDate\":\"2027-05-08\",\"restingHr\":55,\"maxHr\":195,\"vo2max\":46.5,\"vt1SpeedKmh\":9.8,\"vt2SpeedKmh\":11.5,\"fiveKmPbSec\":1500,\"squat3rmKg\":75,\"deadlift3rmKg\":95,\"bench3rmKg\":45,\"cmjCm\":35,\"skiErg1kTtSec\":255,\"row500mTtSec\":115,\"goalRaceTime\":4440}"
   ```
   - **Resultado esperado**: Status `201` com `generatedWeeks: 28` e `generatedSessions: 196`.
   - Ao consultar `GET /api/plan?athleteId=<id_helena>`, confirmar que as zonas `Z1–Z5`, cargas de exercícios de força e cargas das estações (`Sled Push 102 kg`, `Sandbag 10 kg`, `Wall Balls 4 kg`) foram geradas de acordo com os testes e a divisão `OPEN_F` da atleta.

### Cenário 2: Verificação da Análise de Resultado Padrão HYRESULT (`LR3MS4JI5A0E80`)

1. Consultar o diagnóstico HYRESULT do atleta:
   ```powershell
   curl.exe -s http://localhost:3000/api/hyresult
   ```
   - **Resultado esperado**: Status `200` retornando `HyresultAnalysisDTO` com:
     - `activeSource.resultCode === "LR3MS4JI5A0E80"`
     - `pillars` contendo `RUNNING`, `WORKOUTS` e `ROXZONE` cuja soma de `timeSec` é 100% idêntica a `overall.totalTimeSec`.
     - `radarData` com 10 eixos normalizados em percentis (`1..99`).
     - `runAnalytics` com os 8 splits de corrida, `fadeIndexPct` e classificação de estratégia de ritmo.
     - `prescription` vinculando os limitadores detectados ao mesociclo atual da periodização.

### Cenário 3: Verificação de Qualidade e Tipagem

```powershell
bunx tsc --noEmit
bun run lint
```
- **Resultado esperado**: Zero erros de compilação TypeScript e zero avisos/erros de ESLint.

