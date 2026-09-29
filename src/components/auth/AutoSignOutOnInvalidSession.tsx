'use client'

import { useEffect, useRef } from 'react'
import { useAuth, useClerk } from '@clerk/nextjs'

/**
 * Signs the user out automatically when mounted with a still-active session.
 * Used on the sign-in screen when the role guard detected an invalid role/unitId
 * (?error=invalid_session) — the Clerk session exists but isn't a valid role for
 * the app, so it must be terminated before the user tries again.
 */
export function AutoSignOutOnInvalidSession() {
  const { isLoaded, isSignedIn } = useAuth()
  const { signOut } = useClerk()
  const firedRef = useRef(false)

  useEffect(() => {
    if (!isLoaded || !isSignedIn || firedRef.current) return
    firedRef.current = true
    void signOut()
  }, [isLoaded, isSignedIn, signOut])

  return null
}
