'use client'

// Sheet de edição da sessão: prescrito E realizado — escalares, exercícios (cargas/séries)
// e estações Hyrox (splits). Salva via PATCH /api/sessions/[id].
import { useEffect, useMemo, useState } from 'react'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import { Loader2, Save, ClipboardList, Dumbbell, Flag, NotebookPen } from 'lucide-react'
import { STATUS_META, SESSION_STATUS, RPE_SCALE_HINT } from '@/lib/constants'
import { fmtDateFull, fmtClock, parseClock } from '@/lib/format'
import { tonnageOf, tonnageOfActual } from '@/lib/tonnage'
import { TypeBadge, StatusBadge } from './bits'
import type { ExerciseDTO, SessionDTO, SessionPatchPayload, StationDTO } from '@/lib/types'
import { WEEKDAYS } from '@/lib/constants'

interface ExEdit {
  id: string
  setsP: string; repsP: string; loadP: string
  setsA: string; repsA: string; loadA: string
}
interface StEdit {
  id: string
  target: string; actual: string; hr: string
}

const n = (v: string): number | null => (v.trim() === '' ? null : Number.isNaN(Number(v)) ? null : Number(v))

export function SessionSheet({ session, open, onOpenChange, onSaved }: {
  session: SessionDTO | null
  open: boolean
  onOpenChange: (o: boolean) => void
  onSaved: (s: SessionDTO) => void
}) {
  const [status, setStatus] = useState('PLANEJADO')
  const [durP, setDurP] = useState('')
  const [durA, setDurA] = useState('')
  const [kmP, setKmP] = useState('')
  const [kmA, setKmA] = useState('')
  const [rpeP, setRpeP] = useState<number>(5)
  const [rpeA, setRpeA] = useState<number>(5)
  const [pace, setPace] = useState('')
  const [notes, setNotes] = useState('')
  const [coachNote, setCoachNote] = useState('')
  const [ex, setEx] = useState<ExEdit[]>([])
  const [st, setSt] = useState<StEdit[]>([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (session && open) {
      setStatus(session.status)
      setDurP(String(session.durationPrescribedMin ?? ''))
      setDurA(session.durationActualMin != null ? String(session.durationActualMin) : '')
      setKmP(session.kmPrescribed != null ? String(session.kmPrescribed) : '')
      setKmA(session.kmActual != null ? String(session.kmActual) : '')
      setRpeP(session.rpePrescribed ?? 5)
      setRpeA(session.rpeActual ?? 5)
      setPace(session.paceTarget ?? '')
      setNotes(session.notes ?? '')
      setCoachNote(session.coachNote ?? '')
      setEx(session.exercises.map((e) => ({
        id: e.id,
        setsP: e.setsPrescribed != null ? String(e.setsPrescribed) : '',
        repsP: e.repsPrescribed ?? '',
        loadP: e.loadPrescribedKg != null ? String(e.loadPrescribedKg) : '',
        setsA: e.setsActual != null ? String(e.setsActual) : '',
        repsA: e.repsActual ?? '',
        loadA: e.loadActualKg != null ? String(e.loadActualKg) : '',
      })))
      setSt(session.stations.map((s) => ({
        id: s.id,
        target: s.splitPrescribedSec != null ? fmtClock(s.splitPrescribedSec) : '',
        actual: s.splitActualSec != null ? fmtClock(s.splitActualSec) : '',
        hr: s.hrAvg != null ? String(s.hrAvg) : '',
      })))
    }
  }, [session, open])

  // tonelagem recalculada ao vivo a partir dos exercícios
  const [tonP, tonA] = useMemo(() => {
    const p = tonnageOf(ex.map((e) => ({
      setsPrescribed: n(e.setsP) ?? undefined,
      repsPrescribed: e.repsP || undefined,
      loadPrescribedKg: n(e.loadP) ?? undefined,
    })))
    const a = tonnageOfActual(ex.map((e) => ({
      setsPrescribed: n(e.setsP) ?? undefined,
      repsPrescribed: e.repsP || undefined,
      loadPrescribedKg: n(e.loadP) ?? undefined,
      setsActual: n(e.setsA) ?? undefined,
      repsActual: e.repsA || undefined,
      loadActualKg: n(e.loadA) ?? undefined,
    })))
    return [p, a]
  }, [ex])

  if (!session) return null

  const setExField = (id: string, field: keyof ExEdit, value: string) =>
    setEx((arr) => arr.map((e) => (e.id === id ? { ...e, [field]: value } : e)))
  const setStField = (id: string, field: keyof StEdit, value: string) =>
    setSt((arr) => arr.map((s) => (s.id === id ? { ...s, [field]: value } : s)))

  async function save() {
    if (!session) return
    setSaving(true)
    try {
      const payload: SessionPatchPayload = {
        status,
        durationPrescribedMin: n(durP) ?? undefined,
        durationActualMin: n(durA),
        kmPrescribed: n(kmP),
        kmActual: n(kmA),
        rpePrescribed: rpeP,
        rpeActual: rpeA,
        paceTarget: pace || null,
        notes: notes || null,
        coachNote: coachNote || null,
        exercises: ex.map((e) => ({
          id: e.id,
          setsPrescribed: n(e.setsP),
          repsPrescribed: e.repsP || null,
          loadPrescribedKg: n(e.loadP),
          setsActual: n(e.setsA),
          repsActual: e.repsA || null,
          loadActualKg: n(e.loadA),
        })),
        stations: st.map((s) => ({
          id: s.id,
          splitPrescribedSec: parseClock(s.target),
          splitActualSec: parseClock(s.actual),
          hrAvg: n(s.hr),
        })),
      }
      const res = await fetch(`/api/sessions/${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error()
      const updated: SessionDTO = await res.json()
      toast.success(`Sessão salva — ${WEEKDAYS[session.dayIndex - 1]}, ${fmtDateFull(session.date)}.`)
      onOpenChange(false)
      onSaved(updated)
    } catch {
      toast.error('Não foi possível salvar a sessão.')
    } finally {
      setSaving(false)
    }
  }

  const loadPA = (rpeA != null && n(durA) ? Math.round(rpeA * (n(durA) as number)) : null)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-full w-full flex-col overflow-hidden p-0 sm:max-w-2xl">
        <SheetHeader className="px-5 pt-5 pb-3 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <TypeBadge type={session.type} />
            <StatusBadge status={status} />
            <span className="text-xs text-muted-foreground">
              {WEEKDAYS[session.dayIndex - 1]} · {fmtDateFull(session.date)} · Semana {session.weekNumber}
            </span>
          </div>
          <SheetTitle className="text-lg leading-tight">{session.title}</SheetTitle>
          <SheetDescription className="leading-snug">{session.description}</SheetDescription>
          {(session.hrZone || session.paceTarget) && (
            <p className="text-xs text-muted-foreground">
              {session.hrZone && <span className="mr-3">Zona: <strong className="text-foreground">{session.hrZone}</strong></span>}
              {session.paceTarget && <span>Ritmo: <strong className="text-foreground">{session.paceTarget}</strong></span>}
            </p>
          )}
        </SheetHeader>

        <Separator />

        <ScrollArea className="min-h-0 flex-1 px-5">
          <div className="space-y-6 py-5">
            {/* ---------------- PRESCRITO ---------------- */}
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <ClipboardList className="size-4" /> Prescrito
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Duração (min)</Label>
                  <Input value={durP} onChange={(e) => setDurP(e.target.value)} inputMode="numeric" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Quilometragem</Label>
                  <Input value={kmP} onChange={(e) => setKmP(e.target.value)} inputMode="decimal" placeholder="—" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">RPE alvo</Label>
                  <div className="flex h-9 items-center gap-2 rounded-md border px-3">
                    <Slider className="flex-1" min={1} max={10} step={1} value={[rpeP]} onValueChange={([v]) => setRpeP(v)} />
                    <span className="tnum text-sm font-semibold">{rpeP}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Ritmo alvo</Label>
                  <Input value={pace} onChange={(e) => setPace(e.target.value)} placeholder="4:45–4:55/km" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground tnum">
                Carga sRPE prescrita: <strong className="text-foreground">{rpeP * (n(durP) ?? 0)} UA</strong>
                {tonP > 0 && <> · Tonelagem prescrita: <strong className="text-foreground">{tonP.toLocaleString('pt-BR')} kg</strong> (auto dos exercícios)</>}
              </p>
            </section>

            {/* ---------------- REALIZADO ---------------- */}
            <section className="space-y-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                <NotebookPen className="size-4" /> Realizado
              </h3>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SESSION_STATUS.map((s) => (
                        <SelectItem key={s} value={s}>{STATUS_META[s].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Duração (min)</Label>
                  <Input value={durA} onChange={(e) => setDurA(e.target.value)} inputMode="numeric" placeholder="—" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Quilometragem</Label>
                  <Input value={kmA} onChange={(e) => setKmA(e.target.value)} inputMode="decimal" placeholder="—" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">RPE da sessão</Label>
                  <div className="flex h-9 items-center gap-2 rounded-md border px-3">
                    <Slider className="flex-1" min={1} max={10} step={1} value={[rpeA]} onValueChange={([v]) => setRpeA(v)} />
                    <span className="tnum text-sm font-semibold">{rpeA}</span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground tnum">
                RPE {rpeA} — {RPE_SCALE_HINT[rpeA] ?? ''} · Carga sRPE realizada: <strong className="text-foreground">{loadPA ?? '—'} UA</strong>
                {tonA != null && tonA > 0 && <> · Tonelagem realizada: <strong className="text-foreground">{tonA.toLocaleString('pt-BR')} kg</strong></>}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Observações do atleta</Label>
                  <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Como a sessão transcorreu, percepções, dores, condições…" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Observações da comissão técnica</Label>
                  <Textarea rows={3} value={coachNote} onChange={(e) => setCoachNote(e.target.value)} placeholder="Ajustes, feedback e decisões para a próxima semana…" />
                </div>
              </div>
            </section>

            {/* ---------------- EXERCÍCIOS ---------------- */}
            {ex.length > 0 && (
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  <Dumbbell className="size-4" /> Exercícios — cargas, séries e reps
                </h3>
                <div className="space-y-3">
                  {ex.map((e, idx) => {
                    const meta = session.exercises.find((x) => x.id === e.id)
                    return (
                      <div key={e.id} className="rounded-lg border p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-sm font-medium leading-tight">
                            <span className="text-muted-foreground mr-1.5 tnum">{idx + 1}.</span>{meta?.name}
                          </p>
                          <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{meta?.category}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-2">
                          <div className="space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Prescrito</p>
                            <div className="flex items-center gap-1.5">
                              <Input className="h-8 w-12 text-center tnum" value={e.setsP} onChange={(ev) => setExField(e.id, 'setsP', ev.target.value)} placeholder="s" inputMode="numeric" aria-label="séries prescritas" />
                              <span className="text-xs text-muted-foreground">×</span>
                              <Input className="h-8 w-16 text-center tnum" value={e.repsP} onChange={(ev) => setExField(e.id, 'repsP', ev.target.value)} placeholder="reps" aria-label="reps prescritas" />
                              <span className="text-xs text-muted-foreground">@</span>
                              <Input className="h-8 w-16 text-center tnum" value={e.loadP} onChange={(ev) => setExField(e.id, 'loadP', ev.target.value)} placeholder="kg" inputMode="decimal" aria-label="carga prescrita" />
                              <span className="text-xs text-muted-foreground">kg</span>
                            </div>
                            {meta?.rest && <p className="text-[11px] text-muted-foreground">desc. {meta.rest}{meta.tempo ? ` · tempo ${meta.tempo}` : ''}</p>}
                          </div>
                          <div className="space-y-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Realizado</p>
                            <div className="flex items-center gap-1.5">
                              <Input className="h-8 w-12 text-center tnum" value={e.setsA} onChange={(ev) => setExField(e.id, 'setsA', ev.target.value)} placeholder="s" inputMode="numeric" aria-label="séries realizadas" />
                              <span className="text-xs text-muted-foreground">×</span>
                              <Input className="h-8 w-16 text-center tnum" value={e.repsA} onChange={(ev) => setExField(e.id, 'repsA', ev.target.value)} placeholder="reps" aria-label="reps realizadas" />
                              <span className="text-xs text-muted-foreground">@</span>
                              <Input className="h-8 w-16 text-center tnum" value={e.loadA} onChange={(ev) => setExField(e.id, 'loadA', ev.target.value)} placeholder="kg" inputMode="decimal" aria-label="carga realizada" />
                              <span className="text-xs text-muted-foreground">kg</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            )}

            {/* ---------------- ESTAÇÕES ---------------- */}
            {st.length > 0 && (
              <section className="space-y-3">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  <Flag className="size-4" /> Estações Hyrox — splits
                </h3>
                <div className="overflow-hidden rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50 text-[11px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-2 py-2 text-left font-medium">Estação</th>
                        <th className="px-2 py-2 text-center font-medium">Alvo</th>
                        <th className="px-2 py-2 text-center font-medium">Realizado</th>
                        <th className="px-2 py-2 text-center font-medium">FC méd.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {st.map((s, i) => {
                        const meta = session.stations.find((x) => x.id === s.id)
                        const done = parseClock(s.actual)
                        const target = parseClock(s.target)
                        const diff = done != null && target != null ? done - target : null
                        return (
                          <tr key={s.id} className="border-b last:border-0">
                            <td className="px-2 py-2">
                              <p className="text-[13px] font-medium leading-tight">{meta?.label}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {meta?.distanceM ? `${meta.distanceM.toLocaleString('pt-BR')} m` : ''}
                                {meta?.reps ? `${meta.reps} reps` : ''}
                                {meta?.loadKg ? ` · ${meta.loadKg} kg` : ''}
                              </p>
                            </td>
                            <td className="px-2 py-2 text-center">
                              <Input className="h-8 w-16 text-center tnum" value={s.target} onChange={(ev) => setStField(s.id, 'target', ev.target.value)} placeholder="m:ss" aria-label={`split alvo ${meta?.label}`} />
                            </td>
                            <td className="px-2 py-2 text-center">
                              <Input className="h-8 w-16 text-center tnum" value={s.actual} onChange={(ev) => setStField(s.id, 'actual', ev.target.value)} placeholder="m:ss" aria-label={`split realizado ${meta?.label}`} />
                              {diff != null && (
                                <p className={`tnum text-[11px] ${diff <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {diff <= 0 ? '−' : '+'}{fmtClock(Math.abs(diff))}
                                </p>
                              )}
                            </td>
                            <td className="px-2 py-2 text-center">
                              <Input className="h-8 w-14 text-center tnum" value={s.hr} onChange={(ev) => setStField(s.id, 'hr', ev.target.value)} placeholder="bpm" inputMode="numeric" aria-label="FC média" />
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-muted-foreground">Splits em <strong>m:ss</strong> — ex.: 4:25. Verde = no/alvo melhor que o prescrito; vermelho = acima.</p>
              </section>
            )}
          </div>
        </ScrollArea>

        <div className="border-t bg-card/95 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="hidden text-xs text-muted-foreground sm:block">
              Edições afetam instantaneamente tonelagem, carga sRPE, aderência e gráficos.
            </p>
            <Button onClick={save} disabled={saving} className="ml-auto">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar alterações
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
