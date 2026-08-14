'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Printer, Loader2, Search, CheckCircle2, CalendarDays } from 'lucide-react'

type Orientation = 'portrait' | 'landscape'

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

// ── Print plan: dialog computes this and passes to parent ──────────────────
// Parent records payments + builds the print HTML from this plan.
export interface MediaPrintPlanItem {
  mediaId: string
  name: string
  mediaName: string
  paymentType: string
  pricePerMonth: number
  // Unpaid months to print & record (subset of selectedMonths that are not yet paid)
  months: number[]
}

export interface MediaPrintPlan {
  year: string
  place: string
  orientation: Orientation
  // Tanggal cetak yang dipilih user (ISO yyyy-mm-dd).
  // String kosong = pakai tanggal hari ini (default).
  printDate: string
  // Sorted unique list of all months covered by the plan (for the title)
  allMonths: number[]
  items: MediaPrintPlanItem[]
}

interface MediaPrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPrint: (plan: MediaPrintPlan) => void
  /** All media entries from the database (parent passes full list) */
  entries: Array<{
    id: string
    name: string
    mediaName: string
    paymentType: string
    pricePerMonth: number
    unitCount: number
  }>
  loading?: boolean
  defaultPlace?: string
}

interface PaymentRecord {
  id: string
  mediaId: string
  year: number
  month: number
  amount: number
  paidAt?: string
}

