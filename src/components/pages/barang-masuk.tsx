'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { toast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  PackagePlus,
  X,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface StoreData {
  id: string
  name: string
  ownerName: string
  npwp: string
  phone: string
  address: string
}

interface EmployeeData {
  id: string
  name: string
  nip: string
  position: string
}

interface BarangMasukItemData {
  id: string
  itemName: string
  quantity: number
  unit: string
  condition: string
  notes: string
}

interface BarangMasukData {
  id: string
  documentNumber: string
  entryDate: string
  storeId: string | null
  employeeId: string | null
  source: string
  notes: string
  status: string
  store?: StoreData
  employee?: EmployeeData
  items?: BarangMasukItemData[]
  createdAt: string
}

interface BarangMasukItemForm {
  itemName: string
  quantity: number
  unit: string
  condition: string
}

const statusColors: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Draft: 'secondary',
  Diterima: 'default',
  Ditolak: 'destructive',
}

const conditionOptions = ['Baik', 'Rusak Ringan', 'Rusak Berat']

// ─── Helper ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BarangMasukPage() {
  const { toast } = useToast()
  const [data, setData] = useState<BarangMasukData[]>([])
  const [stores, setStores] = useState<StoreData[]>([])
  const [employees, setEmployees] = useState<EmployeeData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingData, setEditingData] = useState<BarangMasukData | null>(null)
  const [saving, setSaving] = useState(false)

  // Form
  const [documentNumber, setDocumentNumber] = useState('')
  const [entryDate, setEntryDate] = useState('')
  const [storeId, setStoreId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [source, setSource] = useState('')
  const [entryNotes, setEntryNotes] = useState('')
  const [entryStatus, setEntryStatus] = useState('Draft')
  const [items, setItems] = useState<BarangMasukItemForm[]>([
    { itemName: '', quantity: 1, unit: 'Unit', condition: 'Baik' },
  ])

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Status change
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusDataId, setStatusDataId] = useState<string | null>(null)
  const [newStatus, setNewStatus] = useState('')

  // ─── Fetch ────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/barang-masuk')
      if (!res.ok) throw new Error('Gagal')
      const result = await res.json()
      setData(result)
    } catch {
      toast({ title: 'Error', description: 'Gagal mengambil data barang masuk', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  const fetchSupporting = useCallback(async () => {
    try {
      const [storeRes, empRes] = await Promise.all([fetch('/api/stores'), fetch('/api/employees')])
      if (storeRes.ok) setStores(await storeRes.json())
      if (empRes.ok) setEmployees(await empRes.json())
    } catch {
      // silent
    }
  }, [])

  useEffect(() => { fetchData(); fetchSupporting() }, [fetchData, fetchSupporting])

  // ─── Dialog handlers ──────────────────────────────────────────────────────

  function openAddDialog() {
    setEditingData(null)
    setDocumentNumber('')
    setEntryDate(new Date().toISOString().split('T')[0])
    setStoreId('')
    setEmployeeId('')
    setSource('')
    setEntryNotes('')
    setEntryStatus('Draft')
    setItems([{ itemName: '', quantity: 1, unit: 'Unit', condition: 'Baik' }])
    setDialogOpen(true)
  }

  function openEditDialog(record: BarangMasukData) {
    setEditingData(record)
    setDocumentNumber(record.documentNumber)
    setEntryDate(record.entryDate ? new Date(record.entryDate).toISOString().split('T')[0] : '')
    setStoreId(record.storeId || '')
    setEmployeeId(record.employeeId || '')
    setSource(record.source)
    setEntryNotes(record.notes)
    setEntryStatus(record.status)
    setItems(
      record.items?.map((i) => ({
        itemName: i.itemName,
        quantity: i.quantity,
        unit: i.unit,
        condition: i.condition,
      })) || [{ itemName: '', quantity: 1, unit: 'Unit', condition: 'Baik' }]
    )
    setDialogOpen(true)
  }

  function addItemRow() {
    setItems([...items, { itemName: '', quantity: 1, unit: 'Unit', condition: 'Baik' }])
  }

  function removeItemRow(index: number) {
    if (items.length <= 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  function updateItem(index: number, field: keyof BarangMasukItemForm, value: string | number) {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    setItems(updated)
  }

  async function handleSubmit() {
    if (!documentNumber.trim()) {
      toast({ title: 'Validasi', description: 'Nomor dokumen wajib diisi', variant: 'destructive' })
      return
    }
    if (items.some((i) => !i.itemName.trim())) {
      toast({ title: 'Validasi', description: 'Nama barang pada setiap item wajib diisi', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      const body = {
        documentNumber,
        entryDate: entryDate || new Date().toISOString(),
        storeId: storeId || null,
        employeeId: employeeId || null,
        source,
        notes: entryNotes,
        status: entryStatus,
        items: items.map((i) => ({
          itemName: i.itemName,
          quantity: i.quantity,
          unit: i.unit,
          condition: i.condition,
          notes: '',
        })),
      }

      const url = editingData ? `/api/barang-masuk/${editingData.id}` : '/api/barang-masuk'
      const method = editingData ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: editingData ? 'Barang masuk berhasil diperbarui' : 'Barang masuk berhasil ditambahkan' })
      setDialogOpen(false)
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan barang masuk', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/barang-masuk/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: 'Barang masuk berhasil dihapus' })
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus barang masuk', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteId(null)
      setDeleteName('')
    }
  }

  async function handleStatusChange() {
    if (!statusDataId || !newStatus) return
    try {
      const res = await fetch(`/api/barang-masuk/${statusDataId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: 'Status barang masuk diperbarui' })
      setStatusDialogOpen(false)
      fetchData()
    } catch {
      toast({ title: 'Error', description: 'Gagal mengubah status', variant: 'destructive' })
    }
  }

  // ─── Filter ────────────────────────────────────────────────────────────────

  const filteredData = data.filter((d) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return d.documentNumber.toLowerCase().includes(q) ||
      d.source.toLowerCase().includes(q) ||
      (d.store?.name || '').toLowerCase().includes(q)
  })

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Barang Masuk</h2>
          <p className="text-muted-foreground">Pencatatan barang masuk dan penerimaan</p>
        </div>
        <Button onClick={openAddDialog}>
          <Plus className="size-4 mr-2" />
          Tambah Barang Masuk
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <PackagePlus className="size-5" />
              <div>
                <CardTitle>Data Barang Masuk</CardTitle>
                <CardDescription>Kelola pencatatan barang masuk</CardDescription>
              </div>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Cari barang masuk..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <PackagePlus className="size-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Belum ada data</p>
              <p className="text-sm">{search ? 'Tidak ditemukan data yang sesuai' : 'Klik "Tambah Barang Masuk" untuk menambahkan'}</p>
            </div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">No</TableHead>
                    <TableHead>No. Dokumen</TableHead>
                    <TableHead>Tanggal</TableHead>
                    <TableHead>Sumber</TableHead>
                    <TableHead>Toko</TableHead>
                    <TableHead>Jumlah Item</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((record, idx) => (
                    <TableRow key={record.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{record.documentNumber}</TableCell>
                      <TableCell>{record.entryDate ? formatDate(record.entryDate) : '-'}</TableCell>
                      <TableCell>{record.source || '-'}</TableCell>
                      <TableCell>{record.store?.name || '-'}</TableCell>
                      <TableCell className="text-center">{record.items?.length || 0}</TableCell>
                      <TableCell>
                        <Badge
                          variant={statusColors[record.status] || 'secondary'}
                          className="cursor-pointer"
                          onClick={() => {
                            setStatusDataId(record.id)
                            setNewStatus(record.status)
                            setStatusDialogOpen(true)
                          }}
                        >
                          {record.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditDialog(record)} title="Edit">
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => { setDeleteId(record.id); setDeleteName(record.documentNumber) }} title="Hapus">
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
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingData ? 'Edit Barang Masuk' : 'Tambah Barang Masuk'}</DialogTitle>
            <DialogDescription>{editingData ? 'Perbarui data barang masuk' : 'Isi data barang masuk baru'}</DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[65vh] pr-4">
            <div className="space-y-4">
              {/* Entry Info */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nomor Dokumen *</Label>
                  <Input value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} placeholder="BM/001/2025" />
                </div>
                <div className="space-y-2">
                  <Label>Tanggal Masuk</Label>
                  <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Toko (Opsional)</Label>
                  <Select value={storeId} onValueChange={setStoreId}>
                    <SelectTrigger><SelectValue placeholder="Pilih toko" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Tidak ada</SelectItem>
                      {stores.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pegawai Penerima</Label>
                  <Select value={employeeId} onValueChange={setEmployeeId}>
                    <SelectTrigger><SelectValue placeholder="Pilih pegawai" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Tidak ada</SelectItem>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>{e.name}{e.position ? ` - ${e.position}` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sumber Barang</Label>
                  <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Pembelian, Donasi, Hibah, dll." />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={entryStatus} onValueChange={setEntryStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="Diterima">Diterima</SelectItem>
                      <SelectItem value="Ditolak">Ditolak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Keterangan</Label>
                <Textarea value={entryNotes} onChange={(e) => setEntryNotes(e.target.value)} placeholder="Keterangan tambahan" rows={2} />
              </div>

              {/* Items */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Daftar Barang</Label>
                  <Button size="sm" variant="outline" onClick={addItemRow}>
                    <Plus className="size-4 mr-1" /> Tambah Item
                  </Button>
                </div>

                {items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end border rounded-md p-3">
                    <div className="col-span-12 sm:col-span-4 space-y-1">
                      <Label className="text-xs">Nama Barang</Label>
                      <Input value={item.itemName} onChange={(e) => updateItem(idx, 'itemName', e.target.value)} placeholder="Nama barang" className="h-9" />
                    </div>
                    <div className="col-span-3 sm:col-span-2 space-y-1">
                      <Label className="text-xs">Jumlah</Label>
                      <Input type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', Number(e.target.value))} className="h-9" />
                    </div>
                    <div className="col-span-3 sm:col-span-2 space-y-1">
                      <Label className="text-xs">Satuan</Label>
                      <Input value={item.unit} onChange={(e) => updateItem(idx, 'unit', e.target.value)} className="h-9" />
                    </div>
                    <div className="col-span-4 sm:col-span-3 space-y-1">
                      <Label className="text-xs">Kondisi</Label>
                      <Select value={item.condition} onValueChange={(value) => updateItem(idx, 'condition', value)}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {conditionOptions.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-9 text-destructive hover:text-destructive"
                        onClick={() => removeItemRow(idx)}
                        disabled={items.length <= 1}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <div className="text-right text-base font-semibold">
                  Total Barang: {items.reduce((sum, i) => sum + i.quantity, 0)} ({items.length} jenis)
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingData ? 'Simpan Perubahan' : 'Tambah Barang Masuk'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Ubah Status Barang Masuk</DialogTitle>
            <DialogDescription>Pilih status baru</DialogDescription>
          </DialogHeader>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Diterima">Diterima</SelectItem>
              <SelectItem value="Ditolak">Ditolak</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Batal</Button>
            <Button onClick={handleStatusChange}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) { setDeleteId(null); setDeleteName('') } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Konfirmasi Hapus</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus barang masuk <span className="font-semibold">{deleteName}</span>? Tindakan ini tidak dapat dibatalkan.
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
    </div>
  )
}
