import { Fragment } from 'react'
import { getClockParts } from '../lib/time'
import { usePrefersReducedMotion } from '../hooks/useMediaQuery'
import ClockSeparator from './ClockSeparator'
import FlipDigit from './FlipDigit'

interface FlipClockProps {
  now: Date
  hour12: boolean
  showSeconds: boolean
  timeZone?: string
}

export default function FlipClock({ now, hour12, showSeconds, timeZone }: FlipClockProps) {
  const reducedMotion = usePrefersReducedMotion()
  const { hours, minutes, seconds, meridiem } = getClockParts(now, hour12, timeZone)
  const groups = showSeconds ? [hours, minutes, seconds] : [hours, minutes]

  const spoken = `${hours}:${minutes}${showSeconds ? `:${seconds}` : ''}${meridiem ? ` ${meridiem}` : ''}`

  return (
    <time
      className="flip-clock"
      dateTime={now.toISOString()}
      aria-label={`Current time ${spoken}`}
    >
      {groups.map((group, i) => (
        <Fragment key={i}>
          {i > 0 && <ClockSeparator />}
          <div className="flip-group">
            {i === 0 && meridiem && <span className="flip-meridiem">{meridiem}</span>}
            {[...group].map((digit, j) => (
              <FlipDigit key={j} value={digit} reducedMotion={reducedMotion} />
            ))}
          </div>
        </Fragment>
      ))}
    </time>
  )
}
