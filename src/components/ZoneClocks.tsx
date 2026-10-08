import { formatShortDate } from '../lib/time'
import { formatOffset, tzOf, zoneById, zoneOffset } from '../lib/timezones'
import FlipClock from './FlipClock'

interface ZoneClocksProps {
  now: Date
  hour12: boolean
  showSeconds: boolean
  /** The main clock's IANA zone; offsets and day labels are relative to it. */
  primary: string
  /** Saved place ids (see ZONES). */
  zones: string[]
}

/** Smaller flip clocks for the extra time zones, under the main clock. */
export default function ZoneClocks({ now, hour12, showSeconds, primary, zones }: ZoneClocksProps) {
  if (!zones.length) return null
  const primaryOffset = zoneOffset(now, primary)

  return (
    <div className="zone-clocks">
      {zones.map((id) => {
        const zone = zoneById(id)
        const tz = tzOf(id)
        const offset = zoneOffset(now, tz) - primaryOffset
        return (
          <figure key={id} className="zone-clock">
            <div className="clock-wrap zone-clock__face" data-seconds={showSeconds || undefined}>
              <FlipClock now={now} hour12={hour12} showSeconds={showSeconds} timeZone={tz} />
            </div>
            <figcaption className="zone-clock__label">
              <span className="zone-clock__city">{zone?.city ?? id}</span>
              <span className="zone-clock__meta">
                {formatShortDate(now, tz)} · {formatOffset(offset)}
              </span>
            </figcaption>
          </figure>
        )
      })}
    </div>
  )
}
