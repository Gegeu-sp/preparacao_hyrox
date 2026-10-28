/**
 * HYROX CONTROL — Seed Multi-Atleta da Periodização Científica + Resultado HYRESULT (LR3MS4JI5A0E80)
 * Rafael Nogueira (Open M) & Helena Costa (Open F) · Temporada 2026/27 · Prova: HYROX 08–09/05/2027
 *
 * IMPORTANTE: Todas as 196 sessões (28 semanas) iniciam com status "PLANEJADO" (0 treinos pré-confirmados).
 * Os indicadores realizados no Painel, Periodização, Diário, Previsão de Prova e Análise HYRESULT
 * evoluem exclusivamente conforme o usuário confirma os treinos no Diário de Treino.
 */
import { PrismaClient } from '@prisma/client'
import { generatePeriodizationForAthlete } from '../src/lib/periodization-generator'

const db = new PrismaClient()

const PLAN_START = new Date(Date.UTC(2026, 9, 26)) // segunda-feira, 26/out/2026
const RACE_DATE = new Date(Date.UTC(2027, 4, 8)) // sábado, 08/05/2027

async function main() {
  console.log('Limpando base multi-atleta…')
  await db.hyresultRaceResult.deleteMany()
  await db.wellness.deleteMany()
  await db.exercise.deleteMany()
  await db.stationResult.deleteMany()
  await db.trainingSession.deleteMany()
  await db.microcycle.deleteMany()
  await db.mesocycle.deleteMany()
  await db.athlete.deleteMany()

  console.log('Criando atleta principal (Rafael Nogueira — Open M)…')
  const rafael = await db.athlete.create({
    data: {
      name: 'Rafael Nogueira',
      gender: 'M',
      division: 'OPEN_M',
      ageGroup: '20-24',
      birthDate: new Date(Date.UTC(2005, 5, 10)),
      heightCm: 179,
      weightKg: 76,
      bodyFatPct: 12,
      raceName: 'HYROX — 8/9 Maio 2027',
      raceDate: RACE_DATE,
      planStartDate: PLAN_START,
      restingHr: 52,
      maxHr: 201,
      vo2max: 47.2,
      vdot: 46,
      vt1SpeedKmh: 10.0,
      vt2SpeedKmh: 11.9,
      fiveKmPbSec: 1440,
      squat3rmKg: 95,
      deadlift3rmKg: 125,
      bench3rmKg: 70,
      cmjCm: 41.5,
      skiErg1kTtSec: 258,
      row500mTtSec: 109,
      goalRaceTime: 4140,
      notes: 'Zonas calibradas no teste incremental (VT1 10,0 km/h · VT2 11,9 km/h · 3RM Agachamento 95 kg / Terra 125 kg / Supino 70 kg). Análise HYRESULT #LR3MS4JI5A0E80 vinculada como linha de base.',
    },
  })

  console.log('Gerando periodização de 28 semanas (196 sessões PLANEJADAS, 0 pré-confirmadas) + Baseline #LR3MS4JI5A0E80…')
  const { generatedWeeks, generatedSessions } = await generatePeriodizationForAthlete(rafael, {
    seedSampleActuals: false,
    createBenchmarkLR3: true,
  })

  console.log('Criando 2ª atleta (Helena Costa — Open Feminino)…')
  const helena = await db.athlete.create({
    data: {
      name: 'Helena Costa',
      gender: 'F',
      division: 'OPEN_F',
      ageGroup: '25-29',
      birthDate: new Date(Date.UTC(1998, 3, 15)),
      heightCm: 166,
      weightKg: 61.5,
      bodyFatPct: 16.5,
      raceName: 'HYROX — 8/9 Maio 2027',
      raceDate: RACE_DATE,
      planStartDate: PLAN_START,
      restingHr: 54,
      maxHr: 196,
      vo2max: 45.8,
      vdot: 44,
      vt1SpeedKmh: 9.6,
      vt2SpeedKmh: 11.4,
      fiveKmPbSec: 1510,
      squat3rmKg: 72.5,
      deadlift3rmKg: 95.0,
      bench3rmKg: 45.0,
      cmjCm: 34.5,
      skiErg1kTtSec: 262,
      row500mTtSec: 118,
      goalRaceTime: 4500,
      notes: 'Atleta Open Feminino — periodização parametrizada pela bateria de testes diagnósticos (VT1 9,6 km/h · VT2 11,4 km/h · 3RM Agachamento 72,5 kg / Terra 95 kg / Supino 45 kg).',
    },
  })

  const helenaGen = await generatePeriodizationForAthlete(helena, {
    seedSampleActuals: false,
    createBenchmarkLR3: false,
  })

  console.log(
    `✅ Seed concluído (0 treinos pré-confirmados): Rafael Nogueira (${generatedWeeks} sem / ${generatedSessions} sessões PLANEJADAS) e Helena Costa (${helenaGen.generatedWeeks} sem / ${helenaGen.generatedSessions} sessões PLANEJADAS).`,
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
