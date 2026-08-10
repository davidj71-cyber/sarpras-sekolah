'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'

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
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Building2,
  DoorOpen,
  Layers,
  Printer,
} from 'lucide-react'
import { printWithKop, formatRupiahPrint } from '@/lib/print-utils'
import type { PrintOrientation } from '@/lib/print-utils'
import { PrintDialog } from '@/components/print-dialog'
import { MasterCombobox } from '@/components/ui/master-combobox'

const conditionOptions = ['Baik', 'Rusak Ringan', 'Rusak Berat'] as const

const conditionBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'Baik': 'default',
  'Rusak Ringan': 'secondary',
  'Rusak Berat': 'destructive',
}

function formatRupiah(v: number): string {
  if (!v) return '-'
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v)
}

interface BuildingRoomCount {
  id: string
  name: string
  _count: { items: number; biliks: number; cabinets: number }
}

interface BuildingData {
  id: string
  name: string
  code: string
  floors: number
  description: string
  // ── Aset fields ──
  condition: string
  acquisitionYear: number | null
  acquisitionPrice: number
  sumberDana: string
  // ── Dimensi fisik ──
  length: number
  width: number
  height: number
  area: number
  volume: number
  landArea: number
  // ── Metadata aset ──
  registrationNumber: string
  documentNumber: string
  responsiblePerson: string
  usefulLife: number | null
  notes: string
  createdAt: string
  rooms: BuildingRoomCount[]
  _count: { rooms: number }
}

interface FormData {
  name: string
  code: string
  floors: number | string
  description: string
  condition: string
  acquisitionYear: number | string
  acquisitionPrice: number | string
  sumberDana: string
  length: number | string
  width: number | string
  height: number | string
  area: number | string
  volume: number | string
  landArea: number | string
  registrationNumber: string
  documentNumber: string
  responsiblePerson: string
  usefulLife: number | string
  notes: string
}

const emptyForm: FormData = {
  name: '',
  code: '',
  floors: 1,
  description: '',
  condition: 'Baik',
  acquisitionYear: '',
  acquisitionPrice: 0,
  sumberDana: '',
  length: 0,
  width: 0,
  height: 0,
  area: 0,
  volume: 0,
  landArea: 0,
  registrationNumber: '',
  documentNumber: '',
  responsiblePerson: '',
  usefulLife: '',
  notes: '',
}

