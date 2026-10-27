// Domínio compartilhado: tipos de sessão, fases, estações, zonas, status
// (SQLite não suporta enums Prisma → strings validadas aqui)

export const SESSION_TYPES = ['FORCA', 'CORRIDA', 'LPO', 'PLIOMETRIA', 'HIBRIDO', 'TESTE', 'ATIVACAO', 'REGEN'] as const
export type SessionType = (typeof SESSION_TYPES)[number]

export const SESSION_STATUS = ['PLANEJADO', 'CONCLUIDO', 'PARCIAL', 'AJUSTADO', 'NAO_REALIZADO'] as const
export type SessionStatus = (typeof SESSION_STATUS)[number]

export const PHASE_CODES = ['DIAG', 'GPP1', 'GPP2', 'SPP1', 'SPP2', 'COMP', 'TAPER'] as const
export type PhaseCode = (typeof PHASE_CODES)[number]

export const WEEK_TYPES = ['DESENVOLVIMENTO', 'REGENERATIVO', 'TESTE', 'FLEXIVEL', 'COMPETICAO'] as const
export type WeekType = (typeof WEEK_TYPES)[number]

export const STATION_CODES = ['RUN_1KM', 'SKIERG', 'SLED_PUSH', 'SLED_PULL', 'BBJ', 'ROWING', 'FARMERS', 'SANDBAG', 'WALLBALLS'] as const
export type StationCode = (typeof STATION_CODES)[number]

export const WEEKDAYS = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'] as const
export const WEEKDAYS_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const

// ---------- Rótulos e cores (tailwind) ----------

