import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSalaryMediaSchema } from "@/lib/migrate-settings";

// POST /api/salary/payments/batch
// Body: { year: number, items: Array<{ salaryId, month, lessonCount, amount }> }
// → Insert banyak catatan pembayaran gaji sekaligus (1 query INSERT),
//   lalu recompute totalReceived untuk tiap salary yang terdampak
//   (1 query aggregate + N query update paralel).
//
// Menggantikan loop POST /api/salary/[id]/payments di client yang
// lambat karena N sequential request (bisa 30+ detik untuk 60 baris).
export async function POST(request: NextRequest) {
  try {
    await ensureSalaryMediaSchema();

    const body = await request.json();
    const year = Number(body.year);
    const itemsRaw: unknown = body.items;

    if (!Number.isFinite(year) || !Array.isArray(itemsRaw) || itemsRaw.length === 0) {
      return NextResponse.json(
        { error: "Body tidak valid. Butuh { year, items: [{ salaryId, month, lessonCount, amount }] }" },
        { status: 400 }
      );
    }

    // ── Validasi + normalisasi semua item sekaligus ──
    const items: Array<{ salaryId: string; month: number; lessonCount: number; amount: number }> = [];
    const invalid: number[] = [];

    itemsRaw.forEach((it: unknown, idx: number) => {
      if (typeof it !== "object" || it === null) {
        invalid.push(idx);
        return;
      }
      const o = it as Record<string, unknown>;
      const salaryId = String(o.salaryId ?? "").trim();
      const month = Number(o.month);
      const lessonCount = Number(o.lessonCount) || 0;
      const amount = Number(o.amount) || 0;

      if (!salaryId || !Number.isFinite(month) || month < 1 || month > 12) {
        invalid.push(idx);
        return;
      }
      items.push({ salaryId, month, lessonCount, amount });
    });

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada item valid untuk dicatat", invalid },
        { status: 400 }
      );
    }

    // ── 1. INSERT SEMUA SEKALIGUS dengan skipDuplicates ──
    // skipDuplicates penting karena dialog sudah memfilter bulan belum-bayar,
    // tapi sebagai safety net kalau ada race condition.
    const now = new Date();
    const result = await db.salaryPayment.createMany({
      data: items.map((it) => ({
        salaryId: it.salaryId,
        year,
        month: it.month,
        lessonCount: it.lessonCount,
        amount: it.amount,
        paidAt: now,
      })),
      skipDuplicates: true,
    });

    const insertedCount = result.count;

    // ── 2. Recompute totalReceived untuk tiap salary yang terdampak ──
    const affectedSalaryIds = Array.from(new Set(items.map((it) => it.salaryId)));

    const sums = await db.salaryPayment.groupBy({
      by: ["salaryId"],
      where: { salaryId: { in: affectedSalaryIds } },
      _sum: { amount: true },
    });

    await Promise.all(
      sums.map((s) =>
        db.salaryEntry.update({
          where: { id: s.salaryId },
          data: { totalReceived: s._sum.amount ?? 0 },
        })
      )
    );

    return NextResponse.json({
      recorded: insertedCount,
      requested: items.length,
      affectedSalary: affectedSalaryIds.length,
      skipped: items.length - insertedCount,
    });
  } catch (error) {
    console.error("Error batch recording salary payments:", error);
    return NextResponse.json(
      { error: "Gagal mencatat pembayaran gaji secara batch" },
      { status: 500 }
    );
  }
}
