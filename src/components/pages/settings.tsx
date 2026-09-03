'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Settings, Upload, Loader2, X, School, Plus, Trash2, ChevronUp, ChevronDown, UserCheck, Image as ImageIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PageHeader, PageContainer } from '@/components/ui/page-header'
import { PageLoading } from '@/components/ui/loading-skeleton'
import { refreshSchoolBranding } from '@/lib/use-school-branding'
import { resizeImageFile } from '@/lib/resize-image'

// ─── Types ────────────────────────────────────────────────────────────────────

interface KopLine {
  text: string
  style: 'header' | 'detail'  // header = above (font big default), detail = below (font small default)
  bold: boolean
  fontSize: number            // per-line font size in pt
  textTransform: string       // 'none' | 'uppercase' | 'capitalize' | 'lowercase'
}

interface SchoolSettingsData {
  schoolName: string
  npsn: string | null
  address: string | null
  phone: string | null
  email: string | null
  schoolCode: string
  letterUnitCode: string
  barangMasukDocFormat: string
  barangMasukDocPrefix: string
  orderDocFormat: string
  orderDocPrefix: string
  logo: string | null          // KOP surat / letterhead logo
  appLogo: string | null       // application logo (login & sidebar)
  favicon: string | null       // browser tab favicon
  logoWidth: number
  logoHeight: number
  fontFamily: string
  fontSize: number
  isBold: boolean
  textTransform: string
  underlineThickness: number
  underlineWidth: number
  kopLines: KopLine[]
  // Penandatangan laporan (sinkronisasi)
  principalName: string
  principalNip: string
  treasurerName: string
  treasurerNip: string
  goodsManagerName: string
  goodsManagerNip: string
}

const defaultSettings: SchoolSettingsData = {
  schoolName: '',
  npsn: '',
  address: '',
  phone: '',
  email: '',
  schoolCode: '',
  letterUnitCode: 'TU',
  barangMasukDocFormat: '{NOMOR}/{PREFIX}/{KODE_SEKOLAH}-{KODE_UNIT}/{ROMAN}/{TAHUN}',
  barangMasukDocPrefix: 'BM',
  orderDocFormat: '{NOMOR}/{PREFIX}/{KODE_SEKOLAH}-{KODE_UNIT}/{ROMAN}/{TAHUN}',
  orderDocPrefix: 'PB',
  logo: null,
  appLogo: null,
  favicon: null,
  logoWidth: 3.0,
  logoHeight: 3.0,
  fontFamily: 'Times New Roman',
  fontSize: 14,
  isBold: false,
  textTransform: 'none',
  underlineThickness: 1.0,
  underlineWidth: 100.0,
  kopLines: [],
  principalName: '',
  principalNip: '',
  treasurerName: '',
  treasurerNip: '',
  goodsManagerName: '',
  goodsManagerNip: '',
}

const fontOptions = [
  'Times New Roman',
  'Arial',
  'Courier New',
  'Georgia',
  'Verdana',
  'Tahoma',
  'Comic Sans MS',
  'Impact',
  'Trebuchet MS',
  'Palatino Linotype',
]

const CM_TO_PX = 37.8

// ─── Helper: parse kopLines from API response ────────────────────────────────

