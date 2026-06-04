'use client'

import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { useNavigationStore } from '@/lib/navigation-store'
import { DashboardPage } from '@/components/pages/dashboard'
import { SettingsPage } from '@/components/pages/settings'
import { StoresPage } from '@/components/pages/stores'
import { EmployeesPage } from '@/components/pages/employees'
import { KibPage } from '@/components/pages/kib'
import { RoomsPage } from '@/components/pages/rooms'
import { OrdersPage } from '@/components/pages/orders'
import { Separator } from '@/components/ui/separator'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'

const kibItems = [
  { type: 'A', label: 'KIB A - Tanah' },
  { type: 'B', label: 'KIB B - Peralatan & Mesin' },
  { type: 'C', label: 'KIB C - Gedung & Bangunan' },
  { type: 'D', label: 'KIB D - Jalan, Irigasi & Jaringan' },
  { type: 'E', label: 'KIB E - Aset Tetap Lainnya' },
  { type: 'F', label: 'KIB F - Konstruksi Dalam Pengerjaan' },
]

function renderPage(page: string) {
  switch (page) {
    case 'dashboard':
      return <DashboardPage />
    case 'settings':
      return <SettingsPage />
    case 'stores':
      return <StoresPage />
    case 'employees':
      return <EmployeesPage />
    case 'kib':
      return <KibPage />
    case 'rooms':
      return <RoomsPage />
    case 'orders':
      return <OrdersPage />
    default:
      return <DashboardPage />
  }
}

function KibNavbar() {
  const { kibType, setKibType } = useNavigationStore()

  return (
    <ScrollArea className="w-full whitespace-nowrap">
      <div className="flex items-center gap-1">
        {kibItems.map((kib) => (
          <button
            key={kib.type}
            onClick={() => setKibType(kib.type)}
            className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              kibType === kib.type
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
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

export default function Home() {
  const { currentPage } = useNavigationStore()
  const showKibNavbar = currentPage === 'kib'

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex shrink-0 flex-col border-b">
          <div className="flex h-14 items-center gap-2 px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <h1 className="text-lg font-semibold">Sarana Prasarana Sekolah</h1>
          </div>
          {showKibNavbar && (
            <div className="border-t px-4 py-2">
              <KibNavbar />
            </div>
          )}
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {renderPage(currentPage)}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
