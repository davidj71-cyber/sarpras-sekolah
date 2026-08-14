import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSalaryMediaSchema } from "@/lib/migrate-settings";
import * as XLSX from "xlsx";

// ─── Mapping header Excel → field SalaryEntry ────────────────────────────────
// Excel asli (DAFTAR GTTS DAN PTTS) header:
// NO | NAMA | NO. REKENING TABUNGAN | JUMLAH BULAN/JAM PELAJARAN | SATUAN |
// HARGA SATUAN/BULAN/JAM PELAJARAN | PENERIMAAN BERSIH | STATUS | JABATAN

type ParsedRow = {
  name: string;
  nip: string;
  bankAccount: string;
  gender: string;
  status: string;
  jabatan: string;
  lessonCount: number;
  unit: string;
  pricePerLesson: number;
  totalReceived: number;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

// Parse angka dari string Excel yang mungkin berisi separator ribuan (koma/titik/spasi)
// Contoh: " 60,000 " → 60000, "2.340.000" → 2340000, "Rp 2.000.000" → 2000000
function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const s = String(value).trim();
  if (!s) return 0;
  // Hilangkan prefix mata uang & karakter non-digit kecuali , . -
  let cleaned = s.replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  if (hasComma && !hasDot) {
    // "60,000" → 60000 (koma = ribuan)
    cleaned = cleaned.replace(/,/g, "");
  } else if (hasDot && !hasComma) {
    // "2.340.000" → 2340000 (titik = ribuan)
    // tapi "1.5" → 1.5 (desimal) — cek apakah ada lebih dari 1 titik
    const dotCount = (cleaned.match(/\./g) || []).length;
    if (dotCount > 1) {
      cleaned = cleaned.replace(/\./g, "");
    }
    // 1 titik: biarkan Number() parse (bisa desimal)
  } else if (hasDot && hasComma) {
    // Format ID: "1.234,56" → 1234.56 | Format US: "1,234.56" → 1234.56
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    if (lastComma > lastDot) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else {
      cleaned = cleaned.replace(/,/g, "");
    }
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// Cari index baris header di sheet (baris yg punya "NO" & "NAMA")
function findHeaderRow(rows: any[][]): number {
  for (let i = 0; i < Math.min(rows.length, 10); i++) {
    const row = (rows[i] || []).map((c) => String(c ?? "").trim().toUpperCase());
    const hasNo = row.some((c) => c === "NO" || c === "NOMOR" || c === "NO.");
    const hasName = row.some((c) => c === "NAMA" || c === "NAMA PEGAWAI" || c === "NAMA GURU");
    if (hasNo && hasName) return i;
  }
  return -1;
}

// Map header → field key
function mapHeaderToField(header: string): string | null {
  const h = header.trim().toUpperCase();
  if (h === "NO" || h === "NOMOR" || h === "NO.") return "no";
  if (h === "NAMA" || h === "NAMA PEGAWAI" || h === "NAMA GURU" || h === "NAMA LENGKAP") return "name";
  if (h.includes("REKENING") || h.includes("NOREK") || h === "NO. REKENING TABUNGAN") return "bankAccount";
  if (h === "NIP" || h === "NIP." || h.includes("NOMOR INDUK PEGAWAI")) return "nip";
  if (h === "JK" || h === "JENIS KELAMIN" || h === "L/P") return "gender";
  if (h.includes("STATUS")) return "status";
  if (h.includes("JABATAN")) return "jabatan";
  // ── Penting: cek HARGA & JUMLAH SEBELUM SATUAN, karena header bisa
  //    berbentuk "HARGA SATUAN/..." atau "JUMLAH BULAN/JAM PELAJARAN"
  //    yg juga mengandung kata "SATUAN".
  if (h.includes("JUMLAH") && (h.includes("LES") || h.includes("JAM") || h.includes("BULAN"))) return "lessonCount";
  if (h.includes("JML LES") || h === "JUMLAH LES") return "lessonCount";
  if (h.includes("HARGA") && (h.includes("SATUAN") || h.includes("LES") || h.includes("JAM") || h.includes("BULAN"))) return "pricePerLesson";
  if (h.includes("HARGA/LES") || h === "HARGA PER LES") return "pricePerLesson";
  if (h.includes("PENERIMAAN") || h.includes("TOTAL")) return "totalReceived";
  // SATUAN dicek terakhir (setelah HARGA & JUMLAH) untuk hindari false match
  if (h === "SATUAN" || h.includes("SATUAN")) return "unit";
  return null;
}

// Skip row kategori/footer (bukan data pegawai)
const FOOTER_KEYWORDS = [
  "PETUGAS KEBERSIHAN",
  "GURU SEMENTARA",
  "PEGAWAI SEKOLAH",
  "TOTAL",
  "JUMLAH",
  "KETERANGAN",
];

function isFooterRow(name: string, no: string): boolean {
  if (!name.trim()) return true;
  const upper = name.trim().toUpperCase();
  if (FOOTER_KEYWORDS.some((kw) => upper.includes(kw))) return true;
  // NO harus berupa angka (1, 2, 3, ...) untuk baris data valid
  if (no.trim() && isNaN(Number(no.trim()))) return true;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    await ensureSalaryMediaSchema();

    const formData = await request.formData();
    const file = formData.get("file");
    const period = String(formData.get("period") ?? "").trim();
    const mode = String(formData.get("mode") ?? "skip").trim(); // skip | overwrite | append

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "File Excel tidak ditemukan" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: "buffer" });

    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json(
        { error: "File Excel tidak memiliki sheet" },
        { status: 400 }
      );
    }
    const sheet = workbook.Sheets[sheetName];

    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      raw: true,
      defval: "",
      blankrows: true,
    });

    const headerRowIdx = findHeaderRow(rows);
    if (headerRowIdx === -1) {
      return NextResponse.json(
        {
          error:
            'Header tidak ditemukan. Pastikan ada baris dengan kolom "NO" dan "NAMA".',
        },
        { status: 400 }
      );
    }

    const headerRow = (rows[headerRowIdx] || []).map((c) => String(c ?? "").trim());
    const columnMap: Record<number, string> = {};
    headerRow.forEach((h, idx) => {
      const field = mapHeaderToField(h);
      if (field) columnMap[idx] = field;
    });

    const hasNameCol = Object.values(columnMap).includes("name");
    if (!hasNameCol) {
      return NextResponse.json(
        { error: 'Kolom "NAMA" tidak ditemukan pada header Excel.' },
        { status: 400 }
      );
    }

    const parsed: ParsedRow[] = [];
    const skippedRows: { row: number; reason: string; data: any }[] = [];
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i] || [];
      const get = (field: string): string => {
        const idx = Object.entries(columnMap).find(
          ([, f]) => f === field
        )?.[0];
        if (idx === undefined) return "";
        const v = row[Number(idx)];
        return v === null || v === undefined ? "" : String(v).trim();
      };
      const getNum = (field: string): number => {
        const idx = Object.entries(columnMap).find(
          ([, f]) => f === field
        )?.[0];
        if (idx === undefined) return 0;
        return parseNumber(row[Number(idx)]);
      };

      const no = get("no");
      const name = get("name");

      if (isFooterRow(name, no)) {
        skippedRows.push({
          row: i + 1,
          reason: "Baris kosong/kategori/footer",
          data: { no, name },
        });
        continue;
      }

      const lessonCount = getNum("lessonCount");
      const pricePerLesson = getNum("pricePerLesson");
      const totalReceived = getNum("totalReceived");

      parsed.push({
        name,
        nip: get("nip"),
        bankAccount: get("bankAccount"),
        gender: get("gender") || "L",
        status: get("status"),
        jabatan: get("jabatan"),
        lessonCount,
        unit: get("unit") || "Jam",
        pricePerLesson,
        totalReceived: totalReceived || lessonCount * pricePerLesson,
      });
    }

    if (parsed.length === 0) {
      return NextResponse.json(
        {
          error: "Tidak ada baris data valid yang dapat diimport.",
          skipped: skippedRows.length,
        },
        { status: 400 }
      );
    }

    // Mode overwrite: hapus entries dengan period yg sama dulu
    let deletedCount = 0;
    if (mode === "overwrite" && period) {
      const del = await db.salaryEntry.deleteMany({
        where: { period },
      });
      deletedCount = del.count;
    }

    let imported = 0;
    const errors: { row: number; name: string; error: string }[] = [];
    let skippedDuplicates = 0;

    let existingKeys = new Set<string>();
    if (mode === "skip" && period) {
      const existing = await db.salaryEntry.findMany({
        where: { period },
        select: { name: true, bankAccount: true },
      });
      existingKeys = new Set(
        existing.map((e) => `${e.name.toLowerCase()}|${e.bankAccount.toLowerCase()}`)
      );
    }

    for (let i = 0; i < parsed.length; i++) {
      const p = parsed[i];
      try {
        if (mode === "skip") {
          const key = `${p.name.toLowerCase()}|${p.bankAccount.toLowerCase()}`;
          if (existingKeys.has(key)) {
            skippedDuplicates++;
            continue;
          }
          existingKeys.add(key);
        }

        await db.salaryEntry.create({
          data: {
            name: p.name,
            nip: p.nip,
            bankAccount: p.bankAccount,
            gender: p.gender,
            status: p.status,
            jabatan: p.jabatan,
            lessonCount: p.lessonCount,
            unit: p.unit,
            pricePerLesson: p.pricePerLesson,
            totalReceived: p.totalReceived,
            period,
          },
        });
        imported++;
      } catch (err) {
        errors.push({
          row: headerRowIdx + 2 + i,
          name: p.name,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({
      success: true,
      total: parsed.length,
      imported,
      skippedDuplicates,
      skippedFooter: skippedRows.length,
      deletedFromOverwrite: deletedCount,
      errors,
      period,
    });
  } catch (error) {
    console.error("Error importing salary:", error);
    return NextResponse.json(
      {
        error: "Gagal import data gaji",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
