import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Pause, PictureInPicture2, Play, RotateCcw } from 'lucide-react'
import { formatDuration, type PomodoroTimer } from '../hooks/usePomodoro'
import { pipSupported, usePictureInPicture } from '../hooks/usePictureInPicture'
import type { Theme } from '../hooks/useTheme'
import { STORAGE_KEYS, readJSON, writeJSON } from '../lib/storage'
import FlipClock from './FlipClock'
import { MODES } from './Pomodoro'

export type PopOutView = 'clock' | 'pomodoro'

// Window sizes per view; the clock needs more width with seconds on.
const SIZES = {
  clock: { width: 440, height: 200 },
  clockSeconds: { width: 580, height: 200 },
  pomodoro: { width: 320, height: 240 },
}

interface PopOutProps {
  now: Date
  hour12: boolean
  showSeconds: boolean
  timeZone: string
  theme: Theme
  timer: PomodoroTimer
}

/**
 * Pops the clock or the Pomodoro — one at a time — into an always-on-top
 * Picture-in-Picture window that stays visible over other apps and tabs.
 */
export default function PopOut({ now, hour12, showSeconds, timeZone, theme, timer }: PopOutProps) {
  const { pipWindow, open, close } = usePictureInPicture()
  const [view, setView] = useState<PopOutView>(() =>
    readJSON<PopOutView>(STORAGE_KEYS.popOut, 'clock') === 'pomodoro' ? 'pomodoro' : 'clock',
  )
  const supported = pipSupported()

  useEffect(() => writeJSON(STORAGE_KEYS.popOut, view), [view])

  const sizeFor = (v: PopOutView) => (v === 'pomodoro' ? SIZES.pomodoro : showSeconds ? SIZES.clockSeconds : SIZES.clock)

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
              {(['clock', 'pomodoro'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={view === v}
                  className="segmented__option"
                  onClick={() => switchView(v)}
                >
                  {v === 'clock' ? 'Clock' : 'Pomodoro'}
                </button>
              ))}
            </div>

            {view === 'clock' ? (
              <div className="clock-wrap pip-clock" data-seconds={showSeconds || undefined}>
                <FlipClock now={now} hour12={hour12} showSeconds={showSeconds} timeZone={timeZone} />
              </div>
            ) : (
              <PipPomodoro timer={timer} />
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
