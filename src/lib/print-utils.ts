// ─── Shared Print Utilities ────────────────────────────────────────────────────
// Provides KOP surat generation and common print styling for all print features.

export type PrintOrientation = 'portrait' | 'landscape'

interface KopLine {
  text: string
  style: 'header' | 'detail'
  bold: boolean
  fontSize: number      // per-line font size in pt; 0 = inherit default (header: global fontSize, detail: 55% of global)
  textTransform: string // '' = inherit (header: global transform, detail: none); 'none' | 'uppercase' | 'capitalize' | 'lowercase'
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
  // Penandatangan laporan (disinkronisasi)
  principalName: string
  principalNip: string
  treasurerName: string
  treasurerNip: string
  goodsManagerName: string
  goodsManagerNip: string
}

// ─── Parse kopLines from API response ─────────────────────────────────────────

export function parseKopLines(raw: unknown): KopLine[] {
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    if (!Array.isArray(parsed)) return []
    return parsed.map((item: unknown) => {
      if (typeof item === 'string') {
        // Backward compat: old string lines become detail lines with inherited defaults
        return { text: item, style: 'detail' as const, bold: false, fontSize: 0, textTransform: '' }
      }
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>
        const transformRaw = typeof obj.textTransform === 'string' ? obj.textTransform : ''
        const validTransform = ['none', 'uppercase', 'capitalize', 'lowercase'].includes(transformRaw) ? transformRaw : ''
        return {
          text: String(obj.text ?? ''),
          style: (obj.style === 'header' ? 'header' : 'detail') as 'header' | 'detail',
          bold: Boolean(obj.bold ?? false),
          fontSize: typeof obj.fontSize === 'number' && obj.fontSize > 0 ? obj.fontSize : 0,
          textTransform: validTransform,
        }
      }
      return { text: '', style: 'detail' as const, bold: false, fontSize: 0, textTransform: '' }
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
    const data = await res.json()
    return {
      schoolName: data.schoolName ?? '',
      logo: data.logo ?? null,
      logoWidth: data.logoWidth ?? 3,
      logoHeight: data.logoHeight ?? 3,
      fontFamily: data.fontFamily ?? 'Times New Roman',
      fontSize: data.fontSize ?? 14,
      isBold: data.isBold ?? false,
      textTransform: data.textTransform ?? 'none',
      underlineThickness: data.underlineThickness ?? 1,
      underlineWidth: data.underlineWidth ?? 100,
      address: data.address ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      npsn: data.npsn ?? null,
      kopLines: data.kopLines ?? [],
      principalName: data.principalName ?? '',
      principalNip: data.principalNip ?? '',
      treasurerName: data.treasurerName ?? '',
      treasurerNip: data.treasurerNip ?? '',
      goodsManagerName: data.goodsManagerName ?? '',
      goodsManagerNip: data.goodsManagerNip ?? '',
    }
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
      principalName: '',
      principalNip: '',
      treasurerName: '',
      treasurerNip: '',
      goodsManagerName: '',
      goodsManagerNip: '',
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

  // Global default text transform — used as fallback for header lines that don't specify their own
  let globalTextTransformCSS = 'none'
  switch (settings.textTransform) {
    case 'uppercase': globalTextTransformCSS = 'uppercase'; break
    case 'capitalize': globalTextTransformCSS = 'capitalize'; break
    case 'lowercase': globalTextTransformCSS = 'lowercase'; break
  }

  const detailDefaultSize = Math.max(Math.round(settings.fontSize * 0.55), 7)

  const renderLine = (line: KopLine, isHeader: boolean): string => {
    // Per-line font size; 0 means inherit style default
    const effectiveFontSize = line.fontSize > 0
      ? line.fontSize
      : (isHeader ? settings.fontSize : detailDefaultSize)

    // Per-line text transform; '' means inherit (header: global, detail: none)
    let lineTextTransformCSS = 'none'
    if (line.textTransform) {
      switch (line.textTransform) {
        case 'uppercase': lineTextTransformCSS = 'uppercase'; break
        case 'capitalize': lineTextTransformCSS = 'capitalize'; break
        case 'lowercase': lineTextTransformCSS = 'lowercase'; break
      }
    } else if (isHeader) {
      lineTextTransformCSS = globalTextTransformCSS
    }

    const fontFamily = isHeader ? `'${settings.fontFamily}', serif` : 'Arial, sans-serif'

    return `
      <div style="
        font-family: ${fontFamily};
        font-size: ${effectiveFontSize}pt;
        font-weight: ${line.bold ? 'bold' : 'normal'};
        text-transform: ${lineTextTransformCSS};
        line-height: 1.3;
        margin-top: 1px;
        white-space: nowrap;
      ">${line.text}</div>
    `
  }

  const headerLinesHtml = headerLines.map(l => renderLine(l, true)).join('\n')
  const detailLinesHtml = detailLines.map(l => renderLine(l, false)).join('\n')

  return `
    <div style="display: flex; align-items: flex-start; justify-content: center; gap: 8px; margin-bottom: 2px;">
      ${settings.logo ? `<img src="${settings.logo}" style="width: ${logoWidthPx}px; height: ${logoHeightPx}px; object-fit: contain; flex-shrink: 0;" />` : `<div style="width: ${logoWidthPx}px; height: ${logoHeightPx}px; flex-shrink: 0;"></div>`}
      <div style="flex: 1; text-align: center; min-width: 0;">
        ${headerLinesHtml}
        ${detailLinesHtml}
      </div>
      ${settings.logo ? `<div style="width: ${logoWidthPx}px; flex-shrink: 0;"></div>` : ''}
    </div>
    <div style="border-bottom: ${settings.underlineThickness}px solid black; width: ${settings.underlineWidth}%; margin: 6px auto 0;"></div>
  `
}

// ─── Build synced signature block ────────────────────────────────────────────
// Renders a signature block using data from SchoolSettings so it stays
// synchronized across all reports. Supports 2-column (default) and
// 3-column layouts (when `thirdColumn` is provided).

export interface SignatureBlockOptions {
  /** Label for left column header (default: "Mengetahui,") */
  leftIntro?: string
  /** Position title for left column (default: "Kepala Sekolah") */
  leftTitle?: string
  /** Position title for right column (default: "Bendahara") */
  rightTitle?: string
  /** Override city for right column date line (default: derived from settings.address) */
  city?: string
  /** Override date string for right column (default: today's date in id-ID) */
  dateStr?: string
  /** Show only one column (e.g. for letters that already have issuer signature) */
  singleColumn?: 'left' | 'right' | null
  /**
   * Which person's name/NIP to render in the RIGHT column.
   * - 'treasurer' (default) → uses settings.treasurerName / treasurerNip
   * - 'goodsManager'        → uses settings.goodsManagerName / goodsManagerNip
   * The label (rightTitle) is independent — caller controls both.
   */
  rightSigner?: 'treasurer' | 'goodsManager'
  /**
   * When provided, renders a 3-column layout with the third column showing
   * the Pengurus Barang (goods manager). Pass `true` to use defaults, or an
   * object to customize the intro/title.
   */
  thirdColumn?: boolean | {
    intro?: string
    title?: string
  }
}

export function buildSyncedSignatureBlock(
  settings: PrintSettings,
  options: SignatureBlockOptions = {}
): string {
  const {
    leftIntro = 'Mengetahui,',
    leftTitle = 'Kepala Sekolah',
    rightTitle = 'Bendahara',
    city,
    dateStr,
    singleColumn = null,
    rightSigner = 'treasurer',
    thirdColumn = false,
  } = options

  // Derive city from address (last comma-separated chunk) or fallback
  const derivedCity = city || (settings.address
    ? (settings.address.split(',').pop()?.trim() || '_____________')
    : '_____________')
  const derivedDate = dateStr || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  const principalNameDisplay = settings.principalName || '________________________'
  const principalNipDisplay = settings.principalNip ? `NIP. ${settings.principalNip}` : 'NIP. ________________________'
  const treasurerNameDisplay = settings.treasurerName || '________________________'
  const treasurerNipDisplay = settings.treasurerNip ? `NIP. ${settings.treasurerNip}` : 'NIP. ________________________'
  const goodsManagerNameDisplay = settings.goodsManagerName || '________________________'
  const goodsManagerNipDisplay = settings.goodsManagerNip ? `NIP. ${settings.goodsManagerNip}` : 'NIP. ________________________'

  // Pick which person's data goes in the right column based on `rightSigner`.
  // The label (rightTitle) is independent so callers can pair any title with
  // any person — but the typical pairings are:
  //   rightSigner='treasurer'   + rightTitle='Bendahara'           (Pesanan)
  //   rightSigner='goodsManager' + rightTitle='Pengurus Barang'    (Inventaris/KIB)
  const rightNameDisplay = rightSigner === 'goodsManager' ? goodsManagerNameDisplay : treasurerNameDisplay
  const rightNipDisplay = rightSigner === 'goodsManager' ? goodsManagerNipDisplay : treasurerNipDisplay

  // Column width adapts to layout: 45% for 2-col, 30% for 3-col
  const colWidth = thirdColumn ? '30%' : '45%'

  const renderColumn = (intro: string, title: string, name: string, nip: string, width: string = colWidth) => `
    <div style="text-align:center; width: ${width};">
      <div>${intro}</div>
      <div style="margin-top: 2px;">${title}</div>
      <div style="height: 60px;"></div>
      <div style="text-decoration: underline; font-weight: bold;">${name}</div>
      <div>${nip}</div>
    </div>
  `

  let inner: string
  if (singleColumn === 'left') {
    inner = `<div style="display:flex; justify-content:flex-start;">${renderColumn(leftIntro, leftTitle, principalNameDisplay, principalNipDisplay)}</div>`
  } else if (singleColumn === 'right') {
    inner = `<div style="display:flex; justify-content:flex-end;">${renderColumn(`${derivedCity}, ${derivedDate}`, rightTitle, rightNameDisplay, rightNipDisplay)}</div>`
  } else if (thirdColumn) {
    // 3-column layout: Kepala Sekolah | Bendahara | Pengurus Barang
    const tc = typeof thirdColumn === 'object' ? thirdColumn : {}
    const thirdIntro = tc.intro ?? 'Diketahui,'
    const thirdTitle = tc.title ?? 'Pengurus Barang'
    inner = `
      <div style="display:flex; justify-content:space-between; margin-top: 24px;">
        ${renderColumn(leftIntro, leftTitle, principalNameDisplay, principalNipDisplay)}
        ${renderColumn(`${derivedCity}, ${derivedDate}`, rightTitle, rightNameDisplay, rightNipDisplay)}
        ${renderColumn(thirdIntro, thirdTitle, goodsManagerNameDisplay, goodsManagerNipDisplay)}
      </div>
    `
  } else {
    inner = `
      <div style="display:flex; justify-content:space-between; margin-top: 24px;">
        ${renderColumn(leftIntro, leftTitle, principalNameDisplay, principalNipDisplay)}
        ${renderColumn(`${derivedCity}, ${derivedDate}`, rightTitle, rightNameDisplay, rightNipDisplay)}
      </div>
    `
  }

  return `
    <div class="signature-block">
      ${inner}
    </div>
  `
}

// ─── Common print styles ──────────────────────────────────────────────────────

export function getPrintStyles(orientation: PrintOrientation = 'portrait'): string {
  // Reduced margins (10mm sides, 12mm left for hole-punch clearance) so KOP lines have more width
  // and won't wrap. A4 portrait = 210mm wide → usable ~186mm.
  const pageRule = orientation === 'landscape'
    ? '@page { size: A4 landscape; margin: 10mm 10mm 10mm 12mm; }'
    : '@page { size: A4 portrait; margin: 10mm 10mm 10mm 12mm; }'

  return `
    ${pageRule}
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

// ─── Sanitize filename ────────────────────────────────────────────────────────
// Buat string aman dipakai sebagai nama file (PDF/Excel) di Windows/macOS/Linux.
// Karakter invalid \ / : * ? " < > | diganti dengan '-'.
// Spasi, kurung (), koma, & tetap dipertahankan (valid di semua OS).
export function sanitizeFilename(name: string): string {
  return (name || '').replace(/[\\/:*?"<>|]/g, '-').trim()
}

// ─── Open print window ────────────────────────────────────────────────────────

export function openPrintWindow(title: string, bodyHtml: string, orientation: PrintOrientation = 'portrait'): void {
  const isLandscape = orientation === 'landscape'

  // Instruction banner for landscape mode — guides user to select landscape in browser print dialog
  const bannerHtml = isLandscape ? `
    <div id="print-banner" style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
      color: #78350f;
      padding: 16px 24px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-family: Arial, sans-serif;
      font-size: 14px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      gap: 16px;
    ">
      <div style="display:flex;align-items:center;gap:10px;flex:1;">
        <span style="font-size:24px;">⚠️</span>
        <div>
          <div style="font-weight:bold;font-size:15px;margin-bottom:2px;">Orientasi: LANDSCAPE (Mendatar)</div>
          <div>Pastikan memilih <strong>Landscape / Mendatar</strong> pada pengaturan cetak browser Anda sebelum mencetak.</div>
        </div>
      </div>
      <button onclick="doPrint()" style="
        background: #78350f;
        color: white;
        border: none;
        padding: 10px 28px;
        border-radius: 8px;
        cursor: pointer;
        font-size: 15px;
        font-weight: bold;
        white-space: nowrap;
        transition: background 0.2s;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      " onmouseover="this.style.background='#92400e'" onmouseout="this.style.background='#78350f'">🖨️ Cetak Sekarang</button>
    </div>
    <div id="print-spacer" style="height: 80px;"></div>
  ` : ''

  // Print script: landscape uses manual trigger, portrait auto-prints
  const printScript = isLandscape ? `
    <script>
      function doPrint() {
        var banner = document.getElementById('print-banner');
        var spacer = document.getElementById('print-spacer');
        if (banner) banner.style.display = 'none';
        if (spacer) spacer.style.display = 'none';
        window.print();
        // Restore banner after print dialog closes
        setTimeout(function() {
          if (banner) banner.style.display = 'flex';
          if (spacer) spacer.style.display = 'block';
        }, 500);
      }
    </script>
  ` : ''

  // Extra print styles for landscape banner
  const bannerPrintStyles = isLandscape ? `
    <style>
      @media print {
        #print-banner { display: none !important; }
        #print-spacer { display: none !important; }
      }
    </style>
  ` : ''

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>${getPrintStyles(orientation)}</style>
      ${bannerPrintStyles}
    </head>
    <body>
      ${bannerHtml}
      ${bodyHtml}
      ${printScript}
    </body>
    </html>
  `

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.focus()

    if (!isLandscape) {
      // Auto-print for portrait mode after short delay
      setTimeout(() => { printWindow.print() }, 500)
    }
    // For landscape: user clicks "Cetak Sekarang" button in the preview
  }
}

// ─── Build complete print document with KOP ───────────────────────────────────

export interface PrintWithKopOptions {
  /** Auto-append synced signature block (Kepala Sekolah + Bendahara) before footer */
  appendSignature?: boolean
  /** Options forwarded to buildSyncedSignatureBlock when appendSignature is true */
  signatureOptions?: SignatureBlockOptions
}

export async function printWithKop(
  title: string,
  contentHtml: string,
  orientation: PrintOrientation = 'portrait',
  options: PrintWithKopOptions = {}
): Promise<void> {
  const { appendSignature = false, signatureOptions } = options
  const settings = await fetchPrintSettings()
  const kopHtml = buildKopHtml(settings)
  const signatureHtml = appendSignature ? buildSyncedSignatureBlock(settings, signatureOptions) : ''

  const bodyHtml = `
    ${kopHtml}
    <div class="title">${title}</div>
    ${contentHtml}
    ${signatureHtml}
    <div class="footer-info">
      Dicetak pada: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
    </div>
  `

  openPrintWindow(title, bodyHtml, orientation)
}
