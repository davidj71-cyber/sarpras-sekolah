import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSalaryMediaSchema } from "@/lib/migrate-settings";

// POST /api/salary/payments/batch
// Body: { year: number, printMode: 'signature' | 'bank', items: Array<{ salaryId, month, lessonCount, amount }> }
// → Tracking cetak per mode:
//   - Saat cetak mode 'signature': set signaturePrinted=true
//   - Saat cetak mode 'bank': set bankPrinted=true
//   - Jika kedua flag true → set fullyPaidAt=now() (transaksi selesai)
//   - Record baru dibuat jika belum ada (dengan amount/lessonCount),
//     tapi fullyPaidAt hanya ter-set saat kedua mode tercetak.
export async function POST(request: NextRequest) {
  try {
    await ensureSalaryMediaSchema();

    const body = await request.json();
    const year = Number(body.year);
    const printMode: string = body.printMode === "bank" ? "bank" : "signature";
    const itemsRaw: unknown = body.items;

    if (!Number.isFinite(year) || !Array.isArray(itemsRaw) || itemsRaw.length === 0) {
      return NextResponse.json(
        { error: "Body tidak valid. Butuh { year, printMode, items: [{ salaryId, month, lessonCount, amount }] }" },
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

    const affectedSalaryIds = Array.from(new Set(items.map((it) => it.salaryId)));
    const affectedMonths = Array.from(new Set(items.map((it) => it.month)));

    // ── Query record yang sudah ada untuk (salaryId, month) kombinasi ──
    const existing = await db.salaryPayment.findMany({
      where: {
        year,
        salaryId: { in: affectedSalaryIds },
        month: { in: affectedMonths },
      },
    });
    const existingMap = new Map(existing.map((e) => [`${e.salaryId}|${e.month}`, e]));

    const now = new Date();
    let insertedCount = 0;
    let updatedCount = 0;
    let fullyPaidCount = 0;

    // ── Proses tiap item: insert baru atau update flag ──
    for (const it of items) {
      const key = `${it.salaryId}|${it.month}`;
      const ex = existingMap.get(key);

      if (!ex) {
        // Record belum ada → INSERT baru dengan flag sesuai printMode
        // fullyPaidAt hanya ter-set jika kedua mode sudah tercetak.
        // Karena ini record baru, mode pertama saja → fullyPaidAt = null.
        await db.salaryPayment.create({
          data: {
            salaryId: it.salaryId,
            year,
            month: it.month,
            lessonCount: it.lessonCount,
            amount: it.amount,
            paidAt: now,
            signaturePrinted: printMode === "signature",
            bankPrinted: printMode === "bank",
            fullyPaidAt: null, // baru 1 mode tercetak, belum lengkap
          },
        });
        insertedCount++;
      } else {
        // Record sudah ada → UPDATE flag sesuai printMode
        const newSignaturePrinted = printMode === "signature" ? true : ex.signaturePrinted;
        const newBankPrinted = printMode === "bank" ? true : ex.bankPrinted;
        const bothPrinted = newSignaturePrinted && newBankPrinted;

        // Set fullyPaidAt hanya jika kedua mode sudah tercetak DAN belum pernah di-set
        const newFullyPaidAt = bothPrinted ? (ex.fullyPaidAt ?? now) : ex.fullyPaidAt;

        const wasFullyPaid = ex.fullyPaidAt !== null;
        await db.salaryPayment.update({
          where: { id: ex.id },
          data: {
            signaturePrinted: newSignaturePrinted,
            bankPrinted: newBankPrinted,
            fullyPaidAt: newFullyPaidAt,
            // Update amount/lessonCount jika berubah (mis. harga honor diubah)
            lessonCount: it.lessonCount,
            amount: it.amount,
          },
        });
        updatedCount++;
        if (!wasFullyPaid && bothPrinted) {
          fullyPaidCount++; // baru saja lengkap
        }
      }
    }

    // ── Recompute totalReceived untuk tiap salary yang terdampak ──
    // Hanya hitung record yang sudah fullyPaid (transaksi selesai) sebagai penerimaan.
    // Record yang baru 1 mode tercetak belum dihitung sebagai penerimaan final,
    // tapi amount tetap tersimpan untuk tracking.
    const sums = await db.salaryPayment.groupBy({
      by: ["salaryId"],
      where: {
        salaryId: { in: affectedSalaryIds },
        fullyPaidAt: { not: null },
      },
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
      updated: updatedCount,
      fullyPaid: fullyPaidCount,
      requested: items.length,
      affectedSalary: affectedSalaryIds.length,
      printMode,
    });
  } catch (error) {
    console.error("Error batch recording salary payments:", error);
    return NextResponse.json(
      { error: "Gagal mencatat pembayaran gaji secara batch" },
      { status: 500 }
    );
  }
}
