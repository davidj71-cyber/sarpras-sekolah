'use client'

// ─── Cetak Rekening Koran ───────────────────────────────────────────────────
// Surat permohonan resmi ke Bank untuk mencetak rekening koran.
// Format mengikuti "rekening koran.docx" (format baku user).
//
// Struktur surat:
//   1. KOP surat (dari SchoolSettings — buildKopHtml)
//   2. Tanggal + Nomor + Lampiran + Perihal (rata kanan)
//   3. Tujuan: Kepada Yth, Pimpinan [Bank] di [Lokasi]
//   4. Salam pembuka + Identitas pemohon (Nama/NIP/Jabatan/Unit Kerja)
//   5. Maksud: permohonan cetak rekening koran periode [bulan awal-akhir] [tahun]
//   6. Daftar rekening (1 atau lebih): Nomor / a/n / Rek. Koran Bank
//   7. Tujuan & alamat (guna kepentingan)
//   8. Penutup
//   9. Tanda tangan Kepala Sekolah
//
// Daftar rekening persisten di DATABASE (tabel BankAccount) supaya sinkron
// antar perangkat/session. Sebelumnya pakai localStorage (per-browser only).
//
// ⚠️ PENTING: Rekening Koran ini KHUSUS untuk rekening SEKOLAH (mis. BOS Reguler,
// Gaji PNS, GTT Provinsi), BUKAN rekening pribadi pegawai. Jangan masukkan
// nomor rekening pegawai dari data gaji di sini.

import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  Trash2,
  Loader2,
  Printer,
  Landmark,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  X,
} from 'lucide-react'
import {
  openPrintWindow,
  sanitizeFilename,
  fetchPrintSettings,
  buildKopHtml,
  parseKopLines,
  type PrintSettings,
} from '@/lib/print-utils'
import { resizeImageFile } from '@/lib/resize-image'

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const STORAGE_KEY = 'simapras:rekening-koran-defaults'
// Daftar rekening sekarang disimpan di database (tabel BankAccount),
// bukan localStorage. Lihat API /api/bank-accounts.

interface BankAccountRow {
  id: string
  accountNumber: string
  accountName: string
  description: string // "Rek. Koran Bank" — e.g. "BOS Reguler"
}

interface RekeningKoranDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FormDefaults {
  // Nomor urut surat (angka saja) — auto di-compose jadi
  // 400.3.8/[NOMOR]/ADM/[ROMAN_BULAN]/[TAHUN] saat dicetak.
  letterSeq: string
  lampiran: string
  bankName: string
  bankLocation: string
  startMonth: number
  endMonth: number
  year: number
  budgetYear: number
  purpose: string
  // Alamat singkat di bagian "yang beralamat ..." — berbeda dari address KOP.
  // Default diambil dari 2 chunk pertama address KOP (mis. "Jl. Pendidikan No.13 Kelurahan Pasar Telukdalam").
  shortAddress: string
}

// ─── Konstanta format nomor surat ───────────────────────────────────────────
// Format baku: 400.3.8/[NOMOR]/ADM/[ROMAN_BULAN]/[TAHUN]
//   400.3.8 = kode klasifikasi surat keuangan/sekolah (fixed)
//   NOMOR   = nomor urut surat (input user, angka saja)
//   ADM     = kode unit Tata Usaha (fixed)
//   ROMAN_BULAN = bulan surat dalam Romawi (I–XII), diambil dari Tanggal Surat
//   TAHUN   = tahun surat, diambil dari Tanggal Surat
const LETTER_PREFIX = '400.3.8'
const LETTER_UNIT_CODE = 'ADM'

const ROMAN_NUMERALS = [
  'I', 'II', 'III', 'IV', 'V', 'VI',
  'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
]

/** Konversi monthIndex (0-11) → Romawi (I-XII). */
function monthToRoman(monthIndex: number): string {
  const i = Math.max(0, Math.min(11, monthIndex))
  return ROMAN_NUMERALS[i]
}

/** Compose nomor surat lengkap dari nomor urut + tanggal surat. */
function composeLetterNumber(seq: string, letterDate: Date): string {
  const seqTrim = (seq || '').trim()
  const nomor = seqTrim || '...'
  const roman = monthToRoman(letterDate.getMonth())
  const year = letterDate.getFullYear()
  return `${LETTER_PREFIX}/${nomor}/${LETTER_UNIT_CODE}/${roman}/${year}`
}

function readDefaults(): FormDefaults {
  const now = new Date()
  // Default: periode Januari s/d bulan sekarang, tahun berjalan.
  const currentMonth = now.getMonth() // 0-11
  const fallback: FormDefaults = {
    letterSeq: '',
    lampiran: '-',
    bankName: 'PT. Bank SUMUT Telukdalam',
    bankLocation: 'Telukdalam',
    startMonth: 0, // Januari
    endMonth: currentMonth,
    year: now.getFullYear(),
    budgetYear: now.getFullYear(),
    purpose: 'Surat Pertanggungjawaban (SPJ) BOS Tahun ' + now.getFullYear() + ', Gaji PNS, GTT Provinsi Tahun ' + now.getFullYear(),
    shortAddress: '',
  }
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return { ...fallback, ...parsed }
  } catch {
    return fallback
  }
}

function persistDefaults(d: FormDefaults) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch { /* ignore */ }
}

