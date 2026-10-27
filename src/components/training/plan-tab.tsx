'use client'

// Periodização — visão macro, mesociclos, microciclo atual, zonas e bateria de testes
import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Target, Zap, CalendarRange, ClipboardCheck, Trophy, User, HeartPulse } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fmtDateShort, fmtClock } from '@/lib/format'
import { HR_ZONES, TEST_BATTERY, WEEK_TYPE_META } from '@/lib/constants'
import { PhaseBadge, TypeBadge, PHASE_SOLID, WeekTypeBadge } from './bits'
import type { PlanResponse, WeekDetailResponse } from '@/lib/types'

export function PlanTab({ plan, onGoToWeek }: { plan: PlanResponse; onGoToWeek: (weekId: string) => void }) {
  const currentWeek = plan.currentWeek
  const [curDetail, setCurDetail] = useState<WeekDetailResponse | null>(null)

  useEffect(() => {
    if (!currentWeek) return
    let alive = true
    fetch(`/api/weeks/${currentWeek.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: WeekDetailResponse | null) => { if (alive && d) setCurDetail(d) })
      .catch(() => null)
    return () => { alive = false }
  }, [currentWeek?.id])

  const a = plan.athlete
  const totalWeeks = plan.weeks.length
  const currentMeso = plan.mesocycles.find((m) => m.code === currentWeek?.phaseCode)

  return (
    <div className="space-y-4">
      {/* linha do tempo macro */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base"><CalendarRange className="size-4 text-primary" /> Visão macro — {totalWeeks} semanas até a prova</CardTitle>
          <CardDescription>
            26/out/2026 → 08–09/05/2027 · prova <strong className="text-foreground">{plan.race.name}</strong> · meta {a.goalRaceTime ? `${Math.floor(a.goalRaceTime / 60)}:${String(a.goalRaceTime % 60).padStart(2, '0')} (divisão Open)` : 'a definir'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TooltipProvider delayDuration={100}>
            <div className="flex h-9 w-full overflow-hidden rounded-lg border">
              {plan.mesocycles.map((m) => (
                <TooltipProvider key={m.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => m.weeks[0] && onGoToWeek(m.weeks[0].id)}
                        style={{ flexGrow: m.weeks.length }}
                        className={cn(
                          'flex min-w-0 items-center justify-center px-1 text-[10px] font-bold uppercase tracking-wide text-white transition-opacity hover:opacity-80',
                          PHASE_SOLID[m.code],
                          currentMeso?.id === m.id ? 'opacity-100 ring-2 ring-foreground/60 ring-inset' : 'opacity-85',
                        )}
                        aria-label={`${m.name}: ${fmtDateShort(m.startDate)} a ${fmtDateShort(m.endDate)}`}
                      >
                        <span className="truncate">{m.code} · {m.weeks.length}s</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-64 text-xs">
                      <p className="font-semibold">{m.name}</p>
                      <p className="text-muted-foreground">{fmtDateShort(m.startDate)} – {fmtDateShort(m.endDate)} · {m.weeks.length} semanas</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}
              <div className="flex shrink-0 items-center gap-1 bg-primary px-2 text-[10px] font-bold uppercase text-primary-foreground">
                <Trophy className="size-3" /> Prova
              </div>
            </div>
          </TooltipProvider>
          <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
            <span>{fmtDateShort(plan.weeks[0].startDate)}</span>
            <span>{fmtDateShort(plan.race.date)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* perfil do atleta */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><User className="size-4 text-primary" /> Perfil do atleta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
              <Item label="Nome" value={a.name} />
              <Item label="Idade" value={`${a.age} anos (10/06/2005)`} />
              <Item label="Altura" value="1,79 m" />
              <Item label="Peso" value={`${a.weightKg.toLocaleString('pt-BR')} kg`} />
              <Item label="Gordura corporal" value={`${a.bodyFatPct}%`} />
              <Item label="PB 5 km" value={a.fiveKmPbSec ? fmtClock(a.fiveKmPbSec) : '—'} />
              <Item label="VO₂max" value={a.vo2max != null ? `${a.vo2max.toLocaleString('pt-BR')} mL/kg/min` : 'teste pendente'} />
              <Item label="VDOT" value={a.vdot != null ? String(a.vdot) : '—'} />
              <Item label="VT1 (limiar aeróbico)" value={a.vt1SpeedKmh != null ? `${a.vt1SpeedKmh.toLocaleString('pt-BR')} km/h · ${fmtClock(3600 / a.vt1SpeedKmh)}/km` : '—'} />
              <Item label="VT2 (limiar anaeróbico)" value={a.vt2SpeedKmh != null ? `${a.vt2SpeedKmh.toLocaleString('pt-BR')} km/h · ${fmtClock(3600 / a.vt2SpeedKmh)}/km` : '—'} />
              <Item label="FC repouso / máxima" value={`${a.restingHr ?? '—'} / ${a.maxHr ?? '—'} bpm`} />
              <Item label="Meta de prova" value={a.goalRaceTime ? `${Math.floor(a.goalRaceTime / 60)}:${String(a.goalRaceTime % 60).padStart(2, '0')}` : '—'} />
            </div>
            {a.notes && <p className="rounded-md bg-muted/50 px-2.5 py-2 text-[11px] leading-relaxed text-muted-foreground">{a.notes}</p>}
          </CardContent>
        </Card>

        {/* microciclo atual */}
        <Card className="xl:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="size-4 text-primary" /> Microciclo atual — estrutura dos 7 dias
            </CardTitle>
            <CardDescription>
              {currentWeek
                ? <>Semana {currentWeek.weekNumber} · {currentWeek.mesoName} · {fmtDateShort(currentWeek.startDate)} – {fmtDateShort(currentWeek.endDate)} · {currentWeek.adherencePct != null ? `aderência ${currentWeek.adherencePct}%` : 'sem registros'}</>
                : 'Fora do período de planejamento'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {curDetail ? (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {curDetail.sessions.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => onGoToWeek(currentWeek!.id)}
                    className="flex flex-col gap-1.5 rounded-lg border p-2.5 text-left transition-colors hover:border-primary/50 hover:bg-primary/5"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <TypeBadge type={s.type} />
                      <span className="text-[10px] uppercase text-muted-foreground">
                        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][s.dayIndex - 1]} {fmtDateShort(s.date)}
                      </span>
                    </div>
                    <p className="text-xs font-semibold leading-tight">{s.title}</p>
                    <p className="text-[11px] tnum text-muted-foreground">
                      {s.durationPrescribedMin} min
                      {s.kmPrescribed != null && ` · ${s.kmPrescribed.toLocaleString('pt-BR')} km`}
                      {s.rpePrescribed != null && ` · RPE ${s.rpePrescribed}`}
                      {s.hrZone && ` · ${s.hrZone}`}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* mesociclos */}
      <div className="grid gap-4 lg:grid-cols-2">
        {plan.mesocycles.map((m) => {
          const isCurrent = currentMeso?.id === m.id
          return (
            <Card key={m.id} className={cn(isCurrent && 'ring-2 ring-primary/60')}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <PhaseBadge code={m.code} />
                  <CardTitle className="text-base leading-tight">{m.name}</CardTitle>
                  {isCurrent && <Badge className="bg-primary text-primary-foreground text-[10px]">ATUAL</Badge>}
                </div>
                <CardDescription>
                  {fmtDateShort(m.startDate)} – {fmtDateShort(m.endDate)} · {m.weeks.length} semanas · volume {Math.round(m.volumeTargetKm).toLocaleString('pt-BR')} km
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm leading-relaxed">{m.goal}</p>
                <div className="flex flex-wrap gap-1.5">
                  {m.focus.split(';').map((f) => (
                    <span key={f} className="rounded-md border bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground">{f.trim()}</span>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-1.5 text-xs text-muted-foreground">
                  <p className="flex items-start gap-1.5"><Target className="mt-0.5 size-3.5 shrink-0 text-primary" /> {m.keyWorkouts}</p>
                  <p className="flex items-start gap-1.5"><HeartPulse className="mt-0.5 size-3.5 shrink-0 text-red-500" /> {m.intensityNote}</p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {m.weeks.map((w) => (
                    <Tooltip key={w.id}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onGoToWeek(w.id)}
                          className={cn(
                            'rounded-md border px-1.5 py-0.5 text-[11px] font-medium tnum transition-colors hover:border-primary/60',
                            w.isCurrent ? 'border-primary bg-primary/15 text-primary' : 'border-border text-muted-foreground',
                          )}
                        >
                          S{w.weekNumber}
                          {w.adherencePct != null && <span className={cn('ml-1', w.adherencePct >= 90 ? 'text-emerald-500' : w.adherencePct >= 70 ? 'text-amber-500' : 'text-red-500')}>{w.adherencePct}%</span>}
                          {w.type !== 'DESENVOLVIMENTO' && <span className="ml-1 opacity-70" title={WEEK_TYPE_META[w.type as keyof typeof WEEK_TYPE_META]?.label}>•</span>}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">
                        <p className="font-semibold">Semana {w.weekNumber} · {WEEK_TYPE_META[w.type as keyof typeof WEEK_TYPE_META]?.label}</p>
                        <p className="text-muted-foreground">{fmtDateShort(w.startDate)} – {fmtDateShort(w.endDate)} · alvo {w.targetKm.toLocaleString('pt-BR')} km · {Math.round(w.targetTonnageKg / 1000).toLocaleString('pt-BR')} t</p>
                        {w.note && <p className="max-w-56 text-muted-foreground">{w.note}</p>}
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* zonas */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Zonas de treinamento</CardTitle>
            <CardDescription>Calibradas no teste incremental (VT1 10,0 km/h · VT2 11,9 km/h · FCmáx 201 bpm) — revalidar nas semanas 11 e 17</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <TableHead className="py-2">Zona</TableHead>
                  <TableHead className="py-2">% FCmáx</TableHead>
                  <TableHead className="py-2">FC (bpm)</TableHead>
                  <TableHead className="py-2">Ritmo</TableHead>
                  <TableHead className="py-2">Propósito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {HR_ZONES.map((z) => (
                  <TableRow key={z.zone}>
                    <TableCell className="py-2 text-xs font-semibold">{z.zone} · {z.name}</TableCell>
                    <TableCell className="py-2 text-xs tnum">{z.pctHrMax}</TableCell>
                    <TableCell className="py-2 text-xs tnum">{z.hrBpm}</TableCell>
                    <TableCell className="py-2 text-xs tnum">{z.pace}</TableCell>
                    <TableCell className="py-2 text-xs text-muted-foreground">{z.purpose}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* bateria de testes */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base"><ClipboardCheck className="size-4 text-primary" /> Bateria de testes & marcos</CardTitle>
            <CardDescription>Controle de evolução ao longo do ciclo — re-testes a cada 6 semanas</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="relative ml-2 space-y-4 border-l pl-5">
              {TEST_BATTERY.map((t) => (
                <li key={t.week} className="relative">
                  <span className={cn('absolute -left-[27px] flex size-4 items-center justify-center rounded-full border-2 border-background', PHASE_SOLID[plan.weeks[t.week - 1]?.phaseCode ?? ''] ?? 'bg-zinc-500')} />
                  <div className="flex flex-wrap items-center gap-2">
                    <WeekTypeBadge type={plan.weeks[t.week - 1]?.type ?? 'DESENVOLVIMENTO'} />
                    <p className="text-sm font-semibold">{t.label} <span className="font-normal text-muted-foreground">· Semana {t.week}</span></p>
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t.items}</p>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="truncate text-sm font-medium">{value}</p>
    </div>
  )
}
