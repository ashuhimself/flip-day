import { forwardRef } from 'react'
import { ListTodo } from 'lucide-react'

interface TodoTriggerProps {
  open: boolean
  remaining: number
  onToggle: () => void
}

const TodoTrigger = forwardRef<HTMLButtonElement, TodoTriggerProps>(function TodoTrigger(
  { open, remaining, onToggle },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className="icon-button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls="todo-panel"
      aria-label={open ? 'Close today’s tasks' : `Open today’s tasks${remaining ? `, ${remaining} remaining` : ''}`}
      title="Today (T)"
    >
      <ListTodo size={18} strokeWidth={1.75} />
      {remaining > 0 && !open && <span className="icon-badge">{remaining}</span>}
    </button>
  )
})

export default TodoTrigger
