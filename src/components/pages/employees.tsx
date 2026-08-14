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
  Users,
  Printer,
  FileSpreadsheet,
} from 'lucide-react'
import { printWithKop } from '@/lib/print-utils'
import type { PrintOrientation } from '@/lib/print-utils'
import { exportToExcel, getSchoolMeta } from '@/lib/export-excel'
import { PrintDialog } from '@/components/print-dialog'
import { PageHeader, PageContainer } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { PageLoading } from '@/components/ui/loading-skeleton'

interface EmployeeData {
  id: string
  name: string
  nip: string
  position: string
  department: string
  phone: string
  address: string
  createdAt: string
  updatedAt: string
}

interface FormData {
  name: string
  nip: string
  position: string
  department: string
  phone: string
  address: string
}

const emptyForm: FormData = {
  name: '',
  nip: '',
  position: '',
  department: '',
  phone: '',
  address: '',
}

export function EmployeesPage() {
  const { toast } = useToast()
  const [employees, setEmployees] = useState<EmployeeData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeData | null>(null)
  const [formData, setFormData] = useState<FormData>({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [printDialogOpen, setPrintDialogOpen] = useState(false)

  const fetchEmployees = useCallback(async (opts?: { silent?: boolean }) => {
    // Silent mode: skip full-page loading spinner for background refreshes.
    if (!opts?.silent) setLoading(true)
    try {
      const res = await fetch('/api/employees')
      if (!res.ok) throw new Error('Gagal')
      const data = await res.json()
      setEmployees(data)
    } catch {
      toast({ title: 'Error', description: 'Gagal mengambil data pegawai', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchEmployees() }, [fetchEmployees])

  function openAddDialog() {
    setEditingEmployee(null)
    setFormData({ ...emptyForm })
    setDialogOpen(true)
  }

  function openEditDialog(emp: EmployeeData) {
    setEditingEmployee(emp)
    setFormData({
      name: emp.name,
      nip: emp.nip,
      position: emp.position,
      department: emp.department,
      phone: emp.phone,
      address: emp.address,
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!formData.name.trim()) {
      toast({ title: 'Validasi', description: 'Nama pegawai wajib diisi', variant: 'destructive' })
      return
    }
    setSaving(true)
    try {
      const url = editingEmployee ? `/api/employees/${editingEmployee.id}` : '/api/employees'
      const method = editingEmployee ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: editingEmployee ? 'Pegawai berhasil diperbarui' : 'Pegawai berhasil ditambahkan' })
      setDialogOpen(false)
      fetchEmployees({ silent: true })
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan data pegawai', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!deleteId) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/employees/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal')
      toast({ title: 'Berhasil', description: 'Pegawai berhasil dihapus' })
      fetchEmployees({ silent: true })
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus pegawai', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteId(null)
      setDeleteName('')
    }
  }

  const filteredEmployees = employees.filter((e) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return e.name.toLowerCase().includes(q) || e.nip.toLowerCase().includes(q) || e.position.toLowerCase().includes(q) || e.department.toLowerCase().includes(q)
  })

  async function handlePrint(orientation: PrintOrientation = 'portrait') {
    if (filteredEmployees.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data pegawai untuk dicetak' })
      return
    }

    const rows = filteredEmployees.map((emp, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td>${emp.name || '-'}</td>
        <td class="text-center">${emp.nip || '-'}</td>
        <td>${emp.position || '-'}</td>
        <td>${emp.department || '-'}</td>
        <td class="text-center">${emp.phone || '-'}</td>
        <td>${emp.address || '-'}</td>
      </tr>
    `).join('')

    const contentHtml = `
      <table>
        <thead>
          <tr>
            <th style="width: 40px;">No</th>
            <th>Nama</th>
            <th style="width: 120px;">NIP</th>
            <th>Jabatan</th>
            <th>Unit Kerja</th>
            <th style="width: 100px;">No HP</th>
            <th>Alamat</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div style="margin-top: 12px; font-size: 10pt;">
        <strong>Total Pegawai: ${filteredEmployees.length} orang</strong>
      </div>
    `

    await printWithKop('DAFTAR PEGAWAI', contentHtml, orientation, { appendSignature: true })
  }

  async function handleExportExcel() {
    if (filteredEmployees.length === 0) {
      toast({ title: 'Info', description: 'Tidak ada data pegawai untuk diekspor' })
      return
    }
    try {
      const meta = await getSchoolMeta()
      meta.push({ label: 'Total Pegawai', value: `${filteredEmployees.length} orang` })
      await exportToExcel({
        filename: 'Daftar_Pegawai.xlsx',
        sheetName: 'Daftar Pegawai',
        title: 'DAFTAR PEGAWAI',
        meta,
        columns: [
          { header: 'No', key: (e) => String(filteredEmployees.indexOf(e) + 1), width: 6 },
          { header: 'Nama', key: 'name', width: 26 },
          { header: 'NIP', key: (e) => e.nip || '-', width: 22 },
          { header: 'Jabatan', key: (e) => e.position || '-', width: 20 },
          { header: 'Unit Kerja', key: (e) => e.department || '-', width: 20 },
          { header: 'No HP', key: (e) => e.phone || '-', width: 14 },
          { header: 'Alamat', key: (e) => e.address || '-', width: 36 },
        ],
        data: filteredEmployees,
      })
      toast({ title: 'Berhasil', description: 'Data pegawai berhasil diekspor ke Excel' })
    } catch {
      toast({ title: 'Error', description: 'Gagal mengekspor data ke Excel', variant: 'destructive' })
    }
  }

  return (
    <PageContainer>
      <PageHeader
        title="Pegawai"
        description="Manajemen data pegawai sekolah"
        icon={Users}
        actions={
          <>
            <Button variant="outline" onClick={() => setPrintDialogOpen(true)} disabled={loading || filteredEmployees.length === 0}>
              <Printer className="size-4 mr-2" />
              Cetak
            </Button>
            <Button variant="outline" onClick={handleExportExcel} disabled={loading || filteredEmployees.length === 0}>
              <FileSpreadsheet className="size-4 mr-2" />
              Export Excel
            </Button>
            <Button onClick={openAddDialog}>
              <Plus className="size-4 mr-2" />
              Tambah Pegawai
            </Button>
          </>
        }
      />

      <Card className="card-pro">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Users className="size-5" />
              <div>
                <CardTitle>Data Pegawai</CardTitle>
                <CardDescription>Kelola daftar pegawai dan penanggung jawab</CardDescription>
              </div>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Cari pegawai..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <PageLoading label="Memuat data pegawai..." />
          ) : filteredEmployees.length === 0 ? (
            <EmptyState
              icon={Users}
              title="Belum ada data"
              description={search ? 'Tidak ditemukan pegawai yang sesuai' : 'Klik "Tambah Pegawai" untuk menambahkan'}
            />
          ) : (
            <div className="max-h-[520px] overflow-y-auto rounded-md border">
              <Table className="table-pro">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px] text-left">Aksi</TableHead>
                    <TableHead className="w-[50px] text-left tabular-nums">No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead className="whitespace-nowrap tabular-nums">NIP</TableHead>
                    <TableHead>Jabatan</TableHead>
                    <TableHead>Unit Kerja</TableHead>
                    <TableHead className="whitespace-nowrap tabular-nums">No HP</TableHead>
                    <TableHead>Alamat</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map((emp, idx) => (
                    <TableRow key={emp.id} className="h-14">
                      <TableCell>
                        <div className="flex items-center justify-start gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditDialog(emp)}>
                            <Pencil className="size-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-destructive hover:text-destructive" onClick={() => { setDeleteId(emp.id); setDeleteName(emp.name) }}>
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{emp.nip || '-'}</TableCell>
                      <TableCell>{emp.position || '-'}</TableCell>
                      <TableCell>{emp.department || '-'}</TableCell>
                      <TableCell className="whitespace-nowrap tabular-nums text-muted-foreground">{emp.phone || '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-muted-foreground">{emp.address || '-'}</TableCell>
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
            <DialogTitle>{editingEmployee ? 'Edit Pegawai' : 'Tambah Pegawai'}</DialogTitle>
            <DialogDescription>{editingEmployee ? 'Perbarui data pegawai' : 'Isi data pegawai baru'}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="emp-name">Nama Pegawai *</Label>
              <Input id="emp-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Masukkan nama pegawai" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nip">NIP</Label>
              <Input id="nip" value={formData.nip} onChange={(e) => setFormData({ ...formData, nip: e.target.value })} placeholder="Nomor Induk Pegawai" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">Jabatan</Label>
              <MasterCombobox
                category="jabatan"
                value={formData.position}
                onChange={(val) => setFormData({ ...formData, position: val })}
                placeholder="Jabatan"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="department">Unit Kerja</Label>
              <MasterCombobox
                category="unitKerja"
                value={formData.department}
                onChange={(val) => setFormData({ ...formData, department: val })}
                placeholder="Unit kerja"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emp-phone">No HP</Label>
              <Input id="emp-phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="No HP" />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="emp-address">Alamat</Label>
              <Textarea id="emp-address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder="Alamat pegawai" rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingEmployee ? 'Simpan Perubahan' : 'Tambah Pegawai'}
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
              Apakah Anda yakin ingin menghapus pegawai <span className="font-semibold">{deleteName}</span>? Tindakan ini tidak dapat dibatalkan.
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
        title="Cetak Daftar Pegawai"
      />
    </PageContainer>
  )
}
