import { redirect } from 'next/navigation'

type PageProps = { params: Promise<{ id: string }> }

export default async function SchoolPage({ params }: PageProps) {
  const { id } = await params
  redirect(`/escolas/${id}/editar` as never)
}
