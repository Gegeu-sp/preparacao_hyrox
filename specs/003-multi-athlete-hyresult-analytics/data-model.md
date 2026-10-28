# Data Model: Gestão Multi-Atleta, Periodização por Testes e Analytics HYRESULT

**Feature**: `003-multi-athlete-hyresult-analytics`
**Date**: 2026-10-28

## 1. Evolução do Schema Prisma (`prisma/schema.prisma`)

### 1.1. Entidade `Athlete` (Expandida com Divisão e Bateria de Testes Diagnósticos)

```prisma
model Athlete {
  id              String               @id @default(cuid())
  name            String
  gender          String               @default("M") // "M" | "F"
  division        String               @default("OPEN_M") // "OPEN_M" | "OPEN_F" | "PRO_M" | "PRO_F"
  ageGroup        String               @default("25-29") // ex.: "16-24" | "25-29" | "30-34" | "35-39" | "40-44"
  birthDate       DateTime
  heightCm        Float
  weightKg        Float
  bodyFatPct      Float
  raceName        String
  raceDate        DateTime
  planStartDate   DateTime             @default(now())
  restingHr       Int?
  maxHr           Int?
  vo2max          Float?               // mL/kg/min — teste incremental
  vdot            Float?
  vt1SpeedKmh     Float?               // limiar aeróbico (VT1) km/h
  vt2SpeedKmh     Float?               // limiar anaeróbico (VT2) km/h
  fiveKmPbSec     Int?                 // PB 5 km em segundos
  squat3rmKg      Float?               // Teste 3RM Agachamento Livre (kg)
  deadlift3rmKg   Float?               // Teste 3RM Levantamento Terra (kg)
  bench3rmKg      Float?               // Teste 3RM Supino Reto (kg)
  cmjCm           Float?               // Countermovement Jump (cm)
  skiErg1kTtSec   Int?                 // Time Trial 1.000m SkiErg (segundos)
  row500mTtSec    Int?                 // Time Trial 500m Remo (segundos)
  goalRaceTime    Int?                 // Objetivo de prova em segundos
  notes           String?
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt
  mesocycles      Mesocycle[]
  wellnessRecords Wellness[]
  hyresultResults HyresultRaceResult[]
}
```

### 1.2. Entidades `Mesocycle` e `Wellness` (Isolamento por `athleteId`)

```prisma
model Mesocycle {
  id             String       @id @default(cuid())
  athleteId      String
  athlete        Athlete      @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  code           String       // DIAG | GPP1 | GPP2 | SPP1 | SPP2 | COMP | TAPER
  name           String
  order          Int
  startDate      DateTime
  endDate        DateTime
  goal           String
  focus          String
  volumeTargetKm Float
  intensityNote  String
  keyWorkouts    String
  microcycles    Microcycle[]
}

model Wellness {
  id           String   @id @default(cuid())
  athleteId    String
  athlete      Athlete  @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  date         DateTime
  sleepHours   Float?
  sleepQuality Int?
  soreness     Int?
  fatigue      Int?
  stress       Int?
  motivation   Int?
  restingHr    Int?
  hrv          Int?
  weightKg     Float?
  notes        String?

  @@unique([athleteId, date])
}
```

### 1.3. Nova Entidade `HyresultRaceResult` (Resultados e Benchmarks HYRESULT)

Armazena resultados oficiais de provas HYROX (como o preset `LR3MS4JI5A0E80` ou provas anteriores importadas pelo atleta/treinador) para análise e comparação evolutiva com as simulações da periodização:

