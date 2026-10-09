import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Pause, PictureInPicture2, Play, RotateCcw } from 'lucide-react'
import { formatDuration, type PomodoroTimer } from '../hooks/usePomodoro'
import { pipSupported, usePictureInPicture } from '../hooks/usePictureInPicture'
import type { Theme } from '../hooks/useTheme'
import { isOpenBlock, type Timebox, type TimeboxStatus } from '../hooks/useTimeboxes'
import { STORAGE_KEYS, readJSON, writeJSON } from '../lib/storage'
import { formatMinutes } from '../lib/time'
import FlipClock from './FlipClock'
import { MODES } from './Pomodoro'
import { ExtendButtons, formatLeft } from './Timebox'

export type PopOutView = 'clock' | 'pomodoro' | 'timebox'

const VIEWS: [PopOutView, string][] = [
  ['clock', 'Clock'],
  ['pomodoro', 'Pomodoro'],
  ['timebox', 'Timebox'],
]

// Window sizes per view; the clock needs more width with seconds on.
const SIZES = {
  clock: { width: 440, height: 200 },
  clockSeconds: { width: 580, height: 200 },
  pomodoro: { width: 320, height: 240 },
  timebox: { width: 360, height: 280 },
}

interface PopOutProps {
  now: Date
  hour12: boolean
  showSeconds: boolean
  timeZone: string
  theme: Theme
  timer: PomodoroTimer
  boxes: Timebox[]
  boxStatus: TimeboxStatus
  /** Minutes after midnight on the main clock. */
  minute: number
  onFinishBox: (id: string) => void
  onExtendBox: (id: string, minutes: number) => void
}

/**
 * Pops the clock, the Pomodoro or the timebox — one at a time — into an always-on-top
 * Picture-in-Picture window that stays visible over other apps and tabs.
 */
export default function PopOut({
  now,
  hour12,
  showSeconds,
  timeZone,
  theme,
  timer,
  boxes,
  boxStatus,
  minute,
  onFinishBox,
  onExtendBox,
}: PopOutProps) {
  const { pipWindow, open, close } = usePictureInPicture()
  const [view, setView] = useState<PopOutView>(() => {
    const saved = readJSON<PopOutView>(STORAGE_KEYS.popOut, 'clock')
    return VIEWS.some(([v]) => v === saved) ? saved : 'clock'
  })
  const supported = pipSupported()

  useEffect(() => writeJSON(STORAGE_KEYS.popOut, view), [view])

  const sizeFor = (v: PopOutView) => (v !== 'clock' ? SIZES[v] : showSeconds ? SIZES.clockSeconds : SIZES.clock)

  // The PiP window is a separate document: keep its theme in step.
  useEffect(() => {
    if (!pipWindow) return
    pipWindow.document.documentElement.dataset.theme = theme
  }, [pipWindow, theme])

  const switchView = (next: PopOutView) => {
    setView(next)
    const { width, height } = sizeFor(next)
    try {
      // Allowed during the click (user activation) inside the PiP window.
      pipWindow?.resizeTo(width + (pipWindow.outerWidth - pipWindow.innerWidth), height + (pipWindow.outerHeight - pipWindow.innerHeight))
    } catch {
      // Some browsers refuse; the content scales to whatever size it has.
    }
  }

  const label = !supported
    ? 'Pop-out window needs Chrome or Edge'
    : pipWindow
      ? 'Close pop-out window'
      : 'Pop out (always on top)'

  return (
    <>
      <button
        type="button"
        className="icon-button"
        onClick={() => (pipWindow ? close() : open(sizeFor(view)))}
        disabled={!supported}
        aria-pressed={!!pipWindow}
        aria-label={label}
        title={label}
      >
        <PictureInPicture2 size={18} strokeWidth={1.75} />
      </button>

      {pipWindow &&
        createPortal(
          <div className="pip" data-view={view}>
            <div className="pip-switch segmented" role="radiogroup" aria-label="Show">
              {VIEWS.map(([v, name]) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={view === v}
                  className="segmented__option"
                  onClick={() => switchView(v)}
                >
                  {name}
                </button>
              ))}
            </div>

            {view === 'clock' ? (
              <div className="clock-wrap pip-clock" data-seconds={showSeconds || undefined}>
                <FlipClock now={now} hour12={hour12} showSeconds={showSeconds} timeZone={timeZone} />
              </div>
            ) : view === 'pomodoro' ? (
              <PipPomodoro timer={timer} />
            ) : (
              <PipTimebox
                boxes={boxes}
                status={boxStatus}
                minute={minute}
                hour12={hour12}
                onFinish={onFinishBox}
                onExtend={onExtendBox}
              />
            )}
          </div>,
          pipWindow.document.body,
        )}
    </>
  )
}

