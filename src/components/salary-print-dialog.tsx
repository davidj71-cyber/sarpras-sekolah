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
  // Mode cetak: 'signature' = tanda tangan (7 kolom), 'bank' = tanpa kolom tanda tangan (6 kolom)
  printMode: 'signature' | 'bank'
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
  signaturePrinted?: boolean
  bankPrinted?: boolean
  fullyPaidAt?: string | null
}

// ── Mapping STATUS pegawai → LABEL JUDUL cetak ─────────────────────────────
// Mapping ini yang menentukan judul "TANDA TERIMA PEMBAYARAN HONOR [LABEL] BULAN..."
// sesuai permintaan user. Beberapa status berbeda bisa map ke label yang sama.
// Status yang tidak ada di mapping → fallback pakai teks status apa adanya.
const STATUS_TO_HONOR_LABEL: Record<string, string> = {
  // GTTS, HONORER SEKOLAH, GURU SEMENTARA → sama, semua guru tidak tetap
  GTTS: 'GURU TIDAK TETAP SEKOLAH (GTTS)',
  'HONORER SEKOLAH': 'GURU TIDAK TETAP SEKOLAH (GTTS)',
  'GURU SEMENTARA': 'GURU TIDAK TETAP SEKOLAH (GTTS)',
  // PTTS → pegawai tidak tetap
  PTTS: 'PEGAWAI TIDAK TETAP SEKOLAH (PTTS)',
  // Petugas kebersihan & penjaga sekolah → masing-masing sendiri
  'PETUGAS KEBERSIHAN': 'PETUGAS KEBERSIHAN SEKOLAH',
  'PENJAGA SEKOLAH': 'PENJAGA SEKOLAH',
}