```prisma
model HyresultRaceResult {
  id            String   @id @default(cuid())
  athleteId     String
  athlete       Athlete  @relation(fields: [athleteId], references: [id], onDelete: Cascade)
  resultCode    String   // ex.: "LR3MS4JI5A0E80"
  eventName     String   // ex.: "HYROX São Paulo / Benchmark Oficial"
  eventDate     DateTime
  division      String   // "OPEN_M" | "OPEN_F" | "PRO_M" | "PRO_F"
  ageGroup      String   // ex.: "25-29"
  totalTimeSec  Int
  totalRunSec   Int
  totalWorkSec  Int
  totalRoxSec   Int
  runSplitsJson String   // JSON array com 8 inteiros [run1Sec .. run8Sec]
  workSplitsJson String  // JSON object com as 8 estações { SKIERG, SLED_PUSH, SLED_PULL, BBJ, ROWING, FARMERS, SANDBAG, WALLBALLS }
  roxSplitsJson String   // JSON array com 8 inteiros [rox1Sec .. rox8Sec]
  notes         String?
  createdAt     DateTime @default(now())
}
```

---

## 2. Interfaces e DTOs TypeScript (`src/lib/types.ts`)

### 2.1. Perfil de Atleta, Zonas Dinâmicas e Testes (`AthleteDTO` & `DynamicZoneDTO`)

```typescript
export type HyroxDivision = 'OPEN_M' | 'OPEN_F' | 'PRO_M' | 'PRO_F'

export interface DynamicZoneDTO {
  zone: string
  name: string
  pctHrMax: string
  hrBpm: string
  pace: string
  purpose: string
}

export interface AthleteDTO {
  id: string
  name: string
  gender: 'M' | 'F'
  division: HyroxDivision
  ageGroup: string
  birthDate: string
  heightCm: number
  weightKg: number
  bodyFatPct: number
  raceName: string
  raceDate: string
  restingHr: number | null
  maxHr: number | null
  vo2max: number | null
  vdot: number | null
  vt1SpeedKmh: number | null
  vt2SpeedKmh: number | null
  fiveKmPbSec: number | null
  squat3rmKg: number | null
  deadlift3rmKg: number | null
  bench3rmKg: number | null
  cmjCm: number | null
  skiErg1kTtSec: number | null
  row500mTtSec: number | null
  goalRaceTime: number | null
  notes: string | null
  age: number
  zones: DynamicZoneDTO[]
}
```

### 2.2. Estrutura Analítica HYRESULT (`HyresultAnalysisDTO`)

