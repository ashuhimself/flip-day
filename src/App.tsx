import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import DateDisplay from './components/DateDisplay'
import FlipClock from './components/FlipClock'
import Music from './components/Music'
import Pomodoro from './components/Pomodoro'
import PopOut from './components/PopOut'
import Settings from './components/Settings'
import Summary from './components/Summary'
import Timeline from './components/Timeline'
import ThemeToggle from './components/ThemeToggle'
import Timebox, { TimeboxNow } from './components/Timebox'
import TodoTrigger from './components/TodoTrigger'
import TodoPanel from './components/todo/TodoPanel'
import ZoneClocks from './components/ZoneClocks'
import { useIdle } from './hooks/useIdle'
import { useNow } from './hooks/useNow'
import { usePomodoro } from './hooks/usePomodoro'
import { useSettings } from './hooks/useSettings'
import { useTheme } from './hooks/useTheme'
import { isOpenBlock, timeboxStatus, useTimeboxes } from './hooks/useTimeboxes'
import { useTodos, type Todo } from './hooks/useTodos'
import { notify, setNotificationsEnabled } from './lib/notify'
import { STORAGE_KEYS, readJSON, writeJSON } from './lib/storage'
import { formatMinutes, getClockParts, minuteOfDay, toDateKey } from './lib/time'
import { tzOf, zoneById, zonedParts } from './lib/timezones'

function isTypingTarget(target: EventTarget | null) {
  const el = target as HTMLElement | null
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
}

/** Top-left / bottom-left popovers. Only one is open at a time. */
type Tool = 'settings' | 'pomodoro' | 'timebox' | 'music' | 'summary'

