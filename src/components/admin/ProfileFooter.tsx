'use client'

import { useClerk, useUser } from '@clerk/nextjs'
import { LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Admin IX',
  orientador: 'Orientadora',
}

export function ProfileFooter() {
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()

  if (!isLoaded) {
    return (
      <div className="mt-auto h-14 animate-pulse rounded-md bg-[var(--color-primary-softer)]" />
    )
  }

  const name =
    [user?.firstName, user?.lastName].filter(Boolean).join(' ') ||
    user?.fullName ||
    user?.primaryEmailAddress?.emailAddress ||
    'Usuário'
  const role = (user?.publicMetadata?.role as string | undefined) ?? ''
  const roleLabel = ROLE_LABEL[role] ?? role
  const initial = name.charAt(0).toUpperCase()

  return (
    <div className="mt-auto flex items-center gap-3 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--color-border)] bg-white text-sm font-semibold text-[var(--color-primary)]"
      >
        {initial}
      </span>
      <div className="flex min-w-0 flex-1 flex-col leading-tight">
        <span className="truncate text-sm font-semibold text-[var(--color-text)]">{name}</span>
        {roleLabel && (
          <span className="truncate text-xs text-[var(--color-text-subtle)]">{roleLabel}</span>
        )}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Sair"
        onClick={() => signOut({ redirectUrl: '/' })}
      >
        <LogOut className="h-4 w-4" />
      </Button>
    </div>
  )
}
