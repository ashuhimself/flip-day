import { useCallback, useEffect, useState } from 'react'
import { playChime } from '../lib/chime'
import { notify } from '../lib/notify'

export interface Alarm {
  title: string
  body?: string
  /** Distinguishes two alarms with the same text. */
  at: number
}

const REPEAT_MS = 3500
const RING_FOR_MS = 60_000

/** An alarm that rings every few seconds for up to a minute, until stopped. */
export function useAlarm() {
  const [alarm, setAlarm] = useState<Alarm | null>(null)

  useEffect(() => {
    if (!alarm) return
    playChime()
    const repeat = window.setInterval(playChime, REPEAT_MS)
    const quiet = window.setTimeout(() => window.clearInterval(repeat), RING_FOR_MS)
    return () => {
      window.clearInterval(repeat)
      window.clearTimeout(quiet)
    }
  }, [alarm])

  const ring = useCallback((title: string, body?: string) => {
    setAlarm({ title, body, at: Date.now() })
    notify(title, body)
  }, [])

  const stop = useCallback(() => setAlarm(null), [])

  return { alarm, ring, stop }
}
