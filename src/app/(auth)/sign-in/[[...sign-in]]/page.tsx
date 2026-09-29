import { SignIn } from '@clerk/nextjs'
import { AutoSignOutOnInvalidSession } from '@/components/auth/AutoSignOutOnInvalidSession'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function SignInPage({ searchParams }: Props) {
  const { error } = await searchParams
  const invalidSession = error === 'invalid_session'

  return (
    <div className="flex flex-col items-center gap-4">
      {invalidSession && (
        <>
          <div
            role="alert"
            className="max-w-sm rounded-md border border-(--color-danger) bg-(--color-danger-soft) p-3 text-sm text-(--color-danger)"
          >
            Sua sessão não pôde ser validada. Faça login novamente.
          </div>
          <AutoSignOutOnInvalidSession />
        </>
      )}
      <SignIn />
    </div>
  )
}
