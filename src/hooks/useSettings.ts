import { useCallback, useEffect, useState } from 'react'
import { STORAGE_KEYS, readJSON, writeJSON } from '../lib/storage'
import { localePrefers12Hour } from '../lib/time'
import { DEFAULT_ZONE, sanitizeZones } from '../lib/timezones'

export interface Settings {
  hour12: boolean
  showSeconds: boolean
  showDate: boolean
  /** 1–3 zone ids. The first drives the main clock, the date and timeboxes. */
  timeZones: string[]
}

function loadSettings(): Settings {
  const defaults: Settings = { hour12: localePrefers12Hour(), showSeconds: false, showDate: true, timeZones: [DEFAULT_ZONE] }
  const stored = readJSON<Partial<Settings>>(STORAGE_KEYS.settings, {})
  return { ...defaults, ...stored, timeZones: sanitizeZones(stored.timeZones ?? defaults.timeZones) }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  useEffect(() => writeJSON(STORAGE_KEYS.settings, settings), [settings])

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => ({ ...s, [key]: value }))
  }, [])

  return [settings, update] as const
}
