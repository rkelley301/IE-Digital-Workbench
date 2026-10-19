import { DISCLAIMER } from '../db/seed/reference'

/** Permanent, non-dismissible. Rendered by FormShell on every form; there is no close control. */
export function DisclaimerBanner() {
  return (
    <div
      role="note"
      aria-label="Disclaimer"
      className="sticky top-0 z-50 border-b-4 border-black bg-field-warn px-4 py-3 text-center text-base font-black uppercase tracking-wide text-black"
    >
      {DISCLAIMER}
    </div>
  )
}
