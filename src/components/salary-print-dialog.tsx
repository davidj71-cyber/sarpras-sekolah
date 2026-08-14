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
export interface SalaryPrintPlanItem {
  salaryId: string
  name: string
  nip: string
  bankAccount: string
  lessonCount: number
  unit: string
  pricePerLesson: number
  // Unpaid months to print & record (subset of selectedMonths that are not yet paid)
  months: number[]
}

export interface SalaryPrintPlan {
  year: string
  place: string
  orientation: Orientation
  // Jenis honor untuk judul, mis. "HONOR" atau "HONOR PENJAGA KEAMANAN SEKOLAH"
  honorType: string
  // Tanggal cetak yang dipilih user (ISO yyyy-mm-dd). Empty = pakai hari ini.
  printDate: string
  // Sorted unique list of all months covered by the plan (for the title)
  allMonths: number[]
  items: SalaryPrintPlanItem[]
}

interface SalaryPrintDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPrint: (plan: SalaryPrintPlan) => void
  /** All salary entries from the database (parent passes full list) */
  entries: Array<{
    id: string
    name: string
    nip: string
    bankAccount: string
    jabatan: string
    status: string
    lessonCount: number
    unit: string
    pricePerLesson: number
  }>
  loading?: boolean
  defaultPlace?: string
}

interface PaymentRecord {
  id: string
  salaryId: string
  year: number
  month: number
  lessonCount: number
  amount: number
  paidAt?: string
}

