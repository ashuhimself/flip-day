import { Pause, Play, RotateCcw, Timer } from 'lucide-react'
import { DURATIONS, ROUNDS_PER_CYCLE, formatDuration, type PomodoroMode, type PomodoroTimer } from '../hooks/usePomodoro'
import ToolPopover from './ToolPopover'

export const MODES: [PomodoroMode, string][] = [
  ['focus', 'Focus'],
  ['short', 'Short break'],
  ['long', 'Long break'],
]

interface PomodoroProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  timer: PomodoroTimer
}

export default function Pomodoro({ open, onOpenChange, timer }: PomodoroProps) {
  const { mode, status, remaining, progress, roundsInCycle, start, pause, reset, setMode } = timer
  const time = formatDuration(remaining)
  const modeLabel = MODES.find(([m]) => m === mode)![1]

  return (
    <ToolPopover
      open={open}
      onOpenChange={onOpenChange}
      label={status === 'idle' ? 'Pomodoro timer' : `Pomodoro timer, ${modeLabel} ${time} ${status === 'paused' ? 'paused' : 'left'}`}
      title="Pomodoro"
      icon={<Timer size={18} strokeWidth={1.75} />}
      indicator={status !== 'idle' && <span className="tool-indicator" data-paused={status === 'paused'}>{time}</span>}
      placement="bottom"
      className="pomodoro"
    >
      <header className="panel-header">
        <h2 className="todo-eyebrow">Pomodoro</h2>
        <span className="pomo-rounds" aria-label={`${roundsInCycle} of ${ROUNDS_PER_CYCLE} focus sessions done`}>
          {Array.from({ length: ROUNDS_PER_CYCLE }, (_, i) => (
            <span key={i} data-done={i < roundsInCycle} />
          ))}
        </span>
      </header>

      <div className="segmented segmented--full" role="radiogroup" aria-label="Timer mode">
        {MODES.map(([m, text]) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            className="segmented__option"
            title={`${text} · ${DURATIONS[m] / 60_000} min`}
            onClick={() => setMode(m)}
          >
            {text}
          </button>
        ))}
      </div>

      <p className="pomo-time" data-status={status} role="timer" aria-label={`${time} remaining`}>
        {time}
      </p>

      <div className="progress-track" aria-hidden="true">
        <div className="progress-bar" style={{ transform: `scaleX(${progress})` }} />
      </div>

      <div className="panel-actions">
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
        <button type="button" className="button" onClick={reset} disabled={status === 'idle' && progress === 0}>
          <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
          Reset
        </button>
      </div>
    </ToolPopover>
  )
}
