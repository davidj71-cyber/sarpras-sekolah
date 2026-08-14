'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@/hooks/use-toast'
import { toast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MasterCombobox } from '@/components/ui/master-combobox'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Wallet,
  Printer,
  FileSpreadsheet,
  Upload,
  CalendarCheck,
  CheckCircle2,
  FileUp,
  X,
} from 'lucide-react'
import {
  openPrintWindow,
  formatRupiahPrint,
  formatNumberPrint,
} from '@/lib/print-utils'
import { terbilangRupiah } from '@/lib/terbilang'
import { exportToExcel, getSchoolMeta } from '@/lib/export-excel'
import { SalaryPrintDialog, type SalaryPrintPlan } from '@/components/salary-print-dialog'
import { PaymentDialog } from '@/components/payment-dialog'
import { PageHeader, PageContainer } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { PageLoading } from '@/components/ui/loading-skeleton'
import { Badge } from '@/components/ui/badge'

// ─── Settings cache (module-level) ───────────────────────────────────────────
// Settings sekolah hampir tidak berubah saat user aktif. Cache di level modul
// supaya klik cetak ke-2+ → instant. Prefetch saat dialog cetak terbuka.
let settingsCache: Record<string, unknown> | null = null
let settingsPromise: Promise<Record<string, unknown>> | null = null

function fetchSettingsCached(): Promise<Record<string, unknown>> {
  if (settingsCache) return Promise.resolve(settingsCache)
  if (settingsPromise) return settingsPromise
  settingsPromise = fetch('/api/settings')
    .then((r) => (r.ok ? r.json() : {}))
    .then((d) => {
      settingsCache = d as Record<string, unknown>
      settingsPromise = null
      return d as Record<string, unknown>
    })
    .catch(() => {
      settingsPromise = null
      return {}
    })
  return settingsPromise
}

interface SalaryData {
  id: string
  name: string
  nip: string
  bankAccount: string
  gender: string
  status: string // Pembeda kategori pegawai (GTTS/PTTS/PNS/PPPK/Honorer) — TIDAK masuk format cetak
  jabatan: string // Jabatan (GURU SEMENTARA/HONORER SEKOLAH/PEGAWAI SEKOLAH) — TIDAK masuk format cetak
  lessonCount: number
  unit: string
  pricePerLesson: number
  totalReceived: number
  period: string
  createdAt: string
  updatedAt: string
  _count?: { payments: number }
}

interface FormData {
  name: string
  nip: string
  bankAccount: string
  gender: string
  status: string
  jabatan: string
  lessonCount: string
  unit: string
  pricePerLesson: number
  period: string
}

const emptyForm: FormData = {
  name: '',
  nip: '',
  bankAccount: '',
  gender: 'L',
  status: '',
  jabatan: '',
  lessonCount: '0',
  unit: 'Jam',
  pricePerLesson: 0,
  period: '',
}

