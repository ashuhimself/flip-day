import { useEffect, useState } from 'react'

const ACTIVITY_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart'] as const

/** True after `timeout` ms without pointer or keyboard activity. */
export function useIdle(timeout: number): boolean {
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    let timer: number | undefined
    const wake = () => {
      setIdle(false)
      window.clearTimeout(timer)
      timer = window.setTimeout(() => setIdle(true), timeout)
    }

    wake()
    ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, wake, { passive: true }))
    return () => {
      window.clearTimeout(timer)
      ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, wake))
    }
  }, [timeout])

  return idle
}
