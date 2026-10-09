// Daily numbers for the summary panel, read straight from saved data.

import { STORAGE_KEYS, readJSON, writeJSON } from './storage'
import { toDateKey } from './time'

/** End times of finished focus sessions, keyed by local date. */
type FocusLog = Record<string, number[]>

const RETENTION_DAYS = 90
const FOCUS_MINUTES = 25

/** Record a finished focus session. Safe to call twice for the same session. */
export function logFocusSession(endsAt: number) {
  const log = readJSON<FocusLog>(STORAGE_KEYS.focusLog, {})
  const key = toDateKey(new Date(endsAt))
  const day = Array.isArray(log[key]) ? log[key] : []
  if (day.includes(endsAt)) return
  log[key] = [...day, endsAt]

  const cutoff = toDateKey(new Date(endsAt - RETENTION_DAYS * 86_400_000))
  for (const k of Object.keys(log)) if (k < cutoff) delete log[k]
  writeJSON(STORAGE_KEYS.focusLog, log)
}

export interface DayStats {
  dateKey: string
  tasksDone: number
  tasksTotal: number
  blocksDone: number
  blocksPlanned: number
  focusMinutes: number
}

interface Stored {
  completed?: boolean
  done?: boolean
}

function dayStats(dateKey: string, todos: Record<string, Stored[]>, boxes: Record<string, Stored[]>, focus: FocusLog): DayStats {
  const t = Array.isArray(todos[dateKey]) ? todos[dateKey] : []
  const b = Array.isArray(boxes[dateKey]) ? boxes[dateKey] : []
  const f = Array.isArray(focus[dateKey]) ? focus[dateKey] : []
  return {
    dateKey,
    tasksDone: t.filter((x) => x?.completed).length,
    tasksTotal: t.length,
    blocksDone: b.filter((x) => x?.done).length,
    blocksPlanned: b.length,
    focusMinutes: f.length * FOCUS_MINUTES,
  }
}

const active = (d: DayStats) => d.tasksDone > 0 || d.blocksDone > 0 || d.focusMinutes > 0

function shiftKey(dateKey: string, days: number): string {
  const d = new Date(`${dateKey}T12:00:00`)
  d.setDate(d.getDate() + days)
  return toDateKey(d)
}

/**
 * The last `days` days ending today (oldest first), and the streak of days in a
 * row with something finished. A day with nothing yet doesn't break it until it's over.
 */
export function readStats(todayKey: string, days = 7) {
  const todos = readJSON<Record<string, Stored[]>>(STORAGE_KEYS.todos, {})
  const boxes = readJSON<Record<string, Stored[]>>(STORAGE_KEYS.timeboxes, {})
  const focus = readJSON<FocusLog>(STORAGE_KEYS.focusLog, {})
  const at = (key: string) => dayStats(key, todos, boxes, focus)

  const week = Array.from({ length: days }, (_, i) => at(shiftKey(todayKey, i - days + 1)))

  let streak = 0
  let key = active(at(todayKey)) ? todayKey : shiftKey(todayKey, -1)
  while (streak < RETENTION_DAYS && active(at(key))) {
    streak++
    key = shiftKey(key, -1)
  }
  return { today: week[week.length - 1], week, streak }
}