export function SalaryPage() {
  const { toast } = useToast()
  const [entries, setEntries] = useState<SalaryData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [periodFilter, setPeriodFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SalaryData | null>(null)
  const [formData, setFormData] = useState<FormData>({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [paymentEntry, setPaymentEntry] = useState<SalaryData | null>(null)
  const [printing, setPrinting] = useState(false)

  // ─── Import Excel state ──────────────────────────────────────────────────
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPeriod, setImportPeriod] = useState('')
  const [importMode, setImportMode] = useState<'skip' | 'overwrite' | 'append'>('skip')
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/salary')
      if (!res.ok) throw new Error('Gagal')
      const data = await res.json()
      setEntries(data)
    } catch {
      toast({ title: 'Error', description: 'Gagal mengambil data gaji', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  function openAddDialog() {
    setEditing(null)
    setFormData({ ...emptyForm, period: periodFilter })
    setDialogOpen(true)
  }

  function openEditDialog(entry: SalaryData) {
    setEditing(entry)
    setFormData({
      name: entry.name,
      nip: entry.nip,
      bankAccount: entry.bankAccount || '',
      gender: entry.gender || 'L',
      status: entry.status || '',
      jabatan: entry.jabatan || '',
      lessonCount: String(entry.lessonCount ?? 0),
      unit: entry.unit || 'Jam',
      pricePerLesson: entry.pricePerLesson ?? 0,
      period: entry.period || '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!formData.name.trim()) {
      toast({ title: 'Validasi', description: 'Nama guru wajib diisi', variant: 'destructive' })
      return
    }
    if (!formData.status.trim()) {
      toast({ title: 'Validasi', description: 'Status (kategori) wajib diisi', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...formData,
        lessonCount: Number(formData.lessonCount) || 0,
      }
      const url = editing ? `/api/salary/${editing.id}` : '/api/salary'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: editing ? 'Data gaji berhasil diperbarui' : 'Data gaji berhasil ditambahkan' })
      setDialogOpen(false)
      fetchEntries()
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan data gaji', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/salary/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: 'Data gaji berhasil dihapus' })
      fetchEntries()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus data gaji', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteId(null)
      setDeleteName('')
    }
  }

  const filteredEntries = entries.filter((e) => {
    const matchSearch = !search.trim() ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.nip.toLowerCase().includes(search.toLowerCase()) ||
      (e.bankAccount || '').toLowerCase().includes(search.toLowerCase()) ||
      (e.jabatan || '').toLowerCase().includes(search.toLowerCase())
    const matchPeriod = !periodFilter.trim() ||
      (e.period || '').toLowerCase().includes(periodFilter.toLowerCase())
    const matchStatus = !statusFilter.trim() ||
      (e.status || '').toLowerCase() === statusFilter.toLowerCase()
    return matchSearch && matchPeriod && matchStatus
  })

  // Daftar kategori (Status) unik dari data — untuk dropdown filter.
  const statusOptions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.status).filter(Boolean))).sort(),
    [entries]
  )

  const grandTotal = filteredEntries.reduce((s, e) => s + (e.totalReceived || 0), 0)

  // ─── Cetak — format TANDA TERIMA PEMBAYARAN HONOR (struktur = Media) ────────
  // Format ini TIDAK memakai KOP sekolah (sesuai permintaan user, sama seperti Media).
  //
  // Flow (sama dengan Media):
  // 1. Terima SalaryPrintPlan dari dialog (daftar guru + bulan belum-bayar)
  // 2. Catat pembayaran via batch endpoint di background (non-blocking)
  // 3. Cetak HTML laporan dengan tabel per-guru
  // 4. Refresh data guru (supaya badge pembayaran & total terupdate)
  async function handlePrint(plan: SalaryPrintPlan) {
    if (plan.items.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada guru/bulan yang akan dicetak' })
      return
    }

    setPrinting(true)

    // ── 1. Kumpulkan semua (salaryId, month) yang akan dicatat ────────────────
    const batchItems: Array<{ salaryId: string; month: number; lessonCount: number; amount: number }> = []
    for (const item of plan.items) {
      for (const month of item.months) {
        batchItems.push({
          salaryId: item.salaryId,
          month,
          lessonCount: item.lessonCount,
          amount: item.pricePerLesson,
        })
      }
    }

    // ── 2. Background: catat SEMUA pembayaran dalam 1 request batch ──────────
    // Tidak di-await! Jalan paralel dengan render print window.
    const recordPromise = batchItems.length > 0
      ? fetch('/api/salary/payments/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            year: Number(plan.year),
            items: batchItems,
          }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null)
      : Promise.resolve({ recorded: 0, skipped: 0 })

    // ── 3. Ambil settings (dari cache kalau ada — instant!) ─────────────────
    const raw = await fetchSettingsCached()

    const schoolName = (raw.schoolName as string) || ''
    const appLogo = (raw.appLogo as string) || (raw.favicon as string) || null
    const principalName = (raw.principalName as string) || ''
    const principalNip = (raw.principalNip as string) || ''
    const treasurerName = (raw.treasurerName as string) || ''
    const treasurerNip = (raw.treasurerNip as string) || ''
    // Kode anggaran gaji — hardcoded default dari contoh (bisa pindah ke settings nanti)
    const salaryKode = (raw.salaryKode as string) || ''
    const salaryKodeProgram = (raw.salaryKodeProgram as string) || '07.12'
    const salaryKodeKegiatan = (raw.salaryKodeKegiatan as string) || '07.1201'
    const salaryKodeRekening = (raw.salaryKodeRekening as string) || '5.1.02.02.01.0013'

    const { year, place, orientation, honorType, printDate, allMonths, items } = plan

    // ── 4. Watermark logo di tengah halaman (sebesar mungkin yang fit) ────────
    // Pakai logo APLIKASI (bukan KOP). Ukuran mm-based orientation-aware
    // supaya sebesar mungkin yang muat tanpa terpotong.
    const watermarkW = orientation === 'portrait' ? '188mm' : '275mm'
    const watermarkH = orientation === 'portrait' ? '277mm' : '190mm'
    const watermarkHtml = appLogo
      ? `<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.15; z-index: 0; pointer-events: none;">
           <img src="${appLogo}" style="width: ${watermarkW}; height: ${watermarkH}; object-fit: contain; display: block;" alt="watermark" />
         </div>`
      : ''

    // ── 5. Blok metadata (rata KANAN, di atas judul) ─────────────────────────
    const metaBlock = `
      <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
        <table style="border: none; font-size: 10pt; line-height: 1.5; width: auto;">
          <tbody>
            <tr><td style="border: none; padding: 0 4px 0 0; text-align: left;">Kode</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">:</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">${salaryKode}</td></tr>
            <tr><td style="border: none; padding: 0 4px 0 0; text-align: left;">Kode Program</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">:</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">${salaryKodeProgram}</td></tr>
            <tr><td style="border: none; padding: 0 4px 0 0; text-align: left;">Kode Kegiatan</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">:</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">${salaryKodeKegiatan}</td></tr>
            <tr><td style="border: none; padding: 0 4px 0 0; text-align: left;">Kode Rekening</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">:</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">${salaryKodeRekening}</td></tr>
            <tr><td style="border: none; padding: 0 4px 0 0; text-align: left;">Tahun Anggaran</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">:</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">${year}</td></tr>
          </tbody>
        </table>
      </div>
    `

    // ── 6. Judul (center, bold, uppercase, 2 baris sama besar 20pt) ──────────
    // Baris 1: TANDA TERIMA PEMBAYARAN [JENIS HONOR] BULAN [X SAMPAI Y]
    // Baris 2: [SEKOLAH] TAHUN [YEAR]
    const monthLabel = buildMonthRangeLabel(allMonths)
    const honorLabel = (honorType || 'HONOR').trim().toUpperCase()
    const titleHtml = `
      <div style="text-align: center; font-weight: bold; text-transform: uppercase; font-size: 20pt; line-height: 1.4; margin: 8px 0 18px; position: relative; z-index: 1;">
        <div>TANDA TERIMA PEMBAYARAN ${honorLabel} ${monthLabel}</div>
        <div>${schoolName.toUpperCase()} TAHUN ${year}</div>
      </div>
    `

    // ── 7. Tabel 7 kolom (transparan supaya watermark tembus) ────────────────
    // Kolom: NO | NAMA PENERIMA | NO. REKENING TABUNGAN | JUMLAH BULAN/LES | HONOR BULAN/LES | PENERIMAAN | TANDA TANGAN
    const grandTotalPrint = items.reduce((s, it) => s + it.months.length * it.pricePerLesson, 0)

    const rows = items.map((it, idx) => {
      const jumlahBulan = it.months.length
      const penerimaan = jumlahBulan * it.pricePerLesson
      return `
        <tr>
          <td style="background: transparent; text-align: center; vertical-align: middle; white-space: nowrap;">${idx + 1}</td>
          <td style="background: transparent; vertical-align: middle;">${it.name || '-'}</td>
          <td style="background: transparent; vertical-align: middle;">${it.bankAccount || '-'}</td>
          <td style="background: transparent; text-align: center; vertical-align: middle; white-space: nowrap;">${formatNumberPrint(jumlahBulan)} OB</td>
          <td style="background: transparent; text-align: left; vertical-align: middle; white-space: nowrap;">Rp ${formatNumberPrint(it.pricePerLesson)}</td>
          <td style="background: transparent; text-align: left; vertical-align: middle; white-space: nowrap;">Rp ${formatNumberPrint(penerimaan)}</td>
          <td style="background: transparent; height: 48px; vertical-align: middle;"></td>
        </tr>
      `
    }).join('')

    // Baris total: TERBILANG + Rp nominal
    const totalRow = `
      <tr>
        <td colspan="5" style="background: transparent; text-align: center; font-weight: bold; vertical-align: middle;">TERBILANG</td>
        <td style="background: transparent; text-align: left; vertical-align: middle;">${terbilangRupiah(grandTotalPrint)}</td>
        <td style="background: transparent; text-align: center; font-weight: bold; vertical-align: middle;">Rp ${formatNumberPrint(grandTotalPrint)},-</td>
      </tr>
    `

    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; position: relative; z-index: 1; background: transparent;">
        <thead>
          <tr>
            <th style="background: transparent; width: 5%; padding: 6px 4px;">NO.</th>
            <th style="background: transparent; width: 25%; padding: 6px 4px;">NAMA PENERIMA</th>
            <th style="background: transparent; width: 20%; padding: 6px 4px;">NO. REKENING TABUNGAN</th>
            <th style="background: transparent; width: 10%; padding: 6px 4px;">JUMLAH BULAN/LES</th>
            <th style="background: transparent; width: 13%; padding: 6px 4px;">HONOR BULAN/LES</th>
            <th style="background: transparent; width: 13%; padding: 6px 4px;">PENERIMAAN</th>
            <th style="background: transparent; width: 14%; padding: 6px 4px;">TANDA TANGAN</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          ${totalRow}
        </tbody>
      </table>
    `

    // ── 8. Blok tanda tangan (2 kolom: kiri & kanan menempel kanan) ──────────
    const today = printDate
      ? new Date(printDate + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
      : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const placeDate = place.trim() ? `${place.trim()}, ${today}` : today

    const signatureHtml = `
      <div style="display: flex; justify-content: space-between; margin-top: 24px; font-size: 10pt; position: relative; z-index: 1;">
        <div style="width: 40%; text-align: left;">
          <div>Mengetahui/</div>
          <div>Setuju Bayar:</div>
          <div>Kepala ${schoolName || 'Sekolah'},</div>
          <div style="height: 60px;"></div>
          <div style="text-decoration: underline; font-weight: bold;">${principalName || '&nbsp;'}</div>
          <div>${principalNip ? `NIP. ${principalNip}` : '&nbsp;'}</div>
        </div>
        <div style="text-align: left; flex: 0 0 auto;">
          <div>${placeDate}</div>
          <div>&nbsp;</div>
          <div>Bayar lunas :</div>
          <div>Bendahara ${schoolName || 'Sekolah'}</div>
          <div style="height: 60px;"></div>
          <div style="text-decoration: underline; font-weight: bold;">${treasurerName || '&nbsp;'}</div>
          <div>${treasurerNip ? `NIP. ${treasurerNip}` : '&nbsp;'}</div>
        </div>
      </div>
    `

    // ── 9. Gabungkan semua + BUKA print window segera ────────────────────────
    const bodyHtml = `
      ${watermarkHtml}
      ${metaBlock}
      ${titleHtml}
      ${tableHtml}
      ${signatureHtml}
    `

    openPrintWindow(
      `Daftar Pembayaran Gaji - ${monthLabel} ${year}`,
      bodyHtml,
      orientation,
    )

    // ── 10. Lepaskan spinner tombol cetak SEGERA ─────────────────────────────
    setPrinting(false)

    // ── 11. Tunggu recording selesai di background → refresh + toast ────────
    recordPromise
      .then((result) => {
        fetchEntries()
        if (result && typeof result.recorded === 'number') {
          if (result.recorded > 0) {
            toast({
              title: 'Berhasil',
              description: `${result.recorded} pembayaran tercatat di database.`,
            })
          } else if (batchItems.length > 0) {
            toast({
              title: 'Info',
              description: 'Semua pembayaran sudah tercatat sebelumnya.',
            })
          }
        } else if (batchItems.length > 0) {
          toast({
            title: 'Peringatan',
            description: 'Laporan dicetak, tapi sebagian pembayaran gagal tercatat.',
            variant: 'destructive',
          })
        }
      })
      .catch(() => {
        fetchEntries()
      })
  }

  // Helper: build label rentang bulan, mis. "BULAN JULI SAMPAI SEPTEMBER"
  function buildMonthRangeLabel(months: number[]): string {
    if (months.length === 0) return ''
    const MONTHS = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
    ]
    const sorted = [...months].sort((a, b) => a - b)
    if (sorted.length === 1) return `BULAN ${MONTHS[sorted[0] - 1].toUpperCase()}`
    return `BULAN ${MONTHS[sorted[0] - 1].toUpperCase()} SAMPAI ${MONTHS[sorted[sorted.length - 1] - 1].toUpperCase()}`
  }

  async function handleExportExcel() {
    if (filteredEntries.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data untuk diekspor' })
      return
    }
    try {
      const meta = await getSchoolMeta()
      if (periodFilter.trim()) meta.push({ label: 'Periode', value: periodFilter.trim() })
      meta.push({ label: 'Total Data', value: `${filteredEntries.length} guru` })
      meta.push({ label: 'Total Penerimaan', value: formatRupiahPrint(grandTotal) })
      // Ambil nama sekolah untuk judul (sesuai format Excel user)
      const schoolNameMeta = meta.find((m) => m.label === 'Sekolah')
      const title = schoolNameMeta?.value
        ? `DAFTAR GTTS DAN PTTS ${schoolNameMeta.value}`
        : 'DAFTAR GTTS DAN PTTS'
      await exportToExcel({
        filename: 'Database_Gaji.xlsx',
        sheetName: 'Database',
        title,
        meta,
        columns: [
          { header: 'NO', key: (e) => String(filteredEntries.indexOf(e) + 1), width: 6 },
          { header: 'NAMA', key: 'name', width: 32 },
          { header: 'NO. REKENING TABUNGAN', key: (e) => e.bankAccount || '-', width: 24 },
          { header: 'JUMLAH BULAN/JAM PELAJARAN', key: 'lessonCount', width: 16 },
          { header: 'SATUAN', key: (e) => e.unit || '-', width: 10 },
          { header: 'HARGA SATUAN/BULAN/JAM PELAJARAN', key: 'pricePerLesson', width: 18 },
          { header: 'PENERIMAAN BERSIH', key: 'totalReceived', width: 18 },
          { header: 'STATUS', key: (e) => e.status || '-', width: 16 },
          { header: 'JABATAN', key: (e) => e.jabatan || '-', width: 38 },
        ],
        data: filteredEntries,
      })
      toast({ title: 'Berhasil', description: 'Data gaji berhasil diekspor ke Excel' })
    } catch {
      toast({ title: 'Error', description: 'Gagal mengekspor data ke Excel', variant: 'destructive' })
    }
  }

  // ─── Import Excel dari file .xlsx/.xls ──────────────────────────────────
  function openImportDialog() {
    setImportFile(null)
    setImportPeriod(periodFilter || '')
    setImportMode('skip')
    setImportResult(null)
    setImportDialogOpen(true)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    // Validasi ekstensi
    const name = f.name.toLowerCase()
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls')) {
      toast({ title: 'Format tidak didukung', description: 'Pilih file .xlsx atau .xls', variant: 'destructive' })
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      toast({ title: 'File terlalu besar', description: 'Maksimal 5 MB', variant: 'destructive' })
      return
    }
    setImportFile(f)
    setImportResult(null)
  }

  async function handleImportExcel() {
    if (!importFile) {
      toast({ title: 'Validasi', description: 'Pilih file Excel dulu', variant: 'destructive' })
      return
    }
    setImporting(true)
    setImportResult(null)
    try {
      const fd = new FormData()
      fd.append('file', importFile)
      fd.append('period', importPeriod.trim())
      fd.append('mode', importMode)

      const res = await fetch('/api/salary/import', {
        method: 'POST',
        body: fd,
      })
      const data = await res.json()

      if (!res.ok) {
        toast({
          title: 'Import gagal',
          description: data.error || 'Gagal import Excel',
          variant: 'destructive',
        })
        setImporting(false)
        return
      }

      setImportResult(data)

      // Jika ada data berhasil diimport, refresh list
      if (data.imported > 0) {
        await fetchEntries()
      }

      toast({
        title: 'Import selesai',
        description: `${data.imported} dari ${data.total} baris berhasil diimport${
          data.skippedDuplicates ? `, ${data.skippedDuplicates} duplikat dilewati` : ''
        }${data.deletedFromOverwrite ? `, ${data.deletedFromOverwrite} data lama ditimpa` : ''}`,
      })
    } catch (err) {
      console.error('Import error:', err)
      toast({
        title: 'Error',
        description: 'Terjadi kesalahan saat import. Coba lagi.',
        variant: 'destructive',
      })
    } finally {
      setImporting(false)
    }
  }

  function downloadTemplate() {
    // Template Excel — sama persis dgn format "gaji database.xlsx" user:
    // Row 1: judul (merge A1:I1), Row 2: header, Row 3+: contoh data
    const title = 'DAFTAR GTTS DAN PTTS SMAN 1 TELUKDALAM'
    const headers = ['NO', 'NAMA', 'NO. REKENING TABUNGAN', 'JUMLAH BULAN/JAM PELAJARAN', 'SATUAN', 'HARGA SATUAN/BULAN/JAM PELAJARAN', 'PENERIMAAN BERSIH', 'STATUS', 'JABATAN']
    const template: (string | number)[][] = [
      [title, '', '', '', '', '', '', '', ''],
      headers,
      [1, 'CONTOH NAMA, S.PD', '271.02.04.019425-0', 39, 'JPL', 60000, 2340000, 'GTTS', 'GURU TIDAK TETAP SEKOLAH (GTTS)'],
      [2, 'CONTOH NAMA 2, S.PD', '271.02.04.022119-0', 34, 'JPL', 60000, 2040000, 'PTTS', 'PEGAWAI TIDAK TETAP SEKOLAH (PTTS)'],
    ]
    import('xlsx').then((XLSX) => {
      const ws = XLSX.utils.aoa_to_sheet(template)
      // Merge judul di row 1 (A1:I1)
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }]
      // Lebar kolom sesuai format asli
      ws['!cols'] = [
        { wch: 5 }, { wch: 32 }, { wch: 24 }, { wch: 16 }, { wch: 10 }, { wch: 18 }, { wch: 18 }, { wch: 16 }, { wch: 38 },
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Database')
      XLSX.writeFile(wb, 'Template_Import_Gaji.xlsx')
    })
  }

  return (
    <PageContainer>
      <PageHeader
        title="Gaji"
        description="Data guru dan rincian honor mengajar"
        icon={Wallet}
        actions={
          <>
            <Button variant="outline" onClick={() => {
              // Re-fetch entries supaya dialog cetak selalu pakai data DB
              // terbaru (mis. kalau user baru saja ubah jabatan/status guru).
              // Prefetch settings juga, supaya cetak instant begitu dialog buka.
              fetchEntries()
              fetchSettingsCached()
              setPrintDialogOpen(true)
            }} disabled={loading || filteredEntries.length === 0 || printing}>
              {printing ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Printer className="size-4 mr-2" />}
              Cetak
            </Button>
            <Button variant="outline" onClick={handleExportExcel} disabled={loading || filteredEntries.length === 0}>
              <FileSpreadsheet className="size-4 mr-2" />
              Export Excel
            </Button>
            <Button variant="outline" onClick={openImportDialog}>
              <FileUp className="size-4 mr-2" />
              Import Excel
            </Button>
            <Button onClick={openAddDialog}>
              <Plus className="size-4 mr-2" />
              Tambah Data
            </Button>
          </>
        }
      />

      <Card className="card-pro">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="size-5" />
              <div>
                <CardTitle>Data Guru</CardTitle>
                <CardDescription>Kelola daftar guru dan rincian honor</CardDescription>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="Periode (mis. Januari 2026)"
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="sm:w-56"
              />
              <Select
                value={statusFilter || '__all__'}
                onValueChange={(v) => setStatusFilter(v === '__all__' ? '' : v)}
              >
                <SelectTrigger className="sm:w-40">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">Semua Status</SelectItem>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Cari nama / NIP / no. rekening / jabatan..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PageLoading label="Memuat data gaji..." />
          ) : filteredEntries.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="Belum ada data"
              description={search || periodFilter || statusFilter ? 'Tidak ditemukan data yang sesuai' : 'Klik "Tambah Data" untuk menambahkan'}
            />
          ) : (
            <div className="max-h-[560px] overflow-y-auto rounded-md border">
              <Table className="table-pro">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-left tabular-nums">No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead className="whitespace-nowrap tabular-nums">No. Rekening</TableHead>
                    <TableHead className="text-right tabular-nums">Jml Les</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead className="text-right">Harga/Les</TableHead>
                    <TableHead className="text-right">Penerimaan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead className="w-[160px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((e, idx) => (
                    <TableRow key={e.id} className="h-14">
                      <TableCell className="tabular-nums text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{e.bankAccount || '-'}</TableCell>
                      <TableCell className="text-right tabular-nums">{e.lessonCount}</TableCell>
                      <TableCell>{e.unit || '-'}</TableCell>
                      <TableCell className="text-right tabular-nums">Rp {formatNumberPrint(e.pricePerLesson)}</TableCell>
                      <TableCell className="text-right">
                        <div className="tabular-nums font-medium">Rp {formatNumberPrint(e.totalReceived)}</div>
                        {e._count?.payments !== undefined && e._count.payments > 0 && (
                          <div className="mt-0.5">
                            <Badge variant="secondary" className="gap-1 text-[10px]">
                              <CheckCircle2 className="size-2.5 text-emerald-600" />
                              {e._count.payments} bln dibayar
                            </Badge>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {e.status ? (
                          <Badge variant="outline" className="whitespace-nowrap">{e.status}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{e.jabatan || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 gap-1.5"
                            onClick={() => setPaymentEntry(e)}
                            title="Catatan pembayaran per bulan"
                          >
                            <CalendarCheck className="size-4" />
                            <span className="hidden sm:inline">Bayar</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditDialog(e)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => { setDeleteId(e.id); setDeleteName(e.name) }}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          {filteredEntries.length > 0 && (
            <div className="mt-4 flex items-center justify-between rounded-md border bg-muted/40 px-4 py-3">
              <span className="text-sm text-muted-foreground">Total {filteredEntries.length} guru</span>
              <span className="text-sm font-semibold">Total Penerimaan: Rp {formatNumberPrint(grandTotal)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Data Gaji' : 'Tambah Data Gaji'}</DialogTitle>
            <DialogDescription>{editing ? 'Perbarui data guru' : 'Isi data guru baru'}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sal-name">Nama Guru *</Label>
              <Input id="sal-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Masukkan nama guru" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sal-nip">NIP</Label>
              <Input id="sal-nip" value={formData.nip} onChange={(e) => setFormData({ ...formData, nip: e.target.value })} placeholder="Nomor Induk Pegawai" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sal-rek">No. Rekening Tabungan</Label>
              <Input id="sal-rek" value={formData.bankAccount} onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })} placeholder="mis. 271.02.04.019425-0" />
            </div>
            <div className="space-y-2">
              <Label>Jenis Kelamin</Label>
              <Select value={formData.gender} onValueChange={(v) => setFormData({ ...formData, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="L">Laki-laki</SelectItem>
                  <SelectItem value="P">Perempuan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status (Kategori) *</Label>
              <MasterCombobox
                category="statusGaji"
                value={formData.status}
                onChange={(val) => setFormData({ ...formData, status: val })}
                placeholder="Pilih atau ketik status (mis. GTTS, PTTS, PNS)"
                addNewLabel="Tambah Status"
              />
              <p className="text-xs text-muted-foreground">Pembeda kategori pegawai — dipakai untuk filter, tidak masuk format cetak.</p>
            </div>
            <div className="space-y-2">
              <Label>Jabatan</Label>
              <MasterCombobox
                category="jabatanGaji"
                value={formData.jabatan}
                onChange={(val) => setFormData({ ...formData, jabatan: val })}
                placeholder="Pilih atau ketik jabatan (mis. GURU SEMENTARA)"
                addNewLabel="Tambah Jabatan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sal-lesson">Jumlah Les</Label>
              <Input id="sal-lesson" type="number" min="0" value={formData.lessonCount} onChange={(e) => setFormData({ ...formData, lessonCount: e.target.value })} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>Satuan</Label>
              <MasterCombobox
                category="satuanLes"
                value={formData.unit}
                onChange={(val) => setFormData({ ...formData, unit: val })}
                placeholder="Pilih atau ketik satuan"
                addNewLabel="Tambah Satuan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sal-price">Harga Per Les (Rp)</Label>
              <CurrencyInput id="sal-price" value={formData.pricePerLesson} onChange={(v) => setFormData({ ...formData, pricePerLesson: v })} placeholder="0" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="sal-period">Periode</Label>
              <Input id="sal-period" value={formData.period} onChange={(e) => setFormData({ ...formData, period: e.target.value })} placeholder="mis. Januari 2026" />
            </div>
            <div className="space-y-2 sm:col-span-2 rounded-md border bg-muted/40 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Penerimaan (Jml Les × Harga/Les):</span>
                <span className="font-semibold">Rp {formatNumberPrint((Number(formData.lessonCount) || 0) * (formData.pricePerLesson || 0))}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editing ? 'Simpan Perubahan' : 'Tambah Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) { setDeleteId(null); setDeleteName('') } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data gaji <span className="font-semibold">{deleteName}</span>? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SalaryPrintDialog
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        onPrint={handlePrint}
        entries={entries.map((e) => ({
          id: e.id,
          name: e.name,
          nip: e.nip,
          bankAccount: e.bankAccount || '',
          jabatan: e.jabatan || '',
          status: e.status || '',
          lessonCount: e.lessonCount,
          unit: e.unit,
          pricePerLesson: e.pricePerLesson,
        }))}
        loading={loading}
      />

      {paymentEntry && (
        <PaymentDialog
          open={!!paymentEntry}
          onOpenChange={(open) => { if (!open) setPaymentEntry(null) }}
          kind="salary"
          ownerId={paymentEntry.id}
          ownerName={paymentEntry.name}
          ownerSubtitle={paymentEntry.nip ? `NIP. ${paymentEntry.nip}` : undefined}
          durationMonths={12}
          defaultAmount={paymentEntry.pricePerLesson * paymentEntry.lessonCount}
          defaultLessonCount={paymentEntry.lessonCount}
          showLessonCount
          apiBase={`/api/salary/${paymentEntry.id}/payments`}
          onPaymentChange={fetchEntries}
        />
      )}

      {/* ─── Dialog Import Excel ─────────────────────────────────────────── */}
      <Dialog open={importDialogOpen} onOpenChange={(open) => { if (!importing) setImportDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileUp className="size-5" />
              Import Excel Gaji
            </DialogTitle>
            <DialogDescription>
              Import data guru dari file Excel (.xlsx, .xls). Format sama persis dengan database gaji: NO, NAMA, NO. REKENING TABUNGAN, JUMLAH BULAN/JAM PELAJARAN, SATUAN, HARGA SATUAN/BULAN/JAM PELAJARAN, PENERIMAAN BERSIH, STATUS, JABATAN. Baris judul & footer (GTTS/PTTS/HONORER) otomatis dilewati.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Pilih file */}
            <div className="space-y-2">
              <Label>File Excel</Label>
              {!importFile ? (
                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-8 cursor-pointer hover:bg-muted/40 transition-colors">
                  <Upload className="size-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Klik untuk pilih file .xlsx / .xls</span>
                  <span className="text-xs text-muted-foreground/70">Maksimal 5 MB</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                  <div className="flex size-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <FileSpreadsheet className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{importFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(importFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  {!importing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => setImportFile(null)}
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Periode */}
            <div className="space-y-2">
              <Label>Periode (opsional)</Label>
              <Input
                placeholder="Mis. Januari 2026"
                value={importPeriod}
                onChange={(e) => setImportPeriod(e.target.value)}
                disabled={importing}
              />
              <p className="text-xs text-muted-foreground">
                Data yg diimport akan diberi label periode ini. Dipakai juga untuk cek duplikat.
              </p>
            </div>

            {/* Mode import */}
            <div className="space-y-2">
              <Label>Mode Import</Label>
              <Select
                value={importMode}
                onValueChange={(v) => setImportMode(v as 'skip' | 'overwrite' | 'append')}
                disabled={importing}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Lewati duplikat (default)</SelectItem>
                  <SelectItem value="overwrite">Timpa data periode sama</SelectItem>
                  <SelectItem value="append">Tambah semua (tanpa cek)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                <strong>Lewati duplikat:</strong> skip baris dgn NAMA + No.Rekening yg sudah ada di periode sama.<br />
                <strong>Timpa:</strong> hapus semua data di periode sama, lalu import ulang.<br />
                <strong>Tambah semua:</strong> import semua baris tanpa cek duplikat.
              </p>
            </div>

            {/* Tombol download template */}
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={downloadTemplate} disabled={importing}>
                <FileSpreadsheet className="size-4 mr-2" />
                Download Template
              </Button>
            </div>

            {/* Hasil import */}
            {importResult && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle2 className="size-4 text-primary" />
                  Hasil Import
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Total baris diproses:</div>
                  <div className="text-right font-medium">{importResult.total}</div>
                  <div className="text-primary">Berhasil diimport:</div>
                  <div className="text-right font-medium text-primary">{importResult.imported}</div>
                  {importResult.skippedDuplicates > 0 && (
                    <>
                      <div>Duplikat dilewati:</div>
                      <div className="text-right font-medium">{importResult.skippedDuplicates}</div>
                    </>
                  )}
                  {importResult.skippedFooter > 0 && (
                    <>
                      <div>Baris kategori/footer:</div>
                      <div className="text-right font-medium">{importResult.skippedFooter}</div>
                    </>
                  )}
                  {importResult.deletedFromOverwrite > 0 && (
                    <>
                      <div>Data lama ditimpa:</div>
                      <div className="text-right font-medium">{importResult.deletedFromOverwrite}</div>
                    </>
                  )}
                  {importResult.errors?.length > 0 && (
                    <>
                      <div className="text-destructive">Gagal:</div>
                      <div className="text-right font-medium text-destructive">{importResult.errors.length}</div>
                    </>
                  )}
                </div>
                {importResult.errors?.length > 0 && (
                  <div className="mt-2 max-h-32 overflow-y-auto rounded border bg-background p-2 text-xs space-y-1">
                    {importResult.errors.slice(0, 10).map((e: any, i: number) => (
                      <div key={i} className="text-destructive">
                        Baris {e.row} ({e.name}): {e.error}
                      </div>
                    ))}
                    {importResult.errors.length > 10 && (
                      <div className="text-muted-foreground">
                        ...dan {importResult.errors.length - 10} error lainnya
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(false)}
              disabled={importing}
            >
              {importResult ? 'Tutup' : 'Batal'}
            </Button>
            {!importResult && (
              <Button onClick={handleImportExcel} disabled={!importFile || importing}>
                {importing ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Mengimport...
                  </>
                ) : (
                  <>
                    <Upload className="size-4 mr-2" />
                    Import Sekarang
                  </>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
