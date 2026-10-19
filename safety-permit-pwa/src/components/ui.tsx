// Shared field-UI primitives. Every interactive element is at least 44x44px
// (min-h-11 / min-w-11) so it works with gloves.

import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'

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
}: {
  id?: string
  value: string
  onCommit: (v: string) => void
  rows?: number
  placeholder?: string
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

  return (
    <textarea
      id={id}
      rows={rows}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={() => setEditing(true)}
      onBlur={() => {
        setEditing(false)
        if (draft !== value) onCommit(draft)
      }}
      className={inputClass}
    />
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