export function MediaPrintDialog({
  open,
  onOpenChange,
  onPrint,
  entries,
  loading = false,
  defaultPlace = '',
}: MediaPrintDialogProps) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(String(currentYear))
  const [place, setPlace] = useState(defaultPlace)
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  // Tanggal cetak custom (ISO yyyy-mm-dd). Empty = pakai tanggal hari ini.
  const [printDate, setPrintDate] = useState('')
  const [search, setSearch] = useState('')
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<string>>(new Set())
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set())
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [fetchingPayments, setFetchingPayments] = useState(false)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPlace(defaultPlace)
      setPrintDate('')
      setSelectedMediaIds(new Set())
      setSelectedMonths(new Set())
      setSearch('')
    }
  }, [open, defaultPlace])

  // Fetch all media payments for the selected year
  const fetchPayments = useCallback(async () => {
    setFetchingPayments(true)
    try {
      const res = await fetch(`/api/media/payments?year=${year}`)
      if (!res.ok) throw new Error('Gagal')
      const data = await res.json()
      setPayments(Array.isArray(data) ? data : [])
    } catch {
      setPayments([])
    } finally {
      setFetchingPayments(false)
    }
  }, [year])

  useEffect(() => {
    if (open) fetchPayments()
  }, [open, fetchPayments])

  // Filtered entries based on search (by media name OR owner name)
  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries
    const q = search.toLowerCase()
    return entries.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.mediaName.toLowerCase().includes(q)
    )
  }, [entries, search])

  // Map: mediaId → Set of paid months for the selected year
  const paidMonthsByMedia = useMemo(() => {
    const map = new Map<string, Set<number>>()
    const y = Number(year)
    for (const p of payments) {
      if (p.year !== y) continue
      let set = map.get(p.mediaId)
      if (!set) {
        set = new Set()
        map.set(p.mediaId, set)
      }
      set.add(p.month)
    }
    return map
  }, [payments, year])

  // For each month, determine disabled state based on selected media
  const monthStatus = useMemo(() => {
    return MONTHS.map((monthName, idx) => {
      const month = idx + 1
      if (selectedMediaIds.size === 0) {
        return { month, name: monthName, disabled: true, unpaidCount: 0, paidCount: 0 }
      }
      let paidCount = 0
      for (const mediaId of selectedMediaIds) {
        if (paidMonthsByMedia.get(mediaId)?.has(month)) paidCount++
      }
      const unpaidCount = selectedMediaIds.size - paidCount
      // Disable if ALL selected media have already paid this month
      const disabled = unpaidCount === 0
      return { month, name: monthName, disabled, unpaidCount, paidCount }
    })
  }, [selectedMediaIds, paidMonthsByMedia])

  // ── Toggle helpers ──
  function toggleMedia(id: string) {
    setSelectedMediaIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedMediaIds.size === filteredEntries.length && filteredEntries.length > 0) {
      setSelectedMediaIds(new Set())
    } else {
      setSelectedMediaIds(new Set(filteredEntries.map((e) => e.id)))
    }
  }

  function toggleMonth(month: number) {
    setSelectedMonths((prev) => {
      const next = new Set(prev)
      if (next.has(month)) next.delete(month)
      else next.add(month)
      return next
    })
  }

  function selectAllAvailableMonths() {
    const available = monthStatus.filter((m) => !m.disabled).map((m) => m.month)
    setSelectedMonths(new Set(available))
  }

  function clearMonths() {
    setSelectedMonths(new Set())
  }

  // ── Build the print plan (dialog → parent) ──
  function handlePrint() {
    const items: MediaPrintPlanItem[] = []
    const allMonthsSet = new Set<number>()

    for (const mediaId of selectedMediaIds) {
      const entry = entries.find((e) => e.id === mediaId)
      if (!entry) continue
      const paidSet = paidMonthsByMedia.get(mediaId) ?? new Set<number>()
      // Unpaid months = selectedMonths that are NOT in paidSet
      const unpaidMonths = Array.from(selectedMonths)
        .filter((m) => !paidSet.has(m))
        .sort((a, b) => a - b)
      if (unpaidMonths.length === 0) continue
      for (const m of unpaidMonths) allMonthsSet.add(m)
      items.push({
        mediaId: entry.id,
        name: entry.name,
        mediaName: entry.mediaName,
        paymentType: entry.paymentType,
        pricePerMonth: entry.pricePerMonth,
        months: unpaidMonths,
      })
    }

    const allMonths = Array.from(allMonthsSet).sort((a, b) => a - b)
    onPrint({
      year,
      place,
      orientation,
      printDate,
      allMonths,
      items,
    })
    onOpenChange(false)
  }

  const canPrint = selectedMediaIds.size > 0 && selectedMonths.size > 0
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2]

  // Count how many (media × month) payments will be recorded
  const estimatedPayments = useMemo(() => {
    let count = 0
    for (const mediaId of selectedMediaIds) {
      const paidSet = paidMonthsByMedia.get(mediaId) ?? new Set<number>()
      for (const m of selectedMonths) {
        if (!paidSet.has(m)) count++
      }
    }
    return count
  }, [selectedMediaIds, selectedMonths, paidMonthsByMedia])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Printer className="size-5" />
            Cetak Daftar Pembayaran Media
          </DialogTitle>
          <DialogDescription>
            Pilih media dan bulan yang akan dibayar. Bulan yang sudah dibayar otomatis nonaktif.
            Mencetak akan mencatat pembayaran secara otomatis.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2 min-h-0">
        <div className="space-y-4 py-2">
          {/* Year + Place + Print Date + Orientation */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="med-year">Tahun Anggaran</Label>
              <Select
                value={year}
                onValueChange={(v) => {
                  setYear(v)
                  setSelectedMonths(new Set())
                }}
              >
                <SelectTrigger id="med-year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-place">Tempat</Label>
              <Input
                id="med-place"
                placeholder="Mis. Telukdalam"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-print-date">Tanggal Cetak</Label>
              <Input
                id="med-print-date"
                type="date"
                value={printDate}
                onChange={(e) => setPrintDate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {printDate ? 'Dipakai di tanda tangan' : 'Kosong = tanggal hari ini'}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Orientasi</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={orientation === 'portrait' ? 'default' : 'outline'}
                  onClick={() => setOrientation('portrait')}
                >
                  Portrait
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={orientation === 'landscape' ? 'default' : 'outline'}
                  onClick={() => setOrientation('landscape')}
                >
                  Landscape
                </Button>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama pemilik atau nama media..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Media list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Daftar Media ({filteredEntries.length}
                {search.trim() && filteredEntries.length !== entries.length
                  ? ` dari ${entries.length}`
                  : ''}
                )
              </Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={toggleSelectAll}
                disabled={filteredEntries.length === 0 || fetchingPayments}
              >
                {selectedMediaIds.size === filteredEntries.length && filteredEntries.length > 0
                  ? 'Hapus pilihan'
                  : 'Pilih semua'}
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto rounded-md border">
              {fetchingPayments ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">
                    Memuat data pembayaran...
                  </span>
                </div>
              ) : filteredEntries.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {search ? 'Tidak ditemukan media yang sesuai' : 'Belum ada data media'}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredEntries.map((e) => {
                    const isChecked = selectedMediaIds.has(e.id)
                    const paidCount = paidMonthsByMedia.get(e.id)?.size ?? 0
                    return (
                      <label
                        key={e.id}
                        className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleMedia(e.id)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="truncate font-medium">{e.name}</span>
                            <span className="text-muted-foreground">—</span>
                            <span className="truncate">{e.mediaName}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Rp {new Intl.NumberFormat('id-ID').format(e.pricePerMonth)}/bln
                          </div>
                        </div>
                        {paidCount > 0 && (
                          <Badge variant="secondary" className="gap-1 text-[10px]">
                            <CheckCircle2 className="size-2.5 text-emerald-600" />
                            {paidCount} bln dibayar
                          </Badge>
                        )}
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
            {selectedMediaIds.size > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedMediaIds.size} media dipilih
              </p>
            )}
          </div>

          {/* Month selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <CalendarDays className="size-4" />
                Pilih Bulan ({selectedMonths.size} dipilih)
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={selectAllAvailableMonths}
                  disabled={selectedMediaIds.size === 0}
                >
                  Pilih semua bulan
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearMonths}
                  disabled={selectedMonths.size === 0}
                >
                  Bersihkan
                </Button>
              </div>
            </div>
            {selectedMediaIds.size === 0 ? (
              <p className="py-2 text-xs text-muted-foreground">
                Pilih media dulu untuk melihat bulan yang tersedia.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {monthStatus.map(({ month, name, disabled, unpaidCount }) => {
                  const isSelected = selectedMonths.has(month)
                  return (
                    <button
                      key={month}
                      type="button"
                      disabled={disabled}
                      onClick={() => toggleMonth(month)}
                      className={`rounded-md border p-2 text-center transition-all ${
                        disabled
                          ? 'cursor-not-allowed border-muted bg-muted/30 opacity-50'
                          : isSelected
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-border hover:border-primary/40'
                      }`}
                    >
                      <div className="text-xs font-medium">{name}</div>
                      {disabled ? (
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          Sudah dibayar
                        </div>
                      ) : (
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {unpaidCount} media
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Summary */}
          {estimatedPayments > 0 && (
            <div className="rounded-md border bg-primary/5 px-4 py-3 text-sm">
              <span className="text-muted-foreground">Akan dicetak & dicatat: </span>
              <span className="font-semibold">
                {estimatedPayments} pembayaran
              </span>
              <span className="text-muted-foreground">
                {' '}({items_preview(selectedMediaIds, selectedMonths, paidMonthsByMedia)} media)
              </span>
            </div>
          )}
        </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-3 mt-2 gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Batal
          </Button>
          <Button type="button" onClick={handlePrint} disabled={loading || !canPrint}>
            {loading ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Mencetak...
              </>
            ) : (
              <>
                <Printer className="size-4 mr-2" />
                Cetak & Catat Pembayaran
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Helper: count how many selected media have at least 1 unpaid selected month
function items_preview(
  selectedMediaIds: Set<string>,
  selectedMonths: Set<number>,
  paidMonthsByMedia: Map<string, Set<number>>
): number {
  let count = 0
  for (const mediaId of selectedMediaIds) {
    const paidSet = paidMonthsByMedia.get(mediaId) ?? new Set<number>()
    for (const m of selectedMonths) {
      if (!paidSet.has(m)) {
        count++
        break
      }
    }
  }
  return count
}
