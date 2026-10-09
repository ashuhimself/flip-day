import { BellRing } from 'lucide-react'
import type { Alarm } from '../hooks/useAlarm'

/** Shown while an alarm rings: what ended, and a button to stop it. */
export default function AlarmBanner({ alarm, onStop }: { alarm: Alarm | null; onStop: () => void }) {
  if (!alarm) return null
  return (
    <div key={alarm.at} className="alarm glass" role="alert">
      <BellRing size={18} strokeWidth={1.75} aria-hidden="true" className="alarm__icon" />
      <p className="alarm__text">
        {alarm.title}
        {alarm.body && <span className="alarm__body">{alarm.body}</span>}
      </p>
      <button type="button" className="button button--primary alarm__stop" onClick={onStop}>
        Stop
      </button>
    </div>
  )
}