export function BuildingsPage() {
  const { toast } = useToast()
  const [buildings, setBuildings] = useState<BuildingData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<BuildingData | null>(null)
  const [formData, setFormData] = useState<FormData>({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  const [printDialogOpen, setPrintDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [deleting, setDeleting] = useState(false)

  const fetchBuildings = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/inventory/buildings')
      if (!res.ok) throw new Error('Gagal')
      const data = await res.json()
      setBuildings(data)
    } catch {
      toast({ title: 'Error', description: 'Gagal mengambil data gedung', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchBuildings() }, [fetchBuildings])

  function openAddDialog() {
    setEditing(null)
    setFormData({ ...emptyForm })
    setDialogOpen(true)
  }

  function openEditDialog(b: BuildingData) {
    setEditing(b)
    setFormData({
      name: b.name,
      code: b.code,
      floors: b.floors,
      description: b.description,
      condition: b.condition || 'Baik',
      acquisitionYear: b.acquisitionYear ?? '',
      acquisitionPrice: b.acquisitionPrice ?? 0,
      sumberDana: b.sumberDana || '',
      length: b.length ?? 0,
      width: b.width ?? 0,
      height: b.height ?? 0,
      area: b.area ?? 0,
      volume: b.volume ?? 0,
      landArea: b.landArea ?? 0,
      registrationNumber: b.registrationNumber || '',
      documentNumber: b.documentNumber || '',
      responsiblePerson: b.responsiblePerson || '',
      usefulLife: b.usefulLife ?? '',
      notes: b.notes || '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!formData.name.trim()) {
      toast({ title: 'Validasi', description: 'Nama gedung wajib diisi', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim(),
        floors: Number(formData.floors) || 1,
        description: formData.description,
        condition: formData.condition,
        acquisitionYear: formData.acquisitionYear ? Number(formData.acquisitionYear) : null,
        acquisitionPrice: Number(formData.acquisitionPrice) || 0,
        sumberDana: formData.sumberDana,
        length: Number(formData.length) || 0,
        width: Number(formData.width) || 0,
        height: Number(formData.height) || 0,
        area: Number(formData.area) || 0,
        volume: Number(formData.volume) || 0,
        landArea: Number(formData.landArea) || 0,
        registrationNumber: formData.registrationNumber,
        documentNumber: formData.documentNumber,
        responsiblePerson: formData.responsiblePerson,
        usefulLife: formData.usefulLife ? Number(formData.usefulLife) : null,
        notes: formData.notes,
      }
      const url = editing ? `/api/inventory/buildings/${editing.id}` : '/api/inventory/buildings'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: editing ? 'Gedung berhasil diperbarui' : 'Gedung berhasil ditambahkan' })
      setDialogOpen(false)
      fetchBuildings()
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan data gedung', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/inventory/buildings/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: 'Gedung berhasil dihapus' })
      fetchBuildings()
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus gedung', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteId(null)
      setDeleteName('')
    }
  }

  const filtered = buildings.filter((b) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return b.name.toLowerCase().includes(q) || b.code.toLowerCase().includes(q)
  })

  async function handlePrint(_orientation: PrintOrientation = 'portrait') {
    if (filtered.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data gedung untuk dicetak' })
      return
    }

    const rows = filtered
      .map(
        (b, idx) => `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>${b.name}</td>
          <td class="text-center">${b.code || '-'}</td>
          <td class="text-center">${b.floors}</td>
          <td class="text-center">${b._count?.rooms ?? 0}</td>
          <td class="text-center">${b.condition || '-'}</td>
          <td class="text-center">${b.length || 0} × ${b.width || 0} × ${b.height || 0} m</td>
          <td class="text-center">${b.area ? b.area + ' m²' : '-'}</td>
          <td class="text-center">${b.landArea ? b.landArea + ' m²' : '-'}</td>
          <td class="text-center">${b.acquisitionYear || '-'}</td>
          <td class="text-right">${b.acquisitionPrice ? formatRupiahPrint(b.acquisitionPrice) : '-'}</td>
          <td>${b.registrationNumber || '-'}</td>
          <td>${b.responsiblePerson || '-'}</td>
          <td>${b.description || '-'}</td>
        </tr>`
      )
      .join('')

    const contentHtml = `
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Gedung</th>
            <th>Kode</th>
            <th>Lantai</th>
            <th>Ruang</th>
            <th>Keadaan</th>
            <th>P × L × T (m)</th>
            <th>Luas Bangunan</th>
            <th>Luas Tanah</th>
            <th>Tahun</th>
            <th>Nilai Aset</th>
            <th>No. Registrasi</th>
            <th>Penanggung Jawab</th>
            <th>Deskripsi</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div style="margin-top: 12px; font-size: 10pt;">
        <strong>Total: ${filtered.length} gedung</strong>
      </div>`

    await printWithKop('DAFTAR GEDUNG', contentHtml, 'landscape')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gedung</h2>
          <p className="text-muted-foreground">Manajemen data gedung (lokasi tertinggi inventaris)</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setPrintDialogOpen(true)} disabled={loading || filtered.length === 0}>
            <Printer className="size-4 mr-2" />
            Cetak
          </Button>
          <Button onClick={openAddDialog}>
            <Plus className="size-4 mr-2" />
            Tambah Gedung
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="size-5" />
              <div>
                <CardTitle>Data Gedung</CardTitle>
                <CardDescription>Kelola daftar gedung. Setiap gedung memiliki beberapa ruang.</CardDescription>
              </div>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Cari gedung..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Building2 className="size-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">Belum ada data</p>
              <p className="text-sm">{search ? 'Tidak ditemukan gedung yang sesuai' : 'Klik "Tambah Gedung" untuk menambahkan'}</p>
            </div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">No</TableHead>
                    <TableHead>Nama Gedung</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead className="text-center">Lantai</TableHead>
                    <TableHead className="text-center">Jml Ruang</TableHead>
                    <TableHead className="text-center">Keadaan</TableHead>
                    <TableHead className="text-center">Luas Bangunan</TableHead>
                    <TableHead className="text-center">Luas Tanah</TableHead>
                    <TableHead className="text-right">Nilai Aset</TableHead>
                    <TableHead className="max-w-[200px]">Deskripsi</TableHead>
                    <TableHead className="w-[100px]">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((b, idx) => (
                    <TableRow key={b.id}>
                      <TableCell>{idx + 1}</TableCell>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell>{b.code || '-'}</TableCell>
                      <TableCell className="text-center">{b.floors}</TableCell>
                      <TableCell className="text-center">{b._count?.rooms ?? 0}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={conditionBadge[b.condition] || 'secondary'} className="text-xs">{b.condition || 'Baik'}</Badge>
                      </TableCell>
                      <TableCell className="text-center text-xs whitespace-nowrap">
                        {b.area ? `${b.area} m²` : '-'}
                        {b.length || b.width ? <div className="text-[10px] text-muted-foreground">{b.length || 0}×{b.width || 0} m</div> : null}
                      </TableCell>
                      <TableCell className="text-center text-xs whitespace-nowrap">
                        {b.landArea ? `${b.landArea} m²` : '-'}
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {b.acquisitionPrice ? <span className="text-xs">{formatRupiah(b.acquisitionPrice)}</span> : '-'}
                        {b.acquisitionYear && <div className="text-[10px] text-muted-foreground">Th. {b.acquisitionYear}</div>}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate">{b.description || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditDialog(b)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => { setDeleteId(b.id); setDeleteName(b.name) }}>
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

          {/* Info hint */}
          {!loading && buildings.length > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 p-3 text-sm">
              <DoorOpen className="size-4 mt-0.5 shrink-0 text-primary" />
              <p className="text-muted-foreground">
                Setelah membuat gedung, buka tab <span className="font-medium text-foreground">Ruang</span> untuk menambahkan ruangan ke dalam gedung ini.
                Setiap ruang dapat memiliki <span className="font-medium text-foreground">Bilik</span> (opsional) dan <span className="font-medium text-foreground">Lemari</span>.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Gedung' : 'Tambah Gedung'}</DialogTitle>
            <DialogDescription>{editing ? 'Perbarui data gedung' : 'Isi data gedung baru'}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="building-name">Nama Gedung *</Label>
              <Input id="building-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Misal: Gedung Utama, Gedung A" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="building-code">Kode Gedung</Label>
              <Input id="building-code" value={formData.code} onChange={(e) => setFormData({ ...formData, code: e.target.value })} placeholder="Misal: A, GED-A" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="building-floors">Jumlah Lantai</Label>
              <Input id="building-floors" type="number" min={1} value={formData.floors} onChange={(e) => setFormData({ ...formData, floors: e.target.value })} placeholder="1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="building-condition">Keadaan</Label>
              <Select value={formData.condition} onValueChange={(val) => setFormData({ ...formData, condition: val })}>
                <SelectTrigger id="building-condition"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {conditionOptions.map((opt) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="building-year">Tahun Perolehan</Label>
              <Input id="building-year" type="number" min={1900} max={2100} value={formData.acquisitionYear} onChange={(e) => setFormData({ ...formData, acquisitionYear: e.target.value })} placeholder="Misal: 2020" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="building-price">Nilai Perolehan (Rp)</Label>
              <Input id="building-price" type="number" min={0} value={formData.acquisitionPrice} onChange={(e) => setFormData({ ...formData, acquisitionPrice: e.target.value })} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="building-sumber">Sumber Dana</Label>
              <MasterCombobox
                category="sumberDana"
                value={formData.sumberDana}
                onChange={(val) => setFormData({ ...formData, sumberDana: val })}
                placeholder="Pilih sumber dana"
              />
            </div>

            {/* Section: Dimensi Fisik */}
            <div className="sm:col-span-2 mt-2">
              <p className="text-sm font-semibold text-foreground">Dimensi Fisik</p>
              <p className="text-xs text-muted-foreground">Ukuran fisik gedung (meter) dan luas (m²)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="building-length">Panjang (m)</Label>
              <Input id="building-length" type="number" min={0} step="any" value={formData.length} onChange={(e) => setFormData({ ...formData, length: e.target.value })} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="building-width">Lebar (m)</Label>
              <Input id="building-width" type="number" min={0} step="any" value={formData.width} onChange={(e) => setFormData({ ...formData, width: e.target.value })} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="building-height">Tinggi (m)</Label>
              <Input id="building-height" type="number" min={0} step="any" value={formData.height} onChange={(e) => setFormData({ ...formData, height: e.target.value })} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="building-area">Luas Bangunan (m²)</Label>
              <Input id="building-area" type="number" min={0} step="any" value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="building-volume">Volume (m³)</Label>
              <Input id="building-volume" type="number" min={0} step="any" value={formData.volume} onChange={(e) => setFormData({ ...formData, volume: e.target.value })} placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="building-land">Luas Tanah (m²)</Label>
              <Input id="building-land" type="number" min={0} step="any" value={formData.landArea} onChange={(e) => setFormData({ ...formData, landArea: e.target.value })} placeholder="0" />
            </div>

            {/* Section: Metadata Aset */}
            <div className="sm:col-span-2 mt-2">
              <p className="text-sm font-semibold text-foreground">Metadata Aset</p>
              <p className="text-xs text-muted-foreground">Informasi administratif & dokumentasi aset</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="building-reg">No. Registrasi / Kode Aset</Label>
              <Input id="building-reg" value={formData.registrationNumber} onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })} placeholder="Misal: BMD-001/GED-A" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="building-doc">No. Dokumen Perolehan</Label>
              <Input id="building-doc" value={formData.documentNumber} onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })} placeholder="Misal: No. Kontrak/STN" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="building-pj">Penanggung Jawab</Label>
              <Input id="building-pj" value={formData.responsiblePerson} onChange={(e) => setFormData({ ...formData, responsiblePerson: e.target.value })} placeholder="Nama penanggung jawab aset" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="building-life">Masa Manfaat (tahun)</Label>
              <Input id="building-life" type="number" min={0} step={1} value={formData.usefulLife} onChange={(e) => setFormData({ ...formData, usefulLife: e.target.value })} placeholder="Misal: 50" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="building-notes">Catatan</Label>
              <Textarea id="building-notes" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Catatan tambahan (opsional)" rows={2} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="building-desc">Deskripsi</Label>
              <Textarea id="building-desc" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Deskripsi gedung (opsional)" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editing ? 'Simpan Perubahan' : 'Tambah Gedung'}
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
              Apakah Anda yakin ingin menghapus gedung <span className="font-semibold">{deleteName}</span>?
              Ruang di dalam gedung ini tidak akan ikut terhapus, namun keterkaitannya dengan gedung akan dilepas.
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
        title="Cetak Daftar Gedung"
      />
    </div>
  )
}
