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
import { useNavigationStore, type Page } from '@/lib/navigation-store'

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
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { currentPage, setPage, authUser, logout } = useNavigationStore()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Sarpras Sekolah" className="group/header">
              <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg shadow-sm transition-shadow group-hover/header:shadow-md">
                <ClipboardList className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold tracking-tight">Sarpras Sekolah</span>
                <span className="text-muted-foreground truncate text-xs">Manajemen Inventaris</span>
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
              {navItems.map((item) => (
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
                  {authUser.role === 'admin' ? <UserCog className="size-4" /> : <Users className="size-4" />}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{authUser.name}</span>
                  <span className="truncate text-xs text-muted-foreground">{authUser.role === 'admin' ? 'Administrator' : 'Staff'}</span>
                </div>
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
    </Sidebar>
  )
}
