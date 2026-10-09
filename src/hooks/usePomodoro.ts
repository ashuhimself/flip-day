import { useCallback, useEffect, useState } from 'react'
import { playChime, primeAudio } from '../lib/chime'
import { notify } from '../lib/notify'
import { logFocusSession } from '../lib/stats'
import { STORAGE_KEYS, readJSON, writeJSON } from '../lib/storage'

export type PomodoroMode = 'focus' | 'short' | 'long'
export type PomodoroStatus = 'idle' | 'running' | 'paused'

export const DURATIONS: Record<PomodoroMode, number> = {
  focus: 25 * 60_000,
  short: 5 * 60_000,
  long: 15 * 60_000,
}

/** Focus sessions before a long break. */
export const ROUNDS_PER_CYCLE = 4

interface PomodoroState {
  mode: PomodoroMode
  status: PomodoroStatus
  /** Time left while idle or paused. */
  remaining: number
  /** Wall-clock end while running, so throttled background tabs stay accurate. */
  endsAt: number | null
  /** Completed focus sessions. */
  rounds: number
}

const fresh = (mode: PomodoroMode, rounds: number): PomodoroState => ({
  mode,
  status: 'idle',
  remaining: DURATIONS[mode],
  endsAt: null,
  rounds,
})

/** The idle state that follows a finished session. */
function afterComplete(s: PomodoroState): PomodoroState {
  if (s.mode !== 'focus') return fresh('focus', s.rounds)
  const rounds = s.rounds + 1
  return fresh(rounds % ROUNDS_PER_CYCLE === 0 ? 'long' : 'short', rounds)
}

function load(): PomodoroState {
  const s = readJSON<Partial<PomodoroState>>(STORAGE_KEYS.pomodoro, {})
  if (!s.mode || !(s.mode in DURATIONS)) return fresh('focus', 0)
  const state: PomodoroState = {
    mode: s.mode,
    status: s.status === 'running' || s.status === 'paused' ? s.status : 'idle',
    remaining: typeof s.remaining === 'number' ? s.remaining : DURATIONS[s.mode],
    endsAt: typeof s.endsAt === 'number' ? s.endsAt : null,
    rounds: typeof s.rounds === 'number' ? s.rounds : 0,
  }
  if (state.status === 'running' && (state.endsAt == null || state.endsAt <= Date.now())) {
    // Finished while the page was closed.
    if (state.mode === 'focus' && state.endsAt != null) logFocusSession(state.endsAt)
    return afterComplete(state)
  }
  return state
}

export function usePomodoro() {
  const [state, setState] = useState(load)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => writeJSON(STORAGE_KEYS.pomodoro, state), [state])

  // Tick while running; finish the session when the end time passes.
  const { status, endsAt } = state
  useEffect(() => {
    if (status !== 'running' || endsAt == null) return
    const tick = () => {
      const t = Date.now()
      if (t >= endsAt) {
        playChime()
        setState((s) => {
          if (s.mode === 'focus') logFocusSession(endsAt)
          return afterComplete(s)
        })
        notify(state.mode === 'focus' ? 'Focus session done' : 'Break over', state.mode === 'focus' ? 'Time for a break.' : 'Ready to focus again?')
      } else setNow(t)
    }
    tick()
    const id = window.setInterval(tick, 250)
    return () => window.clearInterval(id)
  }, [status, endsAt, state.mode])

  const start = useCallback(() => {
    primeAudio()
    const t = Date.now()
    setNow(t)
    setState((s) => (s.status === 'running' ? s : { ...s, status: 'running', endsAt: t + s.remaining }))
  }, [])

  const pause = useCallback(() => {
    setState((s) =>
      s.status === 'running' && s.endsAt != null
        ? { ...s, status: 'paused', remaining: Math.max(0, s.endsAt - Date.now()), endsAt: null }
        : s,
    )
  }, [])

  /** Start a fresh focus session right away, whatever was set before. */
  const focus = useCallback(() => {
    primeAudio()
    const t = Date.now()
    setNow(t)
    setState((s) => ({ ...fresh('focus', s.rounds), status: 'running', endsAt: t + DURATIONS.focus }))
  }, [])

  const reset = useCallback(() => setState((s) => fresh(s.mode, s.rounds)), [])

  const setMode = useCallback((mode: PomodoroMode) => setState((s) => fresh(mode, s.rounds)), [])

  const remaining = state.status === 'running' && state.endsAt != null ? Math.max(0, state.endsAt - now) : state.remaining

  return {
    mode: state.mode,
    status: state.status,
    remaining,
    progress: 1 - remaining / DURATIONS[state.mode],
    roundsInCycle: state.rounds % ROUNDS_PER_CYCLE,
    start,
    pause,
    focus,
    reset,
    setMode,
  }
}

export type PomodoroTimer = ReturnType<typeof usePomodoro>

/** 1_499_000 → "24:59" (rounds up, so a fresh 25-minute timer reads 25:00). */
export function formatDuration(ms: number): string {
  const total = Math.ceil(ms / 1000)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}
