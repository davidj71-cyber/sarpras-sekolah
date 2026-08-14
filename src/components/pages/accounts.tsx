'use client'

import { useState, useEffect, useCallback } from 'react'
import { useNavigationStore, roleLabels } from '@/lib/navigation-store'
import { useToast } from '@/hooks/use-toast'
import { toast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  UserCog,
  Eye,
  EyeOff,
  Shield,
  User,
  LogOut,
  Wallet,
  Newspaper,
  Settings,
  Info,
} from 'lucide-react'
import { PageHeader, PageContainer } from '@/components/ui/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { PageLoading } from '@/components/ui/loading-skeleton'

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserData {
  id: string
  name: string
  username: string
  password: string
  role: string
  active: boolean
  createdAt: string
  updatedAt: string
}

interface FormData {
  name: string
  username: string
  password: string
  role: string
  active: boolean
}

const emptyForm: FormData = {
  name: '',
  username: '',
  password: '',
  role: 'bendahara',
  active: true,
}

// Ambil label role dari navigation-store supaya konsisten di seluruh app.
// Fallback untuk role lama (mis. 'staff') yang tidak ada di roleLabels.
function getRoleLabel(role: string): string {
  return roleLabels[role] || role
}

// Ikon untuk badge role di tabel.
function getRoleIcon(role: string) {
  if (role === 'admin' || role === 'bendahara') return Shield
  if (role === 'sarpras') return User
  return User
}

// Variant badge berdasarkan role.
function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'destructive' {
  if (role === 'admin') return 'default'
  if (role === 'bendahara') return 'default'
  if (role === 'sarpras') return 'secondary'
  return 'secondary'
}

// ─── Component ───────────────────────────────────────────────────────────────

