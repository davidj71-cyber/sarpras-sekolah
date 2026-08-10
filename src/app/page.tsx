'use client'

import dynamic from 'next/dynamic'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { useNavigationStore } from '@/lib/navigation-store'
import { Separator } from '@/components/ui/separator'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Store, FileText, PackagePlus, DoorOpen, Package, UserCog, Building2 } from 'lucide-react'
import type { StoreSubPage, RoomSubPage } from '@/lib/navigation-store'

// Dynamic imports to reduce initial compilation memory usage
const DashboardPage = dynamic(() => import('@/components/pages/dashboard').then(m => ({ default: m.DashboardPage })), { ssr: false })
const SettingsPage = dynamic(() => import('@/components/pages/settings').then(m => ({ default: m.SettingsPage })), { ssr: false })
const StoresPage = dynamic(() => import('@/components/pages/stores').then(m => ({ default: m.StoresPage })), { ssr: false })
const EmployeesPage = dynamic(() => import('@/components/pages/employees').then(m => ({ default: m.EmployeesPage })), { ssr: false })
const KibPage = dynamic(() => import('@/components/pages/kib').then(m => ({ default: m.KibPage })), { ssr: false })
const RoomsPage = dynamic(() => import('@/components/pages/rooms').then(m => ({ default: m.RoomsPage })), { ssr: false })
const OrdersPage = dynamic(() => import('@/components/pages/orders').then(m => ({ default: m.OrdersPage })), { ssr: false })
const BarangMasukPage = dynamic(() => import('@/components/pages/barang-masuk').then(m => ({ default: m.BarangMasukPage })), { ssr: false })
const RoomItemsPage = dynamic(() => import('@/components/pages/room-items').then(m => ({ default: m.RoomItemsPage })), { ssr: false })
const BuildingsPage = dynamic(() => import('@/components/pages/buildings').then(m => ({ default: m.BuildingsPage })), { ssr: false })
const AccountsPage = dynamic(() => import('@/components/pages/accounts').then(m => ({ default: m.AccountsPage })), { ssr: false })
const LoginPage = dynamic(() => import('@/components/login-page').then(m => ({ default: m.LoginPage })), { ssr: false })

const kibItems = [
  { type: 'A', label: 'KIB A - Tanah' },
  { type: 'B', label: 'KIB B - Peralatan & Mesin' },
  { type: 'C', label: 'KIB C - Gedung & Bangunan' },
  { type: 'D', label: 'KIB D - Jalan, Irigasi & Jaringan' },
  { type: 'E', label: 'KIB E - Aset Tetap Lainnya' },
  { type: 'F', label: 'KIB F - Konstruksi Dalam Pengerjaan' },
]

const storeItems: { key: StoreSubPage; label: string; icon: React.ElementType }[] = [
  { key: 'stores', label: 'Toko', icon: Store },
  { key: 'orders', label: 'Pesanan', icon: FileText },
  { key: 'barangMasuk', label: 'Barang Masuk', icon: PackagePlus },
]

const roomItems: { key: RoomSubPage; label: string; icon: React.ElementType }[] = [
  { key: 'buildings', label: 'Gedung', icon: Building2 },
  { key: 'rooms', label: 'Ruang', icon: DoorOpen },
  { key: 'allItems', label: 'Barang di Ruang', icon: Package },
]

function KibNavbar() {
  const { kibType, setKibType } = useNavigationStore()

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex items-center gap-1">
        {kibItems.map((kib) => (
          <button
            key={kib.type}
            onClick={() => setKibType(kib.type)}
            className={`inline-flex items-center rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all duration-200 ${
              kibType === kib.type
                ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
                : 'text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground'
            }`}
          >
            {kib.label}
          </button>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}

function StoreNavbar() {
  const { storeSubPage, setStoreSubPage } = useNavigationStore()

  return (
    <div className="flex items-center gap-1">
      {storeItems.map((item) => (
        <button
          key={item.key}
          onClick={() => setStoreSubPage(item.key)}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
            storeSubPage === item.key
              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
              : 'text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground'
          }`}
        >
          <item.icon className="size-4" />
          {item.label}
        </button>
      ))}
    </div>
  )
}

function RoomNavbar() {
  const { roomSubPage, setRoomSubPage } = useNavigationStore()

  return (
    <div className="flex items-center gap-1">
      {roomItems.map((item) => (
        <button
          key={item.key}
          onClick={() => setRoomSubPage(item.key)}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
            roomSubPage === item.key
              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
              : 'text-muted-foreground hover:bg-accent/80 hover:text-accent-foreground'
          }`}
        >
          <item.icon className="size-4" />
          {item.label}
        </button>
      ))}
    </div>
  )
}

// Page title map
const pageTitles: Record<string, string> = {
  dashboard: 'Dashboard',
  settings: 'Pengaturan',
  accounts: 'Kelola Akun',
  stores: 'Toko',
  employees: 'Pegawai',
  kib: 'Kartu Inventaris Barang',
  rooms: 'Inventaris',
}

export default function Home() {
  const { currentPage, storeSubPage, roomSubPage, isAuthenticated } = useNavigationStore()

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />
  }

  const showKibNavbar = currentPage === 'kib'
  const showStoreNavbar = currentPage === 'stores'
  const showRoomNavbar = currentPage === 'rooms'

  function renderPage() {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />
      case 'settings':
        return <SettingsPage />
      case 'accounts':
        return <AccountsPage />
      case 'stores':
        switch (storeSubPage) {
          case 'orders':
            return <OrdersPage />
          case 'barangMasuk':
            return <BarangMasukPage />
          default:
            return <StoresPage />
        }
      case 'employees':
        return <EmployeesPage />
      case 'kib':
        return <KibPage />
      case 'rooms':
        switch (roomSubPage) {
          case 'buildings':
            return <BuildingsPage />
          case 'allItems':
            return <RoomItemsPage />
          default:
            return <RoomsPage />
        }
      default:
        return <DashboardPage />
    }
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex shrink-0 flex-col bg-card/80 backdrop-blur-sm border-b supports-[backdrop-filter]:bg-card/60">
          <div className="flex h-14 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 transition-colors" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-2">
              {currentPage === 'accounts' && <UserCog className="size-5 text-primary" />}
              <h1 className="text-lg font-semibold tracking-tight">
                {pageTitles[currentPage] || 'Sarana Prasarana Sekolah'}
              </h1>
            </div>
          </div>
          {showStoreNavbar && (
            <div className="border-t px-4 py-2">
              <StoreNavbar />
            </div>
          )}
          {showKibNavbar && (
            <div className="border-t px-4 py-2">
              <KibNavbar />
            </div>
          )}
          {showRoomNavbar && (
            <div className="border-t px-4 py-2">
              <RoomNavbar />
            </div>
          )}
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          <div className="animate-fade-in-up">
            {renderPage()}
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
