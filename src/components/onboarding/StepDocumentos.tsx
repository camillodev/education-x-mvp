'use client'

import { useState } from 'react'
import { Trash2, Plus } from 'lucide-react'
import type { SubjectInput } from '@/lib/validations/unit'
import { formatBRL } from '@/lib/format'

interface Props {
  subjects: SubjectInput[]
  onAddSubject: (subject: SubjectInput) => void
  onRemoveSubject: (index: number) => void
  onUpdateSubject: (index: number, subject: Partial<SubjectInput>) => void
}

const emptySubject: SubjectInput = {
  name: '',
  nfseServiceCode: '',
  priceCents: 0,
}

function parseBRL(value: string): number {
  const numeric = value.replace(/\D/g, '')
  return parseInt(numeric || '0', 10)
}

export function StepDocumentos({ subjects, onAddSubject, onRemoveSubject, onUpdateSubject }: Props) {
  const [newSubject, setNewSubject] = useState<SubjectInput>({ ...emptySubject })
  const [addError, setAddError] = useState('')

  function handleAddSubject() {
    if (!newSubject.name.trim()) {
      setAddError('Nome da matéria obrigatório')
      return
    }
    if (!newSubject.nfseServiceCode.trim()) {
      setAddError('Código NFS-e obrigatório')
      return
    }
    if (newSubject.priceCents <= 0) {
      setAddError('Preço deve ser maior que zero')
      return
    }
    setAddError('')
    onAddSubject({ ...newSubject })
    setNewSubject({ ...emptySubject })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-primary)]">Matérias oferecidas pela unidade</h2>
        <p className="mt-1 text-sm text-gray-500">
          As matérias/cursos que a unidade oferece, com o valor da mensalidade de cada.
        </p>
      </div>

      {/* Tabela de matérias */}
      <div>
        <h3 className="mb-2 text-sm font-medium text-gray-700">
          Matérias *{' '}
          <span className="font-normal text-gray-400">(pelo menos 1)</span>
        </h3>

        {/* Desktop: tabela */}
        {subjects.length > 0 && (
          <div className="mb-3 hidden rounded-md border border-gray-200 sm:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Matéria</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Código NFS-e</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Preço</th>
                  <th className="w-10 px-3 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subjects.map((subject, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={subject.name}
                        onChange={(e) => onUpdateSubject(idx, { name: e.target.value })}
                        className="w-full bg-transparent text-sm focus:outline-none"
                        aria-label={`Nome da matéria ${idx + 1}`}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="text"
                        value={subject.nfseServiceCode}
                        onChange={(e) => onUpdateSubject(idx, { nfseServiceCode: e.target.value })}
                        className="w-full bg-transparent text-sm focus:outline-none"
                        aria-label={`Código NFS-e da matéria ${idx + 1}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={formatBRL(subject.priceCents)}
                        onChange={(e) =>
                          onUpdateSubject(idx, { priceCents: parseBRL(e.target.value) })
                        }
                        className="w-28 bg-transparent text-right text-sm focus:outline-none"
                        aria-label={`Preço da matéria ${idx + 1}`}
                      />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => onRemoveSubject(idx)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        aria-label={`Remover matéria ${subject.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile: cards */}
        {subjects.length > 0 && (
          <div className="mb-3 space-y-3 sm:hidden">
            {subjects.map((subject, idx) => (
              <div key={idx} className="relative rounded-md border border-gray-200 p-3">
                <button
                  type="button"
                  onClick={() => onRemoveSubject(idx)}
                  className="absolute right-2 top-2 text-gray-400 hover:text-red-500"
                  aria-label={`Remover matéria ${subject.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <label className="block text-xs text-gray-400">Matéria</label>
                <input
                  type="text"
                  value={subject.name}
                  onChange={(e) => onUpdateSubject(idx, { name: e.target.value })}
                  className="mb-2 w-full border-b border-gray-200 pb-1 pr-6 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                  aria-label={`Nome da matéria ${idx + 1}`}
                />
                <label className="block text-xs text-gray-400">Código NFS-e</label>
                <input
                  type="text"
                  value={subject.nfseServiceCode}
                  onChange={(e) => onUpdateSubject(idx, { nfseServiceCode: e.target.value })}
                  className="mb-2 w-full border-b border-gray-200 pb-1 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                  aria-label={`Código NFS-e da matéria ${idx + 1}`}
                />
                <label className="block text-xs text-gray-400">Preço (R$)</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formatBRL(subject.priceCents)}
                  onChange={(e) => onUpdateSubject(idx, { priceCents: parseBRL(e.target.value) })}
                  className="w-full border-b border-gray-200 pb-1 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                  aria-label={`Preço da matéria ${idx + 1}`}
                />
              </div>
            ))}
          </div>
        )}

        {/* Linha de adição */}
        <div className="rounded-md border border-dashed border-[var(--color-border-input)] p-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <input
              type="text"
              placeholder="Nome da matéria"
              value={newSubject.name}
              onChange={(e) => setNewSubject((s) => ({ ...s, name: e.target.value }))}
              className="rounded border border-[var(--color-border-input)] px-2 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
              aria-label="Nome da nova matéria"
            />
            <input
              type="text"
              placeholder="Código NFS-e (ex: 8.01)"
              value={newSubject.nfseServiceCode}
              onChange={(e) => setNewSubject((s) => ({ ...s, nfseServiceCode: e.target.value }))}
              className="rounded border border-[var(--color-border-input)] px-2 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
              aria-label="Código NFS-e da nova matéria"
            />
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="decimal"
                placeholder="R$ 0,00"
                value={newSubject.priceCents > 0 ? formatBRL(newSubject.priceCents) : ''}
                onChange={(e) =>
                  setNewSubject((s) => ({ ...s, priceCents: parseBRL(e.target.value) }))
                }
                className="flex-1 rounded border border-[var(--color-border-input)] px-2 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                aria-label="Preço da nova matéria"
              />
              <button
                type="button"
                onClick={handleAddSubject}
                className="flex items-center gap-1 rounded bg-[var(--color-primary)] px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition-opacity"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar
              </button>
            </div>
          </div>
          {addError && <p className="mt-1.5 text-xs text-red-500">{addError}</p>}
        </div>

        {subjects.length === 0 && (
          <p className="mt-2 text-xs text-red-500">
            Adicione pelo menos uma matéria para continuar.
          </p>
        )}
      </div>
    </div>
  )
}
