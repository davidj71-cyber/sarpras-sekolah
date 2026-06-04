'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Store, Users, DoorOpen, ClipboardList } from 'lucide-react'

interface DashboardStats {
  totalStores: number
  totalEmployees: number
  totalRooms: number
  totalItems: number
}

export function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStores: 0,
    totalEmployees: 0,
    totalRooms: 0,
    totalItems: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch {
        // silently fail - dashboard shows 0s
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const statCards = [
    {
      title: 'Total Toko',
      value: stats.totalStores,
      icon: Store,
      description: 'Toko terdaftar',
    },
    {
      title: 'Total Pegawai',
      value: stats.totalEmployees,
      icon: Users,
      description: 'Pegawai terdaftar',
    },
    {
      title: 'Total Ruang',
      value: stats.totalRooms,
      icon: DoorOpen,
      description: 'Ruang terdaftar',
    },
    {
      title: 'Total Barang',
      value: stats.totalItems,
      icon: ClipboardList,
      description: 'Barang inventaris',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Ringkasan data Sarana Prasarana Sekolah
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <card.icon className="text-muted-foreground size-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loading ? '...' : card.value.toLocaleString('id-ID')}
              </div>
              <p className="text-muted-foreground text-xs">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