export const SESSION_TYPE_META: Record<SessionType, { label: string; icon: string; classes: string }> = {
  FORCA: { label: 'Musculação', icon: 'dumbbell', classes: 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30' },
  CORRIDA: { label: 'Corrida', icon: 'footprints', classes: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30' },
  LPO: { label: 'LPO', icon: 'zap', classes: 'text-lime-700 dark:text-lime-300 bg-lime-500/10 border-lime-500/30' },
  PLIOMETRIA: { label: 'Pliometria', icon: 'chevrons-up', classes: 'text-lime-700 dark:text-lime-300 bg-lime-500/10 border-lime-500/30' },
  HIBRIDO: { label: 'Híbrido', icon: 'flame', classes: 'text-red-700 dark:text-red-300 bg-red-500/10 border-red-500/30' },
  TESTE: { label: 'Teste', icon: 'clipboard-check', classes: 'text-fuchsia-700 dark:text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/30' },
  ATIVACAO: { label: 'Ativação', icon: 'heart-pulse', classes: 'text-teal-700 dark:text-teal-300 bg-teal-500/10 border-teal-500/30' },
  REGEN: { label: 'Regenerativo', icon: 'sparkles', classes: 'text-zinc-700 dark:text-zinc-300 bg-zinc-500/10 border-zinc-500/30' },
}

export const STATUS_META: Record<SessionStatus, { label: string; classes: string }> = {
  PLANEJADO: { label: 'Planejado', classes: 'text-zinc-600 dark:text-zinc-300 bg-zinc-500/10 border-zinc-500/30' },
  CONCLUIDO: { label: 'Concluído', classes: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/40' },
  PARCIAL: { label: 'Parcial', classes: 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border-amber-500/40' },
  AJUSTADO: { label: 'Ajustado', classes: 'text-orange-700 dark:text-orange-300 bg-orange-500/15 border-orange-500/40' },
  NAO_REALIZADO: { label: 'Não realizado', classes: 'text-red-700 dark:text-red-300 bg-red-500/15 border-red-500/40' },
}

export const PHASE_META: Record<PhaseCode, { label: string; classes: string; short: string }> = {
  DIAG: { label: 'Diagnóstico', classes: 'text-zinc-700 dark:text-zinc-300 bg-zinc-500/15 border-zinc-500/40', short: 'DIAG' },
  GPP1: { label: 'Preparatório Geral I', classes: 'text-lime-700 dark:text-lime-300 bg-lime-500/15 border-lime-500/40', short: 'GPP I' },
  GPP2: { label: 'Preparatório Geral II', classes: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 border-emerald-500/40', short: 'GPP II' },
  SPP1: { label: 'Específico I', classes: 'text-amber-700 dark:text-amber-300 bg-amber-500/15 border-amber-500/40', short: 'SPP I' },
  SPP2: { label: 'Específico II', classes: 'text-orange-700 dark:text-orange-300 bg-orange-500/15 border-orange-500/40', short: 'SPP II' },
  COMP: { label: 'Competitivo', classes: 'text-red-700 dark:text-red-300 bg-red-500/15 border-red-500/40', short: 'COMP' },
  TAPER: { label: 'Tapering & Pico', classes: 'text-fuchsia-700 dark:text-fuchsia-300 bg-fuchsia-500/15 border-fuchsia-500/40', short: 'TAPER' },
}

export const WEEK_TYPE_META: Record<WeekType, { label: string; classes: string }> = {
  DESENVOLVIMENTO: { label: 'Desenvolvimento', classes: 'text-zinc-600 dark:text-zinc-300 bg-zinc-500/10 border-zinc-500/30' },
  REGENERATIVO: { label: 'Regenerativo', classes: 'text-teal-700 dark:text-teal-300 bg-teal-500/10 border-teal-500/30' },
  TESTE: { label: 'Teste', classes: 'text-fuchsia-700 dark:text-fuchsia-300 bg-fuchsia-500/10 border-fuchsia-500/30' },
  FLEXIVEL: { label: 'Flexível', classes: 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30' },
  COMPETICAO: { label: 'Semana de Prova', classes: 'text-red-700 dark:text-red-300 bg-red-500/15 border-red-500/40' },
}

export const STATION_META: Record<StationCode, { label: string; detail: string }> = {
  RUN_1KM: { label: 'Corrida 1 km', detail: '1.000 m entre estações (8×)' },
  SKIERG: { label: 'SkiErg', detail: '1.000 m' },
  SLED_PUSH: { label: 'Sled Push', detail: '2 × 25 m (carga Open M)' },
  SLED_PULL: { label: 'Sled Pull', detail: '2 × 25 m (carga Open M)' },
  BBJ: { label: 'Burpee Broad Jumps', detail: '80 m' },
  ROWING: { label: 'Rowing', detail: '1.000 m' },
  FARMERS: { label: "Farmer's Carry", detail: '2 × 100 m' },
  SANDBAG: { label: 'Sandbag Lunges', detail: '100 m (20 kg Open M)' },
  WALLBALLS: { label: 'Wall Balls', detail: '100 reps (9 kg Open M)' },
}

// ---------- Zonas de treinamento (calibradas no teste incremental de 27/out) ----------

export interface ZoneDef {
  zone: string
  name: string
  pctHrMax: string
  hrBpm: string
  pace: string
  purpose: string
}

export const HR_ZONES: ZoneDef[] = [
  { zone: 'Z1', name: 'Recuperação', pctHrMax: '< 70%', hrBpm: '< 141', pace: '> 6:10/km', purpose: 'Regeneração, retorno pós-estações' },
  { zone: 'Z2', name: 'Aeróbia extensiva', pctHrMax: '70–80%', hrBpm: '141–161', pace: '5:30–6:10/km', purpose: 'Volume aeróbio, economia de corrida, base' },
  { zone: 'Z3', name: 'Limiar moderado', pctHrMax: '80–90%', hrBpm: '161–181', pace: '4:55–5:30/km', purpose: 'Tempo-run no/below VT2 — ritmo dominante do Hyrox' },
  { zone: 'Z4', name: 'Limiar alto / VO₂', pctHrMax: '90–95%', hrBpm: '181–191', pace: '4:20–4:55/km', purpose: 'Intervalados VO₂max (5×1.000 m)' },
  { zone: 'Z5', name: 'Máxima', pctHrMax: '> 95%', hrBpm: '> 191', pace: '< 4:20/km', purpose: 'Tiros curtos, simulações e prova' },
]

export const TEST_BATTERY = [
  { week: 1, label: 'Bateria completa', items: 'Esteira incremental (VO₂max/VT1/VT2) · 3RM (agachamento, terra, supino) · CMJ · 1.000 m Ski TT · 500 m Row TT' },
  { week: 11, label: 'Re-teste parcial', items: '5.000 m TT · CMJ · 3RM estimado — fechar GPP2' },
  { week: 17, label: 'Re-teste limiar', items: 'Teste curto em esteira (3 min × 3 stages) — recalibrar zonas pós-SPP1' },
  { week: 24, label: 'Simulação completa #1', items: 'Hyrox integral em ritmo de prova — raio-X logístico e de splits' },
  { week: 26, label: 'Simulação completa #2', items: 'Ensaio geral final (14 dias antes da prova)' },
  { week: 28, label: 'PROVA — HYROX', items: '8–9 de maio de 2027 — confirmar wave/dia exato' },
]

export const RPE_SCALE_HINT: Record<number, string> = {
  1: 'Muito, muito leve',
  2: 'Muito leve',
  3: 'Leve (ativação dominical)',
  4: 'Um pouco leve',
  5: 'Moderado',
  6: 'Um pouco intenso',
  7: 'Intenso (limiar)',
  8: 'Muito intenso (VO₂/simulação parcial)',
  9: 'Quase máximo (teste/simulação)',
  10: 'Máximo (prova)',
}
