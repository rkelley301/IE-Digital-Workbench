import type { ReactNode } from 'react'
import { DisclaimerBanner } from './DisclaimerBanner'
import { SyncStatus } from './SyncStatus'

/** Wrapper for every form. Guarantees the disclaimer banner and save status are present. */
export function FormShell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DisclaimerBanner />
      <header className="flex items-start justify-between gap-3 border-b-2 border-field-line px-4 py-3">
        <div className="min-w-0">
          <h1 className="text-xl font-black uppercase whitespace-nowrap sm:text-2xl">{title}</h1>
          {subtitle && <p className="text-base text-neutral-300">{subtitle}</p>}
        </div>
        <SyncStatus />
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-4">{children}</main>
    </div>
  )
}
