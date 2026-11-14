import { createRouteMatcher } from '@clerk/nextjs/server'

// Segment-exact on purpose: '/m(.*)' would also match '/matriculas'.
export const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/m/(.*)',
  '/api/webhook',
  '/api/cron/billing',
  '/termos',
  '/termos/(.*)',
  '/confirmar/(.*)',
  '/api/confirmar/(.*)',
])
