// ─── Shared Print Utilities ────────────────────────────────────────────────────
// Provides KOP surat generation and common print styling for all print features.

interface KopLine {
  text: string
  style: 'header' | 'detail'
  bold: boolean
}

interface PrintSettings {
  schoolName: string
  logo: string | null
  logoWidth: number
  logoHeight: number
  fontFamily: string
  fontSize: number
  isBold: boolean
  textTransform: string
  underlineThickness: number
  underlineWidth: number
  address: string | null
  phone: string | null
  email: string | null
  npsn: string | null
  kopLines: string | KopLine[]
}

// ─── Parse kopLines from API response ─────────────────────────────────────────

export function parseKopLines(raw: unknown): KopLine[] {
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed)) return []
    return parsed.map((item: unknown) => {
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
    })
  } catch {
    return []
  }
}

// ─── Fetch settings for print ─────────────────────────────────────────────────

export async function fetchPrintSettings(): Promise<PrintSettings> {
  try {
    const res = await fetch('/api/settings')
    if (!res.ok) throw new Error('Gagal')
    return await res.json()
  } catch {
    return {
      schoolName: '',
      logo: null,
      logoWidth: 3,
      logoHeight: 3,
      fontFamily: 'Times New Roman',
      fontSize: 14,
      isBold: false,
      textTransform: 'none',
      underlineThickness: 1,
      underlineWidth: 100,
      address: null,
      phone: null,
      email: null,
      npsn: null,
      kopLines: [],
    }
  }
}

// ─── Build KOP HTML ───────────────────────────────────────────────────────────

export function buildKopHtml(settings: PrintSettings): string {
  const kopLines = parseKopLines(settings.kopLines)
  const headerLines = kopLines.filter(l => l.style === 'header' && l.text.trim())
  const detailLines = kopLines.filter(l => l.style === 'detail' && l.text.trim())

  const cmToPx = 37.8
  const logoWidthPx = settings.logoWidth * cmToPx
  const logoHeightPx = settings.logoHeight * cmToPx

  let textTransformCSS = 'none'
  switch (settings.textTransform) {
    case 'uppercase': textTransformCSS = 'uppercase'; break
    case 'capitalize': textTransformCSS = 'capitalize'; break
    case 'lowercase': textTransformCSS = 'lowercase'; break
  }

  const headerLinesHtml = headerLines.map(line => `
    <div style="
      font-family: '${settings.fontFamily}', serif;
      font-size: ${settings.fontSize}pt;
      font-weight: ${line.bold ? 'bold' : 'normal'};
      text-transform: ${textTransformCSS};
      line-height: 1.3;
      margin-top: 1px;
    ">${line.text}</div>
  `).join('\n')

  const schoolNameHtml = `
    <div style="
      font-family: '${settings.fontFamily}', serif;
      font-size: ${settings.fontSize}pt;
      font-weight: ${settings.isBold ? 'bold' : 'normal'};
      text-transform: ${textTransformCSS};
      line-height: 1.3;
      margin-top: ${headerLines.length > 0 ? '1px' : '0'};
    ">${settings.schoolName || 'NAMA SEKOLAH'}</div>
  `

  const detailLinesHtml = detailLines.map(line => `
    <div style="
      font-family: Arial, sans-serif;
      font-size: ${Math.max(Math.round(settings.fontSize * 0.55), 7)}pt;
      font-weight: ${line.bold ? 'bold' : 'normal'};
      line-height: 1.4;
      margin-top: 1px;
    ">${line.text}</div>
  `).join('\n')

  return `
    <div style="display: flex; align-items: flex-start; gap: 12px; margin-bottom: 2px;">
      ${settings.logo ? `<img src="${settings.logo}" style="width: ${logoWidthPx}px; height: ${logoHeightPx}px; object-fit: contain;" />` : `<div style="width: ${logoWidthPx}px; height: ${logoHeightPx}px;"></div>`}
      <div style="flex: 1; text-align: center;">
        ${headerLinesHtml}
        ${schoolNameHtml}
        ${detailLinesHtml}
      </div>
      ${settings.logo ? `<div style="width: ${logoWidthPx}px;"></div>` : ''}
    </div>
    <div style="border-bottom: ${settings.underlineThickness}px solid black; width: ${settings.underlineWidth}%; margin: 6px auto 0;"></div>
  `
}

// ─── Common print styles ──────────────────────────────────────────────────────

export function getPrintStyles(): string {
  return `
    @page { size: A4; margin: 20mm 20mm 20mm 25mm; }
    body {
      font-family: 'Times New Roman', serif;
      font-size: 11pt;
      margin: 0;
      padding: 0;
      color: #000;
      line-height: 1.4;
    }
    table { border-collapse: collapse; width: 100%; }
    th {
      background-color: #f0f0f0;
      font-weight: bold;
      border: 1px solid #333;
      padding: 6px 8px;
      text-align: center;
      font-size: 10pt;
    }
    td {
      border: 1px solid #333;
      padding: 4px 8px;
      font-size: 10pt;
    }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
    .title {
      text-align: center;
      font-size: 12pt;
      font-weight: bold;
      margin-top: 16px;
      margin-bottom: 4px;
    }
    .subtitle {
      text-align: center;
      font-size: 10pt;
      margin-bottom: 16px;
    }
    .meta-table {
      width: auto;
      border: none;
      margin-bottom: 12px;
    }
    .meta-table td {
      border: none;
      padding: 2px 8px 2px 0;
      vertical-align: top;
    }
    .footer-info {
      margin-top: 24px;
      font-size: 10pt;
      text-align: right;
    }
    .signature-block {
      margin-top: 32px;
      font-size: 11pt;
    }
    @media print {
      body { margin: 0; padding: 0; }
    }
    @media screen {
      body { padding: 20px; }
    }
  `
}

// ─── Format helpers ───────────────────────────────────────────────────────────

export function formatRupiahPrint(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

export function formatNumberPrint(value: number): string {
  return new Intl.NumberFormat('id-ID').format(value)
}

export function formatDatePrint(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// ─── Open print window ────────────────────────────────────────────────────────

export function openPrintWindow(title: string, bodyHtml: string): void {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>${getPrintStyles()}</style>
    </head>
    <body>
      ${bodyHtml}
    </body>
    </html>
  `

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 500)
  }
}

// ─── Build complete print document with KOP ───────────────────────────────────

export async function printWithKop(title: string, contentHtml: string): Promise<void> {
  const settings = await fetchPrintSettings()
  const kopHtml = buildKopHtml(settings)

  const bodyHtml = `
    ${kopHtml}
    <div class="title">${title}</div>
    ${contentHtml}
    <div class="footer-info">
      Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
    </div>
  `

  openPrintWindow(title, bodyHtml)
}
