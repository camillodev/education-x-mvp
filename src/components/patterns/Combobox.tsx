'use client'

import * as React from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface ComboboxProps {
  options: readonly string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  /** When true, lets the user pick a value not present in the options. */
  allowCustom?: boolean
  id?: string
}

/**
 * Searchable select built on shadcn Popover + Command (cmdk).
 * With `allowCustom`, typing a value not in the list offers "Usar: <texto>",
 * so the user can register a value outside the known options.
 */
export function Combobox({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  searchPlaceholder = 'Buscar...',
  allowCustom = false,
  id,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState('')

  const trimmed = query.trim()
  const hasExactMatch = options.some(
    (o) => o.toLowerCase() === trimmed.toLowerCase()
  )
  const showCreate = allowCustom && trimmed.length > 0 && !hasExactMatch

  function select(val: string) {
    onChange(val)
    setOpen(false)
    setQuery('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="mt-1 w-full justify-between font-normal"
        >
          <span className={cn('truncate', !value && 'text-gray-400')}>
            {value || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput
            placeholder={searchPlaceholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {!showCreate && <CommandEmpty>Nenhum resultado.</CommandEmpty>}
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option} value={option} onSelect={() => select(option)}>
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
              {showCreate && (
                <CommandItem value={`__create__${trimmed}`} onSelect={() => select(trimmed)}>
                  <span className="mr-2 text-gray-400">+</span>
                  Usar: <span className="ml-1 font-medium">{trimmed}</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
