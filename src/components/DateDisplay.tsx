import { formatLongDate } from '../lib/time'

interface DateDisplayProps {
  now: Date
  visible: boolean
  timeZone?: string
  /** Shown after the date when several zones are on screen, e.g. "India". */
  place?: string
}

export default function DateDisplay({ now, visible, timeZone, place }: DateDisplayProps) {
  return (
    <p className="date-display" data-visible={visible} aria-hidden={!visible}>
      {formatLongDate(now, timeZone)}
      {place && <span className="date-display__place"> · {place}</span>}
    </p>
  )
}
