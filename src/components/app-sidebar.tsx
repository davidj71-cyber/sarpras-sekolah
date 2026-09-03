'use client'

import * as React from 'react'
import {
  LayoutDashboard,
  Settings,
  Store,
  Users,
  ClipboardList,
  Archive,
  UserCog,
  LogOut,
  Wallet,
  Newspaper,
  BookOpen,
  FileCheck,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarFooter,
} from '@/components/ui/sidebar'
import { useNavigationStore, type Page, canAccessPage, roleLabels } from '@/lib/navigation-store'
import { useSchoolBranding } from '@/lib/use-school-branding'
import { PanduanDialog } from '@/components/panduan-dialog'

const navItems: {
  page: Page
  label: string
  icon: React.ElementType
}[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'settings', label: 'Pengaturan', icon: Settings },
  { page: 'accounts', label: 'Kelola Akun', icon: UserCog },
  { page: 'stores', label: 'Toko', icon: Store },
  { page: 'employees', label: 'Pegawai', icon: Users },
  { page: 'kib', label: 'KIB', icon: ClipboardList },
  { page: 'rooms', label: 'Inventaris', icon: Archive },
  { page: 'salary', label: 'Gaji', icon: Wallet },
  { page: 'media', label: 'Media', icon: Newspaper },
  { page: 'beritaAcara', label: 'Berita Acara', icon: FileCheck },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { currentPage, setPage, authUser, logout } = useNavigationStore()
  const { appLogoUrl, schoolName } = useSchoolBranding()
  const [panduanOpen, setPanduanOpen] = React.useState(false)
  const brandName = 'SIMAPRAS'
  const brandSubtitle = schoolName?.trim() ? schoolName.trim() : 'Manajemen Sarpras'

  // Filter menu berdasarkan role — Sarpras tidak bisa lihat Gaji & Media.
  const visibleNavItems = authUser
    ? navItems.filter((item) => canAccessPage(authUser.role, item.page))
    : navItems

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={brandName} className="group/header">
              <img
                src={appLogoUrl}
                alt={`${brandName} logo`}
                className="aspect-square size-8 rounded-lg object-contain ring-1 ring-border/40 bg-card p-0.5"
              />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold tracking-tight">{brandName}</span>
                <span className="text-muted-foreground truncate text-xs">{brandSubtitle}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleNavItems.map((item) => (
                <SidebarMenuItem key={item.page}>
                  <SidebarMenuButton
                    isActive={currentPage === item.page}
                    tooltip={item.label}
                    onClick={() => setPage(item.page)}
                    className="transition-all duration-200"
                  >
                    <item.icon className="transition-transform duration-200 group-hover:scale-110" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {authUser && (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" className="group/footer">
                <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  {authUser.role === 'admin' || authUser.role === 'bendahara'
                    ? <UserCog className="size-4" />
                    : <Users className="size-4" />}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{authUser.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{roleLabels[authUser.role] || authUser.role}</span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Panduan Penggunaan"
                onClick={() => setPanduanOpen(true)}
                className="text-muted-foreground hover:text-foreground"
              >
                <BookOpen className="size-4" />
                <span className="text-sm">Panduan</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                tooltip="Keluar"
                onClick={logout}
                className="text-muted-foreground hover:text-destructive"
              >
                <LogOut className="size-4" />
                <span className="text-sm">Keluar</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
      <SidebarRail />
      <PanduanDialog open={panduanOpen} onOpenChange={setPanduanOpen} />
    </Sidebar>
  )
}
