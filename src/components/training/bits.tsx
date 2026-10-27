// Componentes visuais compartilhados (badges, KPIs, pills)
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import {
  SESSION_TYPE_META, STATUS_META, PHASE_META, WEEK_TYPE_META,
  type SessionType, type SessionStatus, type PhaseCode, type WeekType,
} from '@/lib/constants'
import {
  Dumbbell, Footprints, Zap, ChevronsUp, Flame, ClipboardCheck, HeartPulse, Sparkles, Activity,
  type LucideIcon,
} from 'lucide-react'

const TYPE_ICONS: Record<string, LucideIcon> = {
  dumbbell: Dumbbell, footprints: Footprints, zap: Zap, 'chevrons-up': ChevronsUp,
  flame: Flame, 'clipboard-check': ClipboardCheck, 'heart-pulse': HeartPulse, sparkles: Sparkles,
}

export function TypeBadge({ type, short }: { type: string; short?: boolean }) {
  const meta = SESSION_TYPE_META[type as SessionType]
  if (!meta) return <Badge variant="outline" className="text-xs">{type}</Badge>
  const Icon = TYPE_ICONS[meta.icon] ?? Activity
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-tight', meta.classes)}>
      <Icon className="size-3" aria-hidden />
      {short ? meta.label.slice(0, 4) : meta.label}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  const meta = STATUS_META[status as SessionStatus]
  if (!meta) return <Badge variant="outline" className="text-xs">{status}</Badge>
  return (
    <span className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-tight', meta.classes)}>
      {meta.label}
    </span>
  )
}

export function PhaseBadge({ code, className }: { code: string; className?: string }) {
  const meta = PHASE_META[code as PhaseCode]
  if (!meta) return <Badge variant="outline" className="text-xs">{code}</Badge>
  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide', meta.classes, className)}>
      {meta.short}
    </span>
  )
}

export function WeekTypeBadge({ type }: { type: string }) {
  const meta = WEEK_TYPE_META[type as WeekType]
  if (!meta) return null
  return (
    <span className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[11px] font-medium leading-tight', meta.classes)}>
      {meta.label}
    </span>
  )
}

// cor sólida da fase (para linha do tempo)
export const PHASE_SOLID: Record<string, string> = {
  DIAG: 'bg-zinc-500',
  GPP1: 'bg-lime-500',
  GPP2: 'bg-emerald-500',
  SPP1: 'bg-amber-500',
  SPP2: 'bg-orange-500',
  COMP: 'bg-red-500',
  TAPER: 'bg-fuchsia-500',
}

export function KpiCard({
  label, value, sub, icon: Icon, accent, progress,
}: {
  label: string
  value: React.ReactNode
  sub?: React.ReactNode
  icon: LucideIcon
  accent?: 'primary' | 'amber' | 'red' | 'zinc'
  progress?: number | null
}) {
  const iconColor = {
    primary: 'text-primary bg-primary/10',
    amber: 'text-amber-500 bg-amber-500/10',
    red: 'text-red-500 bg-red-500/10',
    zinc: 'text-muted-foreground bg-muted',
  }[accent ?? 'primary']
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
          <div className="mt-1 text-2xl font-bold tnum leading-none">{value}</div>
          {sub && <div className="mt-1.5 text-xs text-muted-foreground leading-snug">{sub}</div>}
        </div>
        <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', iconColor)}>
          <Icon className="size-4" aria-hidden />
        </span>
      </div>
      {progress != null && (
        <div className="mt-3 flex items-center gap-2">
          <Progress value={Math.min(100, Math.max(0, progress))} className="h-1.5" />
          <span className="text-[11px] tnum text-muted-foreground shrink-0">{Math.round(progress)}%</span>
        </div>
      )}
    </Card>
  )
}

export function PAValue({ p, a, unit, digits = 0 }: { p: number | null; a: number | null; unit?: string; digits?: number }) {
  return (
    <span className="tnum">
      <span className="text-primary font-semibold">
        {a != null ? a.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—'}
      </span>
      <span className="text-muted-foreground"> / {p != null ? p.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—'}{unit ? ` ${unit}` : ''}</span>
    </span>
  )
}

export function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 text-xs text-muted-foreground', className)}>
      {children}
    </span>
  )
}
