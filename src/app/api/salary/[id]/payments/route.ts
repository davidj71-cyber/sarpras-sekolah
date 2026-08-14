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

    // Parse proofPhotos JSON string → array
    const paymentsWithPhotos = payments.map((p) => ({
      ...p,
      proofPhotos: JSON.parse(p.proofPhotos || "[]") as string[],
    }));

    return NextResponse.json(paymentsWithPhotos);
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

    // ── Auto-update totalReceived on the parent SalaryEntry ──
    // totalReceived = sum of ALL payment amounts for this salary.
    const allPayments = await db.salaryPayment.findMany({
      where: { salaryId: id },
      select: { amount: true },
    });
    const totalReceived = allPayments.reduce((s, p) => s + (p.amount || 0), 0);
    await db.salaryEntry.update({
      where: { id },
      data: { totalReceived },
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

// PATCH /api/salary/[id]/payments
// Body: { year, month, proofPhotos: string[] }
// → Update proof photos for a payment record.
export async function PATCH(
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

    const proofPhotos = JSON.stringify(
      Array.isArray(body.proofPhotos) ? body.proofPhotos : []
    );

    const payment = await db.salaryPayment.update({
      where: {
        salaryId_year_month: { salaryId: id, year, month },
      },
      data: { proofPhotos },
    });

    return NextResponse.json({
      ...payment,
      proofPhotos: JSON.parse(payment.proofPhotos || "[]") as string[],
    });
  } catch (error) {
    console.error("Error updating proof photos:", error);
    return NextResponse.json(
      { error: "Gagal menyimpan foto bukti pembayaran" },
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

    // ── Auto-update totalReceived on the parent SalaryEntry ──
    const remainingPayments = await db.salaryPayment.findMany({
      where: { salaryId: id },
      select: { amount: true },
    });
    const totalReceived = remainingPayments.reduce((s, p) => s + (p.amount || 0), 0);
    await db.salaryEntry.update({
      where: { id },
      data: { totalReceived },
    });

    return NextResponse.json({ message: "Catatan pembayaran dihapus", totalReceived });
  } catch (error) {
    console.error("Error deleting salary payment:", error);
    return NextResponse.json(
      { error: "Gagal menghapus catatan pembayaran gaji" },
      { status: 500 }
    );
  }
}
