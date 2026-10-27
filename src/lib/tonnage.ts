// Tonelagem de força/LPO = Σ (séries × reps × carga) sobre exercícios com carga > 0
// reps pode ser "10", "8/perna", "45s", "20m" — usa o inteiro inicial.

export function parseReps(reps: string | null | undefined): number {
  if (!reps) return 0
  const m = reps.match(/\d+/)
  return m ? parseInt(m[0], 10) : 0
}

export function tonnageOf(
  exercises: { setsPrescribed?: number | null; repsPrescribed?: string | null; loadPrescribedKg?: number | null }[],
): number {
  return Math.round(
    exercises.reduce((acc, e) => {
      const load = e.loadPrescribedKg ?? 0
      if (!load) return acc
      return acc + (e.setsPrescribed ?? 0) * parseReps(e.repsPrescribed) * load
    }, 0),
  )
}

export function tonnageOfActual(
  exercises: {
    setsPrescribed?: number | null
    repsPrescribed?: string | null
    loadPrescribedKg?: number | null
    setsActual?: number | null
    repsActual?: string | null
    loadActualKg?: number | null
  }[],
): number | null {
  const hasAny = exercises.some((e) => e.setsActual != null || e.repsActual != null || e.loadActualKg != null)
  if (!hasAny) return null
  return Math.round(
    exercises.reduce((acc, e) => {
      const load = e.loadActualKg ?? e.loadPrescribedKg ?? 0
      if (!load) return acc
      return acc + (e.setsActual ?? e.setsPrescribed ?? 0) * parseReps(e.repsActual ?? e.repsPrescribed) * load
    }, 0),
  )
}
