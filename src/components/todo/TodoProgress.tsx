export default function TodoProgress({ done, total }: { done: number; total: number }) {
  if (total === 0) return null
  const allDone = done === total

  return (
    <div className="todo-progress" data-complete={allDone}>
      <div
        className="todo-progress__track"
        role="progressbar"
        aria-label="Tasks completed"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={done}
      >
        <div className="todo-progress__bar" style={{ transform: `scaleX(${done / total})` }} />
      </div>
      <p className="todo-progress__label" aria-live="polite">
        {allDone ? 'All done for today.' : `${done} / ${total} completed`}
      </p>
    </div>
  )
}
