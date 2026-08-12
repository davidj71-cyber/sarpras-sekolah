import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSalaryMediaSchema } from "@/lib/migrate-settings";

// GET /api/media/payments?year=2026
// → Returns ALL MediaPayment records for the given year (across all media).
//   Used by the print dialog to compute which months are already paid per media,
//   so it can disable already-paid months from being selected again.
//
// Response shape: Array<{ id, mediaId, year, month, amount, notes, paidAt }>
export async function GET(request: NextRequest) {
  try {
    // Self-heal: create MediaPayment table in Neon production if missing.
    await ensureSalaryMediaSchema();

    const url = new URL(request.url);
    const yearParam = url.searchParams.get("year");

    const where: { year?: number } = {};
    if (yearParam) {
      const y = Number(yearParam);
      if (!Number.isNaN(y)) where.year = y;
    }

    const payments = await db.mediaPayment.findMany({
      where,
      select: {
        id: true,
        mediaId: true,
        year: true,
        month: true,
        amount: true,
        notes: true,
        paidAt: true,
      },
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching all media payments:", error);
    // Resilient: return empty array on error (matches other GET routes).
    return NextResponse.json([]);
  }
}
