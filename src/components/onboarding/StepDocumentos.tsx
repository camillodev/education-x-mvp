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

// Defaults de preço por período conforme política comercial
const DEFAULT_MONTHLY_CENTS = 45000   // R$ 450,00
const DEFAULT_QUARTERLY_CENTS = 43000 // R$ 430,00
const DEFAULT_SEMIANNUAL_CENTS = 40000 // R$ 400,00
const DEFAULT_ANNUAL_CENTS = 38000    // R$ 380,00

const emptySubject: SubjectInput = {
  name: '',
  nfseServiceCode: '',
  priceCents: DEFAULT_MONTHLY_CENTS,
  quarterlyPriceCents: DEFAULT_QUARTERLY_CENTS,
  semiannualPriceCents: DEFAULT_SEMIANNUAL_CENTS,
  annualPriceCents: DEFAULT_ANNUAL_CENTS,
}

function parseBRL(value: string): number {
  const numeric = value.replace(/\D/g, '')
  return parseInt(numeric || '0', 10)
}

function PriceTiers({ subject }: { subject: SubjectInput }) {
  const parts: string[] = []
  if (subject.quarterlyPriceCents) parts.push(`3×: ${formatBRL(subject.quarterlyPriceCents)}`)
  if (subject.semiannualPriceCents) parts.push(`6×: ${formatBRL(subject.semiannualPriceCents)}`)
  if (subject.annualPriceCents) parts.push(`12×: ${formatBRL(subject.annualPriceCents)}`)
  if (parts.length === 0) return null
  return (
    <span className="block text-xs text-[var(--color-text-subtle)]">
      {parts.join(' · ')}
    </span>
  )
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

  // Sem auto-fill por cálculo — cada campo tem seu default independente.
  // O usuário edita livremente; os defaults já vêm preenchidos no emptySubject.

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
                  <tr key={idx} className="bg-[var(--color-primary-softer)] hover:bg-[var(--color-primary-soft)]/30">
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
                      <PriceTiers subject={subject} />
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
              <div key={idx} className="relative rounded-md border border-[var(--color-primary-soft)] bg-[var(--color-primary-softer)] p-3">
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
                  className="mb-1 w-full border-b border-gray-200 pb-1 text-sm focus:border-[var(--color-primary)] focus:outline-none"
                  aria-label={`Preço da matéria ${idx + 1}`}
                />
                <PriceTiers subject={subject} />
              </div>
            ))}
          </div>
        )}

        {/* Linha de adição */}
        <div className="rounded-md border border-dashed border-gray-300 p-3">
          {/* Linha 1: Nome | Código NFS-e */}
          <div className="mb-2 grid gap-2 sm:grid-cols-2">
            <input
              type="text"
              placeholder="Nome da matéria"
              value={newSubject.name}
              onChange={(e) => setNewSubject((s) => ({ ...s, name: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
              aria-label="Nome da nova matéria"
            />
            <input
              type="text"
              placeholder="Código NFS-e (ex: 8.01)"
              value={newSubject.nfseServiceCode}
              onChange={(e) => setNewSubject((s) => ({ ...s, nfseServiceCode: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
              aria-label="Código NFS-e da nova matéria"
            />
          </div>
          {/* Linha 2: Preços + botão */}
          <div className="flex flex-wrap gap-2">
            <input
              type="text"
              inputMode="decimal"
              placeholder="Mensal"
              value={newSubject.priceCents > 0 ? formatBRL(newSubject.priceCents) : ''}
              onChange={(e) =>
                setNewSubject((s) => ({ ...s, priceCents: parseBRL(e.target.value) }))
              }
              className="w-36 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
              aria-label="Preço mensal da nova matéria"
            />
            <input
              type="text"
              inputMode="decimal"
              placeholder="Trimestral"
              value={newSubject.quarterlyPriceCents && newSubject.quarterlyPriceCents > 0 ? formatBRL(newSubject.quarterlyPriceCents) : ''}
              onChange={(e) =>
                setNewSubject((s) => ({ ...s, quarterlyPriceCents: parseBRL(e.target.value) || undefined }))
              }
              className="w-36 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
              aria-label="Preço trimestral da nova matéria"
            />
            <input
              type="text"
              inputMode="decimal"
              placeholder="Semestral"
              value={newSubject.semiannualPriceCents && newSubject.semiannualPriceCents > 0 ? formatBRL(newSubject.semiannualPriceCents) : ''}
              onChange={(e) =>
                setNewSubject((s) => ({ ...s, semiannualPriceCents: parseBRL(e.target.value) || undefined }))
              }
              className="w-36 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
              aria-label="Preço semestral da nova matéria"
            />
            <input
              type="text"
              inputMode="decimal"
              placeholder="Anual"
              value={newSubject.annualPriceCents && newSubject.annualPriceCents > 0 ? formatBRL(newSubject.annualPriceCents) : ''}
              onChange={(e) =>
                setNewSubject((s) => ({ ...s, annualPriceCents: parseBRL(e.target.value) || undefined }))
              }
              className="w-36 rounded border border-gray-300 px-2 py-1.5 text-sm focus:border-[var(--color-primary)] focus:outline-none"
              aria-label="Preço anual da nova matéria"
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
