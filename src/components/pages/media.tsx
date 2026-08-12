'use client'

import { useState, useEffect, useCallback } from 'react'
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
import { MediaPrintDialog, type MediaPrintOptions } from '@/components/media-print-dialog'
import { PaymentDialog } from '@/components/payment-dialog'
import { PageHeader, PageContainer } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { PageLoading } from '@/components/ui/loading-skeleton'
import { Badge } from '@/components/ui/badge'

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

  const fetchEntries = useCallback(async () => {
    setLoading(true)
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
      fetchEntries()
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
      fetchEntries()
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
  // Struktur: watermark logo + metadata kanan-atas + judul 2 baris + tabel 7 kolom
  // + baris total (terbilang) + 2 blok tanda tangan (Mengetahui & Bendahara).
  async function handlePrint(options: MediaPrintOptions) {
    if (filteredEntries.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data untuk dicetak' })
      return
    }

    // Ambil settings lengkap (termasuk kode anggaran & provinsi yang tidak ada di PrintSettings)
    let raw: Record<string, unknown> = {}
    try {
      const res = await fetch('/api/settings')
      if (res.ok) raw = await res.json()
    } catch { /* ignore — fallback ke default */ }

    const schoolName = (raw.schoolName as string) || ''
    const province = (raw.province as string) || 'SUMATERA UTARA'
    const logo = (raw.logo as string) || null
    const principalName = (raw.principalName as string) || ''
    const principalNip = (raw.principalNip as string) || ''
    const treasurerName = (raw.treasurerName as string) || ''
    const treasurerNip = (raw.treasurerNip as string) || ''
    const mediaKode = (raw.mediaKode as string) || ''
    const mediaKodeProgram = (raw.mediaKodeProgram as string) || '03.03.16.'
    const mediaKodeKegiatan = (raw.mediaKodeKegiatan as string) || '03.03.'
    const mediaKodeRekening = (raw.mediaKodeRekening as string) || '5.1.02.01.01.0055'

    const { startMonth, endMonth, year, place, orientation } = options

    // ── 1. Watermark logo di tengah halaman (opacity rendah) ──────────────────
    const watermarkHtml = logo
      ? `<div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.08; z-index: 0; pointer-events: none;">
           <img src="${logo}" style="width: 380px; height: 380px; object-fit: contain;" alt="watermark" />
         </div>`
      : ''

    // ── 2. Blok metadata (rata kanan, di atas judul) ──────────────────────────
    const metaBlock = `
      <div style="display: flex; justify-content: flex-end; margin-bottom: 8px;">
        <table style="border: none; font-size: 10pt; line-height: 1.5;">
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

    // ── 3. Judul (center, bold, uppercase, 2 baris) ───────────────────────────
    const titleHtml = `
      <div style="text-align: center; font-weight: bold; text-transform: uppercase; font-size: 12pt; line-height: 1.5; margin: 4px 0 12px; position: relative; z-index: 1;">
        <div>DAFTAR PEMBAYARAN IURAN KORAN DAN MAJALAH</div>
        <div>BULAN ${startMonth.toUpperCase()} SAMPAI ${endMonth.toUpperCase()}</div>
        <div>DI LINGKUNGAN ${schoolName.toUpperCase()} PROVINSI ${province.toUpperCase()} TAHUN ${year}</div>
      </div>
    `

    // ── 4. Tabel 7 kolom ──────────────────────────────────────────────────────
    // Kolom: NO | PENERIMA | NAMA MEDIA | JUMLAH BULAN | URAIAN IURAN/BULAN | PENERIMAAN BERSIH | TANDA TANGAN
    const rows = filteredEntries.map((e, idx) => `
      <tr>
        <td style="text-align: center; vertical-align: middle;">${idx + 1}</td>
        <td style="vertical-align: middle;">${e.name || '-'}</td>
        <td style="vertical-align: middle;">${e.mediaName || '-'}</td>
        <td style="text-align: center; vertical-align: middle;">
          <div>${formatNumberPrint(e.unitCount)}</div>
          <div style="font-size: 9pt;">OB</div>
        </td>
        <td style="text-align: left; vertical-align: middle;">
          <div>Rp</div>
          <div>${formatNumberPrint(e.pricePerMonth)}</div>
        </td>
        <td style="text-align: left; vertical-align: middle;">
          <div>Rp</div>
          <div>${formatNumberPrint(e.totalReceived)}</div>
        </td>
        <td style="height: 48px; vertical-align: middle;"></td>
      </tr>
    `).join('')

    // Baris total: kolom 1-5 merge "JUMLAH KESELURUHAN", kolom 6 = terbilang, kolom 7 = "Rp X,-"
    const totalRow = `
      <tr>
        <td colspan="5" style="text-align: center; font-weight: bold; vertical-align: middle;">JUMLAH KESELURUHAN</td>
        <td style="text-align: left; vertical-align: middle;">${terbilangRupiah(grandTotal)}</td>
        <td style="text-align: center; font-weight: bold; vertical-align: middle;">Rp ${formatNumberPrint(grandTotal)},-</td>
      </tr>
    `

    const tableHtml = `
      <table style="width: 100%; border-collapse: collapse; position: relative; z-index: 1;">
        <thead>
          <tr>
            <th style="width: 5%; padding: 6px 4px;">NO.</th>
            <th style="width: 20%; padding: 6px 4px;">PENERIMA</th>
            <th style="width: 15%; padding: 6px 4px;">NAMA MEDIA</th>
            <th style="width: 10%; padding: 6px 4px;">JUMLAH BULAN</th>
            <th style="width: 15%; padding: 6px 4px;">URAIAN IURAN/BULAN</th>
            <th style="width: 15%; padding: 6px 4px;">PENERIMAAN BERSIH</th>
            <th style="width: 20%; padding: 6px 4px;">TANDA TANGAN</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          ${totalRow}
        </tbody>
      </table>
    `

    // ── 5. Blok tanda tangan (2 kolom paralel) ───────────────────────────────
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const placeDate = place.trim() ? `${place.trim()}, ${today}` : today

    const signatureHtml = `
      <div style="display: flex; justify-content: space-between; margin-top: 24px; font-size: 10pt; position: relative; z-index: 1;">
        <div style="width: 45%; text-align: left;">
          <div>Mengetahui/</div>
          <div>Setuju Bayar:</div>
          <div>Kepala ${schoolName || 'Sekolah'},</div>
          <div style="height: 60px;"></div>
          <div style="text-decoration: underline; font-weight: bold;">${principalName || '&nbsp;'}</div>
          <div>${principalNip ? `NIP. ${principalNip}` : '&nbsp;'}</div>
        </div>
        <div style="width: 45%; text-align: left;">
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

    // ── 6. Gabungkan semua ────────────────────────────────────────────────────
    const bodyHtml = `
      ${watermarkHtml}
      ${metaBlock}
      ${titleHtml}
      ${tableHtml}
      ${signatureHtml}
    `

    openPrintWindow(
      `Daftar Pembayaran Media - ${startMonth} sampai ${endMonth} ${year}`,
      bodyHtml,
      orientation,
    )
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
            <Button variant="outline" onClick={() => setPrintDialogOpen(true)} disabled={loading || filteredEntries.length === 0}>
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
        title="Cetak Daftar Pembayaran Media"
        description="Atur periode bulan, tahun, dan tempat sebelum mencetak"
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
