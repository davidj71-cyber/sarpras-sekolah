'use client'

// ─── Galon Page ──────────────────────────────────────────────────────────────
// Sub-menu Toko. Catatan penerimaan & pembayaran galon (Cash/Bon).
//
// Field (sesuai permintaan user):
//   1. Galon kosong       (emptyCount)   — jumlah galon kosong diterima
//   2. Galon di isi       (filledCount)  — jumlah galon isi ditukar/diterima
//   3. Toko               (storeId)      — relasi ke Store, dropdown
//   4. Pengantar/Penandatangan (courier) — siapa yang mengantar
//   5. Penerima           (recipient)    — nama media/penerima galon
//   6. Tanggal terima     (receivedDate) — tanggal galon diterima
//   7. Cash atau Bon      (paymentMethod)— Cash = langsung lunas, Bon = utang
//   8. Tanggal bayar      (paidAt)       — otomatis = tanggal terima jika Cash;
//                                           diisi manual saat Bon dilunasi.

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '@/hooks/use-toast'
import { toast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  PageHeader,
  PageContainer,
} from '@/components/ui/page-header'
import { PageLoading } from '@/components/ui/loading-skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Badge } from '@/components/ui/badge'
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
  Droplet,
  CheckCircle2,
  XCircle,
  Calendar,
} from 'lucide-react'

interface StoreOption {
  id: string
  name: string
}

interface GalonData {
  id: string
  emptyCount: number
  filledCount: number
  storeId: string | null
  storeName: string
  store?: { id: string; name: string } | null
  courier: string
  recipient: string
  receivedDate: string
  paymentMethod: string
  paymentStatus: string
  paidAt: string | null
  notes: string
  createdAt: string
  updatedAt: string
}

interface FormData {
  emptyCount: string
  filledCount: string
  storeId: string
  courier: string
  recipient: string
  receivedDate: string
  paymentMethod: string
  paidAt: string
  notes: string
}

const emptyForm: FormData = {
  emptyCount: '0',
  filledCount: '0',
  storeId: '',
  courier: '',
  recipient: '',
  receivedDate: new Date().toISOString().slice(0, 10),
  paymentMethod: 'Cash',
  paidAt: '',
  notes: '',
}

function formatDateShort(s: string | null): string {
  if (!s) return '-'
  try {
    return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '-'
  }
}

