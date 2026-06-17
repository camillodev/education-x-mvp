import { clerkClient } from '@clerk/nextjs/server'

interface InviteParams {
  email: string
  unitId: string
}

/**
 * Invites the school's responsible to access the platform.
 * The invitation's publicMetadata becomes the user's publicMetadata on sign-up,
 * scoping them to their unit with the `fran` role.
 *
 * Never throws: a failed invite must not roll back the terms acceptance — the
 * acceptance is the legally important part. Logs and continues.
 */
export async function inviteUnitResponsible({ email, unitId }: InviteParams): Promise<void> {
  // Sem secret do Clerk (ex.: dev/sandbox), apenas loga.
  if (!process.env.CLERK_SECRET_KEY) {
    // eslint-disable-next-line no-console
    console.info(`[clerk:dev] Sem CLERK_SECRET_KEY — convite não enviado para ${email} (unit ${unitId})`)
    return
  }

  try {
    const client = await clerkClient()
    await client.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { role: 'fran', unitId },
      ignoreExisting: true,
    })
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[clerk] Falha ao enviar convite de acesso:', err)
  }
}