```typescript
export type HyresultSourceType = 'HYRESULT_OFFICIAL' | 'SIMULATION_W21' | 'SIMULATION_W24' | 'SIMULATION_W26' | 'TARGET_W28'

export interface HyresultPillarBreakdownDTO {
  label: 'Corrida (Runs 1–8)' | 'Workouts (8 Estações)' | 'Roxzone (Transições)'
  key: 'RUNNING' | 'WORKOUTS' | 'ROXZONE'
  timeSec: number
  timeFormatted: string
  sharePct: number
  percentile: number // 1..99 (ex.: 88 = Top 12%)
  rankLabel: string  // ex.: "Top 12% na divisão"
  targetTimeSec: number
  deltaSec: number
}

export interface HyresultStationSplitDTO {
  order: number
  stationCode: string
  label: string
  officialLoadDesc: string
  timeSec: number
  timeFormatted: string
  targetTimeSec: number
  targetFormatted: string
  divisionMedianSec: number
  divisionTop10Sec: number
  percentile: number // 1..99
  targetPercentile: number
  status: 'ELITE' | 'FORTE' | 'MEDIANO' | 'LIMITADOR'
  timeSavingsPotentialSec: number
}

export interface HyresultRunSplitDTO {
  runNumber: number // 1..8
  label: string
  precedingStationLabel: string
  timeSec: number
  timeFormatted: string
  targetTimeSec: number
  paceRatioVsRun1: number // ex.: 1.09 (+9% sobre Run 1)
  deviationFromMeanSec: number
  isCompromisedCritical: boolean // Run 3 pós-Sled Push, Run 8 pós-Lunges
}

export interface HyresultRoxzoneSplitDTO {
  transitionNumber: number // 1..8
  stationLabel: string
  inOutSec: number
  inOutFormatted: string
  targetSec: number
  efficiencyStatus: 'OTIMA' | 'NORMAL' | 'LENTA'
}

export interface HyresultPeriodizationPrescriptionDTO {
  currentPhaseCode: string
  currentPhaseName: string
  primaryLimiter: string
  secondaryLimiter: string
  timeSavingsTotalSec: number
  timeSavingsFormatted: string
  recommendations: {
    area: 'RUNNING_PACING' | 'STATION_STRENGTH' | 'STATION_ENGINE' | 'ROXZONE_TRANSITION'
    title: string
    finding: string
    periodizationAction: string
    keyWorkoutsToFocus: string
  }[]
}

export interface HyresultAnalysisDTO {
  athleteId: string
  athleteName: string
  division: HyroxDivision
  divisionLabel: string
  ageGroup: string
  activeSource: {
    id: string
    sourceType: HyresultSourceType
    resultCode: string
    title: string
    date: string
  }
  availableSources: {
    id: string
    sourceType: HyresultSourceType
    resultCode: string
    title: string
    date: string
    totalTimeFormatted: string
  }[]
  overall: {
    totalTimeSec: number
    totalTimeFormatted: string
    goalTimeSec: number
    goalTimeFormatted: string
    deltaVsGoalSec: number
    overallPercentile: number
    overallRankBadge: string
    athleteProfileArchetype: string // ex.: "Corredor Forte / Gargalo em Trenós" | "Híbrido Equilibrado" | "Potência de Estações / Déficit de Pacing"
  }
  pillars: HyresultPillarBreakdownDTO[]
  radarData: {
    subject: string
    fullMark: number
    athletePercentile: number
    targetPercentile: number
  }[]
  runAnalytics: {
    avgPaceSec: number
    avgPaceFormatted: string
    bestRunSec: number
    worstRunSec: number
    fadeIndexPct: number
    pacingStrategyClassification: 'EVEN_PACING' | 'CONTROLLED_FADE' | 'FLY_AND_DIE'
    postSledPushDropSec: number
    postLungesDropSec: number
    splits: HyresultRunSplitDTO[]
  }
  stationAnalytics: {
    strongestStation: string
    weakestStation: string
    splits: HyresultStationSplitDTO[]
  }
  roxzoneAnalytics: {
    totalRoxzoneSec: number
    totalRoxzoneFormatted: string
    avgPerTransitionSec: number
    splits: HyresultRoxzoneSplitDTO[]
  }
  prescription: HyresultPeriodizationPrescriptionDTO
}
```

## 3. Regras de Validação (Zod)

1. **Cadastro/Edição de Atleta (`AthleteUpsertSchema`)**:
   - `name`: string (`min: 2`, `max: 80`)
   - `gender`: `'M' | 'F'`
   - `division`: `'OPEN_M' | 'OPEN_F' | 'PRO_M' | 'PRO_F'`
   - `birthDate`: ISO date string válida (idade entre 14 e 85 anos)
   - `heightCm`: número (`120..230`)
   - `weightKg`: número (`35..180`)
   - `bodyFatPct`: número (`3..50`)
   - `vt1SpeedKmh` / `vt2SpeedKmh`: números opcionais (`5..25`), garantindo `vt2SpeedKmh > vt1SpeedKmh` quando ambos informados
   - `squat3rmKg`, `deadlift3rmKg`, `bench3rmKg`: números opcionais positivos (`15..350`)
   - `skiErg1kTtSec` (`150..480`), `row500mTtSec` (`70..240`), `cmjCm` (`15..90`)
2. **Importação/Registro de Resultado HYRESULT (`HyresultCreateSchema`)**:
   - `athleteId`: string obrigatória
   - `resultCode`: string (`min: 4`, `max: 32`, ex.: `LR3MS4JI5A0E80`)
   - `runSplits`: array exato de 8 números inteiros (`150..600` segundos cada)
   - `workSplits`: objeto com as 8 chaves de estações oficiais (`60..900` segundos cada)
   - `roxSplits`: array de 8 números inteiros (`15..180` segundos cada) ou tempo total de Roxzone distribuído automaticamente nas 8 passagens

