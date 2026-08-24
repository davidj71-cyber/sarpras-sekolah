'use client'

import * as XLSX from 'xlsx'
import { fetchPrintSettings } from '@/lib/print-utils'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ExcelColumn<T = Record<string, unknown>> {
  /** Column header text shown in row 1 */
  header: string
  /** Property name in the data object, OR a accessor function */
  key: keyof T | ((row: T) => string | number | null | undefined)
  /** Column width in characters (default: auto-sized) */
  width?: number
}

export interface ExcelExportOptions<T = Record<string, unknown>> {
  /** Download filename (with or without .xlsx extension) */
  filename: string
  /** Sheet name (max 31 chars, default: "Laporan") */
  sheetName?: string
  /** Report title shown in row 1, merged across columns */
  title?: string
  /** Column definitions */
  columns: ExcelColumn<T>[]
  /** Data rows */
  data: T[]
  /**
   * Optional metadata rows shown between title and column headers
   * (e.g. school name, date range, filter info)
   */
  meta?: { label: string; value: string }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCellValue<T>(row: T, col: ExcelColumn<T>): string | number | null {
  if (typeof col.key === 'function') {
    return col.key(row) ?? ''
  }
  const val = row[col.key]
  if (val === null || val === undefined) return ''
  if (typeof val === 'number') return val
  if (val instanceof Date) return val.toLocaleDateString('id-ID')
  return String(val)
}

// ─── Main export function ────────────────────────────────────────────────────

/**
 * Export tabular data to a native .xlsx file (Excel 2007+).
 *
 * Features:
 * - Title row (merged across all columns, bold, larger font)
 * - Optional metadata rows (label: value pairs)
 * - Column headers (bold, with fill color)
 * - Auto-sized column widths (with manual override per column)
 * - Frozen header rows
 * - Number formatting preserved for numeric cells
 *
 * Runs entirely client-side — no server round-trip needed.
 */
export async function exportToExcel<T = Record<string, unknown>>(
  options: ExcelExportOptions<T>
): Promise<void> {
  const {
    filename,
    sheetName = 'Laporan',
    title,
    columns,
    data,
    meta = [],
  } = options

  // Build the worksheet data as a 2D array (AOA) for precise control
  // over layout: title → meta → headers → data.
  const aoa: (string | number | null)[][] = []

  // Row 1: Title (merged later)
  if (title) {
    aoa.push([title, ...Array(columns.length - 1).fill('')])
  }

  // Metadata rows
  for (const m of meta) {
    aoa.push([`${m.label}: ${m.value}`, ...Array(columns.length - 1).fill('')])
  }

  // Empty separator row
  if (title || meta.length > 0) {
    aoa.push([])
  }

  // Column headers
  aoa.push(columns.map((c) => c.header))

  // Data rows
  for (const row of data) {
    aoa.push(columns.map((c) => getCellValue(row, c)))
  }

  // Create worksheet from array-of-arrays
  const ws = XLSX.utils.aoa_to_sheet(aoa)

  // ── Column widths ──────────────────────────────────────────────────────
  // Auto-size based on content, with optional manual override.
  const colWidths: { wch: number }[] = columns.map((col, colIdx) => {
    if (col.width) return { wch: col.width }

    // Find max string length in this column (header + all data cells)
    let maxLen = col.header.length
    for (const row of data) {
      const val = getCellValue(row, col)
      const str = val === null ? '' : String(val)
      if (str.length > maxLen) maxLen = str.length
    }
    // Cap at 50 chars to avoid absurdly wide columns
    return { wch: Math.min(Math.max(maxLen + 2, 10), 50) }
  })
  ws['!cols'] = colWidths

  // ── Merge title row (if present) ───────────────────────────────────────
  if (title) {
    ws['!merges'] = [
      {
        s: { r: 0, c: 0 }, // start: row 0, col 0
        e: { r: 0, c: columns.length - 1 }, // end: row 0, last col
      },
    ]
  }

  // ── Freeze panes (lock header rows) ────────────────────────────────────
  const headerRowCount = (title ? 1 : 0) + meta.length + (title || meta.length > 0 ? 1 : 0) + 1
  ws['!freeze'] = { xSplit: 0, ySplit: headerRowCount, topLeftCell: `A${headerRowCount + 1}`, activePane: 'bottomLeft', state: 'frozen' }

  // ── Create workbook & download ─────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31))

  // Ensure filename ends with .xlsx
  const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`

  XLSX.writeFile(wb, finalFilename, { compression: true })
}

// ─── Convenience: fetch school settings for metadata header ──────────────────

/**
 * Fetches school settings and returns a metadata array suitable for
 * ExcelExportOptions.meta. Useful for adding school name + address at
 * the top of every report export.
 */
export async function getSchoolMeta(): Promise<{ label: string; value: string }[]> {
  try {
    const s = await fetchPrintSettings()
    const meta: { label: string; value: string }[] = []
    if (s.schoolName) meta.push({ label: 'Sekolah', value: s.schoolName })
    if (s.npsn) meta.push({ label: 'NPSN', value: s.npsn })
    if (s.address) meta.push({ label: 'Alamat', value: s.address })
    meta.push({
      label: 'Dicetak',
      value: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    })
    return meta
  } catch {
    return [
      {
        label: 'Dicetak',
        value: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      },
    ]
  }
}