export default function App() {
  const [settings, updateSetting] = useSettings()
  const [theme, toggleTheme] = useTheme()
  // Shared by the Pomodoro panel and the pop-out window.
  const timer = usePomodoro()
  const now = useNow(settings.showSeconds ? 'second' : 'minute')
  const dateKey = toDateKey(now)
  const { todos, add, toggle, complete, edit, remove, leftover, carryOver, dismissLeftover } = useTodos(dateKey)

  // The first zone is the main clock; timeboxes follow its time and date.
  const [primaryId, ...extraZones] = settings.timeZones
  const primaryZone = tzOf(primaryId)
  const multiZone = extraZones.length > 0
  const primaryCity = zoneById(primaryId)?.city
  const timeboxes = useTimeboxes(toDateKey(now, primaryZone))
  const minute = minuteOfDay(now, primaryZone)
  const boxStatus = timeboxStatus(timeboxes.boxes, minute, settings.showSeconds ? zonedParts(now, primaryZone).second : 0)

  // Finishing a block planned from a task also ticks the task off.
  const { finish: finishBox } = timeboxes
  const finishBlock = useCallback(
    (id: string) => {
      const todoId = timeboxes.boxes.find((b) => b.id === id)?.todoId
      finishBox(id)
      if (todoId) complete(todoId)
    },
    [timeboxes.boxes, finishBox, complete],
  )

  // Desktop notifications as blocks start, end and come up next.
  useEffect(() => setNotificationsEnabled(settings.notifications), [settings.notifications])
  const lastMinute = useRef(minute)
  useEffect(() => {
    const prev = lastMinute.current
    lastMinute.current = minute
    // Only for the clock moving forward a little (not a new day or waking from sleep).
    if (minute <= prev || minute - prev > 5) return
    const crossed = (m: number) => prev < m && m <= minute
    const fmt = (m: number) => formatMinutes(m, settings.hour12)
    for (const b of timeboxes.boxes) {
      if (b.done) continue
      const end = b.start + b.duration
      if (crossed(b.start)) notify(`Now: ${b.title}`, `Until ${fmt(end)}`)
      else if (crossed(end)) notify(`Block ended: ${b.title}`)
      else if (crossed(b.start - 5)) notify(`Next: ${b.title} in 5 min`, `Starts at ${fmt(b.start)}`)
    }
  }, [minute, timeboxes.boxes, settings.hour12])

  // Start time of each task's unfinished block, for the badge in the todo list.
  const scheduled = useMemo(() => {
    const map: Record<string, string> = {}
    for (const b of timeboxes.boxes) {
      if (b.todoId && isOpenBlock(b, minute)) map[b.todoId] = formatMinutes(b.start, settings.hour12)
    }
    return map
  }, [timeboxes.boxes, minute, settings.hour12])

  // "Timebox it" on a task: open the Timebox panel with the task filled in.
  const [scheduleRequest, setScheduleRequest] = useState<{ todo: Todo; n: number } | null>(null)
  const scheduleTodo = useCallback((todo: Todo) => {
    setScheduleRequest((r) => ({ todo, n: (r?.n ?? 0) + 1 }))
    setTool('timebox')
  }, [])

  const [panelOpen, setPanelOpen] = useState(() => readJSON(STORAGE_KEYS.panelOpen, false))
  const [tool, setTool] = useState<Tool | null>(null)
  const idle = useIdle(3500)

  // Room taken by the bottom dock (timeline and block cards), so the clock centers above it.
  const dockRef = useRef<HTMLDivElement>(null)
  const [dockSpace, setDockSpace] = useState(0)
  useEffect(() => {
    const el = dockRef.current
    if (!el) return
    const measure = () => {
      const r = el.getBoundingClientRect()
      setDockSpace(r.height ? Math.ceil(window.innerHeight - r.top + 8) : 0)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    window.addEventListener('resize', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  const panelRef = useRef<HTMLElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => writeJSON(STORAGE_KEYS.panelOpen, panelOpen), [panelOpen])

  const closePanel = useCallback(() => {
    setPanelOpen(false)
    // Hand focus back to the trigger rather than dropping it on <body>.
    if (panelRef.current?.contains(document.activeElement)) triggerRef.current?.focus({ preventScroll: true })
  }, [])

  const togglePanel = useCallback(() => {
    if (panelOpen) closePanel()
    else setPanelOpen(true)
  }, [panelOpen, closePanel])

  // Focus the input when the panel opens. Skipped on touch screens, where
  // it would throw the on-screen keyboard over the bottom sheet.
  useEffect(() => {
    if (panelOpen && window.matchMedia('(pointer: fine)').matches) inputRef.current?.focus({ preventScroll: true })
  }, [panelOpen])

  const toolProps = useCallback(
    (name: Tool) => ({
      open: tool === name,
      onOpenChange: (open: boolean) => setTool((t) => (open ? name : t === name ? null : t)),
    }),
    [tool],
  )

  // Close the panel on outside click (the trigger toggles it itself). Clicks
  // on the other floating tools don't count, so both can stay open together.
  useEffect(() => {
    if (!panelOpen) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      if (target.closest?.('[data-overlay="tool"]')) return
      setPanelOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [panelOpen])

  // Keyboard: Escape closes the top-most layer, T toggles the panel, B the Timebox,
  // P starts or pauses the Pomodoro, F starts a focus session, D finishes the running block.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (tool) setTool(null)
        else if (panelOpen) closePanel()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat || isTypingTarget(e.target)) return
      const key = e.key.toLowerCase()
      if (key === 't') togglePanel()
      else if (key === 'b') setTool((t) => (t === 'timebox' ? null : 'timebox'))
      else if (key === 'p') (timer.status === 'running' ? timer.pause : timer.start)()
      else if (key === 'f') timer.focus()
      else if (key === 'd' && boxStatus.current) finishBlock(boxStatus.current.id)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [tool, panelOpen, closePanel, togglePanel, timer, boxStatus.current, finishBlock])

  // Show the time in the tab title too.
  const { hours, minutes, meridiem } = getClockParts(now, settings.hour12, primaryZone)
  useEffect(() => {
    document.title = `${hours}:${minutes}${meridiem ? ` ${meridiem}` : ''} · Flipday`
  }, [hours, minutes, meridiem])

  const remaining = todos.filter((t) => !t.completed).length
  const chromeHidden = idle && !panelOpen && !tool

  return (
    <main className="app" style={{ '--dock-space': `${dockSpace}px` } as CSSProperties}>
      {/* The clock is centered in the full viewport. Everything else floats
          above it, fixed-position, and never takes layout space from it. */}
      <div className="stage">
        <div className="clock-wrap" data-seconds={settings.showSeconds || undefined} data-zones={extraZones.length || undefined}>
          <div className="main-clock">
            <FlipClock now={now} hour12={settings.hour12} showSeconds={settings.showSeconds} timeZone={primaryZone} />
            <DateDisplay
              now={now}
              visible={settings.showDate || multiZone}
              timeZone={primaryZone}
              place={multiZone ? primaryCity : undefined}
            />
          </div>
          <ZoneClocks
            now={now}
            hour12={settings.hour12}
            showSeconds={settings.showSeconds}
            primary={primaryZone}
            zones={extraZones}
          />
        </div>
      </div>

      <div className="chrome chrome--bottom-center" data-overlay="tool" ref={dockRef}>
        <Timeline
          boxes={timeboxes.boxes}
          minute={minute}
          currentId={boxStatus.current?.id ?? null}
          hour12={settings.hour12}
          onOpen={() => setTool('timebox')}
        />
        <TimeboxNow
          boxes={timeboxes.boxes}
          status={boxStatus}
          minute={minute}
          hour12={settings.hour12}
          onOpen={() => setTool('timebox')}
          onExtend={timeboxes.extend}
          timer={timer}
        />
      </div>

      <div className="chrome chrome--top-left" data-overlay="tool" data-hidden={chromeHidden}>
        <Pomodoro {...toolProps('pomodoro')} timer={timer} />
        <Timebox
          {...toolProps('timebox')}
          boxes={timeboxes.boxes}
          status={boxStatus}
          minute={minute}
          hour12={settings.hour12}
          zoneLabel={multiZone ? primaryCity : undefined}
          todos={todos}
          request={scheduleRequest}
          onAdd={timeboxes.add}
          onRemove={timeboxes.remove}
          onFinish={finishBlock}
          onExtend={timeboxes.extend}
          timer={timer}
        />
        <Music {...toolProps('music')} />
        <Summary {...toolProps('summary')} todayKey={dateKey} />
      </div>

      <div className="chrome chrome--top-right" data-overlay="tool" data-hidden={chromeHidden}>
        <PopOut
          now={now}
          hour12={settings.hour12}
          showSeconds={settings.showSeconds}
          timeZone={primaryZone}
          theme={theme}
          timer={timer}
          boxes={timeboxes.boxes}
          boxStatus={boxStatus}
          minute={minute}
          onFinishBox={finishBlock}
          onExtendBox={timeboxes.extend}
        />
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </div>

      <div className="chrome chrome--bottom-left" data-overlay="tool" data-hidden={chromeHidden}>
        <Settings {...toolProps('settings')} settings={settings} onChange={updateSetting} />
      </div>

      <div
        className="chrome chrome--bottom-right"
        data-overlay="todo"
        data-hidden={chromeHidden}
        data-covered={panelOpen}
      >
        <TodoTrigger ref={triggerRef} open={panelOpen} remaining={remaining} onToggle={togglePanel} />
      </div>

      <TodoPanel
        ref={panelRef}
        open={panelOpen}
        now={now}
        todos={todos}
        inputRef={inputRef}
        onClose={closePanel}
        onAdd={add}
        onToggle={toggle}
        onEdit={edit}
        onRemove={remove}
        scheduled={scheduled}
        onSchedule={scheduleTodo}
        leftover={leftover}
        onCarryOver={carryOver}
        onDismissLeftover={dismissLeftover}
      />
    </main>
  )
}
