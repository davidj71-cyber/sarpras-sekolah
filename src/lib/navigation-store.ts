import { create } from 'zustand'

export type Page =
  | 'dashboard'
  | 'settings'
  | 'accounts'
  | 'stores'
  | 'employees'
  | 'kib'
  | 'rooms'
  | 'salary'
  | 'media'
  | 'beritaAcara'

export type StoreSubPage = 'stores' | 'orders' | 'barangMasuk' | 'galon'

export type RoomSubPage = 'buildings' | 'rooms' | 'allItems'

interface AuthUser {
  id: string
  name: string
  username: string
  role: string
}

// ─── Role-based access control ────────────────────────────────────────────────
// Roles:
//   - 'admin'     → Operator (admin) — akses semua fitur
//   - 'bendahara' → Bendahara       — akses semua fitur
//   - 'sarpras'   → Sarpras         — TIDAK bisa akses Gaji & Media
//   - 'staff'     → (legacy)        — akses semua fitur (backward compat)
export const roleLabels: Record<string, string> = {
  admin: 'Operator (admin)',
  bendahara: 'Bendahara',
  sarpras: 'Sarpras',
  staff: 'Staff',
}

// Halaman yang DILARANG untuk role tertentu.
// - Sarpras: hanya bisa akses fitur operasional (Dashboard, Toko, Pegawai, KIB,
//   Inventaris). Menu admin (Pengaturan, Kelola Akun) & menu keuangan (Gaji,
//   Media) disembunyikan.
// - Bendahara: bisa akses semua fitur keuangan & operasional (termasuk Gaji &
//   Media), tapi TIDAK bisa akses menu admin (Pengaturan, Kelola Akun) —
//   hanya Operator (admin) yang boleh mengelola pengguna & konfigurasi sistem.
const RESTRICTED_PAGES: Record<Page, string[]> = {
  salary: ['sarpras'],
  media: ['sarpras'],
  settings: ['sarpras', 'bendahara'],
  accounts: ['sarpras', 'bendahara'],
  dashboard: [],
  stores: [],
  employees: [],
  kib: [],
  rooms: [],
  beritaAcara: [],
}

/**
 * Cek apakah role tertentu boleh mengakses halaman tertentu.
 * Returns true jika boleh, false jika diblokir.
 */
export function canAccessPage(role: string | undefined | null, page: Page): boolean {
  if (!role) return true // belum login — biarkan auth flow yang menangani
  const blocked = RESTRICTED_PAGES[page]
  if (!blocked || blocked.length === 0) return true
  return !blocked.includes(role)
}

/**
 * Daftar halaman yang diblokir untuk role tertentu — dipakai sidebar
 * untuk menyembunyikan menu.
 */
export function getBlockedPages(role: string | undefined | null): Page[] {
  if (!role) return []
  return (Object.keys(RESTRICTED_PAGES) as Page[]).filter((p) =>
    RESTRICTED_PAGES[p].includes(role)
  )
}

interface NavigationState {
  currentPage: Page
  kibType: string
  storeSubPage: StoreSubPage
  roomSubPage: RoomSubPage
  selectedRoomId: string | null
  selectedBilikId: string | null
  selectedLemariId: string | null
  // Auth
  authUser: AuthUser | null
  isAuthenticated: boolean
  // Setters
  setPage: (page: Page) => void
  setKibType: (type: string) => void
  setStoreSubPage: (sub: StoreSubPage) => void
  setRoomSubPage: (sub: RoomSubPage) => void
  setSelectedRoomId: (id: string | null) => void
  setSelectedBilikId: (id: string | null) => void
  setSelectedLemariId: (id: string | null) => void
  login: (user: AuthUser) => void
  logout: () => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: 'dashboard',
  kibType: 'B',
  storeSubPage: 'stores',
  roomSubPage: 'buildings',
  selectedRoomId: null,
  selectedBilikId: null,
  selectedLemariId: null,
  authUser: null,
  isAuthenticated: false,
  setPage: (page) => set({ currentPage: page }),
  setKibType: (type) => set({ kibType: type }),
  setStoreSubPage: (sub) => set({ storeSubPage: sub }),
  setRoomSubPage: (sub) => set({ roomSubPage: sub }),
  setSelectedRoomId: (id) => set({ selectedRoomId: id }),
  setSelectedBilikId: (id) => set({ selectedBilikId: id }),
  setSelectedLemariId: (id) => set({ selectedLemariId: id }),
  login: (user) => set({ authUser: user, isAuthenticated: true }),
  logout: () => set({ authUser: null, isAuthenticated: false, currentPage: 'dashboard' }),
}))
