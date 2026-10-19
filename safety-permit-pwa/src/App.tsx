import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { FormShell } from './components/FormShell'
import { PermitClosureForm } from './components/PermitClosureForm'
import { PTW1Form } from './components/PTW1Form'
import { TSTIPage1 } from './components/TSTIPage1'
import { TSTIPage2 } from './components/TSTIPage2'
import { Button } from './components/ui'
import { createPermitDraft } from './db/repo'
import { db } from './db/schema'

type Tab = 'ptw' | 'tsti1' | 'tsti2' | 'form2'
const TABS: { key: Tab; label: string }[] = [
  { key: 'ptw', label: 'PTW 1' },
  { key: 'tsti1', label: 'TSTI 1' },
  { key: 'tsti2', label: 'TSTI 2' },
  { key: 'form2', label: 'Form 2' },
]

export default function App() {
  const [permitId, setPermitId] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('ptw')

  if (!permitId) return <PermitList onOpen={(id) => { setPermitId(id); setTab('ptw') }} />

  return (
    <div className="pb-24">
      {tab === 'ptw' && <PTW1Form permitId={permitId} />}
      {tab === 'tsti1' && <TSTIPage1 permitId={permitId} onNext={() => setTab('tsti2')} />}
      {tab === 'tsti2' && <TSTIPage2 permitId={permitId} />}
      {tab === 'form2' && <PermitClosureForm permitId={permitId} />}
      <nav aria-label="Forms" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t-2 border-field-line bg-black p-2">
        <Button variant="ghost" className="px-1 text-sm" onClick={() => setPermitId(null)}>
          ◀ List
        </Button>
        {TABS.map((t) => (
          <Button
            key={t.key}
            aria-current={tab === t.key ? 'page' : undefined}
            variant={tab === t.key ? 'primary' : 'secondary'}
            className="px-1 text-sm"
            onClick={() => {
              setTab(t.key)
              window.scrollTo(0, 0)
            }}
          >
            {t.label}
          </Button>
        ))}
      </nav>
    </div>
  )
}

function PermitList({ onOpen }: { onOpen: (permitId: string) => void }) {
  const permits = useLiveQuery(() => db.permits.orderBy('updatedAt').reverse().toArray(), [])
  const [creating, setCreating] = useState(false)

  return (
    <FormShell title="Permits" subtitle="Morris site">
      <Button
        variant="primary"
        className="w-full text-lg"
        disabled={creating}
        onClick={async () => {
          setCreating(true)
          try {
            onOpen((await createPermitDraft()).permitId)
          } finally {
            setCreating(false)
          }
        }}
      >
        + New permit
      </Button>
      {permits?.length === 0 && <p className="text-lg text-neutral-300">No permits on this device.</p>}
      <ul className="space-y-2">
        {permits?.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => onOpen(p.id)}
              className="flex min-h-14 w-full items-center justify-between gap-3 rounded-lg border-2 border-field-line bg-field-panel px-4 py-3 text-left"
            >
              <span>
                <span className="block text-lg font-bold">{p.permitNumber || '(no permit number)'}</span>
                <span className="block text-sm text-neutral-300">{new Date(p.date).toLocaleDateString()}</span>
              </span>
              <span className="text-sm font-black uppercase text-field-warn">{p.status}</span>
            </button>
          </li>
        ))}
      </ul>
    </FormShell>
  )
}
