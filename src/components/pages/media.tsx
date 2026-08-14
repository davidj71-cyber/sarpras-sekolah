'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Newspaper,
  Printer,
  FileSpreadsheet,
  CalendarCheck,
  CheckCircle2,
} from 'lucide-react'
import {
  openPrintWindow,
  formatRupiahPrint,
  formatNumberPrint,
} from '@/lib/print-utils'
import { terbilangRupiah } from '@/lib/terbilang'
import { exportToExcel, getSchoolMeta } from '@/lib/export-excel'
import { MediaPrintDialog, type MediaPrintPlan } from '@/components/media-print-dialog'
import { PaymentDialog } from '@/components/payment-dialog'
import { PageHeader, PageContainer } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { PageLoading } from '@/components/ui/loading-skeleton'
import { Badge } from '@/components/ui/badge'

// ─── Settings cache (module-level) ───────────────────────────────────────────
// Settings sekolah (KOP, nama kepsek, bendahara, kode anggaran, dst.) hampir
// tidak pernah berubah saat user aktif. Cache di level modul supaya:
//   - Klik cetak ke-2, 3, dst. → instant (tidak perlu fetch /api/settings lagi)
//   - Prefetch bisa dilakukan saat dialog cetak terbuka, sebelum user klik
//     tombol "Cetak" — sehingga saat tombol ditekan, settings sudah siap.
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

interface MediaData {
  id: string
  name: string
  mediaName: string
  paymentType: string
  pricePerMonth: number
  unitCount: number
  totalReceived: number
  period: string
  createdAt: string
  updatedAt: string
  _count?: { payments: number }
}

interface FormData {
  name: string
  mediaName: string
  paymentType: string
  pricePerMonth: number
  unitCount: string
  period: string
}

const emptyForm: FormData = {
  name: '',
  mediaName: '',
  paymentType: 'Tunai',
  pricePerMonth: 0,
  unitCount: '1',
  period: '',
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

// Helper: build "BULAN X SAMPAI Y" (contiguous) or "BULAN X, Y, Z" (non-contiguous)
function buildMonthRangeLabel(months: number[]): string {
  if (months.length === 0) return ''
  if (months.length === 1) return `BULAN ${MONTH_NAMES_ID[months[0] - 1].toUpperCase()}`
  const sorted = [...months].sort((a, b) => a - b)
  let contiguous = true
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) { contiguous = false; break }
  }
  if (contiguous) {
    return `BULAN ${MONTH_NAMES_ID[sorted[0] - 1].toUpperCase()} SAMPAI ${MONTH_NAMES_ID[sorted[sorted.length - 1] - 1].toUpperCase()}`
  }
  return `BULAN ${sorted.map((m) => MONTH_NAMES_ID[m - 1].toUpperCase()).join(', ')}`
}

/**
 * Pre-compute font-size (pt) supaya judul baris 1 SELALU muat 1 baris di
 * halaman cetak. Mengukur lebar teks pakai hidden probe div yang lebarnya =
 * printable area (mm) sesuai orientasi — BUKAN lebar window browser.
 *
 * Fix bug lama: auto-fit JS di print window ukur el.clientWidth = lebar
 * window browser (~1240px) yang lebih lebar dari halaman cetak A4
 * (~1039px landscape / ~710px portrait setelah @page margin). Akibatnya
 * judul "fit" di preview tapi terpotong saat dicetak.
 *
 * Dengan pre-compute di parent window, font-size sudah benar SEBELUM print
 * window dibuka — tidak ada race condition, tidak ada clipping.
 */
function computeTitleFontSize(
  text: string,
  maxWidthMm: number,
  maxPt = 20,
  minPt = 8,
): number {
  if (typeof window === 'undefined' || !text) return maxPt
  try {
    const probe = document.createElement('div')
    probe.style.position = 'absolute'
    probe.style.left = '-99999px'
    probe.style.top = '0'
    probe.style.visibility = 'hidden'
    probe.style.width = `${maxWidthMm}mm`
    probe.style.whiteSpace = 'nowrap'
    probe.style.fontFamily = "'Times New Roman', serif"
    probe.style.fontWeight = 'bold'
    probe.style.textTransform = 'uppercase'
    probe.style.lineHeight = '1.4'
    probe.style.fontSize = `${maxPt}pt`
    probe.textContent = text
    document.body.appendChild(probe)
    const targetWidth = probe.clientWidth // = maxWidthMm dalam px
    const textWidth = probe.scrollWidth    // lebar teks actual pada maxPt
    document.body.removeChild(probe)
    if (textWidth <= targetWidth) return maxPt
    // Skala proporsional + 3% safety margin supaya pasti muat
    const scale = (targetWidth / textWidth) * 0.97
    const fitted = maxPt * scale
    return Math.max(minPt, Math.min(maxPt, Math.round(fitted * 10) / 10))
  } catch {
    return maxPt
  }
}