export function AccountsPage() {
  const { toast: showToast } = useToast()
  const { authUser, logout } = useNavigationStore()

  const [users, setUsers] = useState<UserData[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [formData, setFormData] = useState<FormData>({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  // Password visibility map
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})
  // Password visibility in form
  const [showFormPassword, setShowFormPassword] = useState(false)

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteName, setDeleteName] = useState('')
  const [deleting, setDeleting] = useState(false)

  // ─── Fetch users ────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/users')
      if (!res.ok) throw new Error('Gagal')
      const data = await res.json()
      setUsers(data)
    } catch {
      showToast({ title: 'Error', description: 'Gagal mengambil data pengguna', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [showToast])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  // ─── Filtered users ──────────────────────────────────────────────────────

  const filteredUsers = users.filter((user) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      user.name.toLowerCase().includes(q) ||
      user.username.toLowerCase().includes(q) ||
      user.role.toLowerCase().includes(q)
    )
  })

  // ─── Dialog handlers ──────────────────────────────────────────────────────

  function openAddDialog() {
    setEditingUser(null)
    setFormData({ ...emptyForm })
    setShowFormPassword(false)
    setDialogOpen(true)
  }

  function openEditDialog(user: UserData) {
    setEditingUser(user)
    setFormData({
      name: user.name,
      username: user.username,
      password: user.password,
      role: user.role,
      active: user.active,
    })
    setShowFormPassword(true)
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!formData.name.trim()) {
      showToast({ title: 'Validasi', description: 'Nama wajib diisi', variant: 'destructive' })
      return
    }
    if (!formData.username.trim()) {
      showToast({ title: 'Validasi', description: 'Username wajib diisi', variant: 'destructive' })
      return
    }
    if (!editingUser && !formData.password.trim()) {
      showToast({ title: 'Validasi', description: 'Password wajib diisi untuk pengguna baru', variant: 'destructive' })
      return
    }
    if (editingUser && !formData.password.trim()) {
      showToast({ title: 'Validasi', description: 'Password tidak boleh kosong', variant: 'destructive' })
      return
    }

    setSaving(true)
    try {
      if (editingUser) {
        const res = await fetch(`/api/users/${editingUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Gagal')
        }
        showToast({ title: 'Berhasil', description: 'Pengguna berhasil diperbarui' })
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Gagal')
        }
        showToast({ title: 'Berhasil', description: 'Pengguna berhasil ditambahkan' })
      }
      setDialogOpen(false)
      fetchUsers()
    } catch (err) {
      showToast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Gagal menyimpan pengguna',
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
      const res = await fetch(`/api/users/${deleteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Gagal')
      showToast({ title: 'Berhasil', description: 'Pengguna berhasil dihapus' })
      fetchUsers()
    } catch {
      showToast({ title: 'Error', description: 'Gagal menghapus pengguna', variant: 'destructive' })
    } finally {
      setDeleting(false)
      setDeleteId(null)
      setDeleteName('')
    }
  }

  function togglePasswordVisibility(userId: string) {
    setVisiblePasswords(prev => ({
      ...prev,
      [userId]: !prev[userId],
    }))
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <PageContainer>
      <PageHeader
        title="Kelola Akun"
        description="Tambah, edit, dan hapus pengguna aplikasi"
        icon={UserCog}
        actions={
          <>
            {authUser && (
              <div className="flex items-center gap-2 mr-2">
                <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5">
                  <div className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    {authUser.role === 'admin' || authUser.role === 'bendahara' ? <Shield className="size-3.5" /> : <User className="size-3.5" />}
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{authUser.name}</span>
                    <span className="text-muted-foreground ml-1">({getRoleLabel(authUser.role)})</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={logout} className="gap-1.5">
                  <LogOut className="size-3.5" />
                  Keluar
                </Button>
              </div>
            )}
            <Button onClick={openAddDialog}>
              <Plus className="size-4 mr-2" />
              Tambah Pengguna
            </Button>
          </>
        }
      />

      {/* Main Card */}
      <Card className="card-pro">
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <UserCog className="size-5" />
              <div>
                <CardTitle>Daftar Pengguna</CardTitle>
                <CardDescription>Kelola akun pengguna yang dapat mengakses aplikasi</CardDescription>
              </div>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input placeholder="Cari pengguna..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Info Pembatasan Akses */}
          <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <div className="flex items-start gap-3">
              <Info className="size-5 text-primary shrink-0 mt-0.5" />
              <div className="text-sm space-y-1.5">
                <p className="font-semibold text-foreground">Pembatasan Akses Berdasarkan Role</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <Shield className="size-3.5 text-primary shrink-0" />
                    <span><strong>Operator (admin)</strong> &amp; <strong>Bendahara</strong> — dapat mengakses semua fitur aplikasi</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <User className="size-3.5 text-muted-foreground shrink-0" />
                    <span><strong>Sarpras</strong> — <span className="text-destructive font-medium">tidak dapat mengakses fitur Gaji, Media, Pengaturan, &amp; Kelola Akun</span> (menu disembunyikan dari sidebar)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          {loading ? (
            <PageLoading label="Memuat data pengguna..." />
          ) : filteredUsers.length === 0 ? (
            <EmptyState
              icon={UserCog}
              title="Belum ada data"
              description={search ? 'Tidak ditemukan pengguna yang sesuai' : 'Klik "Tambah Pengguna" untuk menambahkan'}
            />
          ) : (
            <div className="max-h-[520px] overflow-y-auto rounded-md border">
              <Table className="table-pro">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px] text-left tabular-nums">No</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead>Password</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user, idx) => (
                    <TableRow key={user.id} className="h-14">
                      <TableCell className="tabular-nums text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-2 py-0.5 text-sm tabular-nums">{user.username}</code>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-muted px-2 py-0.5 text-sm font-mono tabular-nums">
                            {visiblePasswords[user.id] ? user.password : '••••••••'}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => togglePasswordVisibility(user.id)}
                            title={visiblePasswords[user.id] ? 'Sembunyikan password' : 'Lihat password'}
                          >
                            {visiblePasswords[user.id] ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)} className="gap-1">
                          {(() => {
                            const Icon = getRoleIcon(user.role)
                            return <Icon className="size-3" />
                          })()}
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.active ? 'default' : 'destructive'}>
                          {user.active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditDialog(user)} title="Edit">
                            <Pencil className="size-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            onClick={() => { setDeleteId(user.id); setDeleteName(user.name) }}
                            title="Hapus"
                          >
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna'}</DialogTitle>
            <DialogDescription>{editingUser ? 'Perbarui data pengguna' : 'Isi data pengguna baru'}</DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 py-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="user-name">Nama Lengkap *</Label>
              <Input
                id="user-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Masukkan nama lengkap"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-username">Username *</Label>
              <Input
                id="user-username"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                placeholder="Username untuk login"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="user-password">Password *</Label>
              <div className="relative">
                <Input
                  id="user-password"
                  type={showFormPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={editingUser ? 'Password saat ini' : 'Password untuk login'}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowFormPassword(!showFormPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showFormPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={formData.role}
                onValueChange={(val) => setFormData(prev => ({ ...prev, role: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="size-3.5" />
                      <span>Operator (admin)</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="bendahara">
                    <div className="flex items-center gap-2">
                      <Shield className="size-3.5" />
                      <span>Bendahara</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="sarpras">
                    <div className="flex items-center gap-2">
                      <User className="size-3.5" />
                      <span>Sarpras</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {formData.role === 'sarpras' && (
                <p className="text-xs text-muted-foreground flex items-center flex-wrap gap-1.5 mt-1">
                  <Wallet className="size-3" />
                  <Newspaper className="size-3" />
                  <Settings className="size-3" />
                  <UserCog className="size-3" />
                  Menu <strong>Gaji</strong>, <strong>Media</strong>, <strong>Pengaturan</strong>, &amp; <strong>Kelola Akun</strong> akan disembunyikan dari sidebar pengguna ini.
                </p>
              )}
            </div>

            {editingUser && (
              <div className="space-y-2 sm:col-span-2">
                <Label>Status</Label>
                <Select
                  value={formData.active ? 'active' : 'inactive'}
                  onValueChange={(val) => setFormData(prev => ({ ...prev, active: val === 'active' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Aktif</SelectItem>
                    <SelectItem value="inactive">Nonaktif</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving && <Loader2 className="size-4 mr-2 animate-spin" />}
              {editingUser ? 'Simpan Perubahan' : 'Tambah Pengguna'}
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
              Apakah Anda yakin ingin menghapus pengguna <span className="font-semibold">{deleteName}</span>? Tindakan ini tidak dapat dibatalkan.
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
    </PageContainer>
  )
}
