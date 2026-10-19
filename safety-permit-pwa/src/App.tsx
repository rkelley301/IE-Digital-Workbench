import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db/schema'
import { DISCLAIMER } from './db/seed/reference'

// Placeholder shell until the form components land. The disclaimer banner is permanent.
export default function App() {
  const ruleCount = useLiveQuery(() => db.siteRules.count(), [])
  const permitCount = useLiveQuery(() => db.permits.count(), [])

  return (
    <div className="flex min-h-screen flex-col">
      <div role="note" className="sticky top-0 z-50 bg-field-warn px-4 py-3 text-center text-base font-bold text-black">
        {DISCLAIMER}
      </div>
      <main className="flex-1 p-4">
        <h1 className="text-2xl font-bold">TSTI / JSA Permits</h1>
        <p className="mt-2 text-lg">Site rules loaded: {ruleCount ?? '…'}</p>
        <p className="text-lg">Local permits: {permitCount ?? '…'}</p>
      </main>
    </div>
  )
}
