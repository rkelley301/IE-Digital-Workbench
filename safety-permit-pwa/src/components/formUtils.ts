// Non-component helpers shared by the form components.

export const toggle = <K extends string>(list: readonly K[], key: K, on: boolean): K[] =>
  on ? (list.includes(key) ? [...list] : [...list, key]) : list.filter((k) => k !== key)

export const YES_NO = [
  { value: 'yes', label: 'Yes' },
  { value: 'no', label: 'No' },
] as const
export const YES_NO_NA = [...YES_NO, { value: 'na', label: 'N/A' }] as const

// Dates: local time in the UI, ISO in storage.
const pad = (n: number) => String(n).padStart(2, '0')
export const isoToLocalDate = (iso: string | undefined): string => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
export const isoToLocalTime = (iso: string | undefined): string => {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : `${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export const localToIso = (date: string, time = '00:00'): string => (date ? new Date(`${date}T${time || '00:00'}`).toISOString() : '')

