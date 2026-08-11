import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSalaryMediaSchema } from "@/lib/migrate-settings";

// GET /api/media/[id]/payments?year=2026
// → List all payment records for one media entry, optionally filtered by year.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSalaryMediaSchema();
    const { id } = await params;
    const url = new URL(request.url);
    const yearParam = url.searchParams.get("year");

    const where: { mediaId: string; year?: number } = { mediaId: id };
    if (yearParam) {
      const y = Number(yearParam);
      if (!Number.isNaN(y)) where.year = y;
    }

    const payments = await db.mediaPayment.findMany({
      where,
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching media payments:", error);
    return NextResponse.json(
      { error: "Gagal mengambil catatan pembayaran media" },
      { status: 500 }
    );
  }
}

// POST /api/media/[id]/payments
// Body: { year, month, amount, notes? }
// → Upsert a payment record (paid status = exists in DB; delete = unpaid).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSalaryMediaSchema();
    const { id } = await params;
    const body = await request.json();

    const year = Number(body.year);
    const month = Number(body.month);

    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
      return NextResponse.json(
        { error: "Tahun/bulan tidak valid" },
        { status: 400 }
      );
    }

    const amount = Number(body.amount) || 0;
    const notes = String(body.notes ?? "").trim();

    const payment = await db.mediaPayment.upsert({
      where: {
        mediaId_year_month: { mediaId: id, year, month },
      },
      update: {
        amount,
        notes,
        paidAt: new Date(),
      },
      create: {
        mediaId: id,
        year,
        month,
        amount,
        notes,
        paidAt: new Date(),
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Error upserting media payment:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan catatan pembayaran media" },
      { status: 500 }
    );
  }
}

// DELETE /api/media/[id]/payments?year=2026&month=1
// → Delete a payment record (mark month as unpaid).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSalaryMediaSchema();
    const { id } = await params;
    const url = new URL(request.url);
    const year = Number(url.searchParams.get("year"));
    const month = Number(url.searchParams.get("month"));

    if (!Number.isFinite(year) || !Number.isFinite(month)) {
      return NextResponse.json(
        { error: "Tahun/bulan tidak valid" },
        { status: 400 }
      );
    }

    try {
      await db.mediaPayment.delete({
        where: {
          mediaId_year_month: { mediaId: id, year, month },
        },
      });
    } catch {
      // Already deleted — treat as success.
    }

    return NextResponse.json({ message: "Catatan pembayaran dihapus" });
  } catch (error) {
    console.error("Error deleting media payment:", error);
    return NextResponse.json(
      { error: "Gagal menghapus catatan pembayaran media" },
      { status: 500 }
    );
  }
}
