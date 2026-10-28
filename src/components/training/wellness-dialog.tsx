'use client'

// Registro diário de bem-estar (questionário tipo Hooper-Mackinnon simplificado) — Multi-Atleta
import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, HeartPulse } from 'lucide-react'
import type { WellnessDTO } from '@/lib/types'

const SCALES: { key: keyof WellnessDTO; label: string; low: string; high: string; dft: number }[] = [
  { key: 'sleepQuality', label: 'Qualidade do sono', low: 'péssimo', high: 'ótimo', dft: 4 },
  { key: 'soreness', label: 'Dor muscular (DOMS)', low: 'nenhuma', high: 'muito forte', dft: 2 },
  { key: 'fatigue', label: 'Fadiga percebida', low: 'descansado', high: 'exausto', dft: 2 },
  { key: 'stress', label: 'Estresse', low: 'calmo', high: 'muito estressado', dft: 2 },
  { key: 'motivation', label: 'Motivação', low: 'baixa', high: 'máxima', dft: 4 },
]

export function WellnessDialog({ open, onOpenChange, athleteId, initial, onSaved }: {
  open: boolean
  onOpenChange: (o: boolean) => void
  athleteId?: string
  initial: WellnessDTO | null
  onSaved: () => void
}) {
  const [scales, setScales] = useState<Record<string, number>>({})
  const [sleepHours, setSleepHours] = useState('')
  const [restingHr, setRestingHr] = useState('')
  const [hrv, setHrv] = useState('')
  const [weightKg, setWeightKg] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) {
      const s: Record<string, number> = {}
      SCALES.forEach(({ key, dft }) => { s[key as string] = (initial?.[key] as number | null) ?? dft })
      setScales(s)
      setSleepHours(initial?.sleepHours != null ? String(initial.sleepHours) : '')
      setRestingHr(initial?.restingHr != null ? String(initial.restingHr) : '')
      setHrv(initial?.hrv != null ? String(initial.hrv) : '')
      setWeightKg(initial?.weightKg != null ? String(initial.weightKg) : '')
      setNotes(initial?.notes ?? '')
    }
  }, [open, initial])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch('/api/wellness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          athleteId,
          date: initial?.date,
          sleepHours: sleepHours || null,
          sleepQuality: scales.sleepQuality,
          soreness: scales.soreness,
          fatigue: scales.fatigue,
          stress: scales.stress,
          motivation: scales.motivation,
          restingHr: restingHr || null,
          hrv: hrv || null,
          weightKg: weightKg || null,
          notes: notes || null,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Bem-estar registrado com sucesso.')
      onOpenChange(false)
      onSaved()
    } catch {
      toast.error('Não foi possível registrar o bem-estar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HeartPulse className="size-5 text-primary" /> Registro diário de bem-estar
          </DialogTitle>
          <DialogDescription>
            {initial?.date ? `Editando ${initial.date.split('-').reverse().join('/')}` : 'Registro de hoje'} · escalas de 1 a 5. Use todos os dias, de preferência antes do 1º treino.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {SCALES.map(({ key, label, low, high }) => (
            <div key={key as string} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm">{label}</Label>
                <span className="tnum text-sm font-semibold text-primary">{scales[key as string] ?? '—'}</span>
              </div>
              <Slider
                min={1} max={5} step={1}
                value={[scales[key as string] ?? 3]}
                onValueChange={([v]) => setScales((s) => ({ ...s, [key as string]: v }))}
              />
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>1 · {low}</span><span>5 · {high}</span>
              </div>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="sleep">Horas de sono</Label>
              <Input id="sleep" type="number" step="0.5" min="0" max="14" value={sleepHours} onChange={(e) => setSleepHours(e.target.value)} placeholder="7,5" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rhr">FC repouso (bpm)</Label>
              <Input id="rhr" type="number" min="30" max="110" value={restingHr} onChange={(e) => setRestingHr(e.target.value)} placeholder="52" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hrv">HRV — RMSSD (ms)</Label>
              <Input id="hrv" type="number" min="10" max="200" value={hrv} onChange={(e) => setHrv(e.target.value)} placeholder="65" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wt">Peso corporal (kg)</Label>
              <Input id="wt" type="number" step="0.1" min="35" max="160" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} placeholder="76,0" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="wnotes">Observações</Label>
            <Textarea id="wnotes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Sono interrompido, dor no quadríceps após sleds…" />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Salvar registro
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
