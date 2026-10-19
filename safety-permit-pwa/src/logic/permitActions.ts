// Permit status changes. Each one re-validates against the database before writing,
// so a disabled button is not the only thing standing between a draft and "active".

import { now, patchRecord } from '../db/repo'
import type { Permit } from '../db/types'
import { isSubmitDisabled, loadBundle, validateClosure, validateSignOff } from './validation'

export class BlockedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BlockedError'
  }
}

async function bundleOrThrow(permitId: string) {
  const b = await loadBundle(permitId)
  if (!b) throw new Error('Permit not found.')
  return b
}

/** Sign-off: draft -> active. Refused while STOP Work is unacknowledged or any item is open. */
export async function activatePermit(permitId: string): Promise<void> {
  const b = await bundleOrThrow(permitId)
  if (b.permit.status !== 'draft') throw new BlockedError('Only a draft permit can be activated.')
  if (isSubmitDisabled(b.tsti)) throw new BlockedError('Acknowledge STOP Work Authority.')
  const issues = validateSignOff(b)
  if (issues.length > 0) throw new BlockedError(`${issues.length} open items. ${issues[0]!.message}`)
  await patchRecord('permits', permitId, { status: 'active', workStartedAt: now() })
}

/** Emergency alarm or changed conditions. One-way: work resumes only on a new permit. */
export async function invalidatePermit(permitId: string, reason: NonNullable<Permit['invalidatedReason']>): Promise<void> {
  const b = await bundleOrThrow(permitId)
  if (b.permit.status !== 'active') throw new BlockedError('Only an active permit can be invalidated.')
  await patchRecord('permits', permitId, { status: 'invalidated', invalidatedAt: now(), invalidatedReason: reason })
}

export async function recordWorkEnd(permitId: string, at = now()): Promise<void> {
  await patchRecord('permits', permitId, { workEndedAt: at })
}

export async function closePermit(permitId: string): Promise<void> {
  const b = await bundleOrThrow(permitId)
  const issues = validateClosure(b)
  if (issues.length > 0) throw new BlockedError(`${issues.length} open items. ${issues[0]!.message}`)
  await patchRecord('permits', permitId, { status: 'closed' })
  if (b.closure) await patchRecord('closures', b.closure.id, { closedAt: now() })
}
