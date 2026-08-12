'use client'

import { useState } from 'react'
import { useNavigationStore } from '@/lib/navigation-store'
import { useSchoolBranding } from '@/lib/use-school-branding'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Loader2, Eye, EyeOff } from 'lucide-react'

export function LoginPage() {
  const { login } = useNavigationStore()
  const { appLogoUrl, schoolName, loading } = useSchoolBranding()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loadingState, setLoadingState] = useState(false)
  const [error, setError] = useState('')

  // SIMAPRAS is always the app brand (matches the favicon/tab name).
  // The configured school name, if any, is shown as a subtitle.
  const brandName = 'SIMAPRAS'
  const brandTagline = schoolName?.trim()
    ? schoolName.trim()
    : 'Sistem Informasi Manajemen Sarana Prasarana'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError('Username dan password wajib diisi')
      return
    }

    setLoadingState(true)
    try {
      // Cache-busting: tambahkan timestamp agar gateway/browser tidak cache response lama
      const res = await fetch(`/api/auth?_t=${Date.now()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store',
        },
        cache: 'no-store',
        body: JSON.stringify({ username: username.trim(), password: password.trim() }),
      })

      // Handle response non-JSON (mis. gateway/proxy error)
      const contentType = res.headers.get('content-type') || ''
      if (!contentType.includes('application/json')) {
        setError(`Terjadi kesalahan koneksi (HTTP ${res.status}). Silakan coba lagi.`)
        return
      }

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login gagal')
        return
      }

      login({
        id: data.id,
        name: data.name,
        username: data.username,
        role: data.role,
      })
    } catch (err) {
      setError('Terjadi kesalahan jaringan. Periksa koneksi dan coba lagi.')
      console.error('Login fetch error:', err)
    } finally {
      setLoadingState(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md shadow-xl border-border/50">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="flex justify-center">
            <img
              src={appLogoUrl}
              alt={`${brandName} logo`}
              className="size-20 rounded-2xl object-contain shadow-lg shadow-primary/10 ring-1 ring-border/40 bg-card p-1.5"
            />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-tight">{brandName}</CardTitle>
            <CardDescription className="mt-1">
              {loading ? 'Memuat...' : brandTagline}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Masukkan username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loadingState}
                autoComplete="username"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loadingState}
                  autoComplete="current-password"
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11 text-base" disabled={loadingState}>
              {loadingState ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Masuk...
                </>
              ) : (
                'Masuk'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
