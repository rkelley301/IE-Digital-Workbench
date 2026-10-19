import type { ReactNode } from 'react'
import { DisclaimerBanner } from './DisclaimerBanner'

/** Wrapper for every form. Guarantees the disclaimer banner is present. */
export function FormShell({ title, subtitle, status, children }: { title: string; subtitle?: string; status?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DisclaimerBanner />
      <header className="flex items-center justify-between gap-3 border-b-2 border-field-line px-4 py-3">
        <div>
          <h1 className="text-2xl font-black uppercase">{title}</h1>
          {subtitle && <p className="text-base text-neutral-300">{subtitle}</p>}
        </div>
        {status}
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-4">{children}</main>
    </div>
  )
}
