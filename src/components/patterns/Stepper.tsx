'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Step {
  label: string
  description?: string
}

interface StepperProps {
  steps: Step[]
  current: number
  orientation?: 'horizontal' | 'vertical'
  onStepClick?: (step: number) => void
}

export function Stepper({ steps, current, orientation = 'horizontal', onStepClick }: StepperProps) {
  const isVertical = orientation === 'vertical'

  return (
    <nav aria-label="Progresso do cadastro" className="w-full">
      <ol className={cn('gap-2', isVertical ? 'flex flex-col' : 'flex items-center justify-between')}>
        {steps.map((step, idx) => {
          const stepNum = idx + 1
          const isCompleted = stepNum < current
          const isActive = stepNum === current

          if (isVertical) {
            return (
              <li key={step.label}>
                <div
                  role={onStepClick ? 'button' : undefined}
                  tabIndex={onStepClick ? 0 : undefined}
                  onClick={onStepClick ? () => onStepClick(stepNum) : undefined}
                  onKeyDown={onStepClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onStepClick(stepNum) } : undefined}
                  className={cn(
                    'flex items-start gap-3',
                    isActive && 'rounded-lg bg-[var(--color-primary-softer)] px-3 py-2',
                    onStepClick && 'cursor-pointer hover:opacity-80 transition-opacity'
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                      isCompleted &&
                        'border-[var(--color-primary)] bg-[var(--color-primary)] text-white',
                      isActive &&
                        'border-[var(--color-primary)] bg-white text-[var(--color-primary)]',
                      !isCompleted &&
                        !isActive &&
                        'border-[var(--color-border)] bg-white text-[var(--color-text-subtle)]'
                    )}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    {isCompleted ? (
                      <Check className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <span>{stepNum}</span>
                    )}
                  </div>

                  <div className="flex flex-col gap-1">
                    <span
                      className={cn(
                        'text-sm font-medium leading-tight',
                        isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-subtle)]'
                      )}
                    >
                      {step.label}
                    </span>
                    {step.description && (
                      <span className="text-xs text-[var(--color-text-subtle)]">
                        {step.description}
                      </span>
                    )}
                  </div>
                </div>

                {idx < steps.length - 1 && (
                  <div
                    className={cn(
                      'ml-4 w-0.5 transition-colors',
                      isCompleted ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]',
                      'h-6'
                    )}
                    aria-hidden="true"
                  />
                )}
              </li>
            )
          }

          return (
            <li key={step.label} className="flex flex-1 items-center">
              <div
                role={onStepClick ? 'button' : undefined}
                tabIndex={onStepClick ? 0 : undefined}
                onClick={onStepClick ? () => onStepClick(stepNum) : undefined}
                onKeyDown={onStepClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') onStepClick(stepNum) } : undefined}
                className={cn(
                  'flex flex-col items-center gap-1.5 flex-1',
                  onStepClick && 'cursor-pointer hover:opacity-80 transition-opacity'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-medium transition-colors',
                    isCompleted &&
                      'border-[var(--color-primary)] bg-[var(--color-primary)] text-white',
                    isActive &&
                      'border-[var(--color-primary)] bg-white text-[var(--color-primary)]',
                    !isCompleted &&
                      !isActive &&
                      'border-[var(--color-border)] bg-white text-[var(--color-text-subtle)]'
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
                    isActive ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-subtle)]'
                  )}
                >
                  {step.label}
                </span>
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    'mx-2 h-0.5 flex-1 transition-colors',
                    isCompleted ? 'bg-[var(--color-primary)]' : 'bg-[var(--color-border)]'
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
