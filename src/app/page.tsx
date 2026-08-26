'use client'

import dynamic from 'next/dynamic'
import { useEffect, useRef } from 'react'
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { useNavigationStore, canAccessPage } from '@/lib/navigation-store'
import { Separator } from '@/components/ui/separator'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { Store, FileText, PackagePlus, DoorOpen, Package, UserCog, Building2, Wallet, Newspaper, Droplet } from 'lucide-react'
import type { StoreSubPage, RoomSubPage } from '@/lib/navigation-store'
import { LoginPage } from '@/components/login-page'
import { PageLoading } from '@/components/ui/loading-skeleton'
import { useToast } from '@/hooks/use-toast'

// Reusable loading skeleton passed to every dynamic import so the user
// sees a structured placeholder while the page chunk downloads instead
// of a blank white area. This single change dramatically reduces the
// perceived loading time on slow connections.
const loadingFallback = () => (
  <div className="flex items-center justify-center py-20">
    <PageLoading label="Memuat halaman..." />
  </div>
)

// Dynamic imports to reduce initial compilation memory usage.
// `ssr: false` keeps heavy client-only code (recharts, dnd-kit, etc.)
// out of the server bundle, while `loading` shows a skeleton during
// chunk download. `preload` (default true in dev) keeps cold navigations
// feeling instant after the first visit.
const DashboardPage = dynamic(() => import('@/components/pages/dashboard').then(m => ({ default: m.DashboardPage })), { ssr: false, loading: loadingFallback })
const SettingsPage = dynamic(() => import('@/components/pages/settings').then(m => ({ default: m.SettingsPage })), { ssr: false, loading: loadingFallback })
const StoresPage = dynamic(() => import('@/components/pages/stores').then(m => ({ default: m.StoresPage })), { ssr: false, loading: loadingFallback })
const EmployeesPage = dynamic(() => import('@/components/pages/employees').then(m => ({ default: m.EmployeesPage })), { ssr: false, loading: loadingFallback })
const KibPage = dynamic(() => import('@/components/pages/kib').then(m => ({ default: m.KibPage })), { ssr: false, loading: loadingFallback })
const RoomsPage = dynamic(() => import('@/components/pages/rooms').then(m => ({ default: m.RoomsPage })), { ssr: false, loading: loadingFallback })
const OrdersPage = dynamic(() => import('@/components/pages/orders').then(m => ({ default: m.OrdersPage })), { ssr: false, loading: loadingFallback })
const BarangMasukPage = dynamic(() => import('@/components/pages/barang-masuk').then(m => ({ default: m.BarangMasukPage })), { ssr: false, loading: loadingFallback })
const GalonPage = dynamic(() => import('@/components/pages/galon').then(m => ({ default: m.GalonPage })), { ssr: false, loading: loadingFallback })
const RoomItemsPage = dynamic(() => import('@/components/pages/room-items').then(m => ({ default: m.RoomItemsPage })), { ssr: false, loading: loadingFallback })
const BuildingsPage = dynamic(() => import('@/components/pages/buildings').then(m => ({ default: m.BuildingsPage })), { ssr: false, loading: loadingFallback })
const AccountsPage = dynamic(() => import('@/components/pages/accounts').then(m => ({ default: m.AccountsPage })), { ssr: false, loading: loadingFallback })
const SalaryPage = dynamic(() => import('@/components/pages/salary').then(m => ({ default: m.SalaryPage })), { ssr: false, loading: loadingFallback })
const MediaPage = dynamic(() => import('@/components/pages/media').then(m => ({ default: m.MediaPage })), { ssr: false, loading: loadingFallback })

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
  { key: 'galon', label: 'Galon', icon: Droplet },
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
  salary: 'Gaji',
  media: 'Media',
}

export default function Home() {
  const { currentPage, storeSubPage, roomSubPage, isAuthenticated, authUser, setPage } = useNavigationStore()
  const { toast } = useToast()
  // Track apakah toast sudah pernah dimunculkan untuk blok ini — hindari
  // spam toast saat React re-render.
  const warnedRef = useRef<string | null>(null)

  // Defense-in-depth: jika user tidak punya akses ke halaman saat ini
  // (mis. Sarpras mencoba buka Gaji/Media), paksa redirect ke dashboard.
  useEffect(() => {
    if (!isAuthenticated || !authUser) return
    if (!canAccessPage(authUser.role, currentPage)) {
      // Hindari toast duplikat untuk kombinasi role+page yang sama.
      const key = `${authUser.role}:${currentPage}`
      if (warnedRef.current !== key) {
        warnedRef.current = key
        toast({
          title: 'Akses Dibatasi',
          description: `Role "${authUser.role}" tidak dapat mengakses fitur ${currentPage}. Anda dialihkan ke Dashboard.`,
          variant: 'destructive',
        })
      }
      setPage('dashboard')
    } else {
      // Reset warning key saat user pindah ke halaman yang valid.
      warnedRef.current = null
    }
  }, [isAuthenticated, authUser, currentPage, setPage, toast])

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />
  }

  // Block render untuk halaman terlarang (defense-in-depth, sebelum
  // redirect effect di atas selesai).
  const hasAccess = !authUser || canAccessPage(authUser.role, currentPage)
  const effectivePage = hasAccess ? currentPage : 'dashboard'

  const showKibNavbar = effectivePage === 'kib'
  const showStoreNavbar = effectivePage === 'stores'
  const showRoomNavbar = effectivePage === 'rooms'

  function renderPage() {
    switch (effectivePage) {
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
          case 'galon':
            return <GalonPage />
          default:
            return <StoresPage />
        }
      case 'employees':
        return <EmployeesPage />
      case 'salary':
        return <SalaryPage />
      case 'media':
        return <MediaPage />
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
        <header className="sticky top-0 z-30 flex shrink-0 flex-col bg-card/80 backdrop-blur-md border-b supports-[backdrop-filter]:bg-card/70">
          <div className="flex h-14 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1 transition-colors" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <div className="flex items-center gap-2 min-w-0">
              {effectivePage === 'accounts' && <UserCog className="size-4.5 text-primary shrink-0" />}
              {effectivePage === 'salary' && <Wallet className="size-4.5 text-primary shrink-0" />}
              {effectivePage === 'media' && <Newspaper className="size-4.5 text-primary shrink-0" />}
              <h1 className="text-base font-semibold tracking-tight truncate">
                {pageTitles[effectivePage] || 'SIMAPRAS'}
              </h1>
            </div>
          </div>
          {showStoreNavbar && (
            <div className="border-t bg-muted/30 px-4 py-2">
              <StoreNavbar />
            </div>
          )}
          {showKibNavbar && (
            <div className="border-t bg-muted/30 px-4 py-2">
              <KibNavbar />
            </div>
          )}
          {showRoomNavbar && (
            <div className="border-t bg-muted/30 px-4 py-2">
              <RoomNavbar />
            </div>
          )}
        </header>
        <main className="flex-1 overflow-auto page-bg">
          <div className="mx-auto max-w-[1600px] p-4 md:p-6 lg:p-8">
            <div className="animate-fade-in-up">
              {renderPage()}
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