export function MediaPage() {
  const { toast } = useToast()
  const [entries, setEntries] = useState<MediaData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [periodFilter, setPeriodFilter] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<MediaData | null>(null)
  const [formData, setFormData] = useState<FormData>({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [paymentEntry, setPaymentEntry] = useState<MediaData | null>(null)
  const [defaultPrintPlace, setDefaultPrintPlace] = useState('')
  const [printing, setPrinting] = useState(false)
  // Guard against double-fire (click + Enter key) — prevents 2 print windows.
  const printingRef = useRef(false)

  const fetchEntries = useCallback(async (opts?: { silent?: boolean }) => {
    // Silent mode: skip full-page loading spinner for background refreshes
    // (e.g. after print/save/delete). Only show spinner on initial load.
    if (!opts?.silent) setLoading(true)
    try {
      const res = await fetch('/api/media')
      if (!res.ok) throw new Error('Gagal')
      const data = await res.json()
      setEntries(data)
    } catch {
      toast({ title: 'Error', description: 'Gagal mengambil data media', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  // Ambil tempat default dari address sekolah (kota pertama sebelum koma)
  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((data) => {
        const addr = (data?.address || '').trim()
        if (addr) {
          // Ambil token pertama sebelum koma sebagai kota
          const city = addr.split(',')[0].trim()
          if (city) setDefaultPrintPlace(city)
        }
      })
      .catch(() => { /* ignore — defaultPlace tetap kosong */ })
  }, [])

  function openAddDialog() {
    setEditing(null)
    setFormData({ ...emptyForm, period: periodFilter })
    setDialogOpen(true)
  }

  function openEditDialog(entry: MediaData) {
    setEditing(entry)
    setFormData({
      name: entry.name,
      mediaName: entry.mediaName,
      paymentType: entry.paymentType || 'Tunai',
      pricePerMonth: entry.pricePerMonth ?? 0,
      unitCount: String(entry.unitCount ?? 1),
      period: entry.period || '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!formData.name.trim()) {
      toast({ title: 'Validasi', description: 'Nama wajib diisi', variant: 'destructive' })
      return
    }
    if (!formData.mediaName.trim()) {
      toast({ title: 'Validasi', description: 'Nama media wajib diisi', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...formData,
        unitCount: Number(formData.unitCount) || 0,
      }
      const url = editing ? `/api/media/${editing.id}` : '/api/media'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: editing ? 'Data media berhasil diperbarui' : 'Data media berhasil ditambahkan' })
      setDialogOpen(false)
      fetchEntries({ silent: true })
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan data media', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/media/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: 'Data media berhasil dihapus' })
      fetchEntries({ silent: true })
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus data media', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteId(null)
      setDeleteName('')
    }
  }

  const filteredEntries = entries.filter((e) => {
    const matchSearch = !search.trim() ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.mediaName.toLowerCase().includes(search.toLowerCase())
    const matchPeriod = !periodFilter.trim() ||
      (e.period || '').toLowerCase().includes(periodFilter.toLowerCase())
    return matchSearch && matchPeriod
  })

  const grandTotal = filteredEntries.reduce((s, e) => s + (e.totalReceived || 0), 0)

  // ─── Cetak — format DAFTAR PEMBAYARAN IURAN KORAN & MAJALAH ──────────────────
  // Format ini TIDAK memakai KOP sekolah (sesuai permintaan user).
  //
  // Flow baru (versi terhubung database):
  // 1. Terima MediaPrintPlan dari dialog (daftar media + bulan belum-bayar)
  // 2. Catat pembayaran ke /api/media/[id]/payments untuk setiap (media, bulan)
  // 3. Cetak HTML laporan dengan tabel per-media
  // 4. Refresh data media (supaya badge pembayaran & total terupdate)
  async function handlePrint(plan: MediaPrintPlan) {
    if (plan.items.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada media/bulan yang akan dicetak' })
      return
    }

    // Guard: cegah double-fire (click + Enter, atau double-click cepat).
    // Tanpa ini, 2 window cetak bisa muncul saat loading.
    if (printingRef.current) return
    printingRef.current = true

    setPrinting(true)

    // ── 1. Kumpulkan semua (mediaId, month) yang akan dicatat ────────────────
    const batchItems: Array<{ mediaId: string; month: number; amount: number }> = []
    for (const item of plan.items) {
      for (const month of item.months) {
        batchItems.push({
          mediaId: item.mediaId,
          month,
          amount: item.pricePerMonth,
        })
      }
    }

    // ── 2. Background: catat SEMUA pembayaran dalam 1 request batch ──────────
    // Tidak di-await! Jalan paralel dengan render print window.
    // 1 HTTP request + 1 INSERT createMany + 1 groupBy aggregate + N update paralel
    // vs. sebelumnya: N×M sequential POST (bisa 30+ detik untuk 60 baris).
    const recordPromise = batchItems.length > 0
      ? fetch('/api/media/payments/batch', {
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
    const province = (raw.province as string) || 'SUMATERA UTARA'
    // Watermark memakai logo APLIKASI (bukan logo KOP surat), fallback ke favicon.
    const appLogo = (raw.appLogo as string) || (raw.favicon as string) || null
    const principalName = (raw.principalName as string) || ''
    const principalNip = (raw.principalNip as string) || ''
    const treasurerName = (raw.treasurerName as string) || ''
    const treasurerNip = (raw.treasurerNip as string) || ''
    const mediaKode = (raw.mediaKode as string) || ''
    const mediaKodeProgram = (raw.mediaKodeProgram as string) || '03.03.16.'
    const mediaKodeKegiatan = (raw.mediaKodeKegiatan as string) || '03.03.'
    const mediaKodeRekening = (raw.mediaKodeRekening as string) || '5.1.02.01.01.0055'

    const { year, place, orientation, printDate, allMonths, items } = plan

    // ── 4. Watermark logo di tengah halaman (opacity rendah) ──────────────────
    // Pakai logo APLIKASI (bukan KOP) supaya lebih relevan sebagai background.
    //
    // Agar logo SEBESAR MUGKIN TAPI tidak terpotong:
    // Pakai unit fisik mm (bukan %) yang presisi sesuai usable area A4 setelah
    // @page margin (12mm kiri + 10mm kanan + 10mm atas + 10mm bawah).
    //   A4 portrait  usable = 188mm × 277mm
    //   A4 landscape usable = 275mm × 190mm
    // Box watermark = seluruh usable area. Logo di-scale contain di dalamnya
    // (utuh, tidak distorsi, mungkin ada letterbox untuk logo non-persegi).
    //
    // Sebelumnya pakai width: 95% (relatif viewport = full page termasuk margin)
    // → 95% × 793px = 753px > usable 711px → terpotong 42px di ujung.
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
            <tr><td style="border: none; padding: 0 4px 0 0; text-align: left;">Kode</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">:</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">${mediaKode}</td></tr>
            <tr><td style="border: none; padding: 0 4px 0 0; text-align: left;">Kode Program</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">:</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">${mediaKodeProgram}</td></tr>
            <tr><td style="border: none; padding: 0 4px 0 0; text-align: left;">Kode Kegiatan</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">:</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">${mediaKodeKegiatan}</td></tr>
            <tr><td style="border: none; padding: 0 4px 0 0; text-align: left;">Kode Rekening</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">:</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">${mediaKodeRekening}</td></tr>
            <tr><td style="border: none; padding: 0 4px 0 0; text-align: left;">Tahun Anggaran</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">:</td><td style="border: none; padding: 0 0 0 4px; text-align: left;">${year}</td></tr>
          </tbody>
        </table>
      </div>
    `

    // ── 6. Judul (center, bold, uppercase, 2 baris) ───────────────────────────
    // Baris 1: DAFTAR PEMBAYARAN IURAN KORAN DAN MAJALAH [BULAN X SAMPAI Y]
    // Baris 2: DI LINGKUNGAN [SEKOLAH] TAHUN [YEAR]
    // Baris 1 SELALU 1 baris — font-size di-pre-compute di parent window pakai
    // hidden probe div yang lebarnya = printable area (mm) sesuai orientasi,
    // BUKAN lebar window browser. Ini fix bug judul terpotong saat dicetak.
    // Font Times New Roman (serif) supaya konsisten dengan gaji & dokumen formal.
    const monthLabel = buildMonthRangeLabel(allMonths)
    const titleLine1 = `DAFTAR PEMBAYARAN IURAN KORAN DAN MAJALAH ${monthLabel}`.replace(/\s+/g, ' ').trim()
    const titleLine2 = `DI LINGKUNGAN ${schoolName.toUpperCase()} TAHUN ${year}`
    // Lebar printable A4 (@page margin 12mm kiri + 10mm kanan):
    //   portrait  = 210 - 12 - 10 = 188mm
    //   landscape = 297 - 12 - 10 = 275mm
    const maxWidthMm = orientation === 'landscape' ? 275 : 188
    const titleFontSize = computeTitleFontSize(titleLine1, maxWidthMm, 20, 8)
    const titleHtml = `
      <div style="text-align: center; font-weight: bold; text-transform: uppercase; font-size: ${titleFontSize}pt; line-height: 1.4; margin: 8px 0 18px; position: relative; z-index: 1; font-family: 'Times New Roman', serif;">
        <div id="print-title-line1" style="white-space: nowrap;">${titleLine1}</div>
        <div>${titleLine2}</div>
      </div>
    `

    // ── 7. Tabel 7 kolom ──────────────────────────────────────────────────────
    const grandTotalPrint = items.reduce((s, it) => s + it.months.length * it.pricePerMonth, 0)

    const rows = items.map((it, idx) => {
      const jumlahBulan = it.months.length
      const penerimaan = jumlahBulan * it.pricePerMonth
      return `
        <tr>
          <td style="background: transparent; text-align: center; vertical-align: middle; white-space: nowrap;">${idx + 1}</td>
          <td style="background: transparent; vertical-align: middle;">${it.name || '-'}</td>
          <td style="background: transparent; vertical-align: middle;">${it.mediaName || '-'}</td>
          <td style="background: transparent; text-align: center; vertical-align: middle; white-space: nowrap;">${formatNumberPrint(jumlahBulan)} OB</td>
          <td style="background: transparent; text-align: left; vertical-align: middle; white-space: nowrap;">Rp ${formatNumberPrint(it.pricePerMonth)}</td>
          <td style="background: transparent; text-align: left; vertical-align: middle; white-space: nowrap;">Rp ${formatNumberPrint(penerimaan)}</td>
          <td style="background: transparent; height: 48px; vertical-align: middle;"></td>
        </tr>
      `
    }).join('')

    // Baris total — layout revisi sesuai permintaan user (mirror gaji):
    //   col 1-2 (colspan=2): label "JUMLAH KESELURUHAN" (hanya sampai batas NO + PENERIMA)
    //   col 3-5 (colspan=3): teks terbilang rupiah (dari NAMA MEDIA s/d URAIAN IURAN/BULAN)
    //   col 6:              total "Rp 150.000,-" (di kolom PENERIMAAN BERSIH)
    //   col 7:              kosong (TANDA TANGAN)
    // Total kolom: 2 + 3 + 1 + 1 = 7 ✅
    const totalRow = `
      <tr>
        <td colspan="2" style="background: transparent; text-align: center; font-weight: bold; vertical-align: middle;">JUMLAH KESELURUHAN</td>
        <td colspan="3" style="background: transparent; text-align: left; vertical-align: middle;">${terbilangRupiah(grandTotalPrint)}</td>
        <td style="background: transparent; text-align: left; vertical-align: middle; white-space: nowrap; font-weight: bold;">Rp&nbsp;&nbsp;&nbsp;${formatNumberPrint(grandTotalPrint)},-</td>
        <td style="background: transparent; vertical-align: middle;"></td>
      </tr>
    `

    // Tabel: background transparent + z-index 1 (di atas watermark z-index 0)
    // Header (th) background transparent supaya logo tembus — override CSS global
    // yang default-nya th { background-color: #f0f0f0 } (opaque, menutupi logo).
    // Border tetap #333 supaya struktur tabel jelas.
    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; position: relative; z-index: 1; background: transparent;">
        <thead>
          <tr>
            <th style="background: transparent; width: 5%; padding: 6px 4px;">NO.</th>
            <th style="background: transparent; width: 20%; padding: 6px 4px;">PENERIMA</th>
            <th style="background: transparent; width: 15%; padding: 6px 4px;">NAMA MEDIA</th>
            <th style="background: transparent; width: 10%; padding: 6px 4px;">JUMLAH BULAN</th>
            <th style="background: transparent; width: 15%; padding: 6px 4px;">URAIAN IURAN/BULAN</th>
            <th style="background: transparent; width: 15%; padding: 6px 4px;">PENERIMAAN BERSIH</th>
            <th style="background: transparent; width: 20%; padding: 6px 4px;">TANDA TANGAN</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          ${totalRow}
        </tbody>
      </table>
    `

    // ── 8. Blok tanda tangan (2 kolom paralel) ───────────────────────────────
    // Tanggal cetak: pakai printDate user kalau diisi, fallback ke hari ini.
    // printDate format ISO yyyy-mm-dd (dari <input type="date">), format ke "12 Agustus 2026".
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
    // Tunggu settings saja (sudah cached). Recording masih jalan di background.
    const bodyHtml = `
      ${watermarkHtml}
      ${metaBlock}
      ${titleHtml}
      ${tableHtml}
      ${signatureHtml}
    `

    openPrintWindow(
      `Daftar Pembayaran Media - ${monthLabel} ${year}`,
      bodyHtml,
      orientation,
    )

    // ── 10. Lepaskan spinner tombol cetak SEGERA ─────────────────────────────
    // Print window sudah terbuka, user bisa langsung lihat preview.
    // Recording masih jalan di background, tidak menghalangi UI.
    setPrinting(false)

    // ── 11. Tunggu recording selesai di background → refresh + toast ────────
    // Pakai .then() bukan await supaya tidak block return fungsi ini.
    // Silent refresh: jangan flash full-page loading spinner untuk background update.
    recordPromise
      .then((result) => {
        // Refresh data media untuk update badge pembayaran & total
        fetchEntries({ silent: true })
        if (result && typeof result.recorded === 'number') {
          if (result.recorded > 0) {
            toast({
              title: 'Berhasil',
              description: `${result.recorded} pembayaran tercatat di database.`,
            })
          } else if (batchItems.length > 0) {
            // Semua sudah dibayar sebelumnya (skipDuplicates) — bukan error
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
        // Fallback: tetap refresh agar badge sinkron dengan server
        fetchEntries({ silent: true })
      })
      .finally(() => {
        printingRef.current = false
      })
  }

  async function handleExportExcel() {
    if (filteredEntries.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data untuk diekspor' })
      return
    }
    try {
      const meta = await getSchoolMeta()
      if (periodFilter.trim()) meta.push({ label: 'Periode', value: periodFilter.trim() })
      meta.push({ label: 'Total Data', value: `${filteredEntries.length} media` })
      meta.push({ label: 'Total Penerimaan', value: formatRupiahPrint(grandTotal) })
      await exportToExcel({
        filename: 'Daftar_Media.xlsx',
        sheetName: 'Daftar Media',
        title: 'DAFTAR MEDIA',
        meta,
        columns: [
          { header: 'No', key: (e) => String(filteredEntries.indexOf(e) + 1), width: 6 },
          { header: 'Nama', key: 'name', width: 26 },
          { header: 'Nama Media', key: 'mediaName', width: 28 },
          { header: 'Pembayaran', key: (e) => e.paymentType || '-', width: 14 },
          { header: 'Harga Perbulan', key: 'pricePerMonth', width: 18 },
          { header: 'Satuan', key: 'unitCount', width: 10 },
          { header: 'Penerimaan', key: 'totalReceived', width: 18 },
          { header: 'Periode', key: (e) => e.period || '-', width: 18 },
        ],
        data: filteredEntries,
      })
      toast({ title: 'Berhasil', description: 'Data media berhasil diekspor ke Excel' })
    } catch {
      toast({ title: 'Error', description: 'Gagal mengekspor data ke Excel', variant: 'destructive' })
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Media"
        description="Database langganan media"
        icon={Newspaper}
        actions={
          <>
            <Button variant="outline" onClick={() => {
              // Prefetch settings saat dialog cetak dibuka — saat user nanti
              // klik tombol "Cetak" di dialog, settings sudah siap di cache.
              fetchSettingsCached()
              setPrintDialogOpen(true)
            }} disabled={loading || filteredEntries.length === 0}>
              <Printer className="size-4 mr-2" />
              Cetak
            </Button>
            <Button variant="outline" onClick={handleExportExcel} disabled={loading || filteredEntries.length === 0}>
              <FileSpreadsheet className="size-4 mr-2" />
              Export Excel
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
              <Newspaper className="size-5" />
              <div>
                <CardTitle>Data Media</CardTitle>
                <CardDescription>Kelola daftar langganan media</CardDescription>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                placeholder="Periode (mis. Januari 2026)"
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="sm:w-56"
              />
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Cari nama / media..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PageLoading label="Memuat data media..." />
          ) : filteredEntries.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              title="Belum ada data"
              description={search || periodFilter ? 'Tidak ditemukan data yang sesuai' : 'Klik "Tambah Data" untuk menambahkan'}
            />
          ) : (
            <div className="max-h-[560px] overflow-y-auto rounded-md border">
              <Table className="table-pro">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-left tabular-nums">No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Nama Media</TableHead>
                    <TableHead className="text-center">Pembayaran</TableHead>
                    <TableHead className="text-right">Harga/Bulan</TableHead>
                    <TableHead className="text-center">Satuan</TableHead>
                    <TableHead className="text-right">Penerimaan</TableHead>
                    <TableHead className="w-[160px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((e, idx) => (
                    <TableRow key={e.id} className="h-14">
                      <TableCell className="tabular-nums text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell>{e.mediaName}</TableCell>
                      <TableCell className="text-center">{e.paymentType || '-'}</TableCell>
                      <TableCell className="text-right tabular-nums">Rp {formatNumberPrint(e.pricePerMonth)}</TableCell>
                      <TableCell className="text-center tabular-nums">
                        <Badge variant="outline" className="font-medium">{e.unitCount} bln</Badge>
                      </TableCell>
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
                          <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => { setDeleteId(e.id); setDeleteName(`${e.name} - ${e.mediaName}`) }}>
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
              <span className="text-sm text-muted-foreground">Total {filteredEntries.length} media</span>
              <span className="text-sm font-semibold">Total Penerimaan: Rp {formatNumberPrint(grandTotal)}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Data Media' : 'Tambah Data Media'}</DialogTitle>
            <DialogDescription>{editing ? 'Perbarui data media' : 'Isi data media baru'}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="med-name">Nama *</Label>
              <Input id="med-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Nama penanggung jawab" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-media">Nama Media *</Label>
              <Input id="med-media" value={formData.mediaName} onChange={(e) => setFormData({ ...formData, mediaName: e.target.value })} placeholder="mis. Kompas, Tempo" />
            </div>
            <div className="space-y-2">
              <Label>Pembayaran</Label>
              <Select value={formData.paymentType} onValueChange={(v) => setFormData({ ...formData, paymentType: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tunai">Tunai</SelectItem>
                  <SelectItem value="Transfer">Transfer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Satuan (jumlah bulan)</Label>
              <Select value={formData.unitCount} onValueChange={(v) => setFormData({ ...formData, unitCount: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih jumlah bulan" /></SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((n) => (
                    <SelectItem key={n} value={n}>{n} bulan</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-price">Harga Perbulan (Rp)</Label>
              <CurrencyInput id="med-price" value={formData.pricePerMonth} onChange={(v) => setFormData({ ...formData, pricePerMonth: v })} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="med-period">Periode</Label>
              <Input id="med-period" value={formData.period} onChange={(e) => setFormData({ ...formData, period: e.target.value })} placeholder="mis. Januari 2026" />
            </div>
            <div className="space-y-2 sm:col-span-2 rounded-md border bg-muted/40 px-4 py-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Penerimaan (Satuan × Harga/Bulan):</span>
                <span className="font-semibold">Rp {formatNumberPrint((Number(formData.unitCount) || 0) * (formData.pricePerMonth || 0))}</span>
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
              Apakah Anda yakin ingin menghapus data media <span className="font-semibold">{deleteName}</span>? Tindakan ini tidak dapat dibatalkan.
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

      <MediaPrintDialog
        key={defaultPrintPlace || 'no-place'}
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        onPrint={handlePrint}
        entries={entries}
        loading={printing}
        defaultPlace={defaultPrintPlace}
      />

      {paymentEntry && (
        <PaymentDialog
          open={!!paymentEntry}
          onOpenChange={(open) => { if (!open) setPaymentEntry(null) }}
          kind="media"
          ownerId={paymentEntry.id}
          ownerName={paymentEntry.name}
          ownerSubtitle={paymentEntry.mediaName}
          durationMonths={paymentEntry.unitCount}
          defaultAmount={paymentEntry.pricePerMonth}
          apiBase={`/api/media/${paymentEntry.id}/payments`}
          onPaymentChange={fetchEntries}
        />
      )}
    </PageContainer>
  )
}
