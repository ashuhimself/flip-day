import { useEffect, useState } from 'react'

type Granularity = 'second' | 'minute'

const STEP: Record<Granularity, number> = { second: 1_000, minute: 60_000 }

/**
 * Current local time, re-rendering exactly on each second or minute boundary.
 *
 * A single self-rescheduling timeout is aligned to the wall clock (so it never
 * drifts), and the time is refreshed immediately when the tab becomes visible
 * again, since background tabs throttle timers.
 */
export function useNow(granularity: Granularity): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const step = STEP[granularity]
    let timer: number | undefined

    const tick = () => {
      const date = new Date()
      setNow(date)
      // Small slack keeps us from firing a hair before the boundary.
      const delay = step - (date.getTime() % step) + 15
      timer = window.setTimeout(tick, delay)
    }

    const resync = () => {
      if (document.visibilityState !== 'visible') return
      window.clearTimeout(timer)
      tick()
    }

    tick()
    document.addEventListener('visibilitychange', resync)
    window.addEventListener('focus', resync)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('visibilitychange', resync)
      window.removeEventListener('focus', resync)
    }
  }, [granularity])

  return now
}
