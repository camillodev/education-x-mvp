'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  label: string
}

interface StepperProps {
  steps: Step[]
  current: number // 1-indexed
}

export function Stepper({ steps, current }: StepperProps) {
  return (
    <nav aria-label="Progresso do cadastro" className="w-full">
      <ol className="flex items-center justify-between gap-2">
        {steps.map((step, idx) => {
          const stepNum = idx + 1
          const isCompleted = stepNum < current
          const isActive = stepNum === current

          return (
            <li key={step.label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5 flex-1">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                    isCompleted &&
                      'border-[var(--color-primary)] bg-[var(--color-primary)] text-white',
                    isActive &&
                      'border-[var(--color-primary)] bg-white text-[var(--color-primary)]',
                    !isCompleted &&
                      !isActive &&
                      'border-gray-300 bg-white text-gray-400'
                  )}
                  aria-current={isActive ? 'step' : undefined}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <span>{stepNum}</span>
                  )}
                </div>
                <span
                  className={cn(
                    'text-center text-xs font-medium leading-tight',
                    isActive ? 'text-[var(--color-primary)]' : 'text-gray-400'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Conector */}
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'mx-2 h-0.5 flex-1 transition-colors',
                    isCompleted ? 'bg-[var(--color-primary)]' : 'bg-gray-200'
                  )}
                  aria-hidden="true"
                />
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
