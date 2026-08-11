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
  Wallet,
  Printer,
  FileText,
  FileSpreadsheet,
  Banknote,
  CalendarCheck,
} from 'lucide-react'
import {
  fetchPrintSettings,
  buildKopHtml,
  openPrintWindow,
  formatRupiahPrint,
  formatNumberPrint,
} from '@/lib/print-utils'
import type { PrintOrientation } from '@/lib/print-utils'
import { exportToExcel, getSchoolMeta } from '@/lib/export-excel'
import { PrintDialog } from '@/components/print-dialog'
import { PaymentDialog } from '@/components/payment-dialog'
import { PageHeader, PageContainer } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { PageLoading } from '@/components/ui/loading-skeleton'
import { Badge } from '@/components/ui/badge'

interface SalaryData {
  id: string
  name: string
  nip: string
  gender: string
  lessonCount: number
  unit: string
  pricePerLesson: number
  totalReceived: number
  period: string
  createdAt: string
  updatedAt: string
}

interface FormData {
  name: string
  nip: string
  gender: string
  lessonCount: string
  unit: string
  pricePerLesson: number
  period: string
}

const emptyForm: FormData = {
  name: '',
  nip: '',
  gender: 'L',
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

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<SalaryData | null>(null)
  const [formData, setFormData] = useState<FormData>({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [deleting, setDeleting] = useState(false)

  const [bankDialogOpen, setBankDialogOpen] = useState(false)
  const [ttdDialogOpen, setTtdDialogOpen] = useState(false)
  const [paymentEntry, setPaymentEntry] = useState<SalaryData | null>(null)

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
      gender: entry.gender || 'L',
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
      e.nip.toLowerCase().includes(search.toLowerCase())
    const matchPeriod = !periodFilter.trim() ||
      (e.period || '').toLowerCase().includes(periodFilter.toLowerCase())
    return matchSearch && matchPeriod
  })

  const grandTotal = filteredEntries.reduce((s, e) => s + (e.totalReceived || 0), 0)

  // ─── Cetak Bank — format untuk setoran bank (tanpa kolom tanda tangan) ──────
  async function handlePrintBank(orientation: PrintOrientation) {
    if (filteredEntries.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data untuk dicetak' })
      return
    }
    const settings = await fetchPrintSettings()
    const kopHtml = buildKopHtml(settings)

    const rows = filteredEntries.map((e, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td>${e.name || '-'}</td>
        <td class="text-center">${e.nip || '-'}</td>
        <td class="text-center">${e.gender === 'P' ? 'Perempuan' : 'Laki-laki'}</td>
        <td class="text-center">${formatNumberPrint(e.lessonCount)}</td>
        <td class="text-center">${e.unit || '-'}</td>
        <td class="text-right">Rp ${formatNumberPrint(e.pricePerLesson)}</td>
        <td class="text-right">Rp ${formatNumberPrint(e.totalReceived)}</td>
      </tr>
    `).join('')

    const periodLabel = periodFilter.trim() ? `Periode: ${periodFilter.trim()}` : ''
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

    const contentHtml = `
      ${periodLabel ? `<div style="margin: 8px 0 12px; font-size: 11pt;"><strong>${periodLabel}</strong></div>` : ''}
      <table>
        <thead>
          <tr>
            <th style="width: 35px;">No</th>
            <th>Nama</th>
            <th style="width: 120px;">NIP</th>
            <th style="width: 80px;">Jenis Kelamin</th>
            <th style="width: 60px;">Jumlah Les</th>
            <th style="width: 70px;">Satuan</th>
            <th style="width: 110px;">Harga Per Les</th>
            <th style="width: 120px;">Penerimaan</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="background-color: #e8e8e8;">
            <td colspan="7" style="text-align: right; font-weight: bold;">Total</td>
            <td style="text-align: right; font-weight: bold;">Rp ${formatNumberPrint(grandTotal)}</td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 32px; font-size: 12pt; text-align: left; display: inline-grid; grid-template-columns: auto auto;">
        <div style="padding-right: 4px;">an.</div>
        <div>Kepala ${settings.schoolName || 'Sekolah'}</div>
        <div></div>
        <div style="margin-top: 4px;">Bendahara Sekolah,</div>
        <div></div>
        <div style="height: 72px;"></div>
        <div></div>
        <div style="text-decoration: underline; font-weight: bold;">${settings.treasurerName || '____________________'}</div>
        <div></div>
        <div>${settings.treasurerNip ? `NIP. ${settings.treasurerNip}` : '&nbsp;'}</div>
      </div>
      <div class="footer-info">Dicetak pada: ${today}</div>
    `

    openPrintWindow(`Daftar Gaji (Bank) - ${periodLabel || 'Semua Periode'}`, `${kopHtml}<div class="title">DAFTAR GAJI</div>${contentHtml}`, orientation)
  }

  // ─── Cetak TTD — format dengan kolom tanda tangan untuk setiap guru ─────────
  async function handlePrintTtd(orientation: PrintOrientation) {
    if (filteredEntries.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data untuk dicetak' })
      return
    }
    const settings = await fetchPrintSettings()
    const kopHtml = buildKopHtml(settings)

    const rows = filteredEntries.map((e, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td>${e.name || '-'}</td>
        <td class="text-center">${e.nip || '-'}</td>
        <td class="text-center">${e.gender === 'P' ? 'P' : 'L'}</td>
        <td class="text-center">${formatNumberPrint(e.lessonCount)}</td>
        <td class="text-center">${e.unit || '-'}</td>
        <td class="text-right">Rp ${formatNumberPrint(e.pricePerLesson)}</td>
        <td class="text-right">Rp ${formatNumberPrint(e.totalReceived)}</td>
        <td style="height: 50px;"></td>
      </tr>
    `).join('')

    const periodLabel = periodFilter.trim() ? `Periode: ${periodFilter.trim()}` : ''
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

    const contentHtml = `
      ${periodLabel ? `<div style="margin: 8px 0 12px; font-size: 11pt;"><strong>${periodLabel}</strong></div>` : ''}
      <table>
        <thead>
          <tr>
            <th style="width: 30px;">No</th>
            <th>Nama</th>
            <th style="width: 110px;">NIP</th>
            <th style="width: 40px;">JK</th>
            <th style="width: 50px;">Jml Les</th>
            <th style="width: 60px;">Satuan</th>
            <th style="width: 100px;">Harga/Les</th>
            <th style="width: 110px;">Penerimaan</th>
            <th style="width: 130px;">Tanda Tangan</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr style="background-color: #e8e8e8;">
            <td colspan="7" style="text-align: right; font-weight: bold;">Total</td>
            <td style="text-align: right; font-weight: bold;">Rp ${formatNumberPrint(grandTotal)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 32px; font-size: 12pt;">
        <div style="display:flex; justify-content:space-between;">
          <div style="text-align:center; width: 45%;">
            <div>Mengetahui,</div>
            <div>Kepala ${settings.schoolName || 'Sekolah'}</div>
            <div style="height: 60px;"></div>
            <div style="text-decoration: underline; font-weight: bold;">${settings.principalName || '____________________'}</div>
            <div>${settings.principalNip ? `NIP. ${settings.principalNip}` : '&nbsp;'}</div>
          </div>
          <div style="text-align:center; width: 45%;">
            <div>${today}</div>
            <div>Bendahara</div>
            <div style="height: 60px;"></div>
            <div style="text-decoration: underline; font-weight: bold;">${settings.treasurerName || '____________________'}</div>
            <div>${settings.treasurerNip ? `NIP. ${settings.treasurerNip}` : '&nbsp;'}</div>
          </div>
        </div>
      </div>
      <div class="footer-info">Dicetak pada: ${today}</div>
    `

    openPrintWindow(`Daftar Gaji (Tanda Tangan) - ${periodLabel || 'Semua Periode'}`, `${kopHtml}<div class="title">DAFTAR GAJI</div>${contentHtml}`, orientation)
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
      await exportToExcel({
        filename: 'Daftar_Gaji.xlsx',
        sheetName: 'Daftar Gaji',
        title: 'DAFTAR GAJI',
        meta,
        columns: [
          { header: 'No', key: (e) => String(filteredEntries.indexOf(e) + 1), width: 6 },
          { header: 'Nama', key: 'name', width: 28 },
          { header: 'NIP', key: (e) => e.nip || '-', width: 22 },
          { header: 'Jenis Kelamin', key: (e) => (e.gender === 'P' ? 'Perempuan' : 'Laki-laki'), width: 14 },
          { header: 'Jumlah Les', key: 'lessonCount', width: 12 },
          { header: 'Satuan', key: (e) => e.unit || '-', width: 12 },
          { header: 'Harga Per Les', key: 'pricePerLesson', width: 16 },
          { header: 'Penerimaan', key: 'totalReceived', width: 18 },
          { header: 'Periode', key: (e) => e.period || '-', width: 18 },
        ],
        data: filteredEntries,
      })
      toast({ title: 'Berhasil', description: 'Data gaji berhasil diekspor ke Excel' })
    } catch {
      toast({ title: 'Error', description: 'Gagal mengekspor data ke Excel', variant: 'destructive' })
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Gaji"
        description="Data guru dan rincian honor mengajar"
        icon={Wallet}
        actions={
          <>
            <Button variant="outline" onClick={() => setBankDialogOpen(true)} disabled={loading || filteredEntries.length === 0}>
              <Banknote className="size-4 mr-2" />
              Cetak Bank
            </Button>
            <Button variant="outline" onClick={() => setTtdDialogOpen(true)} disabled={loading || filteredEntries.length === 0}>
              <FileText className="size-4 mr-2" />
              Cetak TTD
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
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input placeholder="Cari nama / NIP..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
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
              description={search || periodFilter ? 'Tidak ditemukan data yang sesuai' : 'Klik "Tambah Data" untuk menambahkan'}
            />
          ) : (
            <div className="max-h-[560px] overflow-y-auto rounded-md border">
              <Table className="table-pro">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-left tabular-nums">No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead className="whitespace-nowrap tabular-nums">NIP</TableHead>
                    <TableHead className="w-[60px] text-center">JK</TableHead>
                    <TableHead className="text-right tabular-nums">Jml Les</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead className="text-right">Harga/Les</TableHead>
                    <TableHead className="text-right">Penerimaan</TableHead>
                    <TableHead className="w-[160px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((e, idx) => (
                    <TableRow key={e.id} className="h-14">
                      <TableCell className="tabular-nums text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{e.name}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{e.nip || '-'}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{e.gender === 'P' ? 'P' : 'L'}</Badge>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{e.lessonCount}</TableCell>
                      <TableCell>{e.unit || '-'}</TableCell>
                      <TableCell className="text-right tabular-nums">Rp {formatNumberPrint(e.pricePerLesson)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">Rp {formatNumberPrint(e.totalReceived)}</TableCell>
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
            <div className="space-y-2">
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

      <PrintDialog
        open={bankDialogOpen}
        onOpenChange={setBankDialogOpen}
        onPrint={handlePrintBank}
        title="Cetak Daftar Gaji (Bank)"
        description="Format setoran bank — tanpa kolom tanda tangan"
      />
      <PrintDialog
        open={ttdDialogOpen}
        onOpenChange={setTtdDialogOpen}
        onPrint={handlePrintTtd}
        title="Cetak Daftar Gaji (Tanda Tangan)"
        description="Format dengan kolom tanda tangan untuk setiap guru"
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
          defaultAmount={paymentEntry.totalReceived}
          defaultLessonCount={paymentEntry.lessonCount}
          showLessonCount
          apiBase={`/api/salary/${paymentEntry.id}/payments`}
        />
      )}
    </PageContainer>
  )
}