export function SalaryPrintDialog({
  open,
  onOpenChange,
  onPrint,
  entries,
  loading = false,
  defaultPlace = '',
}: SalaryPrintDialogProps) {
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(String(currentYear))
  const [place, setPlace] = useState(defaultPlace)
  const [orientation, setOrientation] = useState<Orientation>('portrait')
  const [honorType, setHonorType] = useState('HONOR')
  const [printDate, setPrintDate] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedSalaryIds, setSelectedSalaryIds] = useState<Set<string>>(new Set())
  const [selectedMonths, setSelectedMonths] = useState<Set<number>>(new Set())
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [fetchingPayments, setFetchingPayments] = useState(false)

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setPlace(defaultPlace)
      setHonorType('HONOR')
      setPrintDate('')
      setSelectedSalaryIds(new Set())
      setSelectedMonths(new Set())
      setSearch('')
      setStatusFilter('')
    }
  }, [open, defaultPlace])

  // Fetch all salary payments for the selected year
  const fetchPayments = useCallback(async () => {
    setFetchingPayments(true)
    try {
      const res = await fetch(`/api/salary/payments?year=${year}`)
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

  // Daftar Status unik dari entries — untuk dropdown filter & quick-pick honorType.
  // Selalu re-compute ketika entries berubah (mis. user ubah status guru di DB),
  // sehingga menu cetak selalu sinkron dengan database guru terbaru.
  const statusOptions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.status).filter(Boolean))).sort(),
    [entries]
  )

  // ── AUTO-SYNC honorType dengan status ─────────────────────────────────────
  // Ketika user pilih status di Filter Status, otomatis set honorType (jenis
  // honor untuk judul cetak) ke status itu. Jadi kalau user ubah status di
  // database guru, lalu pilih status tsb di filter, judul cetak langsung
  // pakai status tersebut — sinkron penuh.
  useEffect(() => {
    if (statusFilter) {
      setHonorType(statusFilter)
    }
  }, [statusFilter])

  // Filtered entries based on search (by name OR NIP) AND status filter
  const filteredEntries = useMemo(() => {
    const q = search.trim().toLowerCase()
    const s = statusFilter.trim()
    return entries.filter((e) => {
      const matchSearch = !q ||
        e.name.toLowerCase().includes(q) ||
        e.nip.toLowerCase().includes(q)
      const matchStatus = !s || (e.status || '') === s
      return matchSearch && matchStatus
    })
  }, [entries, search, statusFilter])

  // Map: salaryId → Set of paid months for the selected year
  const paidMonthsBySalary = useMemo(() => {
    const map = new Map<string, Set<number>>()
    const y = Number(year)
    for (const p of payments) {
      if (p.year !== y) continue
      let set = map.get(p.salaryId)
      if (!set) {
        set = new Set()
        map.set(p.salaryId, set)
      }
      set.add(p.month)
    }
    return map
  }, [payments, year])

  // Toggle helpers
  const toggleSalary = (id: string) => {
    setSelectedSalaryIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleMonth = (m: number) => {
    setSelectedMonths((prev) => {
      const next = new Set(prev)
      if (next.has(m)) next.delete(m)
      else next.add(m)
      return next
    })
  }

  const selectAllVisible = () => {
    setSelectedSalaryIds(new Set(filteredEntries.map((e) => e.id)))
  }

  const clearAll = () => {
    setSelectedSalaryIds(new Set())
    setSelectedMonths(new Set())
  }

  // Build label for selected months range, e.g. "JULI SAMPAI SEPTEMBER"
  const buildMonthRangeLabel = (months: number[]): string => {
    if (months.length === 0) return ''
    const sorted = [...months].sort((a, b) => a - b)
    if (sorted.length === 1) return `BULAN ${MONTHS[sorted[0] - 1].toUpperCase()}`
    return `BULAN ${MONTHS[sorted[0] - 1].toUpperCase()} SAMPAI ${MONTHS[sorted[sorted.length - 1] - 1].toUpperCase()}`
  }

  const handleConfirmPrint = () => {
    if (selectedSalaryIds.size === 0 || selectedMonths.size === 0) return

    const allMonthsSet = new Set<number>()
    const items: SalaryPrintPlanItem[] = []

    for (const salaryId of selectedSalaryIds) {
      const entry = entries.find((e) => e.id === salaryId)
      if (!entry) continue

      const paidSet = paidMonthsBySalary.get(salaryId) ?? new Set<number>()
      // Unpaid months = selectedMonths yang belum dibayar
      const unpaidMonths = Array.from(selectedMonths).filter((m) => !paidSet.has(m))
      if (unpaidMonths.length === 0) continue // skip kalau semua bulan sudah dibayar

      unpaidMonths.forEach((m) => allMonthsSet.add(m))

      items.push({
        salaryId: entry.id,
        name: entry.name,
        nip: entry.nip,
        bankAccount: entry.bankAccount,
        lessonCount: entry.lessonCount,
        unit: entry.unit,
        pricePerLesson: entry.pricePerLesson,
        months: unpaidMonths,
      })
    }

    if (items.length === 0) {
      // Semua kombinasi sudah dibayar
      return
    }

    const allMonths = Array.from(allMonthsSet).sort((a, b) => a - b)
    onPrint({
      year,
      place,
      orientation,
      honorType,
      printDate,
      allMonths,
      items,
    })
    onOpenChange(false)
  }

  const canPrint = selectedSalaryIds.size > 0 && selectedMonths.size > 0
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2]

  // Count how many (salary × month) payments will be recorded
  const estimatedPayments = useMemo(() => {
    let count = 0
    for (const salaryId of selectedSalaryIds) {
      const paidSet = paidMonthsBySalary.get(salaryId) ?? new Set<number>()
      for (const m of selectedMonths) {
        if (!paidSet.has(m)) count++
      }
    }
    return count
  }, [selectedSalaryIds, selectedMonths, paidMonthsBySalary])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="size-5" />
            Cetak Daftar Pembayaran Gaji/Honor
          </DialogTitle>
          <DialogDescription>
            Pilih guru dan bulan yang akan dibayar. Bulan yang sudah dibayar otomatis nonaktif.
            Mencetak akan mencatat pembayaran secara otomatis.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Year + Place + Print Date + Orientation */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="sal-year">Tahun Anggaran</Label>
              <Select
                value={year}
                onValueChange={setYear}
              >
                <SelectTrigger id="sal-year">
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
              <Label htmlFor="sal-place">Tempat</Label>
              <Input
                id="sal-place"
                placeholder="Mis. Telukdalam"
                value={place}
                onChange={(e) => setPlace(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sal-print-date">Tanggal Cetak</Label>
              <Input
                id="sal-print-date"
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

          {/* Honor Type + Jabatan Filter + Search */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="sal-honor-type">Jenis Honor (untuk judul)</Label>
              <Input
                id="sal-honor-type"
                placeholder="Mis. HONOR PENJAGA KEAMANAN SEKOLAH"
                value={honorType}
                onChange={(e) => setHonorType(e.target.value)}
                list="sal-honor-type-options"
              />
              {/* Datalist: suggestion dari status DB guru — sync otomatis */}
              <datalist id="sal-honor-type-options">
                <option value="HONOR" />
                {statusOptions.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <p className="text-xs text-muted-foreground">
                Judul: &ldquo;TANDA TERIMA PEMBAYARAN {honorType || 'HONOR'} BULAN ...&rdquo;
              </p>
              {/* Quick-pick chips dari status DB — sinkron dgn database guru */}
              {statusOptions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <span className="text-[10px] text-muted-foreground self-center mr-1">Pilih dari DB:</span>
                  {statusOptions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setHonorType(s)}
                      title={`Set jenis honor = ${s}`}
                      className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors max-w-[180px] truncate ${
                        honorType === s
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background hover:bg-accent border-input'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="sal-status-filter">Filter Status</Label>
              <Select
                value={statusFilter || '__all__'}
                onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}
              >
                <SelectTrigger id="sal-status-filter">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua Status</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {statusFilter
                  ? `Menampilkan hanya: ${statusFilter}`
                  : 'Tampilkan semua status'}
              </p>
            </div>
            <div className="space-y-2 sm:col-span-1">
              <Label htmlFor="sal-search">Cari Guru</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="sal-search"
                  placeholder="Cari nama atau NIP guru..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* Month selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <CalendarDays className="size-4" />
                Pilih Bulan Pembayaran
              </Label>
              {fetchingPayments && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="size-3 animate-spin" />
                  Memuat data pembayaran...
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
              {MONTHS.map((m, idx) => {
                const monthNum = idx + 1
                const isSelected = selectedMonths.has(monthNum)
                return (
                  <button
                    key={monthNum}
                    type="button"
                    onClick={() => toggleMonth(monthNum)}
                    className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                      isSelected
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-accent border-input'
                    }`}
                  >
                    {m}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Salary list with checkboxes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Pilih Guru ({selectedSalaryIds.size} dari {entries.length} terpilih)
              </Label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={selectAllVisible}>
                  Pilih Semua
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={clearAll}>
                  Bersihkan
                </Button>
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0">
                  <tr>
                    <th className="w-10 p-2"></th>
                    <th className="text-left p-2">Nama</th>
                    <th className="text-left p-2 hidden sm:table-cell">NIP</th>
                    <th className="text-left p-2 hidden md:table-cell">Status</th>
                    <th className="text-left p-2 hidden md:table-cell">No. Rekening</th>
                    <th className="text-right p-2 hidden sm:table-cell">Honor/Les</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-muted-foreground">
                        {loading ? 'Memuat data...' : 'Tidak ada guru ditemukan'}
                      </td>
                    </tr>
                  ) : (
                    filteredEntries.map((e) => {
                      const isSelected = selectedSalaryIds.has(e.id)
                      const paidSet = paidMonthsBySalary.get(e.id) ?? new Set<number>()
                      const paidCount = paidSet.size
                      return (
                        <tr
                          key={e.id}
                          className={`border-t cursor-pointer hover:bg-accent/50 ${isSelected ? 'bg-accent/30' : ''}`}
                          onClick={() => toggleSalary(e.id)}
                        >
                          <td className="p-2 text-center">
                            <Checkbox checked={isSelected} />
                          </td>
                          <td className="p-2 font-medium">{e.name || '-'}</td>
                          <td className="p-2 hidden sm:table-cell text-muted-foreground">{e.nip || '-'}</td>
                          <td className="p-2 hidden md:table-cell text-muted-foreground">{e.status || '-'}</td>
                          <td className="p-2 hidden md:table-cell text-muted-foreground">{e.bankAccount || '-'}</td>
                          <td className="p-2 hidden sm:table-cell text-right">
                            Rp {new Intl.NumberFormat('id-ID').format(e.pricePerLesson)}
                            {paidCount > 0 && (
                              <Badge variant="secondary" className="ml-1 text-xs">
                                {paidCount} bln
                              </Badge>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Summary */}
          {canPrint && (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CheckCircle2 className="size-4" />
                <span>
                  Akan mencetak <strong>{selectedSalaryIds.size} guru</strong> × <strong>{selectedMonths.size} bulan</strong>.
                  {' '}Total <strong>{estimatedPayments} pembayaran</strong> akan dicatat ke database.
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button onClick={handleConfirmPrint} disabled={!canPrint}>
            <Printer className="size-4 mr-2" />
            Cetak Sekarang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
