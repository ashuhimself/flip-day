import { ChartColumn, Flame } from 'lucide-react'
import { readStats, type DayStats } from '../lib/stats'
import ToolPopover from './ToolPopover'

interface SummaryProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Today's local date, e.g. "2026-10-10". */
  todayKey: string
}

const weekday = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' })
const longDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
const dateOf = (key: string) => new Date(`${key}T12:00:00`)

const minutes = (m: number) => (m < 60 ? `${m}m` : `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ''}`)

function describe(d: DayStats) {
  return `${longDay.format(dateOf(d.dateKey))}: ${minutes(d.focusMinutes)} Pomodoro, ${d.tasksDone} tasks done, ${d.blocksDone} timeboxes done`
}

/** Today's numbers, the last seven days of focus, and the streak of days with something finished. */
export default function Summary({ open, onOpenChange, todayKey }: SummaryProps) {
  // Read fresh each time it opens; nothing here needs to update live.
  const stats = open ? readStats(todayKey) : null

  return (
    <ToolPopover
      open={open}
      onOpenChange={onOpenChange}
      label="Today’s summary"
      title="Summary"
      icon={<ChartColumn size={18} strokeWidth={1.75} />}
      placement="bottom"
      className="summary"
    >
      {stats && <SummaryBody {...stats} />}
    </ToolPopover>
  )
}

function SummaryBody({ today, week, streak }: ReturnType<typeof readStats>) {
  const peak = Math.max(50, ...week.map((d) => d.focusMinutes))

  return (
    <>
      <header className="panel-header">
        <h2 className="todo-eyebrow">Today</h2>
        <span className="summary-streak" data-on={streak > 0}>
          <Flame size={13} strokeWidth={2} aria-hidden="true" />
          {streak > 0 ? `${streak}-day streak` : 'No streak yet'}
        </span>
      </header>

      <dl className="summary-stats">
        <div>
          <dt title="Tasks done / added">Tasks</dt>
          <dd>
            {today.tasksDone}
            <span>/{today.tasksTotal}</span>
          </dd>
        </div>
        <div>
          <dt title="Timeboxes marked done / planned">Timeboxes</dt>
          <dd>
            {today.blocksDone}
            <span>/{today.blocksPlanned}</span>
          </dd>
        </div>
        <div>
          <dt title="Time in finished Pomodoro focus sessions">Pomodoro</dt>
          <dd>{minutes(today.focusMinutes)}</dd>
        </div>
      </dl>

      <p className="settings-label summary-chart-title">Pomodoro, last 7 days</p>
      <div className="summary-chart" aria-hidden="true">
        {week.map((d) => (
          <div key={d.dateKey} className="summary-day" data-today={d === today} title={describe(d)}>
            <span className="summary-day__bar" style={{ height: `${(d.focusMinutes / peak) * 100}%` }} />
            <span className="summary-day__label">{weekday.format(dateOf(d.dateKey))}</span>
          </div>
        ))}
      </div>
      <table className="sr-only">
        <caption>Last 7 days</caption>
        <tbody>
          {week.map((d) => (
            <tr key={d.dateKey}>
              <td>{describe(d)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
