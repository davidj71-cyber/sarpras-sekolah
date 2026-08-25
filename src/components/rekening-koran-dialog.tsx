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
} from 'lucide-react'
import {
  openPrintWindow,
  sanitizeFilename,
  fetchPrintSettings,
  buildKopHtml,
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
  letterNumber: string
  lampiran: string
  bankName: string
  bankLocation: string
  startMonth: number
  endMonth: number
  year: number
  budgetYear: number
  purpose: string
}

function makeId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}

function readDefaults(): FormDefaults {
  const now = new Date()
  // Default: periode Januari s/d bulan sekarang, tahun berjalan.
  const currentMonth = now.getMonth() // 0-11
  const fallback: FormDefaults = {
    letterNumber: '',
    lampiran: '-',
    bankName: 'PT. Bank SUMUT',
    bankLocation: '',
    startMonth: 0, // Januari
    endMonth: currentMonth,
    year: now.getFullYear(),
    budgetYear: now.getFullYear(),
    purpose: 'Surat Pertanggungjawaban (SPJ) BOS Tahun ' + now.getFullYear() + ', Gaji PNS, GTT Provinsi Tahun ' + now.getFullYear(),
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
    letterNumber, lampiran, bankName, bankLocation,
    startMonth, endMonth, year, budgetYear, purpose,
  } = defaults

  const dateStr = formatLetterDate(letterDate)

  // Identitas pemohon — pakai Kepala Sekolah dari settings (yang menandatangani surat).
  const principalName = settings.principalName || '________________________'
  const principalNip = settings.principalNip || ''
  const schoolName = settings.schoolName || ''
  const jabatan = 'Kepala Sekolah'
  const unitKerja = schoolName || '-'

  // Tanggal & info surat — rata kanan, 2 kolom (label : value)
  const letterInfoHtml = `
    <div style="display:flex; justify-content:flex-end; margin-top: 12px;">
      <table style="width:auto; border:none; font-size: 11pt; line-height: 1.5;">
        <tbody>
          <tr>
            <td style="border:none; padding:1px 8px 1px 0; text-align:left; white-space:nowrap;">${settings.address ? (settings.address.split(',').pop()?.trim() || '') : '_____________'}, ${dateStr}</td>
          </tr>
          <tr>
            <td style="border:none; padding:1px 8px 1px 0; text-align:left; white-space:nowrap;">Nomor&nbsp;&nbsp;&nbsp;&nbsp; : ${letterNumber || '____________________'}</td>
          </tr>
          <tr>
            <td style="border:none; padding:1px 8px 1px 0; text-align:left; white-space:nowrap;">Lampiran&nbsp;&nbsp; : ${lampiran || '-'}</td>
          </tr>
          <tr>
            <td style="border:none; padding:1px 8px 1px 0; text-align:left; white-space:nowrap;">Perihal&nbsp;&nbsp;&nbsp; : Permohonan Cetak Rekening Koran Bank</td>
          </tr>
        </tbody>
      </table>
    </div>
  `

  // Tujuan surat
  const tujuanHtml = `
    <div style="margin-top: 18px; font-size: 11pt; line-height: 1.5;">
      Kepada Yth,<br>
      Pimpinan ${bankName || 'PT. Bank __________'}<br>
      ${bankLocation ? `di ${bankLocation}` : 'di __________'}
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
          <span style="margin-right: 6px;">${idx + 1}.</span>
          <table style="border:none; display:inline-table; vertical-align:top; width: calc(100% - 30px); font-size: 11pt;">
            <tbody>
              <tr>
                <td style="border:none; padding:1px 8px 1px 0; width:140px; vertical-align:top;">Nomor rekening</td>
                <td style="border:none; padding:1px 4px; width:8px; vertical-align:top;">:</td>
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

  // Tujuan & alamat
  const addressLine = settings.address || '_____________________'
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

  // Tanda tangan — rata kanan, "Kepala [Sekolah]"
  const signatureHtml = `
    <div style="margin-top: 28px; display:flex; justify-content:flex-end;">
      <div style="text-align: left; font-size: 11pt; line-height: 1.5; min-width: 240px;">
        <div>Kepala ${schoolName || 'Sekolah'}</div>
        <div style="height: 72px;"></div>
        <div style="text-decoration: underline; font-weight: bold;">${principalName}</div>
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
    fetchPrintSettings().then((s) => setSettings(s)).catch(() => setSettings(null))
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
          {/* ── Info surat ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="rk-letter-number">Nomor Surat</Label>
              <Input
                id="rk-letter-number"
                placeholder="mis. 400.3.8/573/ADM/VIII/2026"
                value={defaults.letterNumber}
                onChange={(e) => setDefaults((d) => ({ ...d, letterNumber: e.target.value }))}
              />
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
          <div className="grid gap-1.5">
            <Label htmlFor="rk-purpose">Tujuan (guna kepentingan)</Label>
            <Input
              id="rk-purpose"
              placeholder="mis. Surat Pertanggungjawaban (SPJ) BOS Tahun 2026, Gaji PNS, GTT Provinsi Tahun 2026"
              value={defaults.purpose}
              onChange={(e) => setDefaults((d) => ({ ...d, purpose: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">
              Alamat surat otomatis diambil dari pengaturan sekolah (Settings).
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Tutup</Button>
          <Button onClick={handlePrint} disabled={loading || !settings}>
            {loading ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Printer className="size-4 mr-2" />}
            Cetak Surat
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
