import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSalaryMediaSchema } from "@/lib/migrate-settings";

// POST /api/media/payments/batch
// Body: { year: number, items: Array<{ mediaId, month, amount }> }
// → Insert banyak catatan pembayaran sekaligus (1 query INSERT),
//   lalu recompute totalReceived untuk tiap media yang terdampak
//   (1 query aggregate + N query update paralel).
//
// Menggantikan loop POST /api/media/[id]/payments di client yang
// lambat karena N sequential request (bisa 30+ detik untuk 60 baris).
export async function POST(request: NextRequest) {
  try {
    await ensureSalaryMediaSchema();

    const body = await request.json();
    const year = Number(body.year);
    const itemsRaw: unknown = body.items;

    if (!Number.isFinite(year) || !Array.isArray(itemsRaw) || itemsRaw.length === 0) {
      return NextResponse.json(
        { error: "Body tidak valid. Butuh { year, items: [{ mediaId, month, amount }] }" },
        { status: 400 }
      );
    }

    // ── Validasi + normalisasi semua item sekaligus ──
    const items: Array<{ mediaId: string; month: number; amount: number }> = [];
    const invalid: number[] = [];

    itemsRaw.forEach((it: unknown, idx: number) => {
      if (typeof it !== "object" || it === null) {
        invalid.push(idx);
        return;
      }
      const o = it as Record<string, unknown>;
      const mediaId = String(o.mediaId ?? "").trim();
      const month = Number(o.month);
      const amount = Number(o.amount) || 0;

      if (!mediaId || !Number.isFinite(month) || month < 1 || month > 12) {
        invalid.push(idx);
        return;
      }
      items.push({ mediaId, month, amount });
    });

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada item valid untuk dicatat", invalid },
        { status: 400 }
      );
    }

    // ── 1. Filter kombinasi (mediaId, month) yang SUDAH dibayar ──
    // Catatan: argumen `skipDuplicates` pada Prisma createMany TIDAK didukung
    // oleh SQLite (database dev). Schema memiliki @@unique([mediaId, year, month]),
    // jadi duplikat akan throw unique-constraint error bila tidak difilter dulu.
    // Solusi: query pembayaran yang sudah ada untuk tahun ini, lalu filter di
    // aplikasi. Kompatibel dengan SQLite (dev) maupun PostgreSQL (prod).
    const affectedMediaIds = Array.from(new Set(items.map((it) => it.mediaId)));
    const affectedMonths = Array.from(new Set(items.map((it) => it.month)));

    const existing = await db.mediaPayment.findMany({
      where: {
        year,
        mediaId: { in: affectedMediaIds },
        month: { in: affectedMonths },
      },
      select: { mediaId: true, month: true },
    });
    const existingKeys = new Set(existing.map((e) => `${e.mediaId}|${e.month}`));

    const newItems = items.filter(
      (it) => !existingKeys.has(`${it.mediaId}|${it.month}`)
    );
    const skippedCount = items.length - newItems.length;

    // ── 2. INSERT hanya item baru (tanpa skipDuplicates) ──
    let insertedCount = 0;
    if (newItems.length > 0) {
      const now = new Date();
      const result = await db.mediaPayment.createMany({
        data: newItems.map((it) => ({
          mediaId: it.mediaId,
          year,
          month: it.month,
          amount: it.amount,
          paidAt: now,
        })),
      });
      insertedCount = result.count;
    }

    // ── 3. Recompute totalReceived untuk tiap media yang terdampak ──
    // Pakai groupBy untuk ambil semua sum dalam 1 query.

    const sums = await db.mediaPayment.groupBy({
      by: ["mediaId"],
      where: { mediaId: { in: affectedMediaIds } },
      _sum: { amount: true },
    });

    // Update tiap MediaEntry paralel (N query, tapi paralel jadi cepat)
    await Promise.all(
      sums.map((s) =>
        db.mediaEntry.update({
          where: { id: s.mediaId },
          data: { totalReceived: s._sum.amount ?? 0 },
        })
      )
    );

    return NextResponse.json({
      recorded: insertedCount,
      requested: items.length,
      affectedMedia: affectedMediaIds.length,
      skipped: skippedCount,
    });
  } catch (error) {
    console.error("Error batch recording media payments:", error);
    return NextResponse.json(
      { error: "Gagal mencatat pembayaran media secara batch" },
      { status: 500 }
    );
  }
}
