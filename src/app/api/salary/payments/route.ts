import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSalaryMediaSchema } from "@/lib/migrate-settings";

// GET /api/salary/payments?year=2026
// → Returns ALL SalaryPayment records for the given year (across all salary entries).
//   Used by the print dialog to compute which months are already paid per salary,
//   so it can disable already-paid months from being selected again.
//
// Response shape: Array<{ id, salaryId, year, month, lessonCount, amount, notes, paidAt, signaturePrinted, bankPrinted, fullyPaidAt }>
//   - signaturePrinted: true = sudah cetak mode Tanda Tangan Guru
//   - bankPrinted: true = sudah cetak mode Bank
//   - fullyPaidAt: non-null = kedua mode sudah tercetak (transaksi selesai, bulan terkunci)
export async function GET(request: NextRequest) {
  try {
    await ensureSalaryMediaSchema();

    const url = new URL(request.url);
    const yearParam = url.searchParams.get("year");

    const where: { year?: number } = {};
    if (yearParam) {
      const y = Number(yearParam);
      if (!Number.isNaN(y)) where.year = y;
    }

    const payments = await db.salaryPayment.findMany({
      where,
      select: {
        id: true,
        salaryId: true,
        year: true,
        month: true,
        lessonCount: true,
        amount: true,
        notes: true,
        paidAt: true,
        signaturePrinted: true,
        bankPrinted: true,
        fullyPaidAt: true,
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching all salary payments:", error);
    return NextResponse.json([]);
  }
}
