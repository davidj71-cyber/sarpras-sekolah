'use client'

import * as React from 'react'
import {
  LayoutDashboard,
  Settings,
  Store,
  Users,
  ClipboardList,
  DoorOpen,
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
} from '@/components/ui/sidebar'
import { useNavigationStore, type Page } from '@/lib/navigation-store'

const navItems: {
  page: Page
  label: string
  icon: React.ElementType
}[] = [
  { page: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { page: 'settings', label: 'Pengaturan', icon: Settings },
  { page: 'stores', label: 'Toko', icon: Store },
  { page: 'employees', label: 'Pegawai', icon: Users },
  { page: 'kib', label: 'KIB', icon: ClipboardList },
  { page: 'rooms', label: 'Ruang', icon: DoorOpen },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { currentPage, setPage } = useNavigationStore()

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Sarpras Sekolah">
              <div className="bg-primary text-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                <ClipboardList className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">Sarpras Sekolah</span>
                <span className="text-muted-foreground truncate text-xs">Manajemen Inventaris</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.page}>
                  <SidebarMenuButton
                    isActive={currentPage === item.page}
                    tooltip={item.label}
                    onClick={() => setPage(item.page)}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
