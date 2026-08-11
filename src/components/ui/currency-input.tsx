'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRupiah(value: number): string {
  if (!value || isNaN(value)) return ''
  return new Intl.NumberFormat('id-ID').format(Math.trunc(value))
}

function parseRupiah(str: string): number {
  // Extract only digits (strip thousand separators and any other chars)
  const digits = str.replace(/\D/g, '')
  return digits ? parseInt(digits, 10) : 0
}

// ─── CurrencyInput ────────────────────────────────────────────────────────────
// A text input that accepts manual typing and displays the value with
// Indonesian thousand separators (e.g. "1.000.000"). The stored value is
// always a plain number — making it easy to send to APIs and preventing the
// "cannot clear field" / "cannot type decimals" issues that come from using
// type="number" with Number() conversion on every keystroke.

export interface CurrencyInputProps
  extends Omit<React.ComponentProps<typeof Input>, 'onChange' | 'value' | 'type'> {
  /** Numeric value (controlled). */
  value: number
  /** Called with the parsed number on every change. */
  onChange: (value: number) => void
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, onFocus, onBlur, ...props }, ref) => {
    const [display, setDisplay] = React.useState<string>(() => formatRupiah(value))
    const [isFocused, setIsFocused] = React.useState(false)

    // Sync external value changes (form reset, data load, etc.)
    // Only reformat when NOT focused — so we don't disturb the user while typing.
    React.useEffect(() => {
      if (isFocused) return
      const currentParsed = parseRupiah(display)
      if (currentParsed !== value) {
        setDisplay(formatRupiah(value))
      }
    }, [value, isFocused, display])

    const handleChange = React.useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value
        const parsed = parseRupiah(raw)
        // While typing, show formatted value with thousand separators
        setDisplay(formatRupiah(parsed))
        onChange(parsed)
      },
      [onChange]
    )

    const handleFocus = React.useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true)
        // Show raw digits while editing for easier cursor control
        const parsed = parseRupiah(display)
        setDisplay(parsed ? String(parsed) : '')
        onFocus?.(e)
      },
      [display, onFocus]
    )

    const handleBlur = React.useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false)
        // Reformat with thousand separators on blur
        const parsed = parseRupiah(e.target.value)
        setDisplay(formatRupiah(parsed))
        onBlur?.(e)
      },
      [onBlur]
    )

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder="0"
        {...props}
      />
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'
