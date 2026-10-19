import { setSignature } from '../db/repo'
import type { Signature, SignatureRole } from '../db/types'
import type { Run } from './hooks'
import { CommitTextArea, DateField, Label } from './ui'

/** Name + date (+ time, + badge) signature line, matching the paper form layout. */
export function SignatureBlock({
  label,
  permitId,
  docType,
  role,
  signatures,
  run,
  withTime = false,
  badgeLabel,
  disabled,
}: {
  label: string
  permitId: string
  docType: Signature['docType']
  role: SignatureRole
  signatures: Signature[]
  run: Run
  withTime?: boolean
  badgeLabel?: string
  disabled?: boolean
}) {
  const sig = signatures.find((s) => s.docType === docType && s.role === role)
  const save = (changes: Parameters<typeof setSignature>[3]) => run(() => setSignature(permitId, docType, role, changes))
  const id = `sig-${docType}-${role}`
  return (
    <div className="space-y-2 rounded-lg border-2 border-field-line bg-black p-3">
      <Label htmlFor={id}>{label}</Label>
      <CommitTextArea id={id} singleLine value={sig?.name ?? ''} placeholder="Print name" disabled={disabled} onCommit={(name) => save({ name })} />
      {badgeLabel && (
        <CommitTextArea
          singleLine
          ariaLabel={badgeLabel}
          value={sig?.badgeOrEmployeeId ?? ''}
          placeholder={badgeLabel}
          disabled={disabled}
          onCommit={(badgeOrEmployeeId) => save({ badgeOrEmployeeId })}
        />
      )}
      <DateField label={withTime ? 'Date / Time' : 'Date'} withTime={withTime} value={sig?.signedAt} disabled={disabled} onChange={(signedAt) => save({ signedAt })} />
    </div>
  )
}
