import { forwardRef, useState } from 'react'
import { Plus } from 'lucide-react'

const MAX_LENGTH = 200

const TodoInput = forwardRef<HTMLInputElement, { onAdd: (text: string) => void }>(function TodoInput({ onAdd }, ref) {
  const [text, setText] = useState('')

  return (
    <form
      className="todo-input"
      onSubmit={(e) => {
        e.preventDefault()
        if (!text.trim()) return
        onAdd(text)
        setText('')
      }}
    >
      <Plus size={16} strokeWidth={1.75} aria-hidden="true" className="todo-input__icon" />
      <input
        ref={ref}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Add a task..."
        aria-label="Add a task"
        maxLength={MAX_LENGTH}
        autoComplete="off"
        enterKeyHint="done"
      />
    </form>
  )
})

export default TodoInput