function PipPomodoro({ timer }: { timer: PomodoroTimer }) {
  const { mode, status, remaining, progress, start, pause, reset } = timer
  const modeLabel = MODES.find(([m]) => m === mode)![1]

  return (
    <div className="pip-pomo">
      <p className="todo-eyebrow">{modeLabel}</p>
      <p className="pip-pomo__time" data-status={status} role="timer">
        {formatDuration(remaining)}
      </p>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-bar" style={{ transform: `scaleX(${progress})` }} />
      </div>
      <div className="pip-pomo__actions">
        {status === 'running' ? (
          <button type="button" className="button button--primary" onClick={pause}>
            <Pause size={15} strokeWidth={2} aria-hidden="true" />
            Pause
          </button>
        ) : (
          <button type="button" className="button button--primary" onClick={start}>
            <Play size={15} strokeWidth={2} aria-hidden="true" />
            {status === 'paused' ? 'Resume' : 'Start'}
          </button>
        )}
        <button
          type="button"
          className="button pip-pomo__reset"
          onClick={reset}
          disabled={status === 'idle' && progress === 0}
          aria-label="Reset"
          title="Reset"
        >
          <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

interface PipTimeboxProps {
  boxes: Timebox[]
  status: TimeboxStatus
  minute: number
  hour12: boolean
  onFinish: (id: string) => void
  onExtend: (id: string, minutes: number) => void
}

/** The running block with its time left, or the next one coming up. */
function PipTimebox({ boxes, status, minute, hour12, onFinish, onExtend }: PipTimeboxProps) {
  const { current, left, progress } = status
  const upcoming = boxes.find((b) => isOpenBlock(b, minute) && b.id !== current?.id) ?? null
  const block = current ?? upcoming

  if (!block) {
    return (
      <div className="pip-pomo pip-box">
        <p className="todo-eyebrow">Timebox</p>
        <p className="todo-empty pip-box__empty">No blocks planned. Add one from the Timebox panel.</p>
      </div>
    )
  }

  return (
    <div className="pip-pomo pip-box" data-active={!!current}>
      <p className="todo-eyebrow pip-box__title" title={block.title}>
        {current ? 'Now' : 'Next'} · {block.title}
      </p>
      <p className="pip-pomo__time pip-box__time" role="timer">
        {current ? formatLeft(left) : formatMinutes(block.start, hour12)}
      </p>
      <div className="progress-track" aria-hidden="true">
        <div className="progress-bar" style={{ transform: `scaleX(${current ? progress : 0})` }} />
      </div>
      <div className="pip-pomo__actions">
        <button type="button" className="button button--primary" onClick={() => onFinish(block.id)}>
          <Check size={15} strokeWidth={2} aria-hidden="true" />
          Done
        </button>
      </div>
      {current && (
        <div className="pip-box__extend">
          <ExtendButtons id={current.id} onExtend={onExtend} />
        </div>
      )}
      {current && upcoming && (
        <p className="pip-box__next">
          Next · {upcoming.title} at {formatMinutes(upcoming.start, hour12)}
        </p>
      )}
    </div>
  )
}
