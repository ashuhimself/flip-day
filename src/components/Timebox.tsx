import { useEffect, useRef, useState } from 'react'
import { CalendarClock, Check, Plus, X } from 'lucide-react'
import { MAX_OPEN, isOpenBlock, type Timebox as TimeboxItem, type TimeboxStatus } from '../hooks/useTimeboxes'
import { playChime, primeAudio } from '../lib/chime'
import { formatMinutes } from '../lib/time'
import ToolPopover from './ToolPopover'

const DURATIONS = [15, 30, 45, 60, 90]
const DAY = 24 * 60

interface TimeboxProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  boxes: TimeboxItem[]
  status: TimeboxStatus
  /** Minutes after midnight on the main clock. */
  minute: number
  hour12: boolean
  /** Which clock the times belong to, shown when several zones are on screen. */
  zoneLabel?: string
  onAdd: (title: string, start: number, duration: number) => void
  onRemove: (id: string) => void
  onFinish: (id: string) => void
}

/** 42 → "42m", 95 → "1h 35m" */
export function formatLeft(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const m = minutes % 60
  return `${Math.floor(minutes / 60)}h${m ? ` ${String(m).padStart(2, '0')}m` : ''}`
}

const toInput = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`

function fromInput(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(value)
  if (!match) return null
  const minutes = Number(match[1]) * 60 + Number(match[2])
  return minutes < DAY ? minutes : null
}

/** Next free start: after the last block still running or ahead, else now rounded up to 5 minutes. */
function suggestStart(boxes: TimeboxItem[], minute: number): number {
  const roundedNow = Math.ceil(minute / 5) * 5
  const busyUntil = boxes.reduce((end, b) => Math.max(end, isOpenBlock(b, minute) ? b.start + b.duration : 0), 0)
  return Math.min(DAY - 5, Math.max(roundedNow, busyUntil))
}

/** Plan the day in fixed blocks on the main clock; chimes as each block starts and ends. */
export default function Timebox({
  open,
  onOpenChange,
  boxes,
  status,
  minute,
  hour12,
  zoneLabel,
  onAdd,
  onRemove,
  onFinish,
}: TimeboxProps) {
  const [title, setTitle] = useState('')
  const [start, setStart] = useState(() => toInput(suggestStart(boxes, minute)))
  const [duration, setDuration] = useState(30)
  // Bumped on each blocked add, to replay the warning's shake.
  const [attempts, setAttempts] = useState(0)
  const titleRef = useRef<HTMLInputElement>(null)

  // Fresh suggestion each time the panel opens.
  useEffect(() => {
    if (!open) return
    primeAudio()
    setStart(toInput(suggestStart(boxes, minute)))
    if (window.matchMedia('(pointer: fine)').matches) titleRef.current?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Chime when the clock moves into or out of a block (not when one is added or deleted).
  const currentId = status.current?.id ?? null
  const prev = useRef({ id: currentId, minute })
  useEffect(() => {
    const p = prev.current
    if (p.id !== currentId && p.minute !== minute) playChime()
    prev.current = { id: currentId, minute }
  }, [currentId, minute])

  const startMinutes = fromInput(start)
  const end = startMinutes == null ? null : Math.min(DAY, startMinutes + duration)
  const overlap =
    startMinutes == null || end == null
      ? undefined
      : boxes.find((b) => !b.done && b.start < end && startMinutes < b.start + b.duration)

  const openBlocks = boxes.filter((b) => isOpenBlock(b, minute))
  const full = openBlocks.length >= MAX_OPEN

  const submit = () => {
    if (full) {
      setAttempts((n) => n + 1)
      return
    }
    if (!title.trim() || startMinutes == null) return
    primeAudio()
    onAdd(title, startMinutes, duration)
    setTitle('')
    const nextStart = Math.min(DAY - 5, startMinutes + duration)
    setStart(toInput(Math.max(nextStart, suggestStart(boxes, minute))))
    titleRef.current?.focus({ preventScroll: true })
  }

  const { current, left } = status

  return (
    <ToolPopover
      open={open}
      onOpenChange={onOpenChange}
      label={current ? `Timebox, ${current.title}, ${formatLeft(left)} left` : 'Timebox'}
      title="Timebox"
      icon={<CalendarClock size={18} strokeWidth={1.75} />}
      indicator={current && <span className="tool-indicator">{formatLeft(left)}</span>}
      placement="bottom"
      className="timebox"
    >
      <header className="panel-header">
        <h2 className="todo-eyebrow">Timebox</h2>
        {zoneLabel && <span className="timebox-zone">{zoneLabel} time</span>}
      </header>

      <form
        className="timebox-form"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <div className="todo-input timebox-title">
          <Plus size={16} strokeWidth={1.75} aria-hidden="true" className="todo-input__icon" />
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What will you work on?"
            aria-label="Block title"
            maxLength={80}
            autoComplete="off"
            enterKeyHint="done"
          />
        </div>

        <div className="timebox-when">
          <label className="timebox-start">
            <span className="settings-label">Start</span>
            <input type="time" value={start} step={300} onChange={(e) => setStart(e.target.value)} required />
          </label>
          <div className="segmented timebox-durations" role="radiogroup" aria-label="Length">
            {DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={duration === d}
                className="segmented__option"
                onClick={() => setDuration(d)}
              >
                {d < 60 ? `${d}m` : `${d / 60}h`.replace('1.5h', '1½h')}
              </button>
            ))}
          </div>
        </div>

        {full && (
          <p key={attempts} className="timebox-limit" data-shake={attempts > 0 || undefined} role="alert">
            You can plan {MAX_OPEN} blocks at a time. Finish{' '}
            {openBlocks.map((b, i) => (
              <span key={b.id}>
                {i > 0 && ' or '}“{b.title}”
              </span>
            ))}{' '}
            first.
          </p>
        )}

        <p className="timebox-hint" data-warn={!!overlap || undefined} hidden={full}>
          {startMinutes == null || end == null
            ? 'Pick a start time.'
            : overlap
              ? `Overlaps “${overlap.title}”`
              : `${formatMinutes(startMinutes, hour12)} – ${formatMinutes(end, hour12)}`}
        </p>

        <button
          type="submit"
          className="button button--primary"
          data-blocked={full || undefined}
          disabled={!full && (!title.trim() || startMinutes == null)}
        >
          Add block
        </button>
      </form>

      {boxes.length ? (
        <ul className="timebox-list" aria-label="Today’s blocks">
          {boxes.map((b) => {
            const state = b.done || b.start + b.duration <= minute ? 'done' : b.id === current?.id ? 'now' : 'upcoming'
            return (
              <li key={b.id} className="timebox-item" data-state={state}>
                <span className="timebox-item__time">
                  {formatMinutes(b.start, hour12)}
                  <span className="timebox-item__end"> – {formatMinutes(b.start + b.duration, hour12)}</span>
                </span>
                <span className="timebox-item__title">{b.title}</span>
                {state === 'now' && <span className="timebox-item__left">{formatLeft(left)}</span>}
                <span className="timebox-item__actions">
                  {state !== 'done' && (
                    <button
                      type="button"
                      className="todo-action"
                      onClick={() => onFinish(b.id)}
                      aria-label={`Mark done: ${b.title}`}
                      title="Mark done"
                    >
                      <Check size={14} strokeWidth={2} aria-hidden="true" />
                    </button>
                  )}
                  <button
                    type="button"
                    className="todo-action"
                    onClick={() => onRemove(b.id)}
                    aria-label={`Delete block: ${b.title}`}
                  >
                    <X size={14} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </span>
                {state === 'now' && (
                  <div className="progress-track timebox-item__progress" aria-hidden="true">
                    <div className="progress-bar" style={{ transform: `scaleX(${status.progress})` }} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="todo-empty timebox-empty">No blocks yet. Give each task a slot on the clock.</p>
      )}
    </ToolPopover>
  )
}

interface TimeboxNowProps {
  boxes: TimeboxItem[]
  status: TimeboxStatus
  /** Minutes after midnight on the main clock. */
  minute: number
  hour12: boolean
  onOpen: () => void
}

/** Up to two unfinished blocks as cards under the clock: the running one and the next. */
export function TimeboxNow({ boxes, status, minute, hour12, onOpen }: TimeboxNowProps) {
  const open = boxes.filter((b) => isOpenBlock(b, minute)).slice(0, MAX_OPEN)
  if (!open.length) return null

  return (
    <div className="timebox-now-row">
      {open.map((b, i) => {
        const active = b.id === status.current?.id
        return (
          // Keyed by block and state, so the entrance animation replays when a block starts.
          <button
            key={`${b.id}-${active ? 'now' : 'next'}`}
            type="button"
            className="timebox-now"
            onClick={onOpen}
            data-active={active}
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span className="timebox-now__row">
              <span className="timebox-now__tag">
                {active && <span className="timebox-now__pulse" aria-hidden="true" />}
                {active ? 'Now' : 'Next'}
              </span>
              <span className="timebox-now__title">{b.title}</span>
              <span className="timebox-now__meta">
                {active ? `${formatLeft(status.left)} left` : formatMinutes(b.start, hour12)}
              </span>
            </span>
            {active && (
              <span className="progress-track timebox-now__progress" aria-hidden="true">
                <span className="progress-bar" style={{ transform: `scaleX(${status.progress})` }} />
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
