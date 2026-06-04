import { create } from 'zustand'

export type Page =
  | 'dashboard'
  | 'settings'
  | 'stores'
  | 'employees'
  | 'kib'
  | 'rooms'

export type StoreSubPage = 'stores' | 'orders' | 'barangMasuk'

export type RoomSubPage = 'rooms' | 'allItems'

interface NavigationState {
  currentPage: Page
  kibType: string
  storeSubPage: StoreSubPage
  roomSubPage: RoomSubPage
  selectedRoomId: string | null
  selectedBilikId: string | null
  selectedLemariId: string | null
  setPage: (page: Page) => void
  setKibType: (type: string) => void
  setStoreSubPage: (sub: StoreSubPage) => void
  setRoomSubPage: (sub: RoomSubPage) => void
  setSelectedRoomId: (id: string | null) => void
  setSelectedBilikId: (id: string | null) => void
  setSelectedLemariId: (id: string | null) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: 'dashboard',
  kibType: 'B',
  storeSubPage: 'stores',
  roomSubPage: 'rooms',
  selectedRoomId: null,
  selectedBilikId: null,
  selectedLemariId: null,
  setPage: (page) => set({ currentPage: page }),
  setKibType: (type) => set({ kibType: type }),
  setStoreSubPage: (sub) => set({ storeSubPage: sub }),
  setRoomSubPage: (sub) => set({ roomSubPage: sub }),
  setSelectedRoomId: (id) => set({ selectedRoomId: id }),
  setSelectedBilikId: (id) => set({ selectedBilikId: id }),
  setSelectedLemariId: (id) => set({ selectedLemariId: id }),
}))
