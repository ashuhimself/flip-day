import { memo, useEffect, useRef, useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import type { Todo } from '../../hooks/useTodos'

interface TodoItemProps {
  todo: Todo
  onToggle: (id: string) => void
  onEdit: (id: string, text: string) => void
  onRemove: (id: string) => void
}

function TodoItem({ todo, onToggle, onEdit, onRemove }: TodoItemProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.text)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  const startEditing = () => {
    setDraft(todo.text)
    setEditing(true)
  }

  const commit = () => {
    if (!editing) return
    setEditing(false)
    if (draft.trim() !== todo.text) onEdit(todo.id, draft)
  }

  return (
    <li className="todo-item" data-completed={todo.completed}>
      <button
        type="button"
        className="todo-check"
        role="checkbox"
        aria-checked={todo.completed}
        aria-label={`${todo.completed ? 'Mark incomplete' : 'Mark complete'}: ${todo.text}`}
        onClick={() => onToggle(todo.id)}
      >
        <Check size={12} strokeWidth={3} aria-hidden="true" />
      </button>

      {editing ? (
        <input
          ref={inputRef}
          className="todo-edit"
          value={draft}
          maxLength={200}
          aria-label="Edit task"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') {
              // Cancel the edit without also closing the panel.
              e.stopPropagation()
              setDraft(todo.text)
              setEditing(false)
            }
          }}
        />
      ) : (
        <span className="todo-text" onDoubleClick={startEditing}>
          {todo.text}
        </span>
      )}

      {!editing && (
        <div className="todo-actions">
          <button type="button" className="todo-action" onClick={startEditing} aria-label={`Edit: ${todo.text}`}>
            <Pencil size={13} strokeWidth={1.75} aria-hidden="true" />
          </button>
          <button type="button" className="todo-action" onClick={() => onRemove(todo.id)} aria-label={`Delete: ${todo.text}`}>
            <X size={14} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      )}
    </li>
  )
}

export default memo(TodoItem)
