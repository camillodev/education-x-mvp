import type { ReactNode } from 'react'
import { AdminSidebar } from './AdminSidebar'

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[var(--color-bg)]">
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden p-6 lg:p-10">{children}</main>
    </div>
  )
}
