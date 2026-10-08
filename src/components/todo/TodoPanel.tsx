import { forwardRef, type RefObject } from 'react'
import { X } from 'lucide-react'
import type { Todo } from '../../hooks/useTodos'
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
}

const TodoPanel = forwardRef<HTMLElement, TodoPanelProps>(function TodoPanel(
  { open, now, todos, inputRef, onClose, onAdd, onToggle, onEdit, onRemove },
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

      {todos.length ? (
        <ul className="todo-list" aria-label="Today’s tasks">
          {todos.map((todo) => (
            <TodoItem key={todo.id} todo={todo} onToggle={onToggle} onEdit={onEdit} onRemove={onRemove} />
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
