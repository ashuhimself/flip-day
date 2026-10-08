import { useCallback, useLayoutEffect, useState } from 'react'
import { STORAGE_KEYS, readJSON, writeJSON } from '../lib/storage'

export type Theme = 'light' | 'dark'

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark'

// index.html already resolved stored-or-system before first paint; start from that.
function initialTheme(): Theme {
  const stored = readJSON<unknown>(STORAGE_KEYS.theme, null)
  if (isTheme(stored)) return stored
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

/** Light/dark theme. Follows the system until the user picks one, which is then remembered. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme)

  useLayoutEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    const ink = getComputedStyle(root).getPropertyValue('--color-ink').trim()
    if (ink) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', ink)
  }, [theme])

  const toggle = useCallback(() => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark'
    writeJSON(STORAGE_KEYS.theme, next)
    setTheme(next)
  }, [theme])

  return [theme, toggle] as const
}
