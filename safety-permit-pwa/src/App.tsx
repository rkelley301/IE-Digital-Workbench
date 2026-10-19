import { useEffect, useState } from 'react'
import { db } from './db/schema'
import { createPermitDraft } from './db/repo'
import { TSTIPage1 } from './components/TSTIPage1'
import { FormShell } from './components/FormShell'

// Module-level so StrictMode's double effect run cannot create two drafts.
let opening: Promise<string> | undefined
function openLatestDraft(): Promise<string> {
  opening ??= (async () => {
    const drafts = await db.permits.where('status').equals('draft').reverse().sortBy('updatedAt')
    return drafts[0]?.id ?? (await createPermitDraft()).permitId
  })()
  return opening
}

// Temporary shell: opens the newest draft (or creates one) on TSTI Page 1.
// Replaced by permit list + form navigation when the remaining forms land.
export default function App() {
  const [permitId, setPermitId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void openLatestDraft().then((id) => {
      if (!cancelled) setPermitId(id)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!permitId) return <FormShell title="TSTI Permits">Loading…</FormShell>
  return <TSTIPage1 permitId={permitId} />
}
