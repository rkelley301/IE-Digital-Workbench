// Shared field-UI primitives. Every interactive element is at least 44x44px
// (min-h-11 / min-w-11) so it works with gloves.

import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import type { Item } from '../forms/templates'
import { isoToLocalDate, isoToLocalTime, localToIso } from './formUtils'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

const VARIANT: Record<Variant, string> = {
  primary: 'bg-field-warn text-black border-field-warn',
  secondary: 'bg-field-panel text-field-text border-field-line',
  danger: 'bg-transparent text-field-stop border-field-stop',
  ghost: 'bg-transparent text-field-text border-transparent',
}

export function Button({
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg border-2 px-4 text-base font-bold
        active:opacity-80 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-3 focus-visible:outline-offset-2
        focus-visible:outline-field-warn ${VARIANT[variant]} ${className}`}
      {...props}
    />
  )
}

export function Label({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-bold uppercase tracking-wide text-field-warn">
      {children}
    </label>
  )
}

export const inputClass =
  'w-full min-h-11 rounded-lg border-2 border-field-line bg-black px-3 py-2 text-lg text-field-text placeholder:text-neutral-500 focus:border-field-warn focus:outline-none'

/**
 * Text area that saves without a submit button: commits 500 ms after typing stops,
 * on blur, and on unmount, so nothing typed in the field is lost.
 */
export function CommitTextArea({
  id,
  value,
  onCommit,
  rows = 2,
  placeholder,
  singleLine = false,
  inputMode,
  disabled,
  ariaLabel,
}: {
  id?: string
  value: string
  onCommit: (v: string) => void
  rows?: number
  placeholder?: string
  singleLine?: boolean
  inputMode?: 'text' | 'decimal' | 'numeric'
  disabled?: boolean
  ariaLabel?: string
}) {
  const [draft, setDraft] = useState(value)
  const [editing, setEditing] = useState(false)
  const [lastValue, setLastValue] = useState(value)
  const latest = useRef({ draft, value, onCommit })
  useEffect(() => {
    latest.current = { draft, value, onCommit }
  })

  // Take outside changes to the stored value unless the technician is mid-edit.
  if (value !== lastValue) {
    setLastValue(value)
    if (!editing) setDraft(value)
  }

  useEffect(() => {
    if (draft === value) return
    const t = setTimeout(() => onCommit(draft), 500)
    return () => clearTimeout(t)
  }, [draft, value, onCommit])

  useEffect(
    () => () => {
      const { draft: d, value: v, onCommit: c } = latest.current
      if (d !== v) c(d)
    },
    [],
  )

  const common = {
    id,
    value: draft,
    placeholder,
    disabled,
    'aria-label': ariaLabel,
    onFocus: () => setEditing(true),
    onBlur: () => {
      setEditing(false)
      if (draft !== value) onCommit(draft)
    },
    className: `${inputClass} disabled:opacity-50`,
  }
  return singleLine ? (
    <input {...common} inputMode={inputMode} onChange={(e) => setDraft(e.target.value)} />
  ) : (
    <textarea {...common} rows={rows} onChange={(e) => setDraft(e.target.value)} />
  )
}

export function LockBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded bg-field-warn px-2 py-0.5 text-xs font-black uppercase text-black">
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
        <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5Zm-3 8V7a3 3 0 1 1 6 0v3H9Z" />
      </svg>
      {label}
    </span>
  )
}

export function IssueList({ issues, title }: { issues: { message: string }[]; title: string }) {
  if (issues.length === 0) {
    return (
      <div role="status" className="rounded-lg border-2 border-field-ok p-4 text-lg font-bold text-field-ok">
        {title}: complete.
      </div>
    )
  }
  return (
    <div role="status" className="rounded-lg border-2 border-field-stop p-4">
      <p className="mb-2 text-lg font-black text-field-stop">
        {title}: {issues.length} open {issues.length === 1 ? 'item' : 'items'}
      </p>
      <ul className="list-disc space-y-1 pl-5 text-base">
        {issues.map((i, n) => (
          <li key={n}>{i.message}</li>
        ))}
      </ul>
    </div>
  )
}

/** Labeled single-line text field that saves itself. */
export function TextField({
  label,
  value,
  onCommit,
  multiline = false,
  placeholder,
  disabled,
  inputMode,
}: {
  label: string
  value: string
  onCommit: (v: string) => void
  multiline?: boolean
  placeholder?: string
  disabled?: boolean
  inputMode?: 'text' | 'decimal' | 'numeric'
}) {
  const id = useId()
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <CommitTextArea id={id} value={value} onCommit={onCommit} singleLine={!multiline} rows={3} placeholder={placeholder} disabled={disabled} inputMode={inputMode} />
    </div>
  )
}

export function Section({ title, note, children, appOnly = false }: { title: string; note?: string; children: ReactNode; appOnly?: boolean }) {
  return (
    <section
      className={`space-y-3 rounded-xl border-2 p-4 ${appOnly ? 'border-dashed border-sky-400 bg-sky-950/30' : 'border-field-line bg-field-panel'}`}
    >
      <h2 className="text-lg font-black uppercase leading-tight">{title}</h2>
      {appOnly && <p className="text-sm font-bold text-sky-300">App only. Not on the paper form.</p>}
      {note && <p className="text-base font-bold text-field-warn">{note}</p>}
      {children}
    </section>
  )
}

/** 44px+ checkbox row. Locked boxes are checked and cannot be cleared. */
export function CheckRow({
  label,
  checked,
  onChange,
  locked,
  disabled,
  flag,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  locked?: string
  disabled?: boolean
  /** Highlights a box another part of the form says must be checked. */
  flag?: string
}) {
  const isLocked = locked !== undefined
  return (
    <label
      className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border-2 px-3 py-2 ${
        flag && !checked ? 'border-field-stop' : checked ? 'border-field-warn' : 'border-field-line'
      } ${disabled || isLocked ? 'cursor-not-allowed' : ''} bg-black`}
    >
      <input
        type="checkbox"
        className="h-7 w-7 shrink-0 accent-field-warn"
        checked={checked || isLocked}
        disabled={disabled || isLocked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="min-w-0 flex-1 text-base">
        {label}
        {isLocked && (
          <span className="mt-1 block">
            <LockBadge label={locked} />
          </span>
        )}
        {flag && !checked && <span className="mt-1 block text-sm font-bold text-field-stop">{flag}</span>}
      </span>
    </label>
  )
}

