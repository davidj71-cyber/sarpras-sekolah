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
import { Settings, Upload, Loader2, X, School } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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

  const handleLogoUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Error', description: 'File harus berupa gambar', variant: 'destructive' })
      return
    }

    // Validate file size (4MB)
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
                  Lebar (cm) ˄
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
                  Tinggi (cm) ˄
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
            <Label htmlFor="fontSize">Ukuran Huruf (pt)</Label>
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
            <p className="text-xs text-muted-foreground">Rentang: 8 - 72 pt</p>
          </div>

          <Separator />

          {/* Tebal (Bold) */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Tebal (Bold)</Label>
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

                {/* School Info */}
                <div className="flex-1 text-center">
                  <h3
                    className="text-black"
                    style={{
                      fontFamily: settings.fontFamily,
                      fontSize: `${settings.fontSize}pt`,
                      fontWeight: settings.isBold ? 'bold' : 'normal',
                      textTransform: getTextTransform(settings.textTransform),
                      lineHeight: 1.3,
                    }}
                  >
                    {settings.schoolName || 'Nama Sekolah'}
                  </h3>
                  {settings.address && (
                    <p
                      className="mt-1 text-black"
                      style={{
                        fontFamily: settings.fontFamily,
                        fontSize: `${Math.max(settings.fontSize - 4, 8)}pt`,
                        lineHeight: 1.4,
                      }}
                    >
                      {settings.address}
                    </p>
                  )}
                  <p
                    className="mt-0.5 text-black"
                    style={{
                      fontFamily: settings.fontFamily,
                      fontSize: `${Math.max(settings.fontSize - 4, 8)}pt`,
                      lineHeight: 1.4,
                    }}
                  >
                    {[
                      settings.phone && `Telp: ${settings.phone}`,
                      settings.email && `Email: ${settings.email}`,
                    ]
                      .filter(Boolean)
                      .join(' | ')}
                  </p>
                  {settings.npsn && (
                    <p
                      className="mt-0.5 text-black"
                      style={{
                        fontFamily: settings.fontFamily,
                        fontSize: `${Math.max(settings.fontSize - 4, 8)}pt`,
                        lineHeight: 1.4,
                      }}
                    >
                      NPSN: {settings.npsn}
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
