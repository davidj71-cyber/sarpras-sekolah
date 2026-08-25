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
// Daftar rekening persisten di localStorage (key: simapras:bank-accounts) supaya
// user tidak perlu input ulang setiap kali cetak.

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { toast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
} from 'lucide-react'
import {
  openPrintWindow,
  sanitizeFilename,
  fetchPrintSettings,
  buildKopHtml,
  parseKopLines,
  type PrintSettings,
} from '@/lib/print-utils'

const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

const STORAGE_KEY = 'simapras:rekening-koran-defaults'
const ACCOUNTS_KEY = 'simapras:bank-accounts'

interface BankAccountRow {
  id: string
  accountNumber: string
  accountName: string
  description: string // "Rek. Koran Bank" — e.g. "BOS Reguler"
}

interface RekeningKoranDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Unique bank account numbers from SalaryEntry — dipakai sebagai suggestions datalist. */
  salaryBankAccounts: string[]
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
  // Jabatan struktural tambahan di bawah nama penandatangan (mis. "Pembina Tk. I").
  principalTitle: string
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

function makeId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
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
    principalTitle: '',
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

function readSavedAccounts(): BankAccountRow[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((r) => r && typeof r === 'object').map((r) => ({
        id: typeof r.id === 'string' ? r.id : makeId(),
        accountNumber: String(r.accountNumber ?? ''),
        accountName: String(r.accountName ?? ''),
        description: String(r.description ?? ''),
      }))
    }
  } catch {
    // ignore
  }
  return []
}

function persistDefaults(d: FormDefaults) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)) } catch { /* ignore */ }
}

