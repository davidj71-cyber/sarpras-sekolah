'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Settings, Upload, Loader2, X, School, Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

// ─── Types ────────────────────────────────────────────────────────────────────

interface KopLine {
  text: string
  style: 'header' | 'detail'  // header = big font (above school name), detail = small font (below school name)
  bold: boolean
}

interface SchoolSettingsData {
  schoolName: string
  npsn: string | null
  address: string | null
  phone: string | null
  email: string | null
  logo: string | null
  logoWidth: number
  logoHeight: number
  fontFamily: string
  fontSize: number
  isBold: boolean
  textTransform: string
  underlineThickness: number
  underlineWidth: number
  kopLines: KopLine[]
}

const defaultSettings: SchoolSettingsData = {
  schoolName: '',
  npsn: '',
  address: '',
  phone: '',
  email: '',
  logo: null,
  logoWidth: 3.0,
  logoHeight: 3.0,
  fontFamily: 'Times New Roman',
  fontSize: 14,
  isBold: false,
  textTransform: 'none',
  underlineThickness: 1.0,
  underlineWidth: 100.0,
  kopLines: [],
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

function parseKopLines(raw: unknown): KopLine[] {
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed)) return []
    return parsed.map((item: unknown) => {
      // Backward compatibility: if item is a string, treat as detail line
      if (typeof item === 'string') {
        return { text: item, style: 'detail' as const, bold: false }
      }
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>
        return {
          text: String(obj.text ?? ''),
          style: (obj.style === 'header' ? 'header' : 'detail') as 'header' | 'detail',
          bold: Boolean(obj.bold ?? false),
        }
      }
      return { text: '', style: 'detail' as const, bold: false }
    }).filter((l: KopLine) => l.text.trim() !== '' || true) // keep empty lines for editing
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

  // Fetch settings on mount
  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/settings')
        if (!res.ok) throw new Error('Gagal mengambil pengaturan')
        const data = await res.json()
        setSettings({
          schoolName: data.schoolName ?? '',
          npsn: data.npsn ?? '',
          address: data.address ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          logo: data.logo ?? null,
          logoWidth: data.logoWidth ?? 3.0,
          logoHeight: data.logoHeight ?? 3.0,
          fontFamily: data.fontFamily ?? 'Times New Roman',
          fontSize: data.fontSize ?? 14,
          isBold: data.isBold ?? false,
          textTransform: data.textTransform ?? 'none',
          underlineThickness: data.underlineThickness ?? 1.0,
          underlineWidth: data.underlineWidth ?? 100.0,
          kopLines: parseKopLines(data.kopLines),
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
    setSettings(prev => ({
      ...prev,
      kopLines: [...prev.kopLines, { text: '', style, bold: style === 'header' }],
    }))
  }, [])

  const removeKopLine = useCallback((index: number) => {
    setSettings(prev => ({
      ...prev,
      kopLines: prev.kopLines.filter((_, i) => i !== index),
    }))
  }, [])

  const updateKopLine = useCallback((index: number, field: keyof KopLine, value: string | boolean) => {
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

  // ─── Save handler ────────────────────────────────────────────────────────

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) throw new Error('Gagal menyimpan pengaturan')
      toast({
        title: 'Berhasil',
        description: 'Pengaturan berhasil disimpan',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'Gagal menyimpan pengaturan',
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
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pengaturan</h2>
          <p className="text-muted-foreground">Pengaturan sekolah dan KOP surat</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Pengaturan</h2>
        <p className="text-muted-foreground">Pengaturan sekolah dan KOP surat</p>
      </div>

      {/* Section 1: Informasi Sekolah */}
      <Card>
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
        </CardContent>
      </Card>

      {/* Section 2: Pengaturan KOP Sekolah */}
      <Card>
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
                  Baris Header tampil di atas nama sekolah (font besar), baris Detail tampil di bawah (font kecil)
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
                  Contoh Header: PEMERINTAH PROVINSI..., DINAS PENDIDIKAN
                  <br />
                  Contoh Detail: Alamat, No. Telepon, Email, Website
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {settings.kopLines.map((line, index) => (
                  <div key={index} className="flex items-center gap-2 rounded-md border p-2">
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

          {/* Ukuran Huruf */}
          <div className="space-y-2">
            <Label htmlFor="fontSize">Ukuran Huruf Nama Sekolah (pt)</Label>
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
            <p className="text-xs text-muted-foreground">Rentang: 8 - 72 pt. Baris header otomatis menggunakan ukuran ini. Baris detail menggunakan ukuran yang lebih kecil.</p>
          </div>

          <Separator />

          {/* Tebal (Bold) */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Tebal Nama Sekolah (Bold)</Label>
              <p className="text-xs text-muted-foreground">Aktifkan teks tebal pada nama sekolah</p>
            </div>
            <Switch
              checked={settings.isBold}
              onCheckedChange={(checked) => updateSettings('isBold', checked)}
            />
          </div>

          <Separator />

          {/* Kapitalisasi Huruf */}
          <div className="space-y-3">
            <Label>Kapitalisasi Huruf</Label>
            <RadioGroup
              value={settings.textTransform}
              onValueChange={(value) => updateSettings('textTransform', value)}
              className="grid gap-2 sm:grid-cols-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="transform-none" />
                <Label htmlFor="transform-none" className="cursor-pointer font-normal">Normal</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="uppercase" id="transform-uppercase" />
                <Label htmlFor="transform-uppercase" className="cursor-pointer font-normal">Huruf Kapital</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="capitalize" id="transform-capitalize" />
                <Label htmlFor="transform-capitalize" className="cursor-pointer font-normal">Huruf Besar Per Kata</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="lowercase" id="transform-lowercase" />
                <Label htmlFor="transform-lowercase" className="cursor-pointer font-normal">Huruf Kecil</Label>
              </div>
            </RadioGroup>
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
      <Card>
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
                padding: '15mm 20mm 10mm',
                maxWidth: '100%',
              }}
            >
              <div className="flex items-start gap-4">
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

                {/* School Info - Centered */}
                <div className="flex-1 text-center">
                  {/* Header lines (above school name) */}
                  {headerLines.filter(l => l.text.trim()).map((line, idx) => (
                    <p
                      key={`h-${idx}`}
                      className="text-black"
                      style={{
                        fontFamily: settings.fontFamily,
                        fontSize: `${settings.fontSize}pt`,
                        fontWeight: line.bold ? 'bold' : 'normal',
                        textTransform: getTextTransform(settings.textTransform),
                        lineHeight: 1.3,
                        marginTop: idx === 0 ? 0 : '2px',
                      }}
                    >
                      {line.text}
                    </p>
                  ))}

                  {/* School Name (main) */}
                  <h3
                    className="text-black"
                    style={{
                      fontFamily: settings.fontFamily,
                      fontSize: `${settings.fontSize}pt`,
                      fontWeight: settings.isBold ? 'bold' : 'normal',
                      textTransform: getTextTransform(settings.textTransform),
                      lineHeight: 1.3,
                      marginTop: headerLines.length > 0 ? '2px' : 0,
                    }}
                  >
                    {settings.schoolName || 'Nama Sekolah'}
                  </h3>

                  {/* Detail lines (below school name) */}
                  {detailLines.filter(l => l.text.trim()).length > 0 ? (
                    detailLines.filter(l => l.text.trim()).map((line, idx) => (
                      <p
                        key={`d-${idx}`}
                        className="text-black"
                        style={{
                          fontFamily: 'Arial, sans-serif',
                          fontSize: `${Math.max(Math.round(settings.fontSize * 0.55), 7)}pt`,
                          fontWeight: line.bold ? 'bold' : 'normal',
                          lineHeight: 1.4,
                          marginTop: idx === 0 ? '4px' : '1px',
                        }}
                      >
                        {line.text}
                      </p>
                    ))
                  ) : (
                    <p
                      className="mt-2 text-gray-400 italic"
                      style={{
                        fontFamily: 'Arial, sans-serif',
                        fontSize: `${Math.max(Math.round(settings.fontSize * 0.55), 7)}pt`,
                        lineHeight: 1.4,
                      }}
                    >
                      Baris detail akan tampil di sini
                    </p>
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
    </div>
  )
}
