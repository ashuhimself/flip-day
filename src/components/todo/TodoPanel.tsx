import { forwardRef, type RefObject } from 'react'
import { X } from 'lucide-react'
import type { Leftover, Todo } from '../../hooks/useTodos'
import { formatMonthDay } from '../../lib/time'
import TodoInput from './TodoInput'
import TodoItem from './TodoItem'
import TodoProgress from './TodoProgress'

interface TodoPanelProps {
  open: boolean
  now: Date
  todos: Todo[]
  inputRef: RefObject<HTMLInputElement | null>
  onClose: () => void
  onAdd: (text: string) => void
  onToggle: (id: string) => void
  onEdit: (id: string, text: string) => void
  onRemove: (id: string) => void
  /** Start times of unfinished blocks, by the task they were planned from. */
  scheduled: Record<string, string>
  onSchedule: (todo: Todo) => void
  leftover: Leftover | null
  onCarryOver: () => void
  onDismissLeftover: () => void
}

const shortDay = new Intl.DateTimeFormat(undefined, { weekday: 'long' })

/** "yesterday", or the weekday for older days. */
function dayLabel(from: string, now: Date): string {
  const y = new Date(now)
  y.setDate(y.getDate() - 1)
  const key = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`
  return from === key ? 'yesterday' : shortDay.format(new Date(`${from}T12:00:00`))
}

const TodoPanel = forwardRef<HTMLElement, TodoPanelProps>(function TodoPanel(
  {
    open,
    now,
    todos,
    inputRef,
    onClose,
    onAdd,
    onToggle,
    onEdit,
    onRemove,
    scheduled,
    onSchedule,
    leftover,
    onCarryOver,
    onDismissLeftover,
  },
  ref,
) {
  const done = todos.filter((t) => t.completed).length

  return (
    <aside
      ref={ref}
      id="todo-panel"
      className="todo-panel glass"
      data-overlay="todo"
      data-open={open}
      inert={!open}
      role="dialog"
      aria-modal="false"
      aria-labelledby="todo-panel-title"
    >
      <span className="todo-grabber" aria-hidden="true" />
      <header className="todo-header">
        <div>
          <h2 id="todo-panel-title" className="todo-eyebrow">
            Today
          </h2>
          <p className="todo-date">{formatMonthDay(now)}</p>
        </div>
        <button type="button" className="icon-button icon-button--ghost" onClick={onClose} aria-label="Close tasks">
          <X size={16} strokeWidth={1.75} />
        </button>
      </header>

      <TodoInput ref={inputRef} onAdd={onAdd} />

      {leftover && (
        <div className="carry-over" role="status">
          <p className="carry-over__text">
            {leftover.todos.length} unfinished from {dayLabel(leftover.from, now)}
            <span className="carry-over__names">{leftover.todos.map((t) => t.text).join(' · ')}</span>
          </p>
          <div className="carry-over__actions">
            <button type="button" className="button button--primary" onClick={onCarryOver}>
              Move to today
            </button>
            <button type="button" className="button" onClick={onDismissLeftover}>
              Dismiss
            </button>
          </div>
        </div>
      )}

      {todos.length ? (
        <ul className="todo-list" aria-label="Today’s tasks">
          {todos.map((todo) => (
            <TodoItem
              key={todo.id}
              todo={todo}
              onToggle={onToggle}
              onEdit={onEdit}
              onRemove={onRemove}
              scheduledAt={scheduled[todo.id]}
              onSchedule={onSchedule}
            />
          ))}
        </ul>
      ) : (
        <p className="todo-empty">A clear day. Add what matters.</p>
      )}

      <TodoProgress done={done} total={todos.length} />
    </aside>
  )
})

export default TodoPanel
