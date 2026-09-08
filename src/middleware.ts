import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/m(.*)',                    // link de matrícula pública (responsável) — /m/[token]
  '/api/enrollment(.*)',       // API do fluxo de matrícula pública (token prova o destinatário)
  '/api/webhook',              // webhook Asaas (auth por token secreto no handler; rota exata, não prefixo)
  '/termos(.*)',              // visualização pública dos termos
  '/confirmar(.*)',           // aceite dos termos via link (token prova o destinatário)
  '/api/confirmar(.*)',       // POST do aceite (público, valida token)
  '/painel(.*)',              // TEMP: frontend mockado (dados via /api/mock/*), sem auth real ainda — remover quando plugar tenant real
  '/api/mock(.*)',            // TEMP: dados mockados do /painel — remover junto com a exceção acima
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
