import { createRouteMatcher } from '@clerk/nextjs/server'

// Paths that skip Clerk's auth.protect(). Keep this list minimal and segment-exact:
// a pattern like '/m(.*)' also matches '/matriculas', so every prefix ends in '/(.*)'.
// Anything under /api that is not listed here must be guarded in its own handler AND
// is protected by the middleware.
export const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/m/(.*)', // public enrollment link flow: /m/[token]/...
  '/api/webhook', // Asaas webhook: exact path, authenticated by secret token in the handler
  '/api/cron/billing', // Vercel Cron: exact path, authenticated by bearer CRON_SECRET in the handler
  '/termos',
  '/termos/(.*)',
  '/confirmar/(.*)', // school terms acceptance link (token proves the recipient)
  '/api/confirmar/(.*)',
])