function parseKopLines(raw: unknown, defaultFontSize: number, defaultTransform: string): KopLine[] {
  if (!raw) return []
  const detailDefaultSize = Math.max(Math.round(defaultFontSize * 0.55), 7)
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed)) return []
    return parsed.map((item: unknown) => {
      // Backward compatibility: if item is a string, treat as detail line with default size
      if (typeof item === 'string') {
        return {
          text: item,
          style: 'detail' as const,
          bold: false,
          fontSize: detailDefaultSize,
          textTransform: 'none',
        }
      }
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>
        const isHeader = obj.style === 'header'
        const transformRaw = typeof obj.textTransform === 'string' ? obj.textTransform : ''
        const validTransform = ['none', 'uppercase', 'capitalize', 'lowercase'].includes(transformRaw)
          ? transformRaw
          : (isHeader ? defaultTransform : 'none')
        const fontSizeNum = typeof obj.fontSize === 'number' ? obj.fontSize : parseFloat(String(obj.fontSize ?? '0'))
        const effectiveFontSize = !isNaN(fontSizeNum) && fontSizeNum > 0
          ? fontSizeNum
          : (isHeader ? defaultFontSize : detailDefaultSize)
        return {
          text: String(obj.text ?? ''),
          style: isHeader ? 'header' as const : 'detail' as const,
          bold: Boolean(obj.bold ?? false),
          fontSize: effectiveFontSize,
          textTransform: validTransform,
        }
      }
      return { text: '', style: 'detail' as const, bold: false, fontSize: detailDefaultSize, textTransform: 'none' }
    })
  } catch {
    return []
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const { toast } = useToast()
  const [settings, setSettings] = useState<SchoolSettingsData>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const appLogoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  // Fetch settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) throw new Error('Gagal mengambil pengaturan')
        const data = await res.json()
        const globalFontSize = data.fontSize ?? 14
        const globalTransform = data.textTransform ?? 'none'
        setSettings({
          schoolName: data.schoolName ?? '',
          npsn: data.npsn ?? '',
          address: data.address ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          schoolCode: data.schoolCode ?? '',
          letterUnitCode: data.letterUnitCode ?? 'TU',
          barangMasukDocFormat: data.barangMasukDocFormat ?? '{NOMOR}/{PREFIX}/{KODE_SEKOLAH}-{KODE_UNIT}/{ROMAN}/{TAHUN}',
          barangMasukDocPrefix: data.barangMasukDocPrefix ?? 'BM',
          orderDocFormat: data.orderDocFormat ?? '{NOMOR}/{PREFIX}/{KODE_SEKOLAH}-{KODE_UNIT}/{ROMAN}/{TAHUN}',
          orderDocPrefix: data.orderDocPrefix ?? 'PB',
          logo: data.logo ?? null,
          appLogo: data.appLogo ?? null,
          favicon: data.favicon ?? null,
          logoWidth: data.logoWidth ?? 3.0,
          logoHeight: data.logoHeight ?? 3.0,
          fontFamily: data.fontFamily ?? 'Times New Roman',
          fontSize: globalFontSize,
          isBold: data.isBold ?? false,
          textTransform: globalTransform,
          underlineThickness: data.underlineThickness ?? 1.0,
          underlineWidth: data.underlineWidth ?? 100.0,
          kopLines: parseKopLines(data.kopLines, globalFontSize, globalTransform),
          principalName: data.principalName ?? '',
          principalNip: data.principalNip ?? '',
          treasurerName: data.treasurerName ?? '',
          treasurerNip: data.treasurerNip ?? '',
          goodsManagerName: data.goodsManagerName ?? '',
          goodsManagerNip: data.goodsManagerNip ?? '',
        })
      } catch {
        toast({
          title: 'Error',
          description: 'Gagal memuat pengaturan sekolah',
          variant: 'destructive',
        })
      } finally {
        setIsLoading(false)
      }
    }
    fetchSettings()
  }, [toast])

  const updateSettings = useCallback(<K extends keyof SchoolSettingsData>(
    key: K,
    value: SchoolSettingsData[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }, [])

  // ─── KOP Lines handlers ────────────────────────────────────────────────────

  const addKopLine = useCallback((style: 'header' | 'detail') => {
    setSettings(prev => {
      const detailDefaultSize = Math.max(Math.round(prev.fontSize * 0.55), 7)
      const newLine: KopLine = {
        text: '',
        style,
        bold: style === 'header',
        fontSize: style === 'header' ? prev.fontSize : detailDefaultSize,
        textTransform: style === 'header' ? prev.textTransform : 'none',
      }
      return { ...prev, kopLines: [...prev.kopLines, newLine] }
    })
  }, [])

  const removeKopLine = useCallback((index: number) => {
    setSettings(prev => ({
      ...prev,
      kopLines: prev.kopLines.filter((_, i) => i !== index),
    }))
  }, [])

  const updateKopLine = useCallback((index: number, field: keyof KopLine, value: string | boolean | number) => {
    setSettings(prev => ({
      ...prev,
      kopLines: prev.kopLines.map((line, i) =>
        i === index ? { ...line, [field]: value } : line
      ),
    }))
  }, [])

  const moveKopLine = useCallback((fromIndex: number, direction: 'up' | 'down') => {
    setSettings(prev => {
      const lines = [...prev.kopLines]
      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1
      if (toIndex < 0 || toIndex >= lines.length) return prev
      const temp = lines[fromIndex]
      lines[fromIndex] = lines[toIndex]
      lines[toIndex] = temp
      return { ...prev, kopLines: lines }
    })
  }, [])

  // ─── Logo handlers ────────────────────────────────────────────────────────

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'File harus berupa gambar', variant: 'destructive' })
      return
    }

    if (file.size > 4 * 1024 * 1024) {
      toast({ title: 'Error', description: 'Ukuran file maksimal 4MB', variant: 'destructive' })
      return
    }

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      updateSettings('logo', base64)
    }
    reader.readAsDataURL(file)
  }, [toast, updateSettings])

  const handleRemoveLogo = useCallback(() => {
    updateSettings('logo', null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [updateSettings])

  // ─── App logo & favicon handlers (max 3 MB input, auto-resized) ───────────

  const MAX_APP_IMAGE_SIZE = 10 * 1024 * 1024 // 10 MB input file limit

  const processImageFile = useCallback(
    async (
      file: File,
      field: 'appLogo' | 'favicon',
      label: string,
      maxDimension: number
    ) => {
      if (!file.type.startsWith('image/')) {
        toast({ title: 'Error', description: `${label} harus berupa gambar`, variant: 'destructive' })
        return
      }
      if (file.size > MAX_APP_IMAGE_SIZE) {
        toast({ title: 'Error', description: `Ukuran ${label} maksimal 3 MB`, variant: 'destructive' })
        return
      }
      try {
        // Resize on the client so the stored base64 payload is small
        // enough to fit within the platform gateway's body-size limit.
        const { dataUrl } = await resizeImageFile(file, maxDimension, 0.9)
        updateSettings(field, dataUrl)
      } catch (err) {
        toast({
          title: 'Error',
          description: err instanceof Error ? err.message : `Gagal memproses ${label}`,
          variant: 'destructive',
        })
      }
    },
    [toast, updateSettings]
  )

  const handleAppLogoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) void processImageFile(file, 'appLogo', 'logo aplikasi', 512)
    },
    [processImageFile]
  )

  const handleFaviconUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) void processImageFile(file, 'favicon', 'favicon', 128)
    },
    [processImageFile]
  )

  const handleRemoveAppLogo = useCallback(() => {
    updateSettings('appLogo', null)
    if (appLogoInputRef.current) appLogoInputRef.current.value = ''
  }, [updateSettings])

  const handleRemoveFavicon = useCallback(() => {
    updateSettings('favicon', null)
    if (faviconInputRef.current) faviconInputRef.current.value = ''
  }, [updateSettings])

  // ─── Save handler ────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        // 413 = body too large (gateway limit). 500 = server error.
        // Give the user a clear, actionable message for each.
        if (res.status === 413) {
          throw new Error('Ukuran data terlalu besar. Logo/favicon akan otomatis dikecilkan saat dipilih — coba pilih ulang gambarnya.')
        }
        let msg = 'Gagal menyimpan pengaturan'
        try {
          const data = await res.json()
          if (data?.error) msg = data.error
        } catch {
          // response wasn't JSON
        }
        throw new Error(msg)
      }
      toast({
        title: 'Berhasil',
        description: 'Pengaturan berhasil disimpan',
      })
      // Refresh the cached branding so login page & sidebar pick up the
      // new app logo / favicon immediately.
      refreshSchoolBranding()
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Gagal menyimpan pengaturan',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }, [settings, toast])

  // Compute text transform style
  const getTextTransform = (transform: string): React.CSSProperties['textTransform'] => {
    switch (transform) {
      case 'uppercase': return 'uppercase'
      case 'capitalize': return 'capitalize'
      case 'lowercase': return 'lowercase'
      default: return 'none'
    }
  }

  // Separate header and detail lines for preview
  const headerLines = settings.kopLines.filter(l => l.style === 'header')
  const detailLines = settings.kopLines.filter(l => l.style === 'detail')

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader
          title="Pengaturan"
          description="Pengaturan sekolah dan KOP surat"
          icon={Settings}
        />
        <PageLoading label="Memuat pengaturan..." />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {/* Page Header */}
      <PageHeader
        title="Pengaturan"
        description="Pengaturan sekolah dan KOP surat"
        icon={Settings}
      />

      {/* Section 1: Informasi Sekolah */}
      <Card className="card-pro">
        <CardHeader>
          <div className="flex items-center gap-2">
            <School className="size-5" />
            <CardTitle>Informasi Sekolah</CardTitle>
          </div>
          <CardDescription>
            Kelola informasi dasar sekolah
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="schoolName">Nama Sekolah</Label>
              <Input
                id="schoolName"
                placeholder="Masukkan nama sekolah"
                value={settings.schoolName}
                onChange={(e) => updateSettings('schoolName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="npsn">NPSN</Label>
              <Input
                id="npsn"
                placeholder="Nomor Pokok Sekolah Nasional"
                value={settings.npsn ?? ''}
                onChange={(e) => updateSettings('npsn', e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Alamat</Label>
            <Textarea
              id="address"
              placeholder="Masukkan alamat sekolah"
              value={settings.address ?? ''}
              onChange={(e) => updateSettings('address', e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">No. Telepon</Label>
              <Input
                id="phone"
                placeholder="Masukkan nomor telepon"
                value={settings.phone ?? ''}
                onChange={(e) => updateSettings('phone', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Masukkan email sekolah"
                value={settings.email ?? ''}
                onChange={(e) => updateSettings('email', e.target.value)}
              />
            </div>
          </div>
          <Separator />
          <div>
            <Label className="text-base font-semibold">Format Nomor Surat Pesanan</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Format: <span className="font-mono bg-muted px-1 py-0.5 rounded">[No]/PB/[Kode Sekolah]-[Kode Unit]/[Bulan Romawi]/[Tahun]</span>
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Contoh: <span className="font-mono bg-muted px-1 py-0.5 rounded">9/PB/SMAN1TLD-TU/XI/2025</span> — Anda hanya perlu memasukkan angka "9", sisanya otomatis.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="schoolCode">Kode Sekolah</Label>
                <Input
                  id="schoolCode"
                  placeholder="Misal: SMAN1TLD"
                  value={settings.schoolCode}
                  onChange={(e) => updateSettings('schoolCode', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="letterUnitCode">Kode Unit</Label>
                <Input
                  id="letterUnitCode"
                  placeholder="Misal: TU"
                  value={settings.letterUnitCode}
                  onChange={(e) => updateSettings('letterUnitCode', e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* ─── Format Nomor Surat Pesanan ─────────────────────────────────── */}
          <div>
            <Label className="text-base font-semibold">Format Nomor Surat Pesanan</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Template nomor surat pesanan barang. Placeholder yang didukung:
              <span className="font-mono bg-muted px-1 py-0.5 rounded mx-1">{`{NOMOR}`}</span>(input user),
              <span className="font-mono bg-muted px-1 py-0.5 rounded mx-1">{`{PREFIX}`}</span>(kode depan),
              <span className="font-mono bg-muted px-1 py-0.5 rounded mx-1">{`{KODE_SEKOLAH}`}</span>,
              <span className="font-mono bg-muted px-1 py-0.5 rounded mx-1">{`{KODE_UNIT}`}</span>,
              <span className="font-mono bg-muted px-1 py-0.5 rounded mx-1">{`{ROMAN}`}</span>(bulan),
              <span className="font-mono bg-muted px-1 py-0.5 rounded mx-1">{`{TAHUN}`}</span>.
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Contoh default: <span className="font-mono bg-muted px-1 py-0.5 rounded">9/PB/SMAN1TLD-TU/XI/2025</span> — Anda hanya input angka "9", sisanya otomatis.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="orderDocPrefix">Kode Depan (Prefix)</Label>
                <Input
                  id="orderDocPrefix"
                  placeholder="PB"
                  value={settings.orderDocPrefix}
                  onChange={(e) => updateSettings('orderDocPrefix', e.target.value.toUpperCase())}
                />
                <p className="text-xs text-muted-foreground">Mis. "PB" (Pesanan Barang), "SP", dll.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderDocFormat">Template Format</Label>
                <Input
                  id="orderDocFormat"
                  placeholder="{NOMOR}/{PREFIX}/{KODE_SEKOLAH}-{KODE_UNIT}/{ROMAN}/{TAHUN}"
                  value={settings.orderDocFormat}
                  onChange={(e) => updateSettings('orderDocFormat', e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Preview: <span className="font-mono">{
                    (settings.orderDocFormat || '{NOMOR}/{PREFIX}/{KODE_SEKOLAH}-{KODE_UNIT}/{ROMAN}/{TAHUN}')
                      .replace(/\{NOMOR\}/g, '9')
                      .replace(/\{PREFIX\}/g, settings.orderDocPrefix || 'PB')
                      .replace(/\{KODE_SEKOLAH\}/g, settings.schoolCode || 'SMAN1TLD')
                      .replace(/\{KODE_UNIT\}/g, settings.letterUnitCode || 'TU')
                      .replace(/\{ROMAN\}/g, 'XI')
                      .replace(/\{TAHUN\}/g, String(new Date().getFullYear()))
                  }</span>
                </p>
              </div>
            </div>
          </div>

          <Separator />

          {/* ─── Format Dokumen Barang Masuk ──────────────────────────────────── */}
          <div>
            <Label className="text-base font-semibold">Format Dokumen Barang Masuk</Label>
            <p className="text-xs text-muted-foreground mt-1 mb-3">
              Template nomor dokumen barang masuk. Placeholder yang didukung:
              <span className="font-mono bg-muted px-1 py-0.5 rounded mx-1">{`{NOMOR}`}</span>(urut 3-digit),
              <span className="font-mono bg-muted px-1 py-0.5 rounded mx-1">{`{PREFIX}`}</span>(kode depan),
              <span className="font-mono bg-muted px-1 py-0.5 rounded mx-1">{`{KODE_SEKOLAH}`}</span>,
              <span className="font-mono bg-muted px-1 py-0.5 rounded mx-1">{`{KODE_UNIT}`}</span>,
              <span className="font-mono bg-muted px-1 py-0.5 rounded mx-1">{`{ROMAN}`}</span>(bulan),
              <span className="font-mono bg-muted px-1 py-0.5 rounded mx-1">{`{TAHUN}`}</span>.
            </p>
            <p className="text-xs text-muted-foreground mb-3">
              Contoh default: <span className="font-mono bg-muted px-1 py-0.5 rounded">001/BM/SMANSATD-TU/IX/2026</span> — Anda hanya input angka nomor, sisanya otomatis.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="barangMasukDocPrefix">Kode Depan (Prefix)</Label>
                <Input
                  id="barangMasukDocPrefix"
                  placeholder="BM"
                  value={settings.barangMasukDocPrefix}
                  onChange={(e) => updateSettings('barangMasukDocPrefix', e.target.value.toUpperCase())}
                />
                <p className="text-xs text-muted-foreground">Mis. "BM" (Barang Masuk), "BRM", dll.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="barangMasukDocFormat">Template Format</Label>
                <Input
                  id="barangMasukDocFormat"
                  placeholder="{NOMOR}/{PREFIX}/{KODE_SEKOLAH}-{KODE_UNIT}/{ROMAN}/{TAHUN}"
                  value={settings.barangMasukDocFormat}
                  onChange={(e) => updateSettings('barangMasukDocFormat', e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Preview: <span className="font-mono">{
                    (settings.barangMasukDocFormat || '{NOMOR}/{PREFIX}/{KODE_SEKOLAH}-{KODE_UNIT}/{ROMAN}/{TAHUN}')
                      .replace(/\{NOMOR\}/g, '001')
                      .replace(/\{PREFIX\}/g, settings.barangMasukDocPrefix || 'BM')
                      .replace(/\{KODE_SEKOLAH\}/g, settings.schoolCode || 'SMANSATD')
                      .replace(/\{KODE_UNIT\}/g, settings.letterUnitCode || 'TU')
                      .replace(/\{ROMAN\}/g, 'IX')
                      .replace(/\{TAHUN\}/g, String(new Date().getFullYear()))
                  }</span>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 1.25: Logo Aplikasi & Favicon */}
      <Card className="card-pro">
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="size-5" />
            <CardTitle>Logo Aplikasi &amp; Favicon</CardTitle>
          </div>
          <CardDescription>
            Logo aplikasi tampil di halaman login &amp; sidebar. Favicon tampil sebagai ikon tab browser. Maksimal 3 MB per file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2">
            {/* Logo Aplikasi */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold">Logo Aplikasi</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Tampil di halaman login &amp; sidebar aplikasi.
                </p>
              </div>
              <input
                ref={appLogoInputRef}
                type="file"
                accept="image/*"
                onChange={handleAppLogoUpload}
                className="hidden"
              />
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appLogoInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="mr-2 size-4" />
                    Pilih Logo Aplikasi
                  </Button>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Maksimal 3 MB. Format: PNG, JPG, SVG, WebP, dll.
                  </p>
                </div>
                {settings.appLogo && (
                  <div className="relative">
                    <div className="flex size-20 items-center justify-center rounded-lg border bg-muted p-1.5">
                      <img
                        src={settings.appLogo}
                        alt="Logo aplikasi"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -right-2 -top-2 size-6"
                      onClick={handleRemoveAppLogo}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Favicon */}
            <div className="space-y-3">
              <div>
                <Label className="text-sm font-semibold">Favicon</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ikon tab browser. Disarankan gambar persegi (contoh: 64×64).
                </p>
              </div>
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/*"
                onChange={handleFaviconUpload}
                className="hidden"
              />
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => faviconInputRef.current?.click()}
                    className="w-full"
                  >
                    <Upload className="mr-2 size-4" />
                    Pilih Favicon
                  </Button>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Maksimal 3 MB. Format: PNG, ICO, SVG, dll.
                  </p>
                </div>
                {settings.favicon && (
                  <div className="relative">
                    <div className="flex size-20 items-center justify-center rounded-lg border bg-muted p-1.5">
                      <img
                        src={settings.favicon}
                        alt="Favicon"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -right-2 -top-2 size-6"
                      onClick={handleRemoveFavicon}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Info box */}
          <div className="mt-5 rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
            <strong>Tips:</strong> Jika favicon tidak diisi, otomatis menggunakan logo aplikasi. Jika logo aplikasi juga tidak diisi, otomatis menggunakan logo KOP surat. Klik <strong>Simpan</strong> setelah mengunggah untuk menerapkan perubahan.
          </div>
        </CardContent>
      </Card>

      {/* Section 1.5: Penandatangan Laporan (Sinkronisasi) */}
      <Card className="card-pro">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserCheck className="size-5" />
            <CardTitle>Penandatangan Laporan</CardTitle>
          </div>
          <CardDescription>
            Nama dan NIP di bawah akan disinkronisasi ke semua pos penandatangan pada hasil cetak laporan di seluruh fitur (Gedung, Ruang, KIB, Pesanan, Barang Masuk, dll).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Kepala Sekolah */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold">Kepala Sekolah</h4>
              <span className="text-xs text-muted-foreground">— Mengetahui / Menyetujui</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="principalName">Nama Lengkap</Label>
                <Input
                  id="principalName"
                  placeholder="Misal: Drs. Budi Santoso, M.M."
                  value={settings.principalName}
                  onChange={(e) => updateSettings('principalName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="principalNip">NIP</Label>
                <Input
                  id="principalNip"
                  placeholder="Misal: 19651210 198803 1 008"
                  value={settings.principalNip}
                  onChange={(e) => updateSettings('principalNip', e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Bendahara */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold">Bendahara</h4>
              <span className="text-xs text-muted-foreground">— Pembuat / Pelaksana</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="treasurerName">Nama Lengkap</Label>
                <Input
                  id="treasurerName"
                  placeholder="Misal: Siti Aminah, S.Pd."
                  value={settings.treasurerName}
                  onChange={(e) => updateSettings('treasurerName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="treasurerNip">NIP</Label>
                <Input
                  id="treasurerNip"
                  placeholder="Misal: 19800315 200501 2 003"
                  value={settings.treasurerNip}
                  onChange={(e) => updateSettings('treasurerNip', e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Pengurus Barang */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold">Pengurus Barang</h4>
              <span className="text-xs text-muted-foreground">— Penyimpan / Pencatat Barang</span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="goodsManagerName">Nama Lengkap</Label>
                <Input
                  id="goodsManagerName"
                  placeholder="Misal: Ahmad Fauzi, S.E."
                  value={settings.goodsManagerName}
                  onChange={(e) => updateSettings('goodsManagerName', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goodsManagerNip">NIP</Label>
                <Input
                  id="goodsManagerNip"
                  placeholder="Misal: 19780420 200801 1 005"
                  value={settings.goodsManagerNip}
                  onChange={(e) => updateSettings('goodsManagerNip', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Info box */}
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            <strong>Catatan sinkronisasi:</strong> Nama dan NIP yang diatur di sini akan otomatis
            muncul di semua hasil cetak laporan. Pastikan data sudah benar sebelum mencetak.
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Pengaturan KOP Sekolah */}
      <Card className="card-pro">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="size-5" />
            <CardTitle>Pengaturan KOP Sekolah</CardTitle>
          </div>
          <CardDescription>
            Konfigurasi tampilan KOP surat dengan pratinjau langsung
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload */}
          <div className="space-y-2">
            <Label>Upload Logo</Label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto"
                >
                  <Upload className="mr-2 size-4" />
                  Pilih File Logo
                </Button>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Maksimal 4MB. Format: JPG, PNG, SVG, dll.
                </p>
              </div>
              {settings.logo && (
                <div className="relative">
                  <div className="flex size-20 items-center justify-center rounded-md border bg-muted p-1">
                    <img
                      src={settings.logo}
                      alt="Logo sekolah"
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute -right-2 -top-2 size-6"
                    onClick={handleRemoveLogo}
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Ukuran Logo */}
          <div className="space-y-2">
            <Label>Ukuran Logo</Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="logoWidth" className="text-xs text-muted-foreground">
                  Lebar (cm)
                </Label>
                <Input
                  id="logoWidth"
                  type="number"
                  min={0.5}
                  max={20}
                  step={0.1}
                  value={settings.logoWidth}
                  onChange={(e) => updateSettings('logoWidth', parseFloat(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="logoHeight" className="text-xs text-muted-foreground">
                  Tinggi (cm)
                </Label>
                <Input
                  id="logoHeight"
                  type="number"
                  min={0.5}
                  max={20}
                  step={0.1}
                  value={settings.logoHeight}
                  onChange={(e) => updateSettings('logoHeight', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Baris Identitas KOP (Dynamic with header/detail types) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label>Baris Identitas KOP</Label>
                <p className="text-xs text-muted-foreground">
                  Baris Header tampil di atas (font besar default), baris Detail tampil di bawah (font kecil default). Ukuran & kapitalisasi tiap baris bisa diatur sendiri.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addKopLine('header')}
                >
                  <Plus className="mr-1 size-4" />
                  Header
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addKopLine('detail')}
                >
                  <Plus className="mr-1 size-4" />
                  Detail
                </Button>
              </div>
            </div>

            {settings.kopLines.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Belum ada baris identitas. Klik &quot;Header&quot; atau &quot;Detail&quot; untuk menambahkan.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Contoh Header: PEMERINTAH PROVINSI..., DINAS PENDIDIKAN, NAMA SEKOLAH
                  <br />
                  Contoh Detail: Alamat, No. Telepon, Email, Website
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {settings.kopLines.map((line, index) => (
                  <div key={index} className="space-y-2 rounded-md border p-2">
                    {/* Row 1: move, style, text, bold, delete */}
                    <div className="flex items-center gap-2">
                      {/* Move buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                          onClick={() => moveKopLine(index, 'up')}
                          disabled={index === 0}
                          title="Pindah ke atas"
                        >
                          <ChevronUp className="size-4" />
                        </button>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
                          onClick={() => moveKopLine(index, 'down')}
                          disabled={index === settings.kopLines.length - 1}
                          title="Pindah ke bawah"
                        >
                          <ChevronDown className="size-4" />
                        </button>
                      </div>

                      {/* Style selector */}
                      <Select
                        value={line.style}
                        onValueChange={(value) => updateKopLine(index, 'style', value)}
                      >
                        <SelectTrigger className="w-[110px] shrink-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="header">
                            <span className="text-xs font-semibold uppercase">Header</span>
                          </SelectItem>
                          <SelectItem value="detail">
                            <span className="text-xs lowercase">Detail</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>

                      {/* Text input */}
                      <Input
                        value={line.text}
                        onChange={(e) => updateKopLine(index, 'text', e.target.value)}
                        placeholder={
                          line.style === 'header'
                            ? 'Contoh: DINAS PENDIDIKAN'
                            : 'Contoh: Jl. Pendidikan No. 1, Jakarta'
                        }
                        className="flex-1"
                      />

                      {/* Bold toggle (mainly for header lines) */}
                      <Button
                        type="button"
                        variant={line.bold ? 'default' : 'outline'}
                        size="icon"
                        className="size-9 shrink-0 font-bold"
                        onClick={() => updateKopLine(index, 'bold', !line.bold)}
                        title={line.bold ? 'Nonaktifkan tebal' : 'Aktifkan tebal'}
                      >
                        B
                      </Button>

                      {/* Delete button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-9 shrink-0 text-destructive hover:text-destructive"
                        onClick={() => removeKopLine(index)}
                        title="Hapus baris"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    {/* Row 2: font size + text transform per line */}
                    <div className="flex flex-wrap items-center gap-3 pl-8 sm:pl-[52px]">
                      <div className="flex items-center gap-1.5">
                        <Label htmlFor={`fs-${index}`} className="text-xs text-muted-foreground whitespace-nowrap">
                          Ukuran
                        </Label>
                        <Input
                          id={`fs-${index}`}
                          type="number"
                          min={6}
                          max={72}
                          step={0.5}
                          value={line.fontSize}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value)
                            if (!isNaN(val)) {
                              updateKopLine(index, 'fontSize', Math.min(72, Math.max(6, val)))
                            }
                          }}
                          className="h-8 w-[72px]"
                        />
                        <span className="text-xs text-muted-foreground">pt</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Label className="text-xs text-muted-foreground whitespace-nowrap">Kapitalisasi</Label>
                        <Select
                          value={line.textTransform}
                          onValueChange={(value) => updateKopLine(index, 'textTransform', value)}
                        >
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Normal</SelectItem>
                            <SelectItem value="uppercase">KAPITAL SEMUA</SelectItem>
                            <SelectItem value="capitalize">Title Case</SelectItem>
                            <SelectItem value="lowercase">kecil semua</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Jenis Huruf */}
          <div className="space-y-2">
            <Label>Jenis Huruf</Label>
            <Select
              value={settings.fontFamily}
              onValueChange={(value) => updateSettings('fontFamily', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih jenis huruf" />
              </SelectTrigger>
              <SelectContent>
                {fontOptions.map((font) => (
                  <SelectItem key={font} value={font}>
                    <span style={{ fontFamily: font }}>{font}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Ukuran Huruf Default */}
          <div className="space-y-2">
            <Label htmlFor="fontSize">Ukuran Huruf Default Baris Header (pt)</Label>
            <Input
              id="fontSize"
              type="number"
              min={8}
              max={72}
              value={settings.fontSize}
              onChange={(e) => {
                const val = parseInt(e.target.value)
                if (!isNaN(val)) {
                  updateSettings('fontSize', Math.min(72, Math.max(8, val)))
                }
              }}
            />
            <p className="text-xs text-muted-foreground">Rentang: 8 - 72 pt. Digunakan sebagai default saat menambah baris Header baru. Baris detail default-nya 55% dari nilai ini. Ukuran tiap baris bisa diatur masing-masing pada editor baris di atas.</p>
          </div>

          <Separator />

          {/* Tebal Garis Bawah */}
          <div className="space-y-2">
            <Label htmlFor="underlineThickness">Tebal Garis Bawah (px)</Label>
            <Input
              id="underlineThickness"
              type="number"
              min={0.5}
              max={5}
              step={0.1}
              value={settings.underlineThickness}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                if (!isNaN(val)) {
                  updateSettings('underlineThickness', Math.min(5, Math.max(0.5, val)))
                }
              }}
            />
            <p className="text-xs text-muted-foreground">Rentang: 0.5 - 5 px</p>
          </div>

          <Separator />

          {/* Lebar Garis Bawah KOP */}
          <div className="space-y-2">
            <Label htmlFor="underlineWidth">Lebar Garis Bawah KOP (%)</Label>
            <Input
              id="underlineWidth"
              type="number"
              min={10}
              max={100}
              step={1}
              value={settings.underlineWidth}
              onChange={(e) => {
                const val = parseFloat(e.target.value)
                if (!isNaN(val)) {
                  updateSettings('underlineWidth', Math.min(100, Math.max(10, val)))
                }
              }}
            />
            <p className="text-xs text-muted-foreground">Rentang: 10 - 100 %</p>
          </div>
        </CardContent>
      </Card>

      {/* Live KOP Preview */}
      <Card className="card-pro">
        <CardHeader>
          <div className="flex items-center gap-2">
            <School className="size-5" />
            <CardTitle>Pratinjau KOP Surat</CardTitle>
          </div>
          <CardDescription>
            Pratinjau langsung tampilan KOP surat sesuai pengaturan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <div
              className="mx-auto bg-white"
              style={{
                width: '210mm',
                minHeight: '80mm',
                padding: '10mm 10mm 10mm 12mm',
                maxWidth: '100%',
              }}
            >
              <div className="flex items-start justify-center gap-2">
                {/* Logo */}
                {settings.logo ? (
                  <div
                    className="shrink-0"
                    style={{
                      width: `${settings.logoWidth * CM_TO_PX}px`,
                      height: `${settings.logoHeight * CM_TO_PX}px`,
                    }}
                  >
                    <img
                      src={settings.logo}
                      alt="Logo"
                      className="size-full object-contain"
                    />
                  </div>
                ) : (
                  <div
                    className="flex shrink-0 items-center justify-center rounded border-2 border-dashed border-gray-300 bg-gray-50"
                    style={{
                      width: `${settings.logoWidth * CM_TO_PX}px`,
                      height: `${settings.logoHeight * CM_TO_PX}px`,
                    }}
                  >
                    <span className="text-xs text-gray-400">Logo</span>
                  </div>
                )}

                {/* KOP Lines - Centered */}
                <div className="flex-1 text-center" style={{ minWidth: 0 }}>
                  {/* Header lines */}
                  {headerLines.filter(l => l.text.trim()).map((line, idx) => (
                    <p
                      key={`h-${idx}`}
                      className="text-black"
                      style={{
                        fontFamily: settings.fontFamily,
                        fontSize: `${line.fontSize}pt`,
                        fontWeight: line.bold ? 'bold' : 'normal',
                        textTransform: getTextTransform(line.textTransform),
                        lineHeight: 1.3,
                        marginTop: idx === 0 ? 0 : '2px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {line.text}
                    </p>
                  ))}

                  {/* Detail lines */}
                  {detailLines.filter(l => l.text.trim()).length > 0 ? (
                    detailLines.filter(l => l.text.trim()).map((line, idx) => (
                      <p
                        key={`d-${idx}`}
                        className="text-black"
                        style={{
                          fontFamily: 'Arial, sans-serif',
                          fontSize: `${line.fontSize}pt`,
                          fontWeight: line.bold ? 'bold' : 'normal',
                          textTransform: getTextTransform(line.textTransform),
                          lineHeight: 1.4,
                          marginTop: idx === 0 ? '4px' : '1px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {line.text}
                      </p>
                    ))
                  ) : (
                    headerLines.filter(l => l.text.trim()).length === 0 && (
                      <p
                        className="mt-2 text-gray-400 italic"
                        style={{
                          fontFamily: 'Arial, sans-serif',
                          fontSize: `${Math.max(Math.round(settings.fontSize * 0.55), 7)}pt`,
                          lineHeight: 1.4,
                        }}
                      >
                        Tambahkan baris Header atau Detail untuk melihat pratinjau KOP
                      </p>
                    )
                  )}
                </div>

                {/* Spacer for logo width on the right to center text */}
                {settings.logo && (
                  <div
                    className="shrink-0"
                    style={{
                      width: `${settings.logoWidth * CM_TO_PX}px`,
                    }}
                  />
                )}
              </div>

              {/* Underline */}
              <div className="mt-3 flex justify-center">
                <div
                  style={{
                    width: `${settings.underlineWidth}%`,
                    height: `${settings.underlineThickness}px`,
                    backgroundColor: 'black',
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="lg"
          className="min-w-[200px]"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Menyimpan...
            </>
          ) : (
            'Simpan Pengaturan'
          )}
        </Button>
      </div>
    </PageContainer>
  )
}
