import { useCallback, useEffect, useState } from 'react'
import { STORAGE_KEYS, readJSON, writeJSON } from '../lib/storage'
import { localePrefers12Hour } from '../lib/time'
import { DEFAULT_ZONE, LOCAL_ZONE, sanitizeZones } from '../lib/timezones'

export interface Settings {
  hour12: boolean
  showSeconds: boolean
  showDate: boolean
  /** 1–3 zone ids. The first drives the main clock, the date and timeboxes. */
  timeZones: string[]
  /** Set once the user picks zones themselves; until then the main clock follows their own time. */
  zonesChosen: boolean
  /** Desktop notifications for blocks and Pomodoro sessions. */
  notifications: boolean
}

function loadSettings(): Settings {
  const defaults: Settings = {
    hour12: localePrefers12Hour(),
    showSeconds: false,
    showDate: true,
    timeZones: [LOCAL_ZONE.id],
    zonesChosen: false,
    notifications: false,
  }
  const stored = readJSON<Partial<Settings>>(STORAGE_KEYS.settings, {})
  // Earlier versions saved India as the default without a flag; treat anything else as a real choice.
  const legacyDefault = stored.timeZones?.length === 1 && stored.timeZones[0] === DEFAULT_ZONE
  const chosen = !!stored.zonesChosen || (Array.isArray(stored.timeZones) && !legacyDefault)
  return {
    ...defaults,
    ...stored,
    zonesChosen: chosen,
    timeZones: chosen ? sanitizeZones(stored.timeZones) : defaults.timeZones,
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  useEffect(() => writeJSON(STORAGE_KEYS.settings, settings), [settings])

  const update = useCallback(<K extends keyof Settings>(key: K, value: Settings[K]) => {
    setSettings((s) => ({ ...s, [key]: value, ...(key === 'timeZones' && { zonesChosen: true }) }))
  }, [])

  return [settings, update] as const
}
