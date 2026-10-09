import { isOpenBlock, type Timebox } from '../hooks/useTimeboxes'
import { formatMinutes } from '../lib/time'

const DAY = 24 * 60

interface TimelineProps {
  boxes: Timebox[]
  /** Minutes after midnight on the main clock. */
  minute: number
  currentId: string | null
  hour12: boolean
  onOpen: () => void
}

/** A thin bar for the planned part of the day: each block, and a marker for now. */
export default function Timeline({ boxes, minute, currentId, hour12, onOpen }: TimelineProps) {
  if (!boxes.length) return null

  // From the hour before the first block (or now) to the hour after the last one.
  const first = Math.min(minute, ...boxes.map((b) => b.start))
  const last = Math.max(minute, ...boxes.map((b) => b.start + b.duration))
  const from = Math.max(0, Math.floor((first - 30) / 60) * 60)
  const to = Math.min(DAY, Math.ceil((last + 30) / 60) * 60)
  const pct = (m: number) => `${((m - from) / (to - from)) * 100}%`

  const range = (b: Timebox) => `${formatMinutes(b.start, hour12)} – ${formatMinutes(b.start + b.duration, hour12)}`

  return (
    <button type="button" className="timeline" onClick={onOpen} aria-label={`Today’s timeline, ${boxes.length} blocks. Open Timebox`}>
      <span className="timeline__track">
        {boxes.map((b) => (
          <span
            key={b.id}
            className="timeline__block"
            data-state={b.id === currentId ? 'now' : isOpenBlock(b, minute) ? 'upcoming' : 'done'}
            style={{ left: pct(b.start), width: pct(from + b.duration) }}
            title={`${b.title} · ${range(b)}`}
          />
        ))}
        <span className="timeline__now" style={{ left: pct(minute) }} title={`Now · ${formatMinutes(minute, hour12)}`} />
      </span>
      <span className="timeline__labels" aria-hidden="true">
        <span>{formatMinutes(from, hour12)}</span>
        <span>{formatMinutes(to, hour12)}</span>
      </span>
    </button>
  )
}
