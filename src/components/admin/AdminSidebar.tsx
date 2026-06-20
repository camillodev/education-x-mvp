'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { usePathname } from 'next/navigation'
import { School, PlusCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProfileFooter } from './ProfileFooter'

type NavItem = { href: Route; label: string; icon: typeof School }

const NAV: NavItem[] = [
  { href: '/escolas', label: 'Escolas', icon: School },
  { href: '/onboarding', label: 'Nova escola', icon: PlusCircle },
]

export function AdminSidebar() {
  const pathname = usePathname()
  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <div className="mb-6 flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-bold text-white"
          style={{ background: 'var(--color-primary)' }}
        >
          X
        </div>
        <span className="font-semibold text-[var(--color-text)]">EducationX</span>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                active
                  ? 'bg-[var(--color-primary-softer)] text-[var(--color-primary)]'
                  : 'text-[var(--color-text-subtle)] hover:bg-[var(--color-primary-softer)]'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          )
        })}
      </nav>
      <ProfileFooter />
    </aside>
  )
}
