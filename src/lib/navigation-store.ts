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

export type StoreSubPage = 'stores' | 'orders' | 'barangMasuk'

export type RoomSubPage = 'buildings' | 'rooms' | 'allItems'

interface AuthUser {
  id: string
  name: string
  username: string
  role: string
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
