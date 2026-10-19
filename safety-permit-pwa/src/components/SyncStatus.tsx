import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/schema'

// Local-first save status, driven by the outbox. There is no backend yet, so
// "pending sync" only means "not yet sent anywhere"; every change is already on the device.
export function SyncStatus() {
  const pending = useLiveQuery(() => db.outbox.count(), [])
  if (pending === undefined) return null

  const clean = pending === 0
  const label = clean ? 'Saved locally' : `Saved locally. ${pending} ${pending === 1 ? 'change' : 'changes'} pending sync.`

  return (
    <div
      role="status"
      aria-live="polite"
      className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border-2 px-3 text-xs font-bold ${
        clean ? 'border-field-ok text-field-ok' : 'border-field-warn text-field-warn'
      }`}
    >
      <span aria-hidden="true" className={`h-3 w-3 rounded-full ${clean ? 'bg-field-ok' : 'bg-field-warn'}`} />
      <span className="max-w-32 leading-tight">{label}</span>
    </div>
  )
}
