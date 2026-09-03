import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureBarangMasukSchema } from "@/lib/migrate-settings";

// ─── /api/barang-masuk/generate-doc-number ───────────────────────────────────
// Generate nomor dokumen otomatis berdasarkan format dari SchoolSettings.
//
// Format default: "{NOMOR}/{PREFIX}/{KODE_SEKOLAH}-{KODE_UNIT}/{ROMAN}/{TAHUN}"
//                 → "001/BM/SMANSATD-TU/IX/2026"
// Placeholder yang didukung:
//   {NOMOR}        = nomor urut 3-digit, auto-increment per tahun (001, 002, 003, ...)
//   {PREFIX}       = kode depan (default "BM")
//   {KODE_SEKOLAH} = kode sekolah dari schoolCode
//   {KODE_UNIT}    = kode unit dari letterUnitCode
//   {ROMAN}        = bulan Romawi (I-XII)
//   {TAHUN}        = tahun 4 digit
//
// NOMOR dihitung dari jumlah dokumen yang sudah ada di tahun berjalan.
export async function GET() {
  try {
    await ensureBarangMasukSchema();

    const settings = await db.schoolSettings.findFirst();
    const format = settings?.barangMasukDocFormat || "{NOMOR}/{PREFIX}/{KODE_SEKOLAH}-{KODE_UNIT}/{ROMAN}/{TAHUN}";
    const prefix = settings?.barangMasukDocPrefix || "BM";
    const schoolCode = settings?.schoolCode || "SEKOLAH";
    const letterUnitCode = settings?.letterUnitCode || "TU";

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11

    // Hitung nomor urut: jumlah dokumen di tahun ini + 1
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);
    const countThisYear = await db.barangMasuk.count({
      where: {
        entryDate: { gte: yearStart, lt: yearEnd },
      },
    });
    const nomor = String(countThisYear + 1).padStart(3, "0");

    // Bulan Romawi
    const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    const roman = romanMonths[month];

    // Compose nomor dokumen
    const docNumber = format
      .replace(/\{NOMOR\}/g, nomor)
      .replace(/\{PREFIX\}/g, prefix)
      .replace(/\{KODE_SEKOLAH\}/g, schoolCode)
      .replace(/\{KODE_UNIT\}/g, letterUnitCode)
      .replace(/\{ROMAN\}/g, roman)
      .replace(/\{TAHUN\}/g, String(year));

    return NextResponse.json({
      documentNumber: docNumber,
      format,
      prefix,
      nomor,
      roman,
      year,
    });
  } catch (error) {
    console.error("Error generating doc number:", error);
    return NextResponse.json(
      { error: "Gagal generate nomor dokumen" },
      { status: 500 }
    );
  }
}
