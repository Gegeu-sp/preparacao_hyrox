'use client'

// Diário de Treino — navegação por microciclos e cards dos 7 dias
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import { ChevronLeft, ChevronRight, PencilLine, Timer, MapPin, Dumbbell, Gauge, CheckCircle2, RotateCcw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { WEEKDAYS, WEEKDAYS_SHORT, WEEK_TYPE_META } from '@/lib/constants'
import { fmtDateShort, fmtTon, fmtKm } from '@/lib/format'
import { TypeBadge, StatusBadge, PhaseBadge, WeekTypeBadge } from './bits'
import { SessionSheet } from './session-sheet'
import type { PlanResponse, SessionDTO, WeekDetailResponse, WeekSummaryDTO } from '@/lib/types'

const dateKey = (d: string | Date) => new Date(d).toISOString().slice(0, 10)

export function WeekTab({ plan, onDataChanged, jumpWeek }: {
  plan: PlanResponse
  onDataChanged: () => void
  jumpWeek: { id: string; n: number } | null
}) {
  const weeks = plan.weeks
  const [weekId, setWeekId] = useState<string>(() => plan.currentWeek?.id ?? weeks[0]?.id)
  const [detail, setDetail] = useState<WeekDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<SessionDTO | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    if (jumpWeek) setWeekId(jumpWeek.id)
  }, [jumpWeek])

  const idx = weeks.findIndex((w) => w.id === weekId)
  const weekMeta: WeekSummaryDTO | undefined = weeks[idx]

  const load = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/weeks/${id}`)
      if (!res.ok) throw new Error()
      const data: WeekDetailResponse = await res.json()
      setDetail(data)
    } catch {
      toast.error('Não foi possível carregar a semana.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { if (weekId) void load(weekId) }, [weekId, load])

  const go = (delta: number) => {
    const next = idx + delta
    if (next >= 0 && next < weeks.length) setWeekId(weeks[next].id)
  }

  const todayKey = useMemo(() => dateKey(new Date()), [])

  const onSaved = (updated: SessionDTO) => {
    if (detail) {
      setDetail({
        ...detail,
        sessions: detail.sessions.map((s) => (s.id === updated.id ? updated : s)),
      })
    }
    setSelected(updated)
    onDataChanged() // atualiza dashboard/plano global
  }

  const toggleConfirmSession = async (s: SessionDTO) => {
    const isDone = s.status === 'CONCLUIDO' || s.status === 'PARCIAL' || s.status === 'AJUSTADO'
    const nextStatus = isDone ? 'PLANEJADO' : 'CONCLUIDO'
    setTogglingId(s.id)
    try {
      const res = await fetch(`/api/sessions/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      })
      if (!res.ok) throw new Error()
      const updated: SessionDTO = await res.json()
      if (detail) {
        setDetail({
          ...detail,
          sessions: detail.sessions.map((item) => (item.id === updated.id ? updated : item)),
        })
      }
      toast.success(
        nextStatus === 'CONCLUIDO'
          ? `Treino confirmado — ${WEEKDAYS[s.dayIndex - 1]} (${s.title}) sincronizado em todas as abas!`
          : `Treino revertido para Planejado — ${WEEKDAYS[s.dayIndex - 1]}.`,
      )
      onDataChanged()
    } catch {
      toast.error('Não foi possível atualizar o status do treino.')
    } finally {
      setTogglingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* navegação da semana */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => go(-1)} disabled={idx <= 0} aria-label="Semana anterior">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => go(1)} disabled={idx >= weeks.length - 1} aria-label="Próxima semana">
            <ChevronRight className="size-4" />
          </Button>
        </div>
        {weekMeta && (
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold">Semana {weekMeta.weekNumber}</h2>
            <PhaseBadge code={weekMeta.phaseCode} />
            <WeekTypeBadge type={weekMeta.type} />
            <span className="text-xs text-muted-foreground">
              {fmtDateShort(weekMeta.startDate)} – {fmtDateShort(weekMeta.endDate)}
            </span>
          </div>
        )}
        <Button
          size="sm" variant="ghost"
          className="ml-auto text-xs"
          onClick={() => plan.currentWeek && setWeekId(plan.currentWeek.id)}
        >
          Ir para semana atual
        </Button>
      </div>

      {weekMeta?.note && (
        <p className="rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {weekMeta.note}
        </p>
      )}

      {/* resumo da semana */}
      {weekMeta && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Card className="flex items-center gap-2.5 p-3">
            <MapPin className="size-4 shrink-0 text-primary" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Quilometragem (real/presc)</p>
              <p className="tnum text-sm font-semibold">{fmtKm(weekMeta.kmA)} / {fmtKm(weekMeta.kmP)} km</p>
            </div>
          </Card>
          <Card className="flex items-center gap-2.5 p-3">
            <Dumbbell className="size-4 shrink-0 text-amber-500" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tonelagem (real/presc)</p>
              <p className="tnum text-sm font-semibold">{fmtTon(weekMeta.tonnageA)} / {fmtTon(weekMeta.tonnageP)} t</p>
            </div>
          </Card>
          <Card className="flex items-center gap-2.5 p-3">
            <Timer className="size-4 shrink-0 text-red-500" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Sessões concluídas</p>
              <p className="tnum text-sm font-semibold">{weekMeta.sessionsDone}/{weekMeta.sessionsTotal}</p>
            </div>
          </Card>
          <Card className="flex items-center gap-2.5 p-3">
            <Gauge className="size-4 shrink-0 text-lime-500" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Aderência</p>
              <p className="tnum text-sm font-semibold">{weekMeta.adherencePct != null ? `${weekMeta.adherencePct}%` : '—'}</p>
            </div>
          </Card>
        </div>
      )}

      {/* dias */}
      {loading || !detail ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {detail.sessions.map((s) => {
            const isToday = dateKey(s.date) === todayKey
            return (
              <Card
                key={s.id}
                className={cn(
                  'flex flex-col gap-2 p-4 transition-shadow hover:shadow-md',
                  isToday && 'ring-2 ring-primary/70',
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={cn('text-xs font-semibold uppercase tracking-wider', isToday ? 'text-primary' : 'text-muted-foreground')}>
                    {WEEKDAYS[s.dayIndex - 1]}
                    <span className="ml-1.5 font-normal normal-case text-muted-foreground">{fmtDateShort(s.date)}</span>
                  </p>
                  <StatusBadge status={s.status} />
                </div>
                <div className="flex items-start gap-2">
                  <TypeBadge type={s.type} />
                  <p className="text-sm font-semibold leading-tight">{s.title}</p>
                </div>
                <p className="line-clamp-3 text-xs leading-relaxed text-muted-foreground">{s.description}</p>
                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] tnum text-muted-foreground">
                  <span className="flex items-center gap-1"><Timer className="size-3" />
                    {s.durationActualMin ?? s.durationPrescribedMin} min
                  </span>
                  {s.kmPrescribed != null && (
                    <span className="flex items-center gap-1"><MapPin className="size-3" />
                      {s.kmActual ?? s.kmPrescribed}/{s.kmPrescribed} km
                    </span>
                  )}
                  {s.tonnagePrescribedKg ? (
                    <span className="flex items-center gap-1"><Dumbbell className="size-3" />
                      {fmtTon(s.tonnageActualKg ?? s.tonnagePrescribedKg)}/{fmtTon(s.tonnagePrescribedKg)} t
                    </span>
                  ) : null}
                  {s.rpePrescribed != null && (
                    <span className="flex items-center gap-1"><Gauge className="size-3" /> RPE {s.rpeActual ?? '–'}/{s.rpePrescribed}</span>
                  )}
                </div>
                <div className="mt-1 grid grid-cols-2 gap-1.5">
                  <Button
                    variant={
                      s.status === 'CONCLUIDO' || s.status === 'PARCIAL' || s.status === 'AJUSTADO'
                        ? 'secondary'
                        : 'default'
                    }
                    size="sm"
                    className="w-full text-xs"
                    disabled={togglingId === s.id}
                    onClick={() => void toggleConfirmSession(s)}
                  >
                    {togglingId === s.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : s.status === 'CONCLUIDO' || s.status === 'PARCIAL' || s.status === 'AJUSTADO' ? (
                      <RotateCcw className="size-3.5" />
                    ) : (
                      <CheckCircle2 className="size-3.5" />
                    )}
                    {s.status === 'CONCLUIDO' || s.status === 'PARCIAL' || s.status === 'AJUSTADO'
                      ? 'Desmarcar'
                      : 'Confirmar'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => {
                      setSelected(s)
                      setSheetOpen(true)
                    }}
                  >
                    <PencilLine className="size-3.5" />
                    Detalhes
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <SessionSheet
        session={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onSaved={onSaved}
      />
    </div>
  )
}
