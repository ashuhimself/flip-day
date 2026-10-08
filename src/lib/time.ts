import { zonedParts } from './timezones'

const pad = (n: number) => String(n).padStart(2, '0')

/** Calendar date as YYYY-MM-DD, local by default or in `timeZone` (never UTC). */
export function toDateKey(date: Date, timeZone?: string): string {
  if (timeZone) {
    const p = zonedParts(date, timeZone)
    return `${p.year}-${pad(p.month)}-${pad(p.day)}`
  }
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Minutes since midnight, local by default or in `timeZone`. */
export function minuteOfDay(date: Date, timeZone?: string): number {
  if (timeZone) {
    const p = zonedParts(date, timeZone)
    return p.hour * 60 + p.minute
  }
  return date.getHours() * 60 + date.getMinutes()
}

/** 570 → "9:30 AM" (12-hour) or "09:30" (24-hour). 1440 reads as midnight. */
export function formatMinutes(minutes: number, hour12: boolean): string {
  const h = Math.floor(minutes / 60) % 24
  const m = pad(minutes % 60)
  return hour12 ? `${h % 12 || 12}:${m} ${h < 12 ? 'AM' : 'PM'}` : `${pad(h)}:${m}`
}

export interface ClockParts {
  hours: string
  minutes: string
  seconds: string
  meridiem: 'AM' | 'PM' | null
}

export function getClockParts(date: Date, hour12: boolean, timeZone?: string): ClockParts {
  const p = timeZone
    ? zonedParts(date, timeZone)
    : { hour: date.getHours(), minute: date.getMinutes(), second: date.getSeconds() }
  const h = p.hour
  const meridiem = hour12 ? (h < 12 ? 'AM' : 'PM') : null
  const displayHour = hour12 ? h % 12 || 12 : h
  return {
    hours: pad(displayHour),
    minutes: pad(p.minute),
    seconds: pad(p.second),
    meridiem,
  }
}

const longDate = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
const monthDay = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' })

/** "Tuesday, September 29" */
export const formatLongDate = (date: Date, timeZone?: string) =>
  timeZone
    ? new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric', timeZone }).format(date)
    : longDate.format(date)

/** "Wed, 7 Oct" (order follows the locale) */
export const formatShortDate = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', timeZone }).format(date)

/** "September 29" */
export const formatMonthDay = (date: Date) => monthDay.format(date)

/** Whether the user's locale prefers a 12-hour clock. */
export function localePrefers12Hour(): boolean {
  try {
    const { hourCycle, hour12 } = new Intl.DateTimeFormat(undefined, { hour: 'numeric' }).resolvedOptions()
    if (hourCycle) return hourCycle === 'h11' || hourCycle === 'h12'
    return Boolean(hour12)
  } catch {
    return false
  }
}
