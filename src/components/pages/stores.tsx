'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import { toast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Store,
  Printer,
} from 'lucide-react'
import { printWithKop } from '@/lib/print-utils'
import type { PrintOrientation } from '@/lib/print-utils'
import { PrintDialog } from '@/components/print-dialog'

interface StoreData {
  id: string
  name: string
  ownerName: string
  npwp: string
  goodsType: string
  phone: string
  address: string
  createdAt: string
  updatedAt: string
}

interface FormData {
  name: string
  ownerName: string
  npwp: string
  goodsType: string
  phone: string
  address: string
}

const emptyForm: FormData = {
  name: '',
  ownerName: '',
  npwp: '',
  goodsType: '',
  phone: '',
  address: '',
}

export function StoresPage() {
  const { toast } = useToast()
  const [stores, setStores] = useState<StoreData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<StoreData | null>(null)
  const [formData, setFormData] = useState<FormData>({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [deleting, setDeleting] = useState(false)

  const fetchStores = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/stores')
      if (!res.ok) throw new Error('Gagal')
      const data = await res.json()
      setStores(data)
    } catch {
      toast({ title: 'Error', description: 'Gagal mengambil data toko', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchStores() }, [fetchStores])

  function openAddDialog() {
    setEditingStore(null)
    setFormData({ ...emptyForm })
    setDialogOpen(true)
  }

  function openEditDialog(store: StoreData) {
    setEditingStore(store)
    setFormData({
      name: store.name,
      ownerName: store.ownerName,
      npwp: store.npwp,
      goodsType: store.goodsType,
      phone: store.phone,
      address: store.address,
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!formData.name.trim()) {
      toast({ title: 'Validasi', description: 'Nama toko wajib diisi', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const url = editingStore ? `/api/stores/${editingStore.id}` : '/api/stores'
      const method = editingStore ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: editingStore ? 'Toko berhasil diperbarui' : 'Toko berhasil ditambahkan' })
      setDialogOpen(false)
      fetchStores()
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan data toko', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/stores/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: 'Toko berhasil dihapus' })
      fetchStores()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus toko', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteId(null)
      setDeleteName('')
    }
  }

  const filteredStores = stores.filter((s) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return s.name.toLowerCase().includes(q) || s.ownerName.toLowerCase().includes(q) || s.goodsType.toLowerCase().includes(q)
  })

  async function handlePrint(orientation: PrintOrientation = 'portrait') {
    if (filteredStores.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data toko untuk dicetak' })
      return
    }

    const rows = filteredStores
      .map(
        (store, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>${store.name}</td>
          <td>${store.ownerName || '-'}</td>
          <td>${store.npwp || '-'}</td>
          <td>${store.goodsType || '-'}</td>
          <td>${store.phone || '-'}</td>
          <td>${store.address || '-'}</td>
        </tr>`
      )
      .join('')

    const contentHtml = `
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Toko</th>
            <th>Nama Pemilik</th>
            <th>NPWP</th>
            <th>Jenis Barang</th>
            <th>No HP</th>
            <th>Alamat</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div style="margin-top: 12px; font-size: 10pt;">
        <strong>Total: ${filteredStores.length} toko/supplier</strong>
      </div>`

    await printWithKop('DAFTAR TOKO DAN SUPPLIER', contentHtml, orientation, { appendSignature: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Toko</h2>
          <p className="text-muted-foreground">Manajemen data toko dan supplier</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPrintDialogOpen(true)} disabled={loading || filteredStores.length === 0}>
            <Printer className="size-4 mr-2" />
            Cetak
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="size-4 mr-2" />
            Tambah Toko
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Store className="size-5" />
              <div>
                <CardTitle>Data Toko</CardTitle>
                <CardDescription>Kelola daftar toko dan supplier barang</CardDescription>
              </div>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Cari toko..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Store className="size-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Belum ada data</p>
              <p className="text-sm">{search ? 'Tidak ditemukan toko yang sesuai' : 'Klik "Tambah Toko" untuk menambahkan'}</p>
            </div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">No</TableHead>
                    <TableHead>Nama Toko</TableHead>
                    <TableHead>Nama Pemilik</TableHead>
                    <TableHead>NPWP</TableHead>
                    <TableHead>Jenis Barang</TableHead>
                    <TableHead>No HP</TableHead>
                    <TableHead>Alamat</TableHead>
                    <TableHead className="w-[100px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStores.map((store, idx) => (
                    <TableRow key={store.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{store.name}</TableCell>
                      <TableCell>{store.ownerName || '-'}</TableCell>
                      <TableCell>{store.npwp || '-'}</TableCell>
                      <TableCell>{store.goodsType || '-'}</TableCell>
                      <TableCell>{store.phone || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{store.address || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditDialog(store)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => { setDeleteId(store.id); setDeleteName(store.name) }}>
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
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingStore ? 'Edit Toko' : 'Tambah Toko'}</DialogTitle>
            <DialogDescription>{editingStore ? 'Perbarui data toko' : 'Isi data toko baru'}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="store-name">Nama Toko *</Label>
              <Input id="store-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Masukkan nama toko" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ownerName">Nama Pemilik</Label>
              <Input id="ownerName" value={formData.ownerName} onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })} placeholder="Nama pemilik" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="npwp">NPWP</Label>
              <Input id="npwp" value={formData.npwp} onChange={(e) => setFormData({ ...formData, npwp: e.target.value })} placeholder="NPWP toko" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goodsType">Jenis Barang</Label>
              <MasterCombobox
                category="jenisBarang"
                value={formData.goodsType}
                onChange={(val) => setFormData({ ...formData, goodsType: val })}
                placeholder="Misal: ATK, Elektronik"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-phone">No HP</Label>
              <Input id="store-phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="No HP" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="store-address">Alamat</Label>
              <Textarea id="store-address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Alamat toko" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingStore ? 'Simpan Perubahan' : 'Tambah Toko'}
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
              Apakah Anda yakin ingin menghapus toko <span className="font-semibold">{deleteName}</span>? Tindakan ini tidak dapat dibatalkan.
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
        open={printDialogOpen}
        onOpenChange={setPrintDialogOpen}
        onPrint={handlePrint}
        title="Cetak Daftar Toko"
      />
    </div>
  )
}