// ─── API helpers untuk BankAccount (database-backed) ─────────────────────────
// Semua operasi CRUD lewat API supaya data tersimpan di database dan sinkron
// antar perangkat. Sebelumnya pakai localStorage (per-browser only).

async function fetchAccountsApi(): Promise<BankAccountRow[]> {
  try {
    const res = await fetch('/api/bank-accounts')
    if (!res.ok) return []
    const data = await res.json()
    if (!Array.isArray(data)) return []
    return data.map((r: Record<string, unknown>) => ({
      id: String(r.id ?? ''),
      accountNumber: String(r.accountNumber ?? ''),
      accountName: String(r.accountName ?? ''),
      description: String(r.description ?? ''),
    }))
  } catch {
    return []
  }
}

// ─── Print HTML builder ─────────────────────────────────────────────────────

function formatLetterDate(d: Date): string {
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function buildRekeningKoranHtml(
  settings: PrintSettings,
  defaults: FormDefaults,
  accounts: BankAccountRow[],
  letterDate: Date,
): string {
  const {
    letterSeq, lampiran, bankName, bankLocation,
    startMonth, endMonth, year, budgetYear, purpose,
    shortAddress,
  } = defaults

  const dateStr = formatLetterDate(letterDate)
  // Compose nomor surat lengkap dari nomor urut + tanggal surat:
  // 400.3.8/[NOMOR]/ADM/[ROMAN_BULAN]/[TAHUN]
  const letterNumber = composeLetterNumber(letterSeq, letterDate)

  // Identitas pemohon — pakai Kepala Sekolah dari settings (yang menandatangani surat).
  // principalTitle (mis. "Pembina Tk. I") otomatis sinkron dari Pengaturan sekolah.
  const principalName = settings.principalName || '________________________'
  const principalNip = settings.principalNip || ''
  const principalTitle = settings.principalTitle || ''
  const schoolName = settings.schoolName || ''
  const jabatan = 'Kepala Sekolah'
  const unitKerja = schoolName || '-'

  // Kota untuk baris tanggal — diambil dari bankLocation (paling akurat),
  // fallback: chunk terakhir dari address KOP.
  const cityFromAddress = settings.address
    ? (settings.address.split(',').pop()?.trim() || '')
    : ''
  const dateCity = bankLocation.trim() || cityFromAddress || '_____________'

  // Alamat singkat di "yang beralamat ..." — default dari 2 chunk pertama address KOP.
  // mis. "Jl. Pendidikan No.13, Kel. Pasar Teluk Dalam" → "Jl. Pendidikan No.13 Kelurahan Pasar Telukdalam".
  // User bisa override lewat input form.
  const chunks = (settings.address || '').split(',').map((c) => c.trim()).filter(Boolean)
  const defaultShortAddr = chunks.length >= 2 ? `${chunks[0]} ${chunks[1]}` : (chunks[0] || settings.address || '_____________________')
  const addressLine = (shortAddress || '').trim() || defaultShortAddr

  // ── Layout info surat (mengikuti format baku) ────────────────────────────
  //   Baris 1 (rata KANAN):  "Telukdalam, 24 Agustus 2026"
  //   Baris 2-4 (rata KIRI): "Nomor     : 400.3.8/..."
  //                          "Lampiran  : -"
  //                          "Perihal   : Permohonan Cetak Rekening Koran Bank"
  // Label diberi width tetap (90px) supaya ":" (colon) di semua baris selaras.
  const letterInfoHtml = `
    <div style="margin-top: 14px; font-size: 12pt; line-height: 1.5; position: relative; min-height: 24px;">
      <div style="text-align: right; margin-bottom: 8px;">${dateCity}, ${dateStr}</div>
      <table style="width:auto; border:none; font-size: 12pt; line-height: 1.5;">
        <tbody>
          <tr>
            <td style="border:none; padding:1px 8px 1px 0; text-align:left; white-space:nowrap; width:90px;">Nomor</td>
            <td style="border:none; padding:1px 4px; text-align:left;">:</td>
            <td style="border:none; padding:1px 0; text-align:left; white-space:nowrap;">${letterNumber || '____________________'}</td>
          </tr>
          <tr>
            <td style="border:none; padding:1px 8px 1px 0; text-align:left; white-space:nowrap; width:90px;">Lampiran</td>
            <td style="border:none; padding:1px 4px; text-align:left;">:</td>
            <td style="border:none; padding:1px 0; text-align:left; white-space:nowrap;">${lampiran || '-'}</td>
          </tr>
          <tr>
            <td style="border:none; padding:1px 8px 1px 0; text-align:left; white-space:nowrap; width:90px;">Perihal</td>
            <td style="border:none; padding:1px 4px; text-align:left;">:</td>
            <td style="border:none; padding:1px 0; text-align:left; white-space:nowrap;"><strong>Permohonan Cetak Rekening Koran Bank</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  `

  // ── Tujuan surat — "di" dan kota di baris terpisah (mengikuti format baku) ──
  //   Kepada Yth,
  //   Pimpinan PT. Bank SUMUT Telukdalam
  //   di
  //   Telukdalam
  const tujuanHtml = `
    <div style="margin-top: 22px; font-size: 12pt; line-height: 1.5;">
      Kepada Yth,<br>
      Pimpinan ${bankName || 'PT. Bank __________'}<br>
      di<br>
      ${bankLocation || '_____________'}
    </div>
  `

  // Pembuka + identitas
  // Label diberi width tetap (130px) supaya ":" (colon) selaras di semua baris.
  const pembukaHtml = `
    <div style="margin-top: 22px; font-size: 12pt; line-height: 1.5;">
      Dengan hormat,<br>
      Saya yang bertanda tangan dibawah ini:
    </div>
    <table style="width:100%; border:none; margin-top: 8px; font-size: 12pt; line-height: 1.7;">
      <tbody>
        <tr>
          <td style="border:none; padding:1px 8px 1px 0; width:130px; vertical-align:top;">Nama</td>
          <td style="border:none; padding:1px 4px; width:8px; vertical-align:top;">:</td>
          <td style="border:none; padding:1px 0; vertical-align:top;">${principalName}</td>
        </tr>
        <tr>
          <td style="border:none; padding:1px 8px 1px 0; vertical-align:top;">NIP</td>
          <td style="border:none; padding:1px 4px; vertical-align:top;">:</td>
          <td style="border:none; padding:1px 0; vertical-align:top;">${principalNip || '-'}</td>
        </tr>
        <tr>
          <td style="border:none; padding:1px 8px 1px 0; vertical-align:top;">Jabatan</td>
          <td style="border:none; padding:1px 4px; vertical-align:top;">:</td>
          <td style="border:none; padding:1px 0; vertical-align:top;">${jabatan}</td>
        </tr>
        <tr>
          <td style="border:none; padding:1px 8px 1px 0; vertical-align:top;">Unit Kerja</td>
          <td style="border:none; padding:1px 4px; vertical-align:top;">:</td>
          <td style="border:none; padding:1px 0; vertical-align:top;">${unitKerja}</td>
        </tr>
      </tbody>
    </table>
  `

  // Maksud permohonan
  const monthRange = startMonth === endMonth
    ? `Bulan ${MONTHS_ID[startMonth]} ${year}`
    : `Bulan ${MONTHS_ID[startMonth]} Sampai dengan Bulan ${MONTHS_ID[endMonth]} ${year}`

  const maksudHtml = `
    <div style="margin-top: 18px; font-size: 12pt; line-height: 1.5; text-align: justify; text-indent: 36px;">
      Bermaksud mengajukan permohonan Cetak Rekening Koran Bank dari ${monthRange} (Tahun Anggaran ${budgetYear}) sebagai berikut :
    </div>
  `

  // Daftar rekening (numbered list, each item has its own sub-table)
  // Layout mengikuti format baku — angka "1" di kolom kiri dengan indentasi
  // (~36px dari margin kiri), sub-items (Nomor rekening/a/n/Rek. Koran Bank)
  // di kolom kanan. Sub-label diberi width tetap (170px) supaya ":" selaras.
  //   1     Nomor rekening   : 271.01.02.000940-0
  //         a/n rekening     : SMAN 1 TELUKDALAM
  //         Rek. Koran Bank  : BOS Reguler
  const accountItemsHtml = accounts.length === 0
    ? '<div style="margin-top:8px; font-size:12pt;">(Belum ada rekening ditambahkan)</div>'
    : accounts.map((acc, idx) => {
      const num = acc.accountNumber || '_____________________'
      const an = acc.accountName || '_____________________'
      const desc = acc.description || '_____________________'
      return `
        <table style="width: 100%; border: none; margin-top: 12px; font-size: 12pt; line-height: 1.7;">
          <tr>
            <td style="border: none; width: 56px; vertical-align: top; padding: 1px 16px 1px 36px;">${idx + 1}</td>
            <td style="border: none; vertical-align: top; padding: 0;">
              <table style="border: none; font-size: 12pt;">
                <tbody>
                  <tr>
                    <td style="border:none; padding:1px 16px 1px 0; width:170px; vertical-align:top;">Nomor rekening</td>
                    <td style="border:none; padding:1px 4px; vertical-align:top;">:</td>
                    <td style="border:none; padding:1px 0; vertical-align:top;">${num}</td>
                  </tr>
                  <tr>
                    <td style="border:none; padding:1px 16px 1px 0; vertical-align:top;">a/n rekening</td>
                    <td style="border:none; padding:1px 4px; vertical-align:top;">:</td>
                    <td style="border:none; padding:1px 0; vertical-align:top;">${an}</td>
                  </tr>
                  <tr>
                    <td style="border:none; padding:1px 16px 1px 0; vertical-align:top;">Rek. Koran Bank</td>
                    <td style="border:none; padding:1px 4px; vertical-align:top;">:</td>
                    <td style="border:none; padding:1px 0; vertical-align:top;">${desc}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </table>
      `
    }).join('')

  // Tujuan & alamat — pakai alamat singkat (bukan alamat KOP lengkap)
  // Paragraf rata justify (kedua margin rata) dengan indentasi awal 36px.
  const tujuanAkhirHtml = `
    <div style="margin-top: 18px; font-size: 12pt; line-height: 1.5; text-align: justify; text-indent: 36px;">
      yang beralamat ${addressLine} (sesuai rekening) guna kepentingan ${purpose || '_______________________'}.
    </div>
  `

  // Penutup
  const penutupHtml = `
    <div style="margin-top: 22px; font-size: 12pt; line-height: 1.5; text-align: justify; text-indent: 36px;">
      Demikian surat permohonan ini saya buat dengan sebenar-benarnya. Atas perhatian dan bantuannya saya ucapkan terima kasih.
    </div>
  `

  // Tanda tangan — rata kanan, "Kepala [Sekolah]" + nama + jabatan struktural + NIP
  // Format baku:
  //   Kepala SMA Negeri 1 Telukdalam
  //   [ruang ttd ~ 2 cm]
  //   Nursari Rindu Simanullang, S.Pd., M.M.   (nama, underline + bold)
  //   Pembina Tk. I                              (jabatan struktural tambahan, opsional)
  //   NIP. 19691208 200502 2 001
  const signatureHtml = `
    <div style="margin-top: 36px; display:flex; justify-content:flex-end;">
      <div style="text-align: left; font-size: 12pt; line-height: 1.5; min-width: 260px;">
        <div>Kepala ${schoolName || 'Sekolah'}</div>
        <div style="height: 72px;"></div>
        <div style="text-decoration: underline; font-weight: bold;">${principalName}</div>
        ${principalTitle.trim() ? `<div>${principalTitle.trim()}</div>` : ''}
        <div>NIP. ${principalNip || '________________________'}</div>
      </div>
    </div>
  `

  // Gabungkan dengan KOP
  const kopHtml = buildKopHtml(settings)

  return `
    ${kopHtml}
    ${letterInfoHtml}
    ${tujuanHtml}
    ${pembukaHtml}
    ${maksudHtml}
    ${accountItemsHtml}
    ${tujuanAkhirHtml}
    ${penutupHtml}
    ${signatureHtml}
  `
}

// ─── Component ───────────────────────────────────────────────────────────────

export function RekeningKoranDialog({
  open,
  onOpenChange,
}: RekeningKoranDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settings, setSettings] = useState<PrintSettings | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement | null>(null)

  // Form state
  const [defaults, setDefaults] = useState<FormDefaults>(() => readDefaults())
  const [accounts, setAccounts] = useState<BankAccountRow[]>([])
  const [accountsLoading, setAccountsLoading] = useState(false)
  const [accountsSaving, setAccountsSaving] = useState<Record<string, boolean>>({})
  // Rekening yang dipilih untuk dicetak (checkbox). Default: semua terpilih saat load.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [letterDateStr, setLetterDateStr] = useState<string>('')

  // Load settings + saved accounts dari database saat dialog dibuka
  useEffect(() => {
    if (!open) return
    setDefaults(readDefaults())
    setLetterDateStr(new Date().toISOString().slice(0, 10))
    setSettingsLoading(true)
    fetchPrintSettings()
      .then((s) => setSettings(s))
      .catch(() => setSettings(null))
      .finally(() => setSettingsLoading(false))
    // Load daftar rekening dari database (bukan localStorage)
    setAccountsLoading(true)
    fetchAccountsApi()
      .then((rows) => {
        setAccounts(rows)
        // Default: semua rekening terpilih untuk dicetak
        setSelectedIds(new Set(rows.map((r) => r.id)))
      })
      .finally(() => setAccountsLoading(false))
  }, [open])

  // Persist defaults (form fields, BUKAN accounts) ke localStorage.
  // Accounts sekarang disimpan di database via API.
  useEffect(() => {
    if (!open) return
    persistDefaults(defaults)
  }, [defaults, open])

  // ── Account row operations (database-backed via API) ────────────────────
  // Saat menambah rekening baru, default a/n: nama sekolah dari settings
  // (huruf kapital). User bisa edit setelah ditambahkan.
  // Saat rekening baru ditambahkan, langsung POST ke API supaya tersimpan di
  // database dan sinkron. Jika gagal, tampilkan toast error.
  const addAccount = useCallback(async () => {
    // Default a/n: nama sekolah dari settings (huruf kapital)
    const accountName = (settings?.schoolName || '').toUpperCase()
    try {
      const res = await fetch('/api/bank-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber: '', // user isi setelah tambah
          accountName,
          description: '',
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast({
          title: 'Gagal menambah rekening',
          description: err.error || 'Terjadi kesalahan',
          variant: 'destructive',
        })
        return
      }
      const created = await res.json()
      setAccounts((prev) => [
        ...prev,
        {
          id: created.id,
          accountNumber: created.accountNumber || '',
          accountName: created.accountName || accountName,
          description: created.description || '',
        },
      ])
    } catch {
      toast({
        title: 'Gagal menambah rekening',
        description: 'Tidak dapat terhubung ke server',
        variant: 'destructive',
      })
    }
  }, [settings, toast])

  // Update field rekening: update state lokal dulu (responsive), lalu PUT ke API.
  // Pakai debounce sederhana: update API setiap perubahan field.
  const updateAccount = useCallback(async (id: string, field: keyof BankAccountRow, value: string) => {
    // Update state lokal dulu supaya UI responsive
    setAccounts((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r))
    // PUT ke API untuk persist ke database
    const row = accounts.find((r) => r.id === id)
    if (!row) return
    // Tandai sedang menyimpan untuk row ini
    setAccountsSaving((prev) => ({ ...prev, [id]: true }))
    try {
      const res = await fetch(`/api/bank-accounts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountNumber: field === 'accountNumber' ? value : row.accountNumber,
          accountName: field === 'accountName' ? value : row.accountName,
          description: field === 'description' ? value : row.description,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast({
          title: 'Gagal menyimpan rekening',
          description: err.error || 'Terjadi kesalahan',
          variant: 'destructive',
        })
      }
    } catch {
      // Silent fail — jangan ganggu user saat mengetik
    } finally {
      setAccountsSaving((prev) => {
        const next = { ...prev }
        delete next[id]
        return next
      })
    }
  }, [accounts, toast])

  const removeAccount = useCallback(async (id: string) => {
    // Optimistic delete: hapus dari state lokal dulu
    setAccounts((prev) => prev.filter((r) => r.id !== id))
    try {
      const res = await fetch(`/api/bank-accounts/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        toast({
          title: 'Gagal menghapus rekening',
          description: 'Terjadi kesalahan saat menghapus',
          variant: 'destructive',
        })
        // Reload daftar dari database untuk restore state konsisten
        const rows = await fetchAccountsApi()
        setAccounts(rows)
      }
    } catch {
      toast({
        title: 'Gagal menghapus rekening',
        description: 'Tidak dapat terhubung ke server',
        variant: 'destructive',
      })
      const rows = await fetchAccountsApi()
      setAccounts(rows)
    }
  }, [toast])

  // ── Upload logo KOP ────────────────────────────────────────────────────────
  // Maks 10MB. Gambar di-resize ke max 512px untuk menjaga ukuran payload tetap
  // kecil (request gateway limit). Disimpan ke SchoolSettings.logo via API,
  // lalu update state lokal supaya KOP langsung ter-update di preview.
  const MAX_LOGO_SIZE = 10 * 1024 * 1024 // 10 MB

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input value supaya user bisa re-upload file yang sama
    e.target.value = ''

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Format tidak didukung', description: 'File harus berupa gambar (JPG/PNG/SVG/dll).', variant: 'destructive' })
      return
    }
    if (file.size > MAX_LOGO_SIZE) {
      toast({ title: 'File terlalu besar', description: `Ukuran maksimal 10MB. File Anda ${(file.size / 1024 / 1024).toFixed(2)}MB.`, variant: 'destructive' })
      return
    }

    setLogoUploading(true)
    try {
      // Resize ke max 512px supaya payload tidak terlalu besar untuk API
      const { dataUrl } = await resizeImageFile(file, 512, 0.92)

      // Kirim SEMUA field yang sudah ada di settings (preserved), plus logo baru.
      // Backend POST /api/settings akan overwrite field yang dikirim dengan
      // nilai baru — kalau kita kirim hanya {logo}, field lain (principalName,
      // schoolName, kopLines, dll) akan ke-reset ke default kosong.
      const payload: Record<string, unknown> = {
        logo: dataUrl,
      }
      if (settings) {
        // Preserve semua field yang relevan dari settings yang sudah ada
        payload.schoolName = settings.schoolName
        payload.address = settings.address
        payload.phone = settings.phone
        payload.email = settings.email
        payload.npsn = settings.npsn
        payload.principalName = settings.principalName
        payload.principalNip = settings.principalNip
        payload.treasurerName = settings.treasurerName
        payload.treasurerNip = settings.treasurerNip
        payload.goodsManagerName = settings.goodsManagerName
        payload.goodsManagerNip = settings.goodsManagerNip
        payload.kopLines = settings.kopLines
        payload.logoWidth = settings.logoWidth
        payload.logoHeight = settings.logoHeight
        payload.fontFamily = settings.fontFamily
        payload.fontSize = settings.fontSize
        payload.isBold = settings.isBold
        payload.textTransform = settings.textTransform
        payload.underlineThickness = settings.underlineThickness
        payload.underlineWidth = settings.underlineWidth
      }

      // POST ke /api/settings untuk persist logo
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        throw new Error('Gagal menyimpan logo ke server')
      }

      // Update state lokal supaya KOP langsung re-render dengan logo baru
      setSettings((prev) => prev ? { ...prev, logo: dataUrl } : prev)

      toast({
        title: 'Logo berhasil diupload',
        description: 'Logo KOP surat sudah diperbarui. KOP akan tampil di hasil cetak.',
      })
    } catch (err) {
      console.error('Logo upload error:', err)
      toast({
        title: 'Gagal upload logo',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan saat memproses gambar.',
        variant: 'destructive',
      })
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleRemoveLogo() {
    if (!settings?.logo) return
    setLogoUploading(true)
    try {
      // Sama seperti upload — preserve semua field, hanya logo yang di-null-kan
      const payload: Record<string, unknown> = {
        logo: null,
      }
      if (settings) {
        payload.schoolName = settings.schoolName
        payload.address = settings.address
        payload.phone = settings.phone
        payload.email = settings.email
        payload.npsn = settings.npsn
        payload.principalName = settings.principalName
        payload.principalNip = settings.principalNip
        payload.treasurerName = settings.treasurerName
        payload.treasurerNip = settings.treasurerNip
        payload.goodsManagerName = settings.goodsManagerName
        payload.goodsManagerNip = settings.goodsManagerNip
        payload.kopLines = settings.kopLines
        payload.logoWidth = settings.logoWidth
        payload.logoHeight = settings.logoHeight
        payload.fontFamily = settings.fontFamily
        payload.fontSize = settings.fontSize
        payload.isBold = settings.isBold
        payload.textTransform = settings.textTransform
        payload.underlineThickness = settings.underlineThickness
        payload.underlineWidth = settings.underlineWidth
      }

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Gagal menghapus logo')
      setSettings((prev) => prev ? { ...prev, logo: null } : prev)
      toast({ title: 'Logo dihapus', description: 'Logo KOP surat sudah dihapus.' })
    } catch (err) {
      console.error('Remove logo error:', err)
      toast({ title: 'Gagal menghapus logo', variant: 'destructive' })
    } finally {
      setLogoUploading(false)
    }
  }

  // ── Toggle rekening terpilih untuk dicetak ─────────────────────────────────
  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    setSelectedIds((prev) => {
      // Kalau semua sudah terpilih, uncheck semua. Kalau ada yang belum, pilih semua.
      if (prev.size === accounts.length) return new Set()
      return new Set(accounts.map((a) => a.id))
    })
  }, [accounts])

  // ── Print ────────────────────────────────────────────────────────────────
  function handlePrint() {
    if (!settings) {
      toast({ title: 'Menunggu data', description: 'Pengaturan sekolah masih dimuat. Coba lagi.', variant: 'destructive' })
      return
    }
    // Hanya rekening yang terpilih (checkbox) yang dicetak
    const selectedAccounts = accounts.filter((a) => selectedIds.has(a.id))
    if (selectedAccounts.length === 0) {
      toast({ title: 'Belum ada rekening dipilih', description: 'Centang minimal 1 rekening untuk dicetak.', variant: 'destructive' })
      return
    }
    // Validasi: nomor rekening wajib diisi untuk yang terpilih
    const invalid = selectedAccounts.find((a) => !a.accountNumber.trim())
    if (invalid) {
      toast({ title: 'Nomor rekening kosong', description: 'Rekening terpilih wajib punya Nomor Rekening.', variant: 'destructive' })
      return
    }
    // Validasi: nomor urut surat wajib diisi (angka)
    const seqTrim = (defaults.letterSeq || '').trim()
    if (!seqTrim || !/^\d+$/.test(seqTrim)) {
      toast({ title: 'Nomor urut surat belum diisi', description: 'Masukkan angka nomor urut surat (mis. 573).', variant: 'destructive' })
      return
    }

    setLoading(true)

    try {
      const letterDate = letterDateStr ? new Date(letterDateStr + 'T00:00:00') : new Date()
      const html = buildRekeningKoranHtml(settings, defaults, selectedAccounts, letterDate)

      // Filename PDF: RekeningKoran_[Bank]_[Periode]_[Tahun]
      const periodeLabel = defaults.startMonth === defaults.endMonth
        ? MONTHS_ID[defaults.startMonth]
        : `${MONTHS_ID[defaults.startMonth]}-${MONTHS_ID[defaults.endMonth]}`
      const bankShort = (defaults.bankName || 'Bank').replace(/^(PT\.\s*Bank\s*)/i, '').trim() || 'Bank'
      const filename = sanitizeFilename(`RekeningKoran_${bankShort}_${periodeLabel} ${defaults.year}`)

      openPrintWindow(filename, html, 'portrait')

      // ── Simpan riwayat pencetakan ke PrintLog ────────────────────────────
      // Fire-and-forget: jangan block flow cetak, jangan lempar error ke user
      // jika logging gagal (mis. DB error / network error).
      try {
        const letterNumber = composeLetterNumber(defaults.letterSeq, letterDate)
        fetch('/api/print-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category: 'rekening-koran',
            periodLabel: periodeLabel
              ? `${periodeLabel} ${defaults.year}`.trim()
              : `${defaults.year}`,
            letterNumber,
            bankName: defaults.bankName,
            title: `Rekening Koran ${bankShort} ${periodeLabel} ${defaults.year}`.replace(/\s+/g, ' ').trim(),
            contentHtml: html,
            orientation: 'portrait',
          }),
        }).catch(() => { /* silent fail — don't block print */ })
      } catch { /* ignore */ }

      toast({
        title: 'Surat permohonan dicetak',
        description: `${selectedAccounts.length} rekening · ${periodeLabel} ${defaults.year}`,
      })
    } catch (err) {
      console.error('Print error:', err)
      toast({ title: 'Gagal mencetak', description: 'Terjadi kesalahan saat mencetak surat.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // Cek apakah KOP surat sudah siap (schoolName + kopLines terisi).
  // Jika belum, tampilkan warning supaya user isi dulu di menu Pengaturan.
  const kopLinesCount = settings ? parseKopLines(settings.kopLines).filter((l) => l.text.trim()).length : 0
  const isKopReady = !!settings && !!(settings.schoolName && settings.schoolName.trim()) && kopLinesCount > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Landmark className="size-5" />
            Cetak Surat Permohonan Rekening Koran
          </DialogTitle>
          <DialogDescription>
            Surat resmi ke Bank untuk mencetak rekening koran periode tertentu.
            Mengikuti format baku (surat permohonan resmi dengan KOP sekolah).
          </DialogDescription>
        </DialogHeader>

        {/* Info banner: rekening koran khusus rekening sekolah */}
        <div className="flex items-start gap-2 rounded-md border border-blue-300 bg-blue-50 p-3 text-sm text-blue-900 dark:border-blue-700 dark:bg-blue-950/50 dark:text-blue-200">
          <Landmark className="size-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Khusus Rekening Sekolah</p>
            <p className="mt-0.5">
              Surat ini khusus untuk mencetak rekening koran <strong>rekening SEKOLAH</strong>{' '}
              (mis. BOS Reguler, Gaji PNS, GTT Provinsi). Jangan masukkan nomor rekening
              pribadi pegawai — gunakan nomor rekening tabungan sekolah.
            </p>
          </div>
        </div>

        <div className="grid gap-4 py-2">
          {/* ── Warning KOP belum diisi ─────────────────────────────────────── */}
          {settings && !isKopReady && (
            <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
              <AlertTriangle className="size-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">KOP surat belum lengkap</p>
                <p className="mt-0.5">
                  KOP sekolah belum diisi di menu <strong>Pengaturan</strong>.
                  Surat akan tercetak tanpa KOP (header institusi) dan data
                  penandatangan. Buka menu <strong>Pengaturan</strong> untuk
                  mengisi Nama Sekolah, KOP Lines, dan Nama Kepala Sekolah.
                </p>
              </div>
            </div>
          )}
          {settingsLoading && (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Memuat pengaturan sekolah...
            </div>
          )}

          {/* ── Upload Logo KOP ──────────────────────────────────────────────── */}
          <div className="rounded-md border p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <ImageIcon className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Logo KOP Surat</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Logo institusi yang tampil di header surat. Maks 10MB (JPG/PNG/SVG).
                  Akan otomatis di-resize ke 512px.
                </p>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <div className="flex flex-wrap items-center gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading || settingsLoading}
                  >
                    {logoUploading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Upload className="size-4 mr-2" />}
                    {settings?.logo ? 'Ganti Logo' : 'Upload Logo'}
                  </Button>
                  {settings?.logo && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveLogo}
                      disabled={logoUploading}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="size-4 mr-1" />
                      Hapus
                    </Button>
                  )}
                </div>
              </div>
              {settings?.logo && (
                <div className="relative flex-shrink-0">
                  <div className="flex size-20 items-center justify-center rounded-md border bg-muted p-1">
                    <img
                      src={settings.logo}
                      alt="Logo KOP"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Info surat ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="rk-letter-seq">Nomor Urut Surat</Label>
              <Input
                id="rk-letter-seq"
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="mis. 573"
                value={defaults.letterSeq}
                onChange={(e) => {
                  // Hanya izinkan angka
                  const v = e.target.value.replace(/[^\d]/g, '')
                  setDefaults((d) => ({ ...d, letterSeq: v }))
                }}
              />
              <p className="text-xs text-muted-foreground">
                Format lengkap:{' '}
                <span className="font-mono font-medium text-foreground">
                  {composeLetterNumber(
                    defaults.letterSeq,
                    letterDateStr ? new Date(letterDateStr + 'T00:00:00') : new Date(),
                  )}
                </span>
              </p>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rk-letter-date">Tanggal Surat</Label>
              <Input
                id="rk-letter-date"
                type="date"
                value={letterDateStr}
                onChange={(e) => setLetterDateStr(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rk-lampiran">Lampiran</Label>
              <Input
                id="rk-lampiran"
                placeholder="-"
                value={defaults.lampiran}
                onChange={(e) => setDefaults((d) => ({ ...d, lampiran: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Perihal</Label>
              <Input value="Permohonan Cetak Rekening Koran Bank" readOnly className="bg-muted/50" />
            </div>
          </div>

          {/* ── Bank tujuan ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="rk-bank-name">Nama Bank</Label>
              <Input
                id="rk-bank-name"
                placeholder="mis. PT. Bank SUMUT Telukdalam"
                value={defaults.bankName}
                onChange={(e) => setDefaults((d) => ({ ...d, bankName: e.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rk-bank-location">Lokasi Bank</Label>
              <Input
                id="rk-bank-location"
                placeholder="mis. Telukdalam"
                value={defaults.bankLocation}
                onChange={(e) => setDefaults((d) => ({ ...d, bankLocation: e.target.value }))}
              />
            </div>
          </div>

          {/* ── Periode ──────────────────────────────────────────────────────── */}
          <div className="rounded-md border p-3 bg-muted/30">
            <div className="text-sm font-medium mb-2">Periode Rekening Koran</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="rk-start-month">Bulan Awal</Label>
                <Select
                  value={String(defaults.startMonth)}
                  onValueChange={(v) => setDefaults((d) => {
                    const newStart = Number(v)
                    return { ...d, startMonth: newStart, endMonth: Math.max(d.endMonth, newStart) }
                  })}
                >
                  <SelectTrigger id="rk-start-month"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS_ID.map((m, i) => (
                      <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rk-end-month">Bulan Akhir</Label>
                <Select
                  value={String(defaults.endMonth)}
                  onValueChange={(v) => setDefaults((d) => {
                    const newEnd = Number(v)
                    return { ...d, endMonth: newEnd, startMonth: Math.min(d.startMonth, newEnd) }
                  })}
                >
                  <SelectTrigger id="rk-end-month"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS_ID.map((m, i) => (
                      <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rk-year">Tahun</Label>
                <Input
                  id="rk-year"
                  type="number"
                  min={2000}
                  max={2100}
                  value={defaults.year}
                  onChange={(e) => setDefaults((d) => ({ ...d, year: Number(e.target.value) || d.year }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="rk-budget-year">Tahun Anggaran</Label>
                <Input
                  id="rk-budget-year"
                  type="number"
                  min={2000}
                  max={2100}
                  value={defaults.budgetYear}
                  onChange={(e) => setDefaults((d) => ({ ...d, budgetYear: Number(e.target.value) || d.budgetYear }))}
                />
              </div>
            </div>
          </div>

          {/* ── Daftar rekening (checklist untuk pilih yang dicetak) ──────────── */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Pilih Rekening untuk Dicetak
                {accountsLoading && <Loader2 className="size-3.5 inline-block ml-2 animate-spin" />}
                {!accountsLoading && accounts.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({selectedIds.size}/{accounts.length} terpilih)
                  </span>
                )}
              </Label>
              <div className="flex items-center gap-1">
                <Button type="button" variant="ghost" size="sm" onClick={toggleSelectAll} disabled={accountsLoading || accounts.length === 0}>
                  {selectedIds.size === accounts.length && accounts.length > 0 ? 'Hapus Semua' : 'Pilih Semua'}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={addAccount} disabled={accountsLoading}>
                  <Plus className="size-4 mr-1" /> Tambah
                </Button>
              </div>
            </div>
            {accountsLoading ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground rounded-md border border-dashed p-6">
                <Loader2 className="size-4 animate-spin" />
                Memuat daftar rekening...
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-sm text-muted-foreground rounded-md border border-dashed p-4 text-center">
                Belum ada rekening tersimpan. Klik &quot;Tambah&quot; untuk menambah rekening sekolah
                (mis. BOS Reguler, Gaji PNS) — sekali input, lalu tinggal centang saat cetak.
              </div>
            ) : (
              <div className="rounded-md border max-h-[300px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px] text-center">Pilih</TableHead>
                      <TableHead className="min-w-[140px]">Nomor Rekening</TableHead>
                      <TableHead className="min-w-[120px]">a/n Rekening</TableHead>
                      <TableHead className="min-w-[120px]">Rek. Koran Bank</TableHead>
                      <TableHead className="w-[40px] text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((acc) => {
                      const isSelected = selectedIds.has(acc.id)
                      return (
                        <TableRow key={acc.id} className={isSelected ? 'bg-primary/5' : ''}>
                          <TableCell className="text-center align-middle">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleSelected(acc.id)}
                              aria-label="Pilih rekening ini untuk dicetak"
                            />
                          </TableCell>
                          <TableCell className="align-middle">
                            <Input
                              placeholder="mis. 271.01.02.000940-0"
                              value={acc.accountNumber}
                              onChange={(e) => updateAccount(acc.id, 'accountNumber', e.target.value)}
                              className="min-w-[140px]"
                            />
                          </TableCell>
                          <TableCell className="align-middle">
                            <Input
                              placeholder="mis. SMAN 1 TELUKDALAM"
                              value={acc.accountName}
                              onChange={(e) => updateAccount(acc.id, 'accountName', e.target.value)}
                              className="min-w-[120px]"
                            />
                          </TableCell>
                          <TableCell className="align-middle">
                            <Input
                              placeholder="mis. BOS Reguler"
                              value={acc.description}
                              onChange={(e) => updateAccount(acc.id, 'description', e.target.value)}
                              className="min-w-[120px]"
                            />
                          </TableCell>
                          <TableCell className="text-center align-middle">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:text-destructive"
                              onClick={() => {
                                removeAccount(acc.id)
                                setSelectedIds((prev) => {
                                  const next = new Set(prev)
                                  next.delete(acc.id)
                                  return next
                                })
                              }}
                              title="Hapus rekening"
                              disabled={accountsSaving[acc.id]}
                            >
                              {accountsSaving[acc.id]
                                ? <Loader2 className="size-4 animate-spin" />
                                : <Trash2 className="size-4" />}
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Daftar rekening tersimpan di database — sekali input, tinggal centang rekening mana yang
              akan dicetak. Tidak perlu isi ulang nomor rekening yang sama berulang-ulang.
            </p>
          </div>

          {/* ── Tujuan / alamat ─────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="rk-short-address">Alamat Singkat (di surat)</Label>
              <Input
                id="rk-short-address"
                placeholder="mis. Jl. Pendidikan No.13 Kelurahan Pasar Telukdalam"
                value={defaults.shortAddress}
                onChange={(e) => setDefaults((d) => ({ ...d, shortAddress: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Alamat pendek di kalimat &quot;yang beralamat ...&quot;. Default otomatis dari 2 bagian pertama alamat KOP.
              </p>
            </div>
            {/* Penandatangan (Kepala Sekolah) otomatis sinkron dari Pengaturan */}
            <div className="grid gap-1.5">
              <Label>Penandatangan (otomatis dari Pengaturan)</Label>
              <div className="rounded-md border bg-muted/30 p-3 text-sm">
                {settings ? (
                  <div className="space-y-0.5">
                    <div><span className="text-muted-foreground">Nama:</span> <strong>{settings.principalName || '(belum diisi)'}</strong></div>
                    <div><span className="text-muted-foreground">NIP:</span> {settings.principalNip || '-'}</div>
                    <div><span className="text-muted-foreground">Jabatan Struktural:</span> {settings.principalTitle || '-'}</div>
                  </div>
                ) : (
                  <span className="text-muted-foreground">Memuat data penandatangan...</span>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Data penandatangan diambil otomatis dari Pengaturan &mdash; Tab Penandatangan.
                  Ubah di sana jika perlu.
                </p>
              </div>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="rk-purpose">Tujuan (guna kepentingan)</Label>
            <Input
              id="rk-purpose"
              placeholder="mis. Surat Pertanggungjawaban (SPJ) BOS Tahun 2026, Gaji PNS, GTT Provinsi Tahun 2026"
              value={defaults.purpose}
              onChange={(e) => setDefaults((d) => ({ ...d, purpose: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
          <Button onClick={handlePrint} disabled={loading || settingsLoading || !settings}>
            {(loading || settingsLoading) ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Printer className="size-4 mr-2" />}
            Cetak Surat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
