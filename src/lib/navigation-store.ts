import { create } from 'zustand'

export type Page =
  | 'dashboard'
  | 'settings'
  | 'stores'
  | 'employees'
  | 'kib'
  | 'rooms'
  | 'orders'

interface NavigationState {
  currentPage: Page
  kibType: string
  selectedRoomId: string | null
  selectedBilikId: string | null
  selectedLemariId: string | null
  setPage: (page: Page) => void
  setKibType: (type: string) => void
  setSelectedRoomId: (id: string | null) => void
  setSelectedBilikId: (id: string | null) => void
  setSelectedLemariId: (id: string | null) => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  currentPage: 'dashboard',
  kibType: 'B',
  selectedRoomId: null,
  selectedBilikId: null,
  selectedLemariId: null,
  setPage: (page) => set({ currentPage: page }),
  setKibType: (type) => set({ kibType: type }),
  setSelectedRoomId: (id) => set({ selectedRoomId: id }),
  setSelectedBilikId: (id) => set({ selectedBilikId: id }),
  setSelectedLemariId: (id) => set({ selectedLemariId: id }),
}))
