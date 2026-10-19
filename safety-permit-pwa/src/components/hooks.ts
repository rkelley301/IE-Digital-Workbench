import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useState } from 'react'
import { loadBundle, type PermitBundle } from '../logic/validation'

/** Live permit bundle. undefined = loading, null = not found. */
export function usePermitBundle(permitId: string): PermitBundle | null | undefined {
  return useLiveQuery(async () => (await loadBundle(permitId)) ?? null, [permitId])
}

export type Run = (fn: () => Promise<unknown>) => void

/** Run a write and surface any error (e.g. LockedItemError) to the technician. */
export function useAction(): { error: string | null; run: Run; clear: () => void } {
  const [error, setError] = useState<string | null>(null)
  const run = useCallback<Run>((fn) => {
    setError(null)
    fn().catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)))
  }, [])
  return { error, run, clear: () => setError(null) }
}