function persistAccounts(rows: BankAccountRow[]) {
  try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(rows)) } catch { /* ignore */ }
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
    shortAddress, principalTitle,
  } = defaults

  const dateStr = formatLetterDate(letterDate)
  // Compose nomor surat lengkap dari nomor urut + tanggal surat:
  // 400.3.8/[NOMOR]/ADM/[ROMAN_BULAN]/[TAHUN]
  const letterNumber = composeLetterNumber(letterSeq, letterDate)

  // Identitas pemohon — pakai Kepala Sekolah dari settings (yang menandatangani surat).
  const principalName = settings.principalName || '________________________'
  const principalNip = settings.principalNip || ''
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
  //   Baris 2-4 (rata KIRI): "Nomor    : 400.3.8/..."
  //                          "Lampiran : -"
  //                          "Perihal  : Permohonan Cetak Rekening Koran Bank"
  const letterInfoHtml = `
    <div style="margin-top: 12px; font-size: 11pt; line-height: 1.5; position: relative; min-height: 24px;">
      <div style="text-align: right; margin-bottom: 6px;">${dateCity}, ${dateStr}</div>
      <table style="width:auto; border:none; font-size: 11pt; line-height: 1.5;">
        <tbody>
          <tr>
            <td style="border:none; padding:1px 8px 1px 0; text-align:left; white-space:nowrap;">Nomor</td>
            <td style="border:none; padding:1px 4px; text-align:left;">:</td>
            <td style="border:none; padding:1px 0; text-align:left; white-space:nowrap;">${letterNumber || '____________________'}</td>
          </tr>
          <tr>
            <td style="border:none; padding:1px 8px 1px 0; text-align:left; white-space:nowrap;">Lampiran</td>
            <td style="border:none; padding:1px 4px; text-align:left;">:</td>
            <td style="border:none; padding:1px 0; text-align:left; white-space:nowrap;">${lampiran || '-'}</td>
          </tr>
          <tr>
            <td style="border:none; padding:1px 8px 1px 0; text-align:left; white-space:nowrap;">Perihal</td>
            <td style="border:none; padding:1px 4px; text-align:left;">:</td>
            <td style="border:none; padding:1px 0; text-align:left; white-space:nowrap;">Permohonan Cetak Rekening Koran Bank</td>
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
    <div style="margin-top: 18px; font-size: 11pt; line-height: 1.5;">
      Kepada Yth,<br>
      Pimpinan ${bankName || 'PT. Bank __________'}<br>
      di<br>
      ${bankLocation || '_____________'}
    </div>
  `

  // Pembuka + identitas
  const pembukaHtml = `
    <div style="margin-top: 18px; font-size: 11pt; line-height: 1.5;">
      Dengan hormat,<br>
      Saya yang bertanda tangan dibawah ini:
    </div>
    <table style="width:100%; border:none; margin-top: 6px; font-size: 11pt; line-height: 1.7;">
      <tbody>
        <tr>
          <td style="border:none; padding:1px 8px 1px 0; width:140px; vertical-align:top;">Nama</td>
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
    <div style="margin-top: 14px; font-size: 11pt; line-height: 1.5; text-align: justify;">
      Bermaksud mengajukan permohonan Cetak Rekening Koran Bank dari ${monthRange} (Tahun Anggaran ${budgetYear}) sebagai berikut :
    </div>
  `

  // Daftar rekening (numbered list, each item has its own sub-table)
  const accountItemsHtml = accounts.length === 0
    ? '<div style="margin-top:8px; font-size:11pt;">(Belum ada rekening ditambahkan)</div>'
    : accounts.map((acc, idx) => {
      const num = acc.accountNumber || '_____________________'
      const an = acc.accountName || '_____________________'
      const desc = acc.description || '_____________________'
      return `
        <div style="margin-top: 10px; padding-left: 22px; text-indent: -22px; font-size: 11pt; line-height: 1.7;">
          <span style="margin-right: 6px;">${idx + 1}</span>
          <table style="border:none; display:inline-table; vertical-align:top; width: calc(100% - 30px); font-size: 11pt;">
            <tbody>
              <tr>
                <td style="border:none; padding:1px 8px 1px 0; width:140px; vertical-align:top;">Nomor rekening</td>
                <td style="border:none; padding:1px 4px; vertical-align:top;">:</td>
                <td style="border:none; padding:1px 0; vertical-align:top;">${num}</td>
              </tr>
              <tr>
                <td style="border:none; padding:1px 8px 1px 0; vertical-align:top;">a/n rekening</td>
                <td style="border:none; padding:1px 4px; vertical-align:top;">:</td>
                <td style="border:none; padding:1px 0; vertical-align:top;">${an}</td>
              </tr>
              <tr>
                <td style="border:none; padding:1px 8px 1px 0; vertical-align:top;">Rek. Koran Bank</td>
                <td style="border:none; padding:1px 4px; vertical-align:top;">:</td>
                <td style="border:none; padding:1px 0; vertical-align:top;">${desc}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `
    }).join('')

  // Tujuan & alamat — pakai alamat singkat (bukan alamat KOP lengkap)
  const tujuanAkhirHtml = `
    <div style="margin-top: 14px; font-size: 11pt; line-height: 1.5; text-align: justify; padding-left: 22px; text-indent: -22px;">
      yang beralamat ${addressLine} (sesuai rekening) guna kepentingan ${purpose || '_______________________'}.
    </div>
  `

  // Penutup
  const penutupHtml = `
    <div style="margin-top: 18px; font-size: 11pt; line-height: 1.5; text-align: justify;">
      Demikian surat permohonan ini saya buat dengan sebenar-benarnya. Atas perhatian dan bantuannya saya ucapkan terima kasih.
    </div>
  `

  // Tanda tangan — rata kanan, "Kepala [Sekolah]" + nama + jabatan struktural + NIP
  // Format baku:
  //   Kepala SMA Negeri 1 Telukdalam
  //   [ruang ttd]
  //   Nursari Rindu Simanullang, S.Pd., M.M.   (nama, underline + bold)
  //   Pembina Tk. I                              (jabatan struktural tambahan, opsional)
  //   NIP. 19691208 200502 2 001
  const signatureHtml = `
    <div style="margin-top: 28px; display:flex; justify-content:flex-end;">
      <div style="text-align: left; font-size: 11pt; line-height: 1.5; min-width: 240px;">
        <div>Kepala ${schoolName || 'Sekolah'}</div>
        <div style="height: 72px;"></div>
        <div style="text-decoration: underline; font-weight: bold;">${principalName}</div>
        ${principalTitle.trim() ? `<div>${principalTitle.trim()}</div>` : ''}
        <div>${principalNip ? 'NIP. ' + principalNip : '&nbsp;'}</div>
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
  salaryBankAccounts,
}: RekeningKoranDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settings, setSettings] = useState<PrintSettings | null>(null)

  // Form state
  const [defaults, setDefaults] = useState<FormDefaults>(() => readDefaults())
  const [accounts, setAccounts] = useState<BankAccountRow[]>([])
  const [letterDateStr, setLetterDateStr] = useState<string>('')

  // Load settings + saved accounts saat dialog dibuka
  useEffect(() => {
    if (!open) return
    setDefaults(readDefaults())
    setAccounts(readSavedAccounts())
    setLetterDateStr(new Date().toISOString().slice(0, 10))
    setSettingsLoading(true)
    fetchPrintSettings()
      .then((s) => setSettings(s))
      .catch(() => setSettings(null))
      .finally(() => setSettingsLoading(false))
  }, [open])

  // Persist on change
  useEffect(() => {
    if (!open) return
    persistDefaults(defaults)
  }, [defaults, open])
  useEffect(() => {
    if (!open) return
    persistAccounts(accounts)
  }, [accounts, open])

  // ── Account row operations ──────────────────────────────────────────────
  const addAccount = useCallback(() => {
    setAccounts((prev) => [
      ...prev,
      {
        id: makeId(),
        accountNumber: salaryBankAccounts[0] || '',
        accountName: (settings?.schoolName || '').toUpperCase(),
        description: '',
      },
    ])
  }, [salaryBankAccounts, settings])

  const updateAccount = useCallback((id: string, field: keyof BankAccountRow, value: string) => {
    setAccounts((prev) => prev.map((r) => r.id === id ? { ...r, [field]: value } : r))
  }, [])

  const removeAccount = useCallback((id: string) => {
    setAccounts((prev) => prev.filter((r) => r.id !== id))
  }, [])

  // ── Print ────────────────────────────────────────────────────────────────
  function handlePrint() {
    if (!settings) {
      toast({ title: 'Menunggu data', description: 'Pengaturan sekolah masih dimuat. Coba lagi.', variant: 'destructive' })
      return
    }
    if (accounts.length === 0) {
      toast({ title: 'Belum ada rekening', description: 'Tambahkan minimal 1 rekening bank.', variant: 'destructive' })
      return
    }
    // Validasi: nomor rekening wajib diisi
    const invalid = accounts.find((a) => !a.accountNumber.trim())
    if (invalid) {
      toast({ title: 'Nomor rekening kosong', description: 'Setiap rekening wajib punya Nomor Rekening.', variant: 'destructive' })
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
      const html = buildRekeningKoranHtml(settings, defaults, accounts, letterDate)

      // Filename PDF: RekeningKoran_[Bank]_[Periode]_[Tahun]
      const periodeLabel = defaults.startMonth === defaults.endMonth
        ? MONTHS_ID[defaults.startMonth]
        : `${MONTHS_ID[defaults.startMonth]}-${MONTHS_ID[defaults.endMonth]}`
      const bankShort = (defaults.bankName || 'Bank').replace(/^(PT\.\s*Bank\s*)/i, '').trim() || 'Bank'
      const filename = sanitizeFilename(`RekeningKoran_${bankShort}_${periodeLabel} ${defaults.year}`)

      openPrintWindow(filename, html, 'portrait')

      toast({
        title: 'Surat permohonan dicetak',
        description: `${accounts.length} rekening · ${periodeLabel} ${defaults.year}`,
      })
    } catch (err) {
      console.error('Print error:', err)
      toast({ title: 'Gagal mencetak', description: 'Terjadi kesalahan saat mencetak surat.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // ── Suggestion datalist id (unique) ──────────────────────────────────────
  const datalistId = 'rk-suggested-accounts'

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

        {/* Hidden datalist for account number suggestions */}
        <datalist id={datalistId}>
          {salaryBankAccounts.map((acc) => (
            <option key={acc} value={acc} />
          ))}
        </datalist>

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

          {/* ── Daftar rekening ─────────────────────────────────────────────── */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Daftar Rekening Bank</Label>
              <Button type="button" variant="outline" size="sm" onClick={addAccount}>
                <Plus className="size-4 mr-1" /> Tambah Rekening
              </Button>
            </div>
            {accounts.length === 0 ? (
              <div className="text-sm text-muted-foreground rounded-md border border-dashed p-4 text-center">
                Belum ada rekening. Klik &quot;Tambah Rekening&quot; untuk menambah.
              </div>
            ) : (
              <div className="rounded-md border max-h-[260px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px] text-center">No</TableHead>
                      <TableHead className="min-w-[140px]">Nomor Rekening</TableHead>
                      <TableHead className="min-w-[140px]">a/n Rekening</TableHead>
                      <TableHead className="min-w-[140px]">Rek. Koran Bank</TableHead>
                      <TableHead className="w-[40px] text-center">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accounts.map((acc, idx) => (
                      <TableRow key={acc.id}>
                        <TableCell className="text-center align-middle">{idx + 1}</TableCell>
                        <TableCell className="align-middle">
                          <Input
                            list={datalistId}
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
                            className="min-w-[140px]"
                          />
                        </TableCell>
                        <TableCell className="align-middle">
                          <Input
                            placeholder="mis. BOS Reguler"
                            value={acc.description}
                            onChange={(e) => updateAccount(acc.id, 'description', e.target.value)}
                            className="min-w-[140px]"
                          />
                        </TableCell>
                        <TableCell className="text-center align-middle">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeAccount(acc.id)}
                            title="Hapus rekening"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
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
            <div className="grid gap-1.5">
              <Label htmlFor="rk-principal-title">Jabatan Struktural (di bawah nama)</Label>
              <Input
                id="rk-principal-title"
                placeholder="mis. Pembina Tk. I"
                value={defaults.principalTitle}
                onChange={(e) => setDefaults((d) => ({ ...d, principalTitle: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                Jabatan struktural tambahan di tanda tangan (opsional, kosongkan jika tidak ada).
              </p>
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
