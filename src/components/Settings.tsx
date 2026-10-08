import { useId } from 'react'
import { Check, Settings2 } from 'lucide-react'
import type { Settings as SettingsValues } from '../hooks/useSettings'
import { MAX_ZONES, ZONES } from '../lib/timezones'
import ToolPopover from './ToolPopover'

interface SettingsProps {
  open: boolean
  settings: SettingsValues
  onOpenChange: (open: boolean) => void
  onChange: <K extends keyof SettingsValues>(key: K, value: SettingsValues[K]) => void
}

export default function Settings({ open, settings, onOpenChange, onChange }: SettingsProps) {
  return (
    <ToolPopover
      open={open}
      onOpenChange={onOpenChange}
      label="Clock settings"
      title="Settings"
      icon={<Settings2 size={18} strokeWidth={1.75} />}
      placement="top"
      className="settings"
    >
      <Option
        label="Clock format"
        value={settings.hour12}
        choices={[
          [true, '12 hour'],
          [false, '24 hour'],
        ]}
        onChange={(v) => onChange('hour12', v)}
      />
      <Option
        label="Seconds"
        value={settings.showSeconds}
        choices={[
          [true, 'On'],
          [false, 'Off'],
        ]}
        onChange={(v) => onChange('showSeconds', v)}
      />
      <Option
        label="Date"
        value={settings.showDate}
        choices={[
          [true, 'Show'],
          [false, 'Hide'],
        ]}
        onChange={(v) => onChange('showDate', v)}
      />
      <ZonePicker value={settings.timeZones} onChange={(v) => onChange('timeZones', v)} />
    </ToolPopover>
  )
}

interface OptionProps {
  label: string
  value: boolean
  choices: [boolean, string][]
  onChange: (value: boolean) => void
}

function Option({ label, value, choices, onChange }: OptionProps) {
  const labelId = useId()
  return (
    <div className="settings-row">
      <span id={labelId} className="settings-label">
        {label}
      </span>
      <div className="segmented" role="radiogroup" aria-labelledby={labelId}>
        {choices.map(([choice, text]) => (
          <button
            key={text}
            type="button"
            role="radio"
            aria-checked={value === choice}
            className="segmented__option"
            onClick={() => onChange(choice)}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

interface ZonePickerProps {
  value: string[]
  onChange: (value: string[]) => void
}

/** Pick 1–3 zones. The first one picked is the main clock. */
function ZonePicker({ value, onChange }: ZonePickerProps) {
  const labelId = useId()
  const full = value.length >= MAX_ZONES

  const toggle = (id: string) => {
    if (value.includes(id)) {
      if (value.length > 1) onChange(value.filter((z) => z !== id))
    } else if (!full) onChange([...value, id])
  }

  return (
    <div className="zone-picker">
      <div className="zone-picker__head">
        <span id={labelId} className="settings-label">
          Time zones
        </span>
        <span className="zone-picker__count">
          {value.length}/{MAX_ZONES}
        </span>
      </div>
      <ul className="zone-picker__list" aria-labelledby={labelId}>
        {ZONES.map((zone) => {
          const index = value.indexOf(zone.id)
          const selected = index !== -1
          const locked = selected && value.length === 1
          return (
            <li key={zone.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={selected}
                className="zone-option"
                disabled={(!selected && full) || locked}
                title={locked ? 'At least one time zone stays on' : !selected && full ? `Up to ${MAX_ZONES} time zones` : undefined}
                onClick={() => toggle(zone.id)}
              >
                <span className="zone-option__box" aria-hidden="true">
                  <Check size={11} strokeWidth={3} />
                </span>
                <span className="zone-option__name">{zone.city}</span>
                <span className="zone-option__region">{index === 0 ? 'Main' : zone.region}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