export function GalonPage() {
  const { toast } = useToast()
  const [entries, setEntries] = useState<GalonData[]>([])
  const [stores, setStores] = useState<StoreOption[]>([])
  const [loading, setLoading] = useState(true)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<GalonData | null>(null)
  const [formData, setFormData] = useState<FormData>({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLabel, setDeleteLabel] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Filter
  const [search, setSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Mark-as-paid dialog
  const [payEntry, setPayEntry] = useState<GalonData | null>(null)
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [paying, setPaying] = useState(false)

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/galon')
      if (!res.ok) throw new Error('Gagal')
      const data = await res.json()
      setEntries(data)
    } catch {
      toast({ title: 'Error', description: 'Gagal memuat data galon', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchStores = useCallback(async () => {
    try {
      const res = await fetch('/api/stores')
      if (!res.ok) return
      const data = await res.json()
      setStores(data.map((s: StoreOption) => ({ id: s.id, name: s.name })))
    } catch {
      // ignore — toko opsional
    }
  }, [])

  useEffect(() => {
    fetchEntries()
    fetchStores()
  }, [fetchEntries, fetchStores])

  // Filtered list
  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const q = search.toLowerCase().trim()
      const matchSearch = !q
        || e.storeName.toLowerCase().includes(q)
        || e.courier.toLowerCase().includes(q)
        || e.recipient.toLowerCase().includes(q)
        || e.notes.toLowerCase().includes(q)
      const matchMethod = methodFilter === 'all' || e.paymentMethod === methodFilter
      const matchStatus = statusFilter === 'all' || e.paymentStatus === statusFilter
      return matchSearch && matchMethod && matchStatus
    })
  }, [entries, search, methodFilter, statusFilter])

  // Stats
  const stats = useMemo(() => {
    const totalEmpty = entries.reduce((s, e) => s + e.emptyCount, 0)
    const totalFilled = entries.reduce((s, e) => s + e.filledCount, 0)
    const totalBon = entries
      .filter((e) => e.paymentMethod === 'Bon')
      .reduce((s, e) => s + e.emptyCount + e.filledCount, 0)
    const totalUnpaid = entries.filter((e) => e.paymentStatus === 'BELUM_BAYAR').length
    return { totalEmpty, totalFilled, totalBon, totalUnpaid }
  }, [entries])

  function openAddDialog() {
    setEditing(null)
    setFormData({ ...emptyForm, receivedDate: new Date().toISOString().slice(0, 10) })
    setDialogOpen(true)
  }

  function openEditDialog(entry: GalonData) {
    setEditing(entry)
    setFormData({
      emptyCount: String(entry.emptyCount),
      filledCount: String(entry.filledCount),
      storeId: entry.storeId || '',
      courier: entry.courier,
      recipient: entry.recipient,
      receivedDate: new Date(entry.receivedDate).toISOString().slice(0, 10),
      paymentMethod: entry.paymentMethod,
      paidAt: entry.paidAt ? new Date(entry.paidAt).toISOString().slice(0, 10) : '',
      notes: entry.notes,
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!formData.recipient.trim()) {
      toast({ title: 'Validasi', description: 'Penerima wajib diisi', variant: 'destructive' })
      return
    }
    if (Number(formData.emptyCount) < 0 || Number(formData.filledCount) < 0) {
      toast({ title: 'Validasi', description: 'Jumlah galon tidak boleh negatif', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const payload = {
        ...formData,
        emptyCount: Number(formData.emptyCount),
        filledCount: Number(formData.filledCount),
        storeName: stores.find((s) => s.id === formData.storeId)?.name || '',
      }
      const url = editing ? `/api/galon/${editing.id}` : '/api/galon'
      const method = editing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Gagal menyimpan')
      }

      toast({
        title: editing ? 'Data diperbarui' : 'Data ditambahkan',
        description: `Galon ${formData.recipient} — ${formData.paymentMethod}`,
      })
      setDialogOpen(false)
      fetchEntries()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Terjadi kesalahan',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/galon/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal menghapus')
      toast({ title: 'Dihapus', description: 'Data galon berhasil dihapus' })
      fetchEntries()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus data', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteId(null)
    }
  }

  async function handleMarkPaid() {
    if (!payEntry) return
    setPaying(true)
    try {
      const res = await fetch(`/api/galon/${payEntry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paidAt: payDate }),
      })
      if (!res.ok) throw new Error('Gagal menandai lunas')
      toast({
        title: 'Bon dilunasi',
        description: `Galon ${payEntry.recipient} — ${formatDateShort(payDate)}`,
      })
      setPayEntry(null)
      fetchEntries()
    } catch {
      toast({ title: 'Error', description: 'Gagal menandai lunas', variant: 'destructive' })
    } finally {
      setPaying(false)
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Galon"
        description="Catatan penerimaan & pembayaran galon (Cash / Bon)"
        icon={Droplet}
        actions={
          <Button onClick={openAddDialog}>
            <Plus className="size-4 mr-2" />
            Tambah Data
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card className="card-pro">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-amber-100 dark:bg-amber-950/40 flex items-center justify-center">
                <Droplet className="size-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{stats.totalEmpty}</div>
                <div className="text-xs text-muted-foreground">Galon Kosong</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-pro">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-sky-100 dark:bg-sky-950/40 flex items-center justify-center">
                <Droplet className="size-5 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{stats.totalFilled}</div>
                <div className="text-xs text-muted-foreground">Galon Di Isi</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-pro">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-purple-100 dark:bg-purple-950/40 flex items-center justify-center">
                <Calendar className="size-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{entries.length}</div>
                <div className="text-xs text-muted-foreground">Total Transaksi</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="card-pro">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-rose-100 dark:bg-rose-950/40 flex items-center justify-center">
                <XCircle className="size-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <div className="text-2xl font-bold tabular-nums">{stats.totalUnpaid}</div>
                <div className="text-xs text-muted-foreground">Bon Belum Lunas</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="card-pro">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Droplet className="size-5" />
              <div>
                <CardTitle>Daftar Galon</CardTitle>
                <CardDescription>Riwayat penerimaan & pembayaran galon</CardDescription>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger className="sm:w-32">
                  <SelectValue placeholder="Metode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Metode</SelectItem>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bon">Bon</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="sm:w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="LUNAS">Lunas</SelectItem>
                  <SelectItem value="BELUM_BAYAR">Belum Bayar</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Cari toko / pengantar / penerima..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PageLoading label="Memuat data galon..." />
          ) : filteredEntries.length === 0 ? (
            <EmptyState
              icon={Droplet}
              title="Belum ada data"
              description={search || methodFilter !== 'all' || statusFilter !== 'all' ? 'Tidak ditemukan data yang sesuai' : 'Klik "Tambah Data" untuk menambahkan'}
            />
          ) : (
            <div className="max-h-[560px] overflow-y-auto rounded-md border">
              <Table className="table-pro">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px] text-left">Aksi</TableHead>
                    <TableHead className="w-[60px] text-center">No</TableHead>
                    <TableHead className="text-center">Galon Kosong</TableHead>
                    <TableHead className="text-center">Galon Isi</TableHead>
                    <TableHead>Toko</TableHead>
                    <TableHead>Pengantar</TableHead>
                    <TableHead>Penerima</TableHead>
                    <TableHead className="text-center">Tgl Terima</TableHead>
                    <TableHead className="text-center">Metode</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-center">Tgl Bayar</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEntries.map((e, idx) => (
                    <TableRow key={e.id} className="h-14">
                      <TableCell className="text-left">
                        <div className="flex items-center justify-start gap-1">
                          {e.paymentMethod === 'Bon' && e.paymentStatus === 'BELUM_BAYAR' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                              onClick={() => {
                                setPayEntry(e)
                                setPayDate(new Date().toISOString().slice(0, 10))
                              }}
                              title="Tandai lunas"
                            >
                              <CheckCircle2 className="size-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onClick={() => openEditDialog(e)}
                            title="Edit"
                          >
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              setDeleteId(e.id)
                              setDeleteLabel(`${e.recipient} (${formatDateShort(e.receivedDate)})`)
                            }}
                            title="Hapus"
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-center tabular-nums">{idx + 1}</TableCell>
                      <TableCell className="text-center tabular-nums font-medium">
                        {e.emptyCount > 0 ? e.emptyCount : '-'}
                      </TableCell>
                      <TableCell className="text-center tabular-nums font-medium">
                        {e.filledCount > 0 ? e.filledCount : '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{e.storeName || e.store?.name || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{e.courier || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap">{e.recipient}</TableCell>
                      <TableCell className="text-center whitespace-nowrap">{formatDateShort(e.receivedDate)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={e.paymentMethod === 'Cash' ? 'secondary' : 'outline'}>
                          {e.paymentMethod}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {e.paymentStatus === 'LUNAS' ? (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-100">
                            <CheckCircle2 className="size-3 mr-1" />
                            Lunas
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="size-3 mr-1" />
                            Belum
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center whitespace-nowrap">{formatDateShort(e.paidAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Add/Edit Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!saving) setDialogOpen(open) }}>
        <DialogContent className="sm:max-w-[640px] max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Droplet className="size-5" />
              {editing ? 'Edit Data Galon' : 'Tambah Data Galon'}
            </DialogTitle>
            <DialogDescription>
              {editing ? 'Perbarui data penerimaan galon' : 'Catat penerimaan galon baru'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Kuantitas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="g-empty">Galon Kosong</Label>
                <Input
                  id="g-empty"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={formData.emptyCount}
                  onChange={(e) => setFormData((d) => ({ ...d, emptyCount: e.target.value.replace(/[^\d]/g, '') }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="g-filled">Galon Di Isi</Label>
                <Input
                  id="g-filled"
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={formData.filledCount}
                  onChange={(e) => setFormData((d) => ({ ...d, filledCount: e.target.value.replace(/[^\d]/g, '') }))}
                />
              </div>
            </div>

            {/* Toko + Pengantar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="g-store">Toko</Label>
                <Select
                  value={formData.storeId || '__none__'}
                  onValueChange={(v) => setFormData((d) => ({ ...d, storeId: v === '__none__' ? '' : v }))}
                >
                  <SelectTrigger id="g-store">
                    <SelectValue placeholder="Pilih toko (opsional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— Tidak ada toko —</SelectItem>
                    {stores.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="g-courier">Pengantar / Penandatangan</Label>
                <Input
                  id="g-courier"
                  placeholder="mis. Bapak Rahmat"
                  value={formData.courier}
                  onChange={(e) => setFormData((d) => ({ ...d, courier: e.target.value }))}
                />
              </div>
            </div>

            {/* Penerima + Tanggal Terima */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="g-recipient">Penerima (nama media)</Label>
                <Input
                  id="g-recipient"
                  placeholder="mis. TU Sekolah / Bapak ..."
                  value={formData.recipient}
                  onChange={(e) => setFormData((d) => ({ ...d, recipient: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="g-received-date">Tanggal Terima</Label>
                <Input
                  id="g-received-date"
                  type="date"
                  value={formData.receivedDate}
                  onChange={(e) => setFormData((d) => ({ ...d, receivedDate: e.target.value }))}
                />
              </div>
            </div>

            {/* Metode pembayaran */}
            <div className="rounded-md border p-3 bg-muted/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="g-method">Cash atau Bon</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(v) => setFormData((d) => ({ ...d, paymentMethod: v }))}
                  >
                    <SelectTrigger id="g-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash (Langsung Lunas)</SelectItem>
                      <SelectItem value="Bon">Bon (Belum Bayar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formData.paymentMethod === 'Bon' && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="g-paid-at">Tanggal Bayar</Label>
                    <Input
                      id="g-paid-at"
                      type="date"
                      value={formData.paidAt}
                      onChange={(e) => setFormData((d) => ({ ...d, paidAt: e.target.value }))}
                      placeholder="Kosongkan jika belum lunas"
                    />
                    <p className="text-xs text-muted-foreground">
                      Kosongkan jika Bon belum dilunasi. Bisa diisi nanti lewat tombol ✓ di tabel.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Catatan */}
            <div className="grid gap-1.5">
              <Label htmlFor="g-notes">Catatan (opsional)</Label>
              <Textarea
                id="g-notes"
                placeholder="Catatan tambahan..."
                value={formData.notes}
                onChange={(e) => setFormData((d) => ({ ...d, notes: e.target.value }))}
                rows={2}
              />
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

      {/* ─── Delete Confirmation ────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) { setDeleteId(null); setDeleteLabel('') } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data galon <span className="font-semibold">{deleteLabel}</span>?
              Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="size-4 mr-2 animate-spin" />}
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─── Mark-as-Paid Dialog ───────────────────────────────────────────── */}
      <Dialog open={!!payEntry} onOpenChange={(open) => { if (!paying) setPayEntry(null) }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" />
              Tandai Bon Sebagai Lunas
            </DialogTitle>
            <DialogDescription>
              {payEntry && (
                <span>
                  Galon <strong>{payEntry.recipient}</strong> ({payEntry.emptyCount + payEntry.filledCount} unit) —
                  diterima {formatDateShort(payEntry.receivedDate)}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-2">
            <Label htmlFor="g-pay-date">Tanggal Pembayaran</Label>
            <Input
              id="g-pay-date"
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayEntry(null)} disabled={paying}>Batal</Button>
            <Button onClick={handleMarkPaid} disabled={paying} className="bg-emerald-600 hover:bg-emerald-700">
              {paying && <Loader2 className="size-4 mr-2 animate-spin" />}
              <CheckCircle2 className="size-4 mr-2" />
              Tandai Lunas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
