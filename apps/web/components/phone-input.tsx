'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import {
  DEFAULT_PHONE_COUNTRY,
  PHONE_COUNTRIES,
  guessPhoneCountry,
  type PhoneCountry,
} from '@/lib/phone-countries'
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

/**
 * A phone number field with a country-code picker: a flag+dial-code trigger to the left of the
 * underline, opening a searchable `sheet` list (same list-item vocabulary as the login page's
 * profile picker) rather than a native `<select>`, so the flag and dial code stay visible in the
 * closed state and the picker matches the rest of the app's flat, ruled-line look.
 *
 * The outer wrapper is a plain `<div>`, not a `<label>` — this control has *two* labelable
 * descendants (the country-trigger `<button>` and the number `<input>`), and a `<label>` wrapping
 * more than one auto-forwards a click on any non-labelable content inside it (like a dropdown
 * item) to the first labelable descendant. That silently re-clicked the trigger button right
 * after a selection, undoing the close. `htmlFor`/`id` on just the number input avoids it.
 *
 * `value`/`onChange` carry the full E.164 string (e.g. `+919885981818`), matching what
 * `registration-form.tsx` and `login/page.tsx` already validate against `PHONE_REGEX` — this
 * component only changes how that string gets typed in, not its shape.
 */
export function PhoneInput({
  label,
  hint,
  value,
  onChange,
  placeholder = '98859 81818',
  large = false,
}: {
  label: string
  hint?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  large?: boolean
}) {
  const [country, setCountry] = useState<PhoneCountry>(
    () => guessPhoneCountry(value) ?? DEFAULT_PHONE_COUNTRY,
  )
  const [national, setNational] = useState(() => stripDialCode(value, country))
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const numberInputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function selectCountry(next: PhoneCountry) {
    setCountry(next)
    setOpen(false)
    setSearch('')
    onChange(compose(next, national))
    numberInputRef.current?.focus()
  }

  function handleNationalChange(raw: string) {
    const digits = raw.replace(/\D/g, '').slice(0, Math.max(0, 15 - country.dialCode.length))
    setNational(digits)
    onChange(compose(country, digits))
  }

  return (
    <div className={cn('block', large ? 'mt-8' : 'mt-7')}>
      <label htmlFor={inputId} className="label flex items-baseline justify-between text-ink-muted">
        {label}
        {hint && <span className="text-ink-muted/60 normal-case">{hint}</span>}
      </label>

      <div ref={containerRef} className="relative mt-2.5 flex items-stretch">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen(o => !o)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 border-b border-ink/25 pr-2.5 transition-colors focus:border-vermilion focus:outline-none',
            large ? 'text-[1.125rem]' : 'text-[1rem]',
          )}
        >
          <span aria-hidden className="text-[1.125em] leading-none">
            {country.flag}
          </span>
          <span className="text-ink-muted">+{country.dialCode}</span>
          <ChevronDown aria-hidden className="size-3.5 text-ink-muted/70" />
        </button>

        <input
          ref={numberInputRef}
          id={inputId}
          type="tel"
          inputMode="numeric"
          value={national}
          onChange={e => handleNationalChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'ml-2.5 w-full border-b border-ink/25 bg-transparent py-2.5 transition-colors placeholder:text-ink-muted/40 focus:border-vermilion focus:outline-none',
            large ? 'text-[1.125rem]' : 'text-[1rem]',
          )}
        />

        {open && (
          <div className="sheet absolute top-full left-0 z-20 mt-1.5 w-72 py-1">
            <Command className="bg-transparent text-ink">
              <div className="border-b border-rule px-3.5 py-2.5">
                <CommandInput
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search country or code"
                  className="placeholder:text-ink-muted/40"
                  autoFocus
                />
              </div>
              <CommandList className="max-h-64">
                <CommandEmpty className="px-3.5 py-4 text-[0.8125rem] text-ink-muted">
                  No matching country.
                </CommandEmpty>
                {PHONE_COUNTRIES.map(option => (
                  <CommandItem
                    key={option.isoCode}
                    value={`${option.name} +${option.dialCode}`}
                    onSelect={() => selectCountry(option)}
                    className={cn(
                      'flex items-center gap-2.5 px-3.5 py-2 text-[0.875rem] transition-colors',
                      option.isoCode === country.isoCode
                        ? 'bg-vermilion/[0.06] text-vermilion'
                        : 'data-[selected=true]:bg-ink/[0.04]',
                    )}
                  >
                    <span aria-hidden className="text-[1.125em] leading-none">
                      {option.flag}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{option.name}</span>
                    <span className="text-ink-muted">+{option.dialCode}</span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </div>
        )}
      </div>
    </div>
  )
}

function compose(country: PhoneCountry, national: string): string {
  return national ? `+${country.dialCode}${national}` : ''
}

function stripDialCode(value: string, country: PhoneCountry): string {
  const digits = value.replace(/^\+/, '')
  return digits.startsWith(country.dialCode) ? digits.slice(country.dialCode.length) : digits
}
