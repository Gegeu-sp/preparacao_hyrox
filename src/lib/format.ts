// Formatação pt-BR e utilitários de data/pace

export const DAY_MS = 86_400_000

export function dateKey(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toISOString().slice(0, 10)
}

export function addDays(d: Date, days: number): Date {
  const nd = new Date(d.getTime())
  nd.setUTCDate(nd.getUTCDate() + days)
  return nd
}

export function utc(y: number, m: number, day: number): Date {
  return new Date(Date.UTC(y, m - 1, day))
}

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

export function fmtDateShort(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d
  return `${String(dt.getUTCDate()).padStart(2, '0')} ${MONTHS_SHORT[dt.getUTCMonth()]}`
}

export function fmtDateFull(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(d) : d
  return `${String(dt.getUTCDate()).padStart(2, '0')}/${String(dt.getUTCMonth() + 1).padStart(2, '0')}/${dt.getUTCFullYear()}`
}

export function fmtKm(v: number | null | undefined, digits = 1): string {
  if (v == null || Number.isNaN(v)) return '—'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function fmtNum(v: number | null | undefined, digits = 0): string {
  if (v == null || Number.isNaN(v)) return '—'
  return v.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** tonelagem em toneladas (t) */
export function fmtTon(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—'
  return (v / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

/** segundos → "m:ss" */
export function fmtClock(sec: number | null | undefined): string {
  if (sec == null || Number.isNaN(sec)) return '—'
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

/** segundos/km → "4:50/km" */
export function fmtPace(secPerKm: number | null | undefined): string {
  if (secPerKm == null || Number.isNaN(secPerKm)) return '—'
  return `${fmtClock(secPerKm)}/km`
}

/** aceita "4:05", "4:05:30", "250" → segundos */
export function parseClock(input: string): number | null {
  const v = input.trim()
  if (!v) return null
  if (/^\d+$/.test(v)) return parseInt(v, 10)
  const parts = v.split(':').map((p) => parseInt(p, 10))
  if (parts.some((p) => Number.isNaN(p))) return null
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
  return null
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS)
}
