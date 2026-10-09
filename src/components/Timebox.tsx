import { useEffect, useRef, useState } from 'react'
import { CalendarClock, Check, Plus, X } from 'lucide-react'
import { MAX_OPEN, isOpenBlock, type Timebox as TimeboxItem, type TimeboxStatus } from '../hooks/useTimeboxes'
import type { Todo } from '../hooks/useTodos'
import { primeAudio } from '../lib/chime'
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
  /** Today's tasks, offered as quick picks for a block's title. */
  todos: Todo[]
  /** A task sent over from the todo list to plan; `n` changes on every request. */
  request: { todo: Todo; n: number } | null
  onAdd: (title: string, start: number, duration: number, todoId?: string) => void
  onRemove: (id: string) => void
  onFinish: (id: string) => void
  onExtend: (id: string, minutes: number) => void
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

/** "+5m" and "+15m" for the running block. */
export function ExtendButtons({ id, onExtend }: { id: string; onExtend: (id: string, minutes: number) => void }) {
  return (
    <>
      {[5, 15].map((m) => (
        <button
          key={m}
          type="button"
          className="chip-button"
          onClick={() => onExtend(id, m)}
          aria-label={`Add ${m} minutes`}
          title={`Add ${m} minutes`}
        >
          +{m}m
        </button>
      ))}
    </>
  )
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
  todos,
  request,
  onAdd,
  onRemove,
  onFinish,
  onExtend,
}: TimeboxProps) {
  const [title, setTitle] = useState('')
  // The task the title was picked from; cleared once the title is edited away from it.
  const [todoId, setTodoId] = useState<string | null>(null)
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

  const openBlocks = boxes.filter((b) => isOpenBlock(b, minute))
  const full = openBlocks.length >= MAX_OPEN

  const pick = (todo: Todo) => {
    setTitle(todo.text)
    setTodoId(todo.id)
  }

  // A task sent from the todo list: fill it in, or shake the limit warning if no slot is free.
  useEffect(() => {
    if (!request) return
    pick(request.todo)
    if (full) setAttempts((n) => n + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request])

  // Unfinished tasks that don't already have an unfinished block.
  const planned = new Set(openBlocks.map((b) => b.todoId))
  const picks = todos.filter((t) => !t.completed && !planned.has(t.id))

  const startMinutes = fromInput(start)
  const end = startMinutes == null ? null : Math.min(DAY, startMinutes + duration)
  const badEnd = duration <= 0

  // Typing an end time sets a custom length; changing the start keeps the length.
  const changeEnd = (value: string) => {
    const e = fromInput(value)
    if (e != null && startMinutes != null) setDuration((e === 0 ? DAY : e) - startMinutes)
  }
  const overlap =
    startMinutes == null || end == null
      ? undefined
      : badEnd
        ? undefined
        : boxes.find((b) => !b.done && b.start < end && startMinutes < b.start + b.duration)

  const submit = () => {
    if (full) {
      setAttempts((n) => n + 1)
      return
    }
    if (!title.trim() || startMinutes == null || badEnd) return
    primeAudio()
    onAdd(title, startMinutes, duration, todoId ?? undefined)
    setTitle('')
    setTodoId(null)
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
            onChange={(e) => {
              setTitle(e.target.value)
              if (todoId && e.target.value.trim() !== todos.find((t) => t.id === todoId)?.text) setTodoId(null)
            }}
            placeholder="What will you work on?"
            aria-label="Block title"
            maxLength={80}
            autoComplete="off"
            enterKeyHint="done"
          />
        </div>

        {picks.length > 0 && (
          <div className="timebox-picks" role="group" aria-label="From today’s tasks">
            {picks.map((t) => (
              <button
                key={t.id}
                type="button"
                className="timebox-pick"
                aria-pressed={todoId === t.id}
                onClick={() => pick(t)}
                title={t.text}
              >
                {t.text}
              </button>
            ))}
          </div>
        )}

        <div className="timebox-when">
          <div className="timebox-times">
            <label className="timebox-start">
              <span className="settings-label">Start</span>
              <input type="time" value={start} step={300} onChange={(e) => setStart(e.target.value)} required />
            </label>
            <label className="timebox-start">
              <span className="settings-label">End</span>
              <input
                type="time"
                value={end == null ? '' : toInput(end % DAY)}
                step={300}
                onChange={(e) => changeEnd(e.target.value)}
                disabled={startMinutes == null}
                aria-invalid={badEnd || undefined}
              />
            </label>
          </div>
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

        <p className="timebox-hint" data-warn={!!overlap || badEnd || undefined} hidden={full}>
          {startMinutes == null || end == null
            ? 'Pick a start time.'
            : badEnd
              ? 'End must be after the start.'
              : overlap
                ? `Overlaps “${overlap.title}”`
                : `${formatLeft(duration)} · ${formatMinutes(startMinutes, hour12)} – ${formatMinutes(end, hour12)}`}
        </p>

        <button
          type="submit"
          className="button button--primary"
          data-blocked={full || undefined}
          disabled={!full && (!title.trim() || startMinutes == null || badEnd)}
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
                  <>
                    <div className="progress-track timebox-item__progress" aria-hidden="true">
                      <div className="progress-bar" style={{ transform: `scaleX(${status.progress})` }} />
                    </div>
                    <div className="timebox-item__extras">
                      <ExtendButtons id={b.id} onExtend={onExtend} />
                    </div>
                  </>
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
  onExtend: (id: string, minutes: number) => void
}

/** Up to two unfinished blocks as cards under the clock: the running one and the next. */
export function TimeboxNow({ boxes, status, minute, hour12, onOpen, onExtend }: TimeboxNowProps) {
  const open = boxes.filter((b) => isOpenBlock(b, minute)).slice(0, MAX_OPEN)
  if (!open.length) return null

  return (
    <div className="timebox-now-row">
      {open.map((b, i) => {
        const active = b.id === status.current?.id
        return (
          // Keyed by block and state, so the entrance animation replays when a block starts.
          <div
            key={`${b.id}-${active ? 'now' : 'next'}`}
            className="timebox-now"
            data-active={active}
            style={{ animationDelay: `${i * 70}ms` }}
          >
            {/* Stretched over the whole card, so the card opens the panel. */}
            <button type="button" className="timebox-now__open" onClick={onOpen} aria-label={`${b.title}. Open Timebox`} />
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
            {active && (
              <span className="timebox-now__actions">
                <ExtendButtons id={b.id} onExtend={onExtend} />
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
