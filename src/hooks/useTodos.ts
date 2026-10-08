import { useCallback, useEffect, useState } from 'react'
import { STORAGE_KEYS, readJSON, writeJSON } from '../lib/storage'

export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
}

/** Tasks keyed by local calendar date, e.g. { "2026-09-29": Todo[] }. */
type TodoStore = Record<string, Todo[]>

/** How long past days are kept locally before being pruned. */
const RETENTION_DAYS = 90

const readStore = () => readJSON<TodoStore>(STORAGE_KEYS.todos, {})

function isTodo(value: unknown): value is Todo {
  const t = value as Todo
  return !!t && typeof t.id === 'string' && typeof t.text === 'string' && typeof t.completed === 'boolean'
}

function loadDay(dateKey: string): Todo[] {
  const day = readStore()[dateKey]
  return Array.isArray(day) ? day.filter(isTodo) : []
}

function saveDay(dateKey: string, todos: Todo[]) {
  const store = readStore()
  if (todos.length) store[dateKey] = todos
  else delete store[dateKey]

  const cutoff = new Date(`${dateKey}T00:00:00`)
  cutoff.setDate(cutoff.getDate() - RETENTION_DAYS)
  for (const key of Object.keys(store)) {
    if (new Date(`${key}T00:00:00`) < cutoff) delete store[key]
  }
  writeJSON(STORAGE_KEYS.todos, store)
}

function newId(): string {
  // randomUUID only exists in secure contexts (not e.g. http://192.168.x.x).
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Today's todo list. Tasks belong to the local date they were created on;
 * when `dateKey` rolls over the list starts fresh and nothing carries forward.
 */
export function useTodos(dateKey: string) {
  const [state, setState] = useState(() => ({ dateKey, todos: loadDay(dateKey) }))

  // Date rolled over while the page was open: switch to the new day's list.
  if (state.dateKey !== dateKey) {
    setState({ dateKey, todos: loadDay(dateKey) })
  }

  // Persist. The list and the day it belongs to live in the same state object,
  // so a rollover can never write yesterday's tasks under today's key.
  useEffect(() => saveDay(state.dateKey, state.todos), [state])

  // Keep multiple open tabs in sync.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.todos) setState({ dateKey, todos: loadDay(dateKey) })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [dateKey])

  const mutate = useCallback((fn: (todos: Todo[]) => Todo[]) => {
    setState((s) => ({ ...s, todos: fn(s.todos) }))
  }, [])

  const add = useCallback(
    (text: string) => {
      const trimmed = text.trim()
      if (!trimmed) return
      mutate((todos) => [...todos, { id: newId(), text: trimmed, completed: false, createdAt: Date.now() }])
    },
    [mutate],
  )

  const toggle = useCallback(
    (id: string) => mutate((todos) => todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))),
    [mutate],
  )

  const edit = useCallback(
    (id: string, text: string) => {
      const trimmed = text.trim()
      mutate((todos) =>
        trimmed ? todos.map((t) => (t.id === id ? { ...t, text: trimmed } : t)) : todos.filter((t) => t.id !== id),
      )
    },
    [mutate],
  )

  const remove = useCallback((id: string) => mutate((todos) => todos.filter((t) => t.id !== id)), [mutate])

  return { todos: state.dateKey === dateKey ? state.todos : [], add, toggle, edit, remove }
}
