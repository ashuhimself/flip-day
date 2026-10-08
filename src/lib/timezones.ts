export interface Zone {
  /** Stable key saved in settings. The originals use their IANA name, so saved picks keep working. */
  id: string
  /** IANA time zone. Cities can share one (Atlanta and New York, Wellington and Auckland). */
  tz: string
  /** Short city label shown under a clock. */
  city: string
  /** Region label shown in settings. */
  region: string
}

/** The listed places: India, the US mainland, Australia and New Zealand. */
const LISTED: Zone[] = [
  { id: 'Asia/Kolkata', tz: 'Asia/Kolkata', city: 'India', region: 'IST' },
  { id: 'America/New_York', tz: 'America/New_York', city: 'New York', region: 'US Eastern' },
  { id: 'atlanta', tz: 'America/New_York', city: 'Atlanta', region: 'US Eastern' },
  { id: 'America/Chicago', tz: 'America/Chicago', city: 'Chicago', region: 'US Central' },
  { id: 'America/Denver', tz: 'America/Denver', city: 'Denver', region: 'US Mountain' },
  { id: 'America/Los_Angeles', tz: 'America/Los_Angeles', city: 'Los Angeles', region: 'US Pacific' },
  { id: 'Australia/Perth', tz: 'Australia/Perth', city: 'Perth', region: 'AU Western' },
  { id: 'Australia/Adelaide', tz: 'Australia/Adelaide', city: 'Adelaide', region: 'AU Central' },
  { id: 'Australia/Brisbane', tz: 'Australia/Brisbane', city: 'Brisbane', region: 'AU Queensland' },
  { id: 'Australia/Sydney', tz: 'Australia/Sydney', city: 'Sydney', region: 'AU Eastern' },
  { id: 'Pacific/Auckland', tz: 'Pacific/Auckland', city: 'Auckland', region: 'New Zealand' },
  { id: 'wellington', tz: 'Pacific/Auckland', city: 'Wellington', region: 'New Zealand' },
]

/** Fallback when the browser can't tell us its zone. */
export const DEFAULT_ZONE = 'Asia/Kolkata'
export const MAX_ZONES = 3

/** Old or alternative names some systems report, mapped to the listed zone. */
const ALIASES: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'US/Eastern': 'America/New_York',
  'US/Central': 'America/Chicago',
  'US/Mountain': 'America/Denver',
  'US/Pacific': 'America/Los_Angeles',
  'Australia/West': 'Australia/Perth',
  'Australia/South': 'Australia/Adelaide',
  'Australia/Queensland': 'Australia/Brisbane',
  'Australia/NSW': 'Australia/Sydney',
  'Australia/ACT': 'Australia/Sydney',
  'Australia/Canberra': 'Australia/Sydney',
  NZ: 'Pacific/Auckland',
}

/** The visitor's own IANA zone, as reported by the browser. */
function detectZone(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (!tz) return DEFAULT_ZONE
    new Intl.DateTimeFormat('en-US', { timeZone: tz }) // throws if the zone is unusable
    return ALIASES[tz] ?? tz
  } catch {
    return DEFAULT_ZONE
  }
}

/** "America/Argentina/Buenos_Aires" → "Buenos Aires" */
const cityFromTz = (tz: string) => tz.split('/').pop()!.replace(/_/g, ' ')

const localTz = detectZone()
const localListed = LISTED.find((z) => z.id === localTz)

/** The visitor's zone: a listed place when it matches, otherwise their own city (added to the list). */
export const LOCAL_ZONE: Zone = localListed ?? { id: localTz, tz: localTz, city: cityFromTz(localTz), region: 'Your time' }

/** Every place the picker offers. A visitor outside the list sees their own city first. */
export const ZONES: Zone[] = localListed ? LISTED : [LOCAL_ZONE, ...LISTED]

export const zoneById = (id: string) => ZONES.find((z) => z.id === id)

/** IANA time zone for a saved place id. */
export const tzOf = (id: string) => zoneById(id)?.tz ?? DEFAULT_ZONE

/** Keeps only known zones, without duplicates, 1 to MAX_ZONES of them. */
export function sanitizeZones(value: unknown): string[] {
  const ids = Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string' && !!zoneById(v)) : []
  const unique = [...new Set(ids)].slice(0, MAX_ZONES)
  return unique.length ? unique : [LOCAL_ZONE.id]
}

export interface ZonedParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string) {
  let f = formatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
    })
    formatters.set(timeZone, f)
  }
  return f
}

/** Wall-clock fields of `date` as seen in `timeZone`. */
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const parts: Record<string, number> = {}
  for (const { type, value } of formatterFor(timeZone).formatToParts(date)) {
    if (type !== 'literal') parts[type] = Number(value)
  }
  return {
    year: parts.year,
    month: parts.month,
    day: parts.day,
    hour: parts.hour % 24,
    minute: parts.minute,
    second: parts.second,
  }
}

/** Offset of `timeZone` from UTC at `date`, in minutes. */
export function zoneOffset(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return Math.round((asUtc - Math.floor(date.getTime() / 1000) * 1000) / 60_000)
}

/** -570 → "−9h 30m", 450 → "+7h 30m", 0 → "Same time" */
export function formatOffset(minutes: number): string {
  if (minutes === 0) return 'Same time'
  const sign = minutes < 0 ? '−' : '+'
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  return `${sign}${h}h${m ? ` ${m}m` : ''}`
}
