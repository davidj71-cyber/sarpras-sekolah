import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSalaryMediaSchema } from "@/lib/migrate-settings";

// GET /api/salary/[id]/payments?year=2026
// → List all payment records for one salary entry, optionally filtered by year.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureSalaryMediaSchema();
    const { id } = await params;
    const url = new URL(request.url);
    const yearParam = url.searchParams.get("year");

    const where: { salaryId: string; year?: number } = { salaryId: id };
    if (yearParam) {
      const y = Number(yearParam);
      if (!Number.isNaN(y)) where.year = y;
    }

    const payments = await db.salaryPayment.findMany({
      where,
      orderBy: [{ year: "asc" }, { month: "asc" }],
    });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("Error fetching salary payments:", error);
    return NextResponse.json(
      { error: "Gagal mengambil catatan pembayaran gaji" },
      { status: 500 }
    );
  }
}

// POST /api/salary/[id]/payments
// Body: { year, month, lessonCount, amount, notes? }
// → Upsert a payment record.
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

    const lessonCount = Number(body.lessonCount) || 0;
    const amount = Number(body.amount) || 0;
    const notes = String(body.notes ?? "").trim();

    const payment = await db.salaryPayment.upsert({
      where: {
        salaryId_year_month: { salaryId: id, year, month },
      },
      update: {
        lessonCount,
        amount,
        notes,
        paidAt: new Date(),
      },
      create: {
        salaryId: id,
        year,
        month,
        lessonCount,
        amount,
        notes,
        paidAt: new Date(),
      },
    });

    return NextResponse.json(payment, { status: 201 });
  } catch (error) {
    console.error("Error upserting salary payment:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan catatan pembayaran gaji" },
      { status: 500 }
    );
  }
}

// DELETE /api/salary/[id]/payments?year=2026&month=1
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
      await db.salaryPayment.delete({
        where: {
          salaryId_year_month: { salaryId: id, year, month },
        },
      });
    } catch {
      // Already deleted — treat as success.
    }

    return NextResponse.json({ message: "Catatan pembayaran dihapus" });
  } catch (error) {
    console.error("Error deleting salary payment:", error);
    return NextResponse.json(
      { error: "Gagal menghapus catatan pembayaran gaji" },
      { status: 500 }
    );
  }
}
