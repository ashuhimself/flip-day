// Thin, failure-tolerant wrappers around localStorage. Private windows,
// blocked site data or a full quota must never break the clock.

export const STORAGE_KEYS = {
  todos: 'flipclock:todos:v1',
  settings: 'flipclock:settings:v1',
  panelOpen: 'flipclock:panel-open:v1',
  // Also read by the inline script in index.html to avoid a theme flash.
  theme: 'flipclock:theme:v1',
  pomodoro: 'flipclock:pomodoro:v1',
  music: 'flipclock:music:v1',
  popOut: 'flipclock:pop-out:v1',
  timeboxes: 'flipclock:timeboxes:v1',
} as const

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key)
    return raw == null ? fallback : (JSON.parse(raw) as T)
  } catch {
    return fallback
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage unavailable — the app keeps working in memory.
  }
}
