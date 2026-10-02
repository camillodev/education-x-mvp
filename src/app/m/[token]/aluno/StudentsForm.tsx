'use client'

import { useActionState, useState } from 'react'
import { User, Calendar, Plus, Trash2 } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Chip } from '@/components/ui/Chip'
import { Button } from '@/components/ui/button'
import { maskBirthDate } from '@/components/onboarding/dados-masks'
import { submitStudentsStepAction, type StudentBlockFormState } from './actions'

const MAX_STUDENTS = 5

interface SubjectOption {
  id: string
  name: string
}

interface StudentBlockState {
  key: string
  name: string
  birthDate: string
  subjectIds: string[]
}

function emptyBlock(): StudentBlockState {
  return { key: crypto.randomUUID(), name: '', birthDate: '', subjectIds: [] }
}

interface Props {
  token: string
  subjects: SubjectOption[]
}

const INITIAL_STATE: StudentBlockFormState = { blockErrors: [] }

export function StudentsForm({ token, subjects }: Props) {
  const action = submitStudentsStepAction.bind(null, token)
  const [state, formAction, pending] = useActionState(action, INITIAL_STATE)
  const [blocks, setBlocks] = useState<StudentBlockState[]>([emptyBlock()])

  const title = blocks.length > 1 ? 'Dados dos alunos' : 'Dados do aluno'

  function updateBlock(index: number, patch: Partial<StudentBlockState>) {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));
  }

  function toggleSubject(index: number, subjectId: string) {
    setBlocks((prev) =>
      prev.map((b, i) => {
        if (i !== index) return b
        const has = b.subjectIds.includes(subjectId)
        return { ...b, subjectIds: has ? b.subjectIds.filter((s) => s !== subjectId) : [...b.subjectIds, subjectId] }
      })
    )
  }

  function addBlock() {
    if (blocks.length >= MAX_STUDENTS) return
    setBlocks((prev) => [...prev, emptyBlock()])
  }

  function removeBlock(index: number) {
    setBlocks((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <Card className="p-6">
      <h1 className="text-xl font-bold text-(--color-text)">{title}</h1>
      <p className="mt-1 text-sm text-(--color-text-subtle)">Passo 2 de 4</p>

      {state.formError && <p className="mt-3 text-sm text-(--color-danger)">{state.formError}</p>}

      <form action={formAction} className="mt-5 flex flex-col gap-6">
        <input type="hidden" name="blockCount" value={blocks.length} />

        {blocks.map((block, index) => {
          const errors = state.blockErrors[index] ?? {}
          return (
            <div key={block.key} className="rounded-(--radius-lg) border border-(--color-border) p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-(--color-text)">Aluno {index + 1}</span>
                {blocks.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBlock(index)}
                    className="text-(--color-text-subtle) hover:text-(--color-danger)"
                    aria-label={`Remover aluno ${index + 1}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-4">
                <Field label="Nome do aluno" htmlFor={`name-${index}`} required error={errors.name}>
                  <Input
                    id={`name-${index}`}
                    name={`students[${index}].name`}
                    value={block.name}
                    onChange={(e) => updateBlock(index, { name: e.target.value })}
                    placeholder="Nome completo"
                    leadingIcon={<User size={18} />}
                    error={!!errors.name}
                  />
                </Field>

                <Field label="Data de nascimento" htmlFor={`birthDate-${index}`} required error={errors.birthDate}>
                  <Input
                    id={`birthDate-${index}`}
                    name={`students[${index}].birthDate`}
                    value={block.birthDate}
                    onChange={(e) => updateBlock(index, { birthDate: maskBirthDate(e.target.value) })}
                    placeholder="DD/MM/AAAA"
                    inputMode="numeric"
                    maxLength={10}
                    leadingIcon={<Calendar size={18} />}
                    error={!!errors.birthDate}
                  />
                </Field>

                <div>
                  <span className="text-[13px] font-semibold text-(--color-text)">
                    Matérias<span className="ml-0.5 text-(--color-danger)">*</span>
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    {subjects.map((subject) => (
                      <Chip
                        key={subject.id}
                        active={block.subjectIds.includes(subject.id)}
                        onClick={() => toggleSubject(index, subject.id)}
                        size="sm"
                      >
                        {subject.name}
                      </Chip>
                    ))}
                  </div>
                  {block.subjectIds.map((id) => (
                    <input key={id} type="hidden" name={`students[${index}].subjectIds`} value={id} />
                  ))}
                  {errors.subjectIds && <p className="mt-1 text-xs text-(--color-danger)">{errors.subjectIds}</p>}
                </div>
              </div>
            </div>
          )
        })}

        {blocks.length < MAX_STUDENTS ? (
          <button
            type="button"
            onClick={addBlock}
            className="flex items-center justify-center gap-2 rounded-(--radius-lg) border border-dashed border-(--color-border-input) py-3 text-sm font-semibold text-(--color-primary) hover:bg-(--color-primary-softer)"
          >
            <Plus size={16} /> Adicionar outro aluno
          </button>
        ) : (
          <p className="text-center text-xs text-(--color-text-subtle)">
            Máximo de 5 alunos por matrícula. Para mais alunos, crie uma nova matrícula.
          </p>
        )}

        <Button type="submit" size="lg" disabled={pending} className="w-full">
          {pending ? 'Salvando…' : 'Continuar'}
        </Button>
      </form>
    </Card>
  )
}
