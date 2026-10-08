import { useCallback, useEffect, useState } from 'react'
import { STORAGE_KEYS, readJSON, writeJSON } from '../lib/storage'

export interface Timebox {
  id: string
  title: string
  /** Minutes after midnight on the main clock. */
  start: number
  /** Length in minutes. */
  duration: number
  /** Marked finished by hand, possibly before its end time. */
  done?: boolean
}

/** Blocks that can be planned at once. Finish one before adding another. */
export const MAX_OPEN = 2

/** Not finished yet: not marked done and its end time is still ahead. */
export const isOpenBlock = (b: Timebox, minute: number) => !b.done && b.start + b.duration > minute

/** Blocks keyed by the main clock's calendar date, e.g. { "2026-10-08": Timebox[] }. */
type TimeboxStore = Record<string, Timebox[]>

const RETENTION_DAYS = 30
const DAY = 24 * 60

const readStore = () => readJSON<TimeboxStore>(STORAGE_KEYS.timeboxes, {})

function isTimebox(value: unknown): value is Timebox {
  const t = value as Timebox
  return (
    !!t &&
    typeof t.id === 'string' &&
    typeof t.title === 'string' &&
    Number.isFinite(t.start) &&
    Number.isFinite(t.duration)
  )
}

const byStart = (a: Timebox, b: Timebox) => a.start - b.start || a.duration - b.duration

function loadDay(dateKey: string): Timebox[] {
  const day = readStore()[dateKey]
  return Array.isArray(day) ? day.filter(isTimebox).sort(byStart) : []
}

function saveDay(dateKey: string, boxes: Timebox[]) {
  const store = readStore()
  if (boxes.length) store[dateKey] = boxes
  else delete store[dateKey]

  const cutoff = new Date(`${dateKey}T00:00:00`)
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)
  for (const key of Object.keys(store)) {
    if (new Date(`${key}T00:00:00`) < cutoff) delete store[key]
  }
  writeJSON(STORAGE_KEYS.timeboxes, store)
}

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

export interface TimeboxStatus {
  /** The block the clock is inside right now (the latest-starting one if they overlap). */
  current: Timebox | null
  next: Timebox | null
  /** Minutes left in the current block. */
  left: number
  /** 0–1 through the current block. */
  progress: number
}

/** Where `minute` (minutes after midnight) falls among the day's blocks. */
export function timeboxStatus(boxes: Timebox[], minute: number, second = 0): TimeboxStatus {
  const t = minute + second / 60
  let current: Timebox | null = null
  for (const b of boxes) if (!b.done && b.start <= t && t < b.start + b.duration) current = b
  const next = boxes.find((b) => !b.done && b.start > t) ?? null
  if (!current) return { current, next, left: 0, progress: 0 }
  const end = current.start + current.duration
  return { current, next, left: Math.ceil(end - t), progress: (t - current.start) / current.duration }
}

/**
 * Today's timeboxes on the main clock. Like todos, each day starts empty;
 * blocks never run past midnight.
 */
export function useTimeboxes(dateKey: string) {
  const [state, setState] = useState(() => ({ dateKey, boxes: loadDay(dateKey) }))

  if (state.dateKey !== dateKey) {
    setState({ dateKey, boxes: loadDay(dateKey) })
  }

  useEffect(() => saveDay(state.dateKey, state.boxes), [state])

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.timeboxes) setState({ dateKey, boxes: loadDay(dateKey) })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [dateKey])

  const add = useCallback((title: string, start: number, duration: number) => {
    const trimmed = title.trim()
    const s = Math.max(0, Math.min(DAY - 1, Math.round(start)))
    const d = Math.max(1, Math.min(DAY - s, Math.round(duration)))
    if (!trimmed) return
    setState((st) => ({
      ...st,
      boxes: [...st.boxes, { id: newId(), title: trimmed, start: s, duration: d }].sort(byStart),
    }))
  }, [])

  const remove = useCallback((id: string) => {
    setState((st) => ({ ...st, boxes: st.boxes.filter((b) => b.id !== id) }))
  }, [])

  const finish = useCallback((id: string) => {
    setState((st) => ({ ...st, boxes: st.boxes.map((b) => (b.id === id ? { ...b, done: true } : b)) }))
  }, [])

  return { boxes: state.dateKey === dateKey ? state.boxes : [], add, remove, finish }
}
