export {}

/**
 * Tipagem do session token customizado do Clerk.
 *
 * O role/unitId vivem no `publicMetadata` do usuário, que NÃO entra no session
 * token por padrão. Para trafegá-los no JWT, configuramos um custom claim no
 * Clerk Dashboard (Sessions → Customize session token):
 *
 *   { "metadata": "{{user.public_metadata}}" }
 *
 * Com isso, `sessionClaims.metadata` fica tipado e disponível sem network call.
 */
declare global {
  interface CustomJwtSessionClaims {
    metadata?: {
      role?: 'admin' | 'orientador'
      unitId?: string
    }
  }
}
