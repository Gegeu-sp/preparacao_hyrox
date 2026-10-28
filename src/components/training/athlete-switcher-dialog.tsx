'use client'

import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  UserPlus,
  Users,
  SlidersHorizontal,
  HeartPulse,
  Dumbbell,
  Loader2,
  Sparkles,
  UserCheck,
} from 'lucide-react'
import { DIVISION_META } from '@/lib/constants'
import type { AthleteDTO, AthleteSummaryDTO, HyroxDivision } from '@/lib/types'

export function AthleteSwitcherDialog({
  athletes,
  activeAthlete,
  onSelectAthlete,
  onAthletesChanged,
}: {
  athletes: AthleteSummaryDTO[]
  activeAthlete: AthleteDTO
  onSelectAthlete: (athleteId: string) => void
  onAthletesChanged: (selectId?: string) => void
}) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [formTab, setFormTab] = useState('perfil')
  const [saving, setSaving] = useState(false)

  // Campos do formulário
  const [name, setName] = useState('')
  const [gender, setGender] = useState<'M' | 'F'>('M')
  const [division, setDivision] = useState<HyroxDivision>('OPEN_M')
  const [ageGroup, setAgeGroup] = useState('25-29')
  const [birthDate, setBirthDate] = useState('1998-05-15')
  const [heightCm, setHeightCm] = useState('175')
  const [weightKg, setWeightKg] = useState('74')
  const [bodyFatPct, setBodyFatPct] = useState('13')
  const [raceName, setRaceName] = useState('HYROX — 8/9 Maio 2027')
  const [raceDate, setRaceDate] = useState('2027-05-08')
  const [goalMin, setGoalMin] = useState('72')

  // Bateria de testes cardiorrespiratórios
  const [restingHr, setRestingHr] = useState('54')
  const [maxHr, setMaxHr] = useState('196')
  const [vo2max, setVo2max] = useState('46.5')
  const [vdot, setVdot] = useState('45')
  const [vt1SpeedKmh, setVt1SpeedKmh] = useState('9.8')
  const [vt2SpeedKmh, setVt2SpeedKmh] = useState('11.6')
  const [fiveKmPbSec, setFiveKmPbSec] = useState('1480')

  // Bateria de testes de força (3RM), potência e ergômetros
  const [squat3rmKg, setSquat3rmKg] = useState('90')
  const [deadlift3rmKg, setDeadlift3rmKg] = useState('120')
  const [bench3rmKg, setBench3rmKg] = useState('65')
  const [cmjCm, setCmjCm] = useState('39')
  const [skiErg1kTtSec, setSkiErg1kTtSec] = useState('255')
  const [row500mTtSec, setRow500mTtSec] = useState('110')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!dialogOpen) return
    if (mode === 'edit' && activeAthlete) {
      setName(activeAthlete.name)
      setGender(activeAthlete.gender)
      setDivision(activeAthlete.division)
      setAgeGroup(activeAthlete.ageGroup)
      setBirthDate(activeAthlete.birthDate.slice(0, 10))
      setHeightCm(String(activeAthlete.heightCm))
      setWeightKg(String(activeAthlete.weightKg))
      setBodyFatPct(String(activeAthlete.bodyFatPct))
      setRaceName(activeAthlete.raceName)
      setRaceDate(activeAthlete.raceDate.slice(0, 10))
      setGoalMin(activeAthlete.goalRaceTime ? String(Math.round(activeAthlete.goalRaceTime / 60)) : '72')
      setRestingHr(activeAthlete.restingHr != null ? String(activeAthlete.restingHr) : '')
      setMaxHr(activeAthlete.maxHr != null ? String(activeAthlete.maxHr) : '')
      setVo2max(activeAthlete.vo2max != null ? String(activeAthlete.vo2max) : '')
      setVdot(activeAthlete.vdot != null ? String(activeAthlete.vdot) : '')
      setVt1SpeedKmh(activeAthlete.vt1SpeedKmh != null ? String(activeAthlete.vt1SpeedKmh) : '')
      setVt2SpeedKmh(activeAthlete.vt2SpeedKmh != null ? String(activeAthlete.vt2SpeedKmh) : '')
      setFiveKmPbSec(activeAthlete.fiveKmPbSec != null ? String(activeAthlete.fiveKmPbSec) : '')
      setSquat3rmKg(activeAthlete.squat3rmKg != null ? String(activeAthlete.squat3rmKg) : '')
      setDeadlift3rmKg(activeAthlete.deadlift3rmKg != null ? String(activeAthlete.deadlift3rmKg) : '')
      setBench3rmKg(activeAthlete.bench3rmKg != null ? String(activeAthlete.bench3rmKg) : '')
      setCmjCm(activeAthlete.cmjCm != null ? String(activeAthlete.cmjCm) : '')
      setSkiErg1kTtSec(activeAthlete.skiErg1kTtSec != null ? String(activeAthlete.skiErg1kTtSec) : '')
      setRow500mTtSec(activeAthlete.row500mTtSec != null ? String(activeAthlete.row500mTtSec) : '')
      setNotes(activeAthlete.notes ?? '')
    } else {
      setName('')
      setGender('M')
      setDivision('OPEN_M')
      setAgeGroup('25-29')
      setBirthDate('1998-05-15')
      setHeightCm('175')
      setWeightKg('74')
      setBodyFatPct('13')
      setRaceName('HYROX — 8/9 Maio 2027')
      setRaceDate('2027-05-08')
      setGoalMin('75')
      setRestingHr('54')
      setMaxHr('196')
      setVo2max('46.0')
      setVdot('45')
      setVt1SpeedKmh('9.8')
      setVt2SpeedKmh('11.6')
      setFiveKmPbSec('1480')
      setSquat3rmKg('90')
      setDeadlift3rmKg('120')
      setBench3rmKg('65')
      setCmjCm('38')
      setSkiErg1kTtSec('258')
      setRow500mTtSec('112')
      setNotes('Periodização individualizada gerada a partir da bateria de testes diagnósticos.')
    }
  }, [dialogOpen, mode, activeAthlete])

  function applySmartEstimation() {
    const wt = Number(weightKg) || 70
    const pb5k = Number(fiveKmPbSec) || 1500
    const isFem = gender === 'F' || division.endsWith('_F')
    const v5k = 18000 / pb5k
    const estVt2 = Math.round(v5k * 0.93 * 10) / 10
    const estVt1 = Math.round(estVt2 * 0.84 * 10) / 10
    const estVo2 = Math.round((v5k * 3.5 + 3.5) * 10) / 10

    setVt1SpeedKmh(String(estVt1))
    setVt2SpeedKmh(String(estVt2))
    setVo2max(String(estVo2))
    setVdot(String(Math.round(estVo2 - 1)))
    setSquat3rmKg(String(Math.round((wt * (isFem ? 1.05 : 1.25)) / 2.5) * 2.5))
    setDeadlift3rmKg(String(Math.round((wt * (isFem ? 1.35 : 1.65)) / 2.5) * 2.5))
    setBench3rmKg(String(Math.round((wt * (isFem ? 0.65 : 0.92)) / 2.5) * 2.5))
    setSkiErg1kTtSec(String(isFem ? 268 : 248))
    setRow500mTtSec(String(isFem ? 118 : 108))
    toast.info('Parâmetros estimados automaticamente pelo PB 5km e peso corporal!')
  }

  async function handleSubmit() {
    if (!name.trim() || name.trim().length < 2) {
      toast.error('Informe o nome completo do atleta (mínimo 2 caracteres).')
      setFormTab('perfil')
      return
    }

    const num = (v: string) => (v !== '' && !Number.isNaN(Number(v)) ? Number(v) : null)
    const vt1 = num(vt1SpeedKmh)
    const vt2 = num(vt2SpeedKmh)
    if (vt1 != null && vt2 != null && vt2 <= vt1) {
      toast.error('A velocidade de VT2 (limiar anaeróbico) deve ser maior que VT1.')
      setFormTab('cardio')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: name.trim(),
        gender,
        division,
        ageGroup,
        birthDate,
        heightCm: Number(heightCm) || 175,
        weightKg: Number(weightKg) || 74,
        bodyFatPct: Number(bodyFatPct) || 13,
        raceName: raceName.trim() || 'HYROX — 8/9 Maio 2027',
        raceDate,
        restingHr: num(restingHr),
        maxHr: num(maxHr),
        vo2max: num(vo2max),
        vdot: num(vdot),
        vt1SpeedKmh: vt1,
        vt2SpeedKmh: vt2,
        fiveKmPbSec: num(fiveKmPbSec),
        squat3rmKg: num(squat3rmKg),
        deadlift3rmKg: num(deadlift3rmKg),
        bench3rmKg: num(bench3rmKg),
        cmjCm: num(cmjCm),
        skiErg1kTtSec: num(skiErg1kTtSec),
        row500mTtSec: num(row500mTtSec),
        goalRaceTime: (Number(goalMin) || 75) * 60,
        notes: notes.trim() || null,
        recalibrateFutureSessions: true,
      }

      if (mode === 'create') {
        const res = await fetch('/api/athletes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar atleta')
        toast.success(
          `Atleta ${data.athlete.name} cadastrado! ${data.generatedWeeks} semanas e ${data.generatedSessions} sessões calibradas com sucesso.`,
        )
        setDialogOpen(false)
        onAthletesChanged(data.athlete.id)
      } else {
        const res = await fetch(`/api/athletes/${activeAthlete.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Erro ao recalibrar atleta')
        toast.success(
          `Testes atualizados! ${data.recalibratedSessions} sessões futuras recalibradas na periodização.`,
        )
        setDialogOpen(false)
        onAthletesChanged(activeAthlete.id)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Falha ao salvar atleta')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {/* Seletor rápido de atleta ativo */}
      <Select value={activeAthlete.id} onValueChange={onSelectAthlete}>
        <SelectTrigger className="h-8 w-[195px] border-primary/30 bg-card/80 text-xs font-semibold sm:w-[230px]">
          <div className="flex items-center gap-1.5 truncate">
            <Users className="size-3.5 shrink-0 text-primary" />
            <SelectValue placeholder="Selecionar atleta" />
          </div>
        </SelectTrigger>
        <SelectContent>
          {athletes.map((a) => (
            <SelectItem key={a.id} value={a.id} className="text-xs">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{a.name}</span>
                <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
                  {DIVISION_META[a.division]?.short ?? a.division}
                </Badge>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Botão para recalibrar testes do atleta ativo */}
      <Button
        variant="outline"
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => {
          setMode('edit')
          setFormTab('cardio')
          setDialogOpen(true)
        }}
      >
        <SlidersHorizontal className="size-3.5 text-primary" />
        <span className="hidden md:inline">Testes & Zonas</span>
      </Button>

      {/* Botão para cadastrar novo atleta com periodização própria */}
      <Button
        size="sm"
        className="h-8 gap-1.5 text-xs"
        onClick={() => {
          setMode('create')
          setFormTab('perfil')
          setDialogOpen(true)
        }}
      >
        <UserPlus className="size-3.5" />
        <span>Novo Atleta</span>
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {mode === 'create' ? (
                <>
                  <UserPlus className="size-5 text-primary" /> Cadastrar Novo Atleta & Gerar Periodização
                </>
              ) : (
                <>
                  <UserCheck className="size-5 text-primary" /> Atualizar Bateria de Testes — {activeAthlete.name}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs">
              {mode === 'create'
                ? 'Preencha os dados biométricos e os resultados dos testes diagnósticos. O sistema gerará automaticamente os 7 mesociclos, 28 semanas e 196 sessões calibradas para este atleta.'
                : 'Atualize os resultados de re-teste (VT1/VT2, 3RM, Ski/Row TT) para recalibrar automaticamente as zonas Z1–Z5 e as cargas prescritas das sessões futuras.'}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={formTab} onValueChange={setFormTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="perfil" className="gap-1.5 text-xs">
                <Users className="size-3.5" /> 1. Perfil & Prova
              </TabsTrigger>
              <TabsTrigger value="cardio" className="gap-1.5 text-xs">
                <HeartPulse className="size-3.5" /> 2. Testes Corrida
              </TabsTrigger>
              <TabsTrigger value="forca" className="gap-1.5 text-xs">
                <Dumbbell className="size-3.5" /> 3. 3RM & Ergômetros
              </TabsTrigger>
            </TabsList>

            {/* ABA 1: PERFIL & PROVA */}
            <TabsContent value="perfil" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="ath-name">Nome completo do atleta *</Label>
                  <Input
                    id="ath-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex.: Carolina Mendes"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Sexo Biológico / Categoria</Label>
                  <Select
                    value={gender}
                    onValueChange={(v: 'M' | 'F') => {
                      setGender(v)
                      if (v === 'F' && division === 'OPEN_M') setDivision('OPEN_F')
                      if (v === 'M' && division === 'OPEN_F') setDivision('OPEN_M')
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino (M)</SelectItem>
                      <SelectItem value="F">Feminino (F)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label>Divisão Oficial HYROX (define pesos das estações)</Label>
                  <Select value={division} onValueChange={(v) => setDivision(v as HyroxDivision)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OPEN_M">Open Masculino (Sled 152/103 kg · WB 6 kg)</SelectItem>
                      <SelectItem value="OPEN_F">Open Feminino (Sled 102/78 kg · WB 4 kg)</SelectItem>
                      <SelectItem value="PRO_M">Pro Masculino (Sled 202/153 kg · WB 9 kg)</SelectItem>
                      <SelectItem value="PRO_F">Pro Feminino (Sled 152/103 kg · WB 6 kg)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ath-birth">Data de nascimento</Label>
                  <Input id="ath-birth" type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Faixa Etária (Age Group HYRESULT)</Label>
                  <Select value={ageGroup} onValueChange={setAgeGroup}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="16-24">16–24</SelectItem>
                      <SelectItem value="25-29">25–29</SelectItem>
                      <SelectItem value="30-34">30–34</SelectItem>
                      <SelectItem value="35-39">35–39</SelectItem>
                      <SelectItem value="40-44">40–44</SelectItem>
                      <SelectItem value="45-49">45–49</SelectItem>
                      <SelectItem value="50+">50+</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ath-h">Altura (cm)</Label>
                  <Input id="ath-h" type="number" value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ath-w">Peso corporal (kg)</Label>
                  <Input id="ath-w" type="number" step="0.1" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ath-bf">Gordura corporal (%)</Label>
                  <Input id="ath-bf" type="number" step="0.5" value={bodyFatPct} onChange={(e) => setBodyFatPct(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ath-goal">Meta de tempo final (minutos totais)</Label>
                  <Input
                    id="ath-goal"
                    type="number"
                    value={goalMin}
                    onChange={(e) => setGoalMin(e.target.value)}
                    placeholder="72 (1h12min)"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ath-rname">Competição-alvo</Label>
                  <Input id="ath-rname" value={raceName} onChange={(e) => setRaceName(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ath-rdate">Data da prova</Label>
                  <Input id="ath-rdate" type="date" value={raceDate} onChange={(e) => setRaceDate(e.target.value)} />
                </div>
              </div>
            </TabsContent>

            {/* ABA 2: TESTES CARDIORRESPIRATÓRIOS & CORRIDA */}
            <TabsContent value="cardio" className="mt-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 p-2.5 text-xs">
                <span className="text-muted-foreground">
                  Estes indicadores calibram automaticamente as <strong>Zonas Z1–Z5</strong> e os volumes semanais de corrida.
                </span>
                <Button type="button" variant="outline" size="sm" className="h-7 gap-1 text-xs" onClick={applySmartEstimation}>
                  <Sparkles className="size-3.5 text-primary" /> Estimar pelo PB 5km & Peso
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ath-pb5k">PB 5 km (segundos)</Label>
                  <Input
                    id="ath-pb5k"
                    type="number"
                    value={fiveKmPbSec}
                    onChange={(e) => setFiveKmPbSec(e.target.value)}
                    placeholder="1440 (24:00)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ath-vt1">VT1 — Limiar Aeróbico (km/h)</Label>
                  <Input
                    id="ath-vt1"
                    type="number"
                    step="0.1"
                    value={vt1SpeedKmh}
                    onChange={(e) => setVt1SpeedKmh(e.target.value)}
                    placeholder="10.0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ath-vt2">VT2 — Limiar Anaeróbico (km/h)</Label>
                  <Input
                    id="ath-vt2"
                    type="number"
                    step="0.1"
                    value={vt2SpeedKmh}
                    onChange={(e) => setVt2SpeedKmh(e.target.value)}
                    placeholder="11.9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ath-vo2">VO₂max (mL/kg/min)</Label>
                  <Input
                    id="ath-vo2"
                    type="number"
                    step="0.1"
                    value={vo2max}
                    onChange={(e) => setVo2max(e.target.value)}
                    placeholder="47.2"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ath-vdot">VDOT (Daniels)</Label>
                  <Input id="ath-vdot" type="number" step="0.5" value={vdot} onChange={(e) => setVdot(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ath-maxhr">FC Máxima (bpm)</Label>
                  <Input id="ath-maxhr" type="number" value={maxHr} onChange={(e) => setMaxHr(e.target.value)} placeholder="201" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ath-rhr">FC Repouso (bpm)</Label>
                  <Input id="ath-rhr" type="number" value={restingHr} onChange={(e) => setRestingHr(e.target.value)} placeholder="52" />
                </div>
              </div>
            </TabsContent>

            {/* ABA 3: TESTES DE FORÇA (3RM), POTÊNCIA & ERGÔMETROS */}
            <TabsContent value="forca" className="mt-4 space-y-4">
              <p className="rounded-lg border bg-muted/40 p-2.5 text-xs text-muted-foreground">
                Os testes de <strong>3RM</strong> escalonam as cargas prescritas nos exercícios de musculação e LPO em todos os mesociclos (GPP1, GPP2, SPP1, SPP2, COMP e TAPER). Os testes de <strong>SkiErg e Remo</strong> calibram os splits-alvo das estações.
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ath-sq">Agachamento Livre 3RM (kg)</Label>
                  <Input id="ath-sq" type="number" step="2.5" value={squat3rmKg} onChange={(e) => setSquat3rmKg(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ath-dl">Levantamento Terra 3RM (kg)</Label>
                  <Input id="ath-dl" type="number" step="2.5" value={deadlift3rmKg} onChange={(e) => setDeadlift3rmKg(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ath-bp">Supino Reto 3RM (kg)</Label>
                  <Input id="ath-bp" type="number" step="2.5" value={bench3rmKg} onChange={(e) => setBench3rmKg(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ath-cmj">Salto Vertical CMJ (cm)</Label>
                  <Input id="ath-cmj" type="number" step="0.5" value={cmjCm} onChange={(e) => setCmjCm(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ath-ski">SkiErg 1.000m TT (segundos)</Label>
                  <Input
                    id="ath-ski"
                    type="number"
                    value={skiErg1kTtSec}
                    onChange={(e) => setSkiErg1kTtSec(e.target.value)}
                    placeholder="255 (4:15)"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ath-row">Rowing 500m TT (segundos)</Label>
                  <Input
                    id="ath-row"
                    type="number"
                    value={row500mTtSec}
                    onChange={(e) => setRow500mTtSec(e.target.value)}
                    placeholder="110 (1:50)"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ath-notes">Observações da Avaliação / Histórico</Label>
                <Textarea
                  id="ath-notes"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Observações biomecânicas, histórico de lesões ou foco individual na periodização…"
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between border-t pt-3">
            <div className="text-[11px] text-muted-foreground">
              Divisão selecionada: <strong>{DIVISION_META[division]?.label}</strong>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSubmit} disabled={saving} className="gap-1.5">
                {saving && <Loader2 className="size-4 animate-spin" />}
                {mode === 'create' ? 'Criar Atleta & Gerar 28 Semanas' : 'Salvar & Recalibrar Periodização'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

