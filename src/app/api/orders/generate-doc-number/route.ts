import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSalaryMediaSchema } from "@/lib/migrate-settings";

// ─── /api/orders/generate-doc-number ─────────────────────────────────────────
// Generate nomor surat pesanan otomatis berdasarkan format dari SchoolSettings.
//
// Format default: "{NOMOR}/{PREFIX}/{KODE_SEKOLAH}-{KODE_UNIT}/{ROMAN}/{TAHUN}"
//                 → "9/PB/SMAN1TLD-TU/XI/2025"
// Placeholder yang didukung:
//   {NOMOR}        = nomor urut (auto-increment per tahun)
//   {PREFIX}       = kode depan (default "PB" = Pesanan Barang)
//   {KODE_SEKOLAH} = kode sekolah dari schoolCode
//   {KODE_UNIT}    = kode unit dari letterUnitCode
//   {ROMAN}        = bulan Romawi (I-XII) — otomatis dari bulan berjalan
//   {TAHUN}        = tahun 4 digit — otomatis dari tahun berjalan
export async function GET() {
  try {
    await ensureSalaryMediaSchema();

    const settings = await db.schoolSettings.findFirst();
    const format = settings?.orderDocFormat || "{NOMOR}/{PREFIX}/{KODE_SEKOLAH}-{KODE_UNIT}/{ROMAN}/{TAHUN}";
    const prefix = settings?.orderDocPrefix || "PB";
    const schoolCode = settings?.schoolCode || "SEKOLAH";
    const letterUnitCode = settings?.letterUnitCode || "TU";

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11

    // Hitung nomor urut: jumlah order di tahun ini + 1
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);
    const countThisYear = await db.order.count({
      where: {
        orderDate: { gte: yearStart, lt: yearEnd },
      },
    });
    const nomor = String(countThisYear + 1).padStart(3, '0');

    // Bulan Romawi (I-XII)
    const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
    const roman = romanMonths[month];

    // Compose nomor surat pesanan
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
    console.error("Error generating order doc number:", error);
    return NextResponse.json(
      { error: "Gagal generate nomor surat pesanan" },
      { status: 500 }
    );
  }
}