function statusToHonorLabel(status: string): string {
  const key = (status || '').trim().toUpperCase()
  if (!key) return 'HONOR'
  // Cek exact match (case-insensitive)
  for (const k of Object.keys(STATUS_TO_HONOR_LABEL)) {
    if (k.toUpperCase() === key) return STATUS_TO_HONOR_LABEL[k]
  }
  // Fallback: pakai teks status apa adanya
  return status.trim()
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
  const [printMode, setPrintMode] = useState<'signature' | 'bank'>('signature')
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
      setPrintMode('signature')
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

  // ── AUTO-SYNC honorType dengan status (pakai mapping label) ───────────────
  // Ketika user pilih status di Filter Status, otomatis set honorType ke LABEL
  // JUDUL yang sesuai (mis. GTTS → "GURU TIDAK TETAP SEKOLAH (GTTS)").
  // Input manual dihapus — honorType 100% mengikuti mapping dari status.
  useEffect(() => {
    if (statusFilter) {
      setHonorType(statusToHonorLabel(statusFilter))
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

  // Map: salaryId → Set of FULLY-PAID months (kedua mode tercetak) for the selected year
  // Bulan dianggap "sudah dibayar" (terkunci) HANYA jika fullyPaidAt ter-set,
  // yaitu kedua laporan (Tanda Tangan + Bank) sudah tercetak.
  const paidMonthsBySalary = useMemo(() => {
    const map = new Map<string, Set<number>>()
    const y = Number(year)
    for (const p of payments) {
      if (p.year !== y) continue
      if (!p.fullyPaidAt) continue // belum lengkap → tidak terkunci
      let set = map.get(p.salaryId)
      if (!set) {
        set = new Set()
        map.set(p.salaryId, set)
      }
      set.add(p.month)
    }
    return map
  }, [payments, year])

  // Map: salaryId → Map<month, { signaturePrinted, bankPrinted }> untuk tracking per mode
  // Dipakai untuk menampilkan badge "✓ TTD" / "✓ Bank" di tabel guru.
  const printStatusBySalary = useMemo(() => {
    const map = new Map<string, Map<number, { signature: boolean; bank: boolean }>>()
    const y = Number(year)
    for (const p of payments) {
      if (p.year !== y) continue
      let inner = map.get(p.salaryId)
      if (!inner) {
        inner = new Map()
        map.set(p.salaryId, inner)
      }
      inner.set(p.month, {
        signature: !!p.signaturePrinted,
        bank: !!p.bankPrinted,
      })
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
      printMode,
      items,
    })
    onOpenChange(false)
  }

  const canPrint = selectedSalaryIds.size > 0 && selectedMonths.size > 0
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear, currentYear + 1, currentYear + 2]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)]">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Printer className="size-5" />
            Cetak Daftar Pembayaran Gaji/Honor
          </DialogTitle>
          <DialogDescription>
            Pilih guru dan bulan yang akan dicetak. Pembayaran tercatat otomatis setelah kedua laporan
            (Tanda Tangan Guru + Bank) tercetak untuk bulan tersebut.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2 -mr-2 min-h-0">
        <div className="space-y-4 py-2">
          {/* Year + Place + Print Date + Orientation + Pilihan Cetak */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
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
            <div className="space-y-2">
              <Label htmlFor="sal-print-mode">Pilihan Cetak</Label>
              <Select
                value={printMode}
                onValueChange={(v) => setPrintMode(v as 'signature' | 'bank')}
              >
                <SelectTrigger id="sal-print-mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="signature">Tanda Tangan Guru</SelectItem>
                  <SelectItem value="bank">Cetak Bank</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {printMode === 'bank'
                  ? 'Tanpa kolom tanda tangan (6 kolom)'
                  : 'Dengan kolom tanda tangan (7 kolom)'}
              </p>
            </div>
          </div>

          {/* Filter Status + Search (2 kolom) */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

          {/* Preview Judul Cetak (auto-update dari status, full-width) */}
          <div className="rounded-md border bg-muted/30 p-3 space-y-1">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                Preview Judul Cetak
              </Label>
              {statusFilter ? (
                <Badge variant="secondary" className="text-[10px]">{statusFilter}</Badge>
              ) : (
                <span className="text-[10px] text-muted-foreground italic">pilih status dulu</span>
              )}
            </div>
            <p className="text-sm font-semibold leading-snug">
              TANDA TERIMA PEMBAYARAN HONOR {honorType || 'HONOR'} {buildMonthRangeLabel(Array.from(selectedMonths).sort((a, b) => a - b))}
            </p>
            <p className="text-xs text-muted-foreground">
              Baris ke-2: <span className="font-medium">[NAMA SEKOLAH] TAHUN {year}</span> (otomatis)
            </p>
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
                      // Tracking cetak per mode untuk bulan-bulan yang dipilih
                      const statusMap = printStatusBySalary.get(e.id) ?? new Map()
                      const selectedMonthsArr = Array.from(selectedMonths).sort((a, b) => a - b)
                      return (
                        <tr
                          key={e.id}
                          className={`border-t cursor-pointer hover:bg-accent/50 ${isSelected ? 'bg-accent/30' : ''}`}
                          onClick={() => toggleSalary(e.id)}
                        >
                          <td className="p-2 text-center">
                            <Checkbox checked={isSelected} />
                          </td>
                          <td className="p-2 font-medium">
                            {e.name || '-'}
                            {/* Badge status cetak per mode untuk bulan yang dipilih */}
                            {isSelected && selectedMonthsArr.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {selectedMonthsArr.map((m) => {
                                  const st = statusMap.get(m)
                                  const sig = st?.signature ?? false
                                  const bnk = st?.bank ?? false
                                  if (sig && bnk) {
                                    return (
                                      <Badge key={m} variant="default" className="text-[10px] py-0 px-1.5 h-4 bg-green-600 hover:bg-green-600">
                                        {MONTHS[m - 1].slice(0, 3)} ✓lengkap
                                      </Badge>
                                    )
                                  }
                                  if (sig) {
                                    return (
                                      <Badge key={m} variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-amber-500 text-amber-700 bg-amber-50">
                                        {MONTHS[m - 1].slice(0, 3)} ✓TTD
                                      </Badge>
                                    )
                                  }
                                  if (bnk) {
                                    return (
                                      <Badge key={m} variant="outline" className="text-[10px] py-0 px-1.5 h-4 border-amber-500 text-amber-700 bg-amber-50">
                                        {MONTHS[m - 1].slice(0, 3)} ✓Bank
                                      </Badge>
                                    )
                                  }
                                  return null
                                })}
                              </div>
                            )}
                          </td>
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
                  Akan mencetak <strong>{selectedSalaryIds.size} guru</strong> × <strong>{selectedMonths.size} bulan</strong> mode{' '}
                  <strong>{printMode === 'signature' ? 'Tanda Tangan Guru' : 'Bank'}</strong>.
                  {' '}Bulan terkunci hanya setelah kedua mode tercetak.
                </span>
              </div>
            </div>
          )}
        </div>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-3 mt-2 gap-2 sm:gap-0">
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
