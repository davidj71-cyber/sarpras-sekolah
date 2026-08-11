'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Plus, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

export interface MasterComboboxProps {
  /** Category key, e.g. "satuan", "sumberDana" */
  category: string
  /** Current selected value */
  value: string
  /** Called when user picks an existing option or adds a new one */
  onChange: (value: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Label for the "add new" action, defaults to "Tambah" */
  addNewLabel?: string
  /** Allow empty / clear selection */
  allowClear?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Additional class on trigger button */
  className?: string
  /** Input id for label association */
  id?: string
}

/**
 * MasterCombobox — a searchable dropdown that loads its options from
 * /api/master-options?category=... and lets the user add a NEW option inline.
 *
 * When the user types something that doesn't exist and selects the
 * "+ Tambah {value}" row, the new option is POSTed to the API and saved
 * to the MasterOption table so it shows up for everyone next time.
 */
export function MasterCombobox({
  category,
  value,
  onChange,
  placeholder = 'Pilih atau ketik...',
  addNewLabel = 'Tambah',
  allowClear = true,
  disabled = false,
  className,
  id,
}: MasterComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [options, setOptions] = React.useState<string[]>([])
  const [loading, setLoading] = React.useState(false)
  const [query, setQuery] = React.useState('')

  // Fetch options whenever category changes (or combobox is opened and stale)
  const fetchOptions = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/master-options?category=${encodeURIComponent(category)}`)
      const json = await res.json()
      if (json.success && Array.isArray(json.data)) {
        setOptions(json.data.map((o: { value: string }) => o.value))
      }
    } catch {
      // silent — options just won't load
    } finally {
      setLoading(false)
    }
  }, [category])

  React.useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  // Refetch when opening (in case other components added new options)
  const handleOpenChange = React.useCallback(
    (next: boolean) => {
      setOpen(next)
      if (next) {
        setQuery('')
        fetchOptions()
      }
    },
    [fetchOptions]
  )

  const addNewOption = React.useCallback(
    async (newValue: string) => {
      const trimmed = newValue.trim()
      if (!trimmed) return
      try {
        await fetch('/api/master-options', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, value: trimmed }),
        })
      } catch {
        // even if save fails, we still apply locally so UX is smooth
      }
      setOptions((prev) => (prev.includes(trimmed) ? prev : [...prev, trimmed]))
      onChange(trimmed)
      setOpen(false)
    },
    [category, onChange]
  )

  const normalizedQuery = query.trim().toLowerCase()
  const filtered = React.useMemo(() => {
    if (!normalizedQuery) return options
    return options.filter((o) => o.toLowerCase().includes(normalizedQuery))
  }, [options, normalizedQuery])

  // Determine if the typed query is a NEW value (not in options)
  const isExactMatch = options.some(
    (o) => o.toLowerCase() === normalizedQuery
  )
  const canAddNew = normalizedQuery.length > 0 && !isExactMatch

  // Clear the current value WITHOUT opening the dropdown.
  // stopPropagation + preventDefault so the Popover trigger doesn't toggle.
  const handleClear = React.useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onChange('')
      setOpen(false)
    },
    [onChange]
  )

  const showClear = allowClear && value && !disabled

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'relative justify-between font-normal w-full',
            // Make room on the right for both the clear (X) button and the chevron
            showClear ? 'pr-16' : 'pr-9',
            !value && 'text-muted-foreground',
            className
          )}
        >
          <span className="truncate">
            {value || placeholder}
          </span>
          {/* Right-side controls: chevron + optional clear (X). The X is rendered
              INSIDE the trigger button so it is visually attached to THIS field
              and cannot be mistaken for an indicator on the next grid cell. */}
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {showClear && (
              <span
                role="button"
                tabIndex={-1}
                aria-label="Hapus pilihan"
                title="Hapus pilihan"
                // Inline span (not a <Button>) so it can sit inside the trigger
                // without nesting interactive elements. We handle the click here
                // and stop it from toggling the Popover.
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    handleClear(e as unknown as React.MouseEvent)
                  }
                }}
                className="pointer-events-auto inline-flex size-5 items-center justify-center rounded-sm text-muted-foreground/70 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
              >
                <X className="size-3.5" />
              </span>
            )}
            <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
          </span>
        </Button>
      </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[200px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder={placeholder}
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              {loading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Memuat...
                </div>
              ) : (
                <>
                  {filtered.length === 0 && !canAddNew && (
                    <CommandEmpty>
                      {query ? 'Tidak ditemukan' : 'Belum ada opsi'}
                    </CommandEmpty>
                  )}
                  {filtered.length > 0 && (
                    <CommandGroup>
                      {filtered.map((opt) => (
                        <CommandItem
                          key={opt}
                          value={opt}
                          onSelect={() => {
                            onChange(opt)
                            setOpen(false)
                          }}
                        >
                          <Check
                            className={cn(
                              'mr-2 size-4',
                              value === opt ? 'opacity-100' : 'opacity-0'
                            )}
                          />
                          {opt}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                  {canAddNew && (
                    <>
                      {filtered.length > 0 && <CommandSeparator />}
                      <CommandGroup>
                        <CommandItem
                          value={`__add__${query}`}
                          onSelect={() => addNewOption(query)}
                          className="text-primary"
                        >
                          <Plus className="mr-2 size-4" />
                          <span>
                            {addNewLabel} <strong>&ldquo;{query.trim()}&rdquo;</strong>
                          </span>
                        </CommandItem>
                      </CommandGroup>
                    </>
                  )}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
  )
}

export default MasterCombobox