export function CheckGroup<K extends string>({
  title,
  items,
  selected,
  onToggle,
  locked,
  flagged,
  disabled,
}: {
  title?: string
  items: readonly Item<K>[]
  selected: readonly string[]
  onToggle: (key: K, checked: boolean) => void
  locked?: ReadonlyMap<string, string>
  flagged?: ReadonlyMap<string, string>
  disabled?: boolean
}) {
  return (
    <fieldset>
      {title && <legend className="mb-2 text-sm font-bold uppercase tracking-wide text-field-warn">{title}</legend>}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {items.map((i) => (
          <CheckRow
            key={i.key}
            label={i.label}
            checked={selected.includes(i.key)}
            locked={locked?.get(i.key)}
            flag={flagged?.get(i.key)}
            disabled={disabled}
            onChange={(c) => onToggle(i.key, c)}
          />
        ))}
      </div>
    </fieldset>
  )
}

/** Yes / No (/ N/A) answer row. */
export function ChoiceRow<V extends string>({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label: string
  value: V | null | undefined
  options: readonly { value: V; label: string }[]
  onChange: (v: V) => void
  disabled?: boolean
}) {
  return (
    <div role="radiogroup" aria-label={label} className="space-y-2 rounded-lg border-2 border-field-line bg-black p-3">
      <p className="text-base">{label}</p>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <Button
            key={o.value}
            role="radio"
            aria-checked={value === o.value}
            disabled={disabled}
            variant={value === o.value ? (o.value === 'no' ? 'danger' : 'primary') : 'secondary'}
            className={value === o.value && o.value === 'no' ? 'bg-field-stop text-black' : ''}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </Button>
        ))}
      </div>
    </div>
  )
}

export function DateField({ label, value, onChange, withTime = false, disabled }: { label: string; value: string | undefined; onChange: (iso: string) => void; withTime?: boolean; disabled?: boolean }) {
  const id = useId()
  const date = isoToLocalDate(value)
  const time = isoToLocalTime(value)
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap gap-2">
        <input id={id} type="date" disabled={disabled} className={`${inputClass} min-w-0 flex-1 basis-40 disabled:opacity-50`} value={date} onChange={(e) => onChange(localToIso(e.target.value, time))} />
        {withTime && (
          <input
            type="time"
            aria-label={`${label} time`}
            disabled={disabled || !date}
            className={`${inputClass} min-w-0 flex-1 basis-28 disabled:opacity-50`}
            value={time}
            onChange={(e) => onChange(localToIso(date, e.target.value))}
          />
        )}
      </div>
    </div>
  )
}
