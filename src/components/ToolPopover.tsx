import { useEffect, useId, useRef, type ReactNode } from 'react'

interface ToolPopoverProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  label: string
  title?: string
  icon: ReactNode
  /** Shown inside the trigger while the popover is closed (e.g. a running timer). */
  indicator?: ReactNode
  /** Which side of the trigger the popover floats on. */
  placement: 'top' | 'bottom'
  className?: string
  children: ReactNode
}

/**
 * An icon button with a floating, translucent popover. The popover is
 * positioned out of flow, so opening it never shifts anything else on the page.
 * Its content stays mounted while closed (e.g. so music keeps playing).
 */
export default function ToolPopover({
  open,
  onOpenChange,
  label,
  title = label,
  icon,
  indicator,
  placement,
  className,
  children,
}: ToolPopoverProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const panelId = useId()

  // Close on outside click. Clicks in the todo panel don't count, so a timer
  // or player can stay open next to today's tasks.
  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element
      if (rootRef.current?.contains(target) || target.closest?.('[data-overlay="todo"]')) return
      onOpenChange(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open, onOpenChange])

  return (
    <div className={`tool${className ? ` ${className}` : ''}`} ref={rootRef}>
      <button
        type="button"
        className="icon-button"
        data-labelled={(!open && !!indicator) || undefined}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        title={title}
      >
        {icon}
        {!open && indicator}
      </button>

      <div
        id={panelId}
        className="popover glass"
        data-open={open}
        data-placement={placement}
        inert={!open}
        role="group"
        aria-label={label}
      >
        {children}
      </div>
    </div>
  )
}
