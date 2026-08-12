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

    // ── 1. INSERT SEMUA SEKALIGUS dengan skipDuplicates ──
    // skipDuplicates penting karena dialog sudah memfilter bulan belum-bayar,
    // tapi sebagai safety net kalau ada race condition.
    const now = new Date();
    const result = await db.mediaPayment.createMany({
      data: items.map((it) => ({
        mediaId: it.mediaId,
        year,
        month: it.month,
        amount: it.amount,
        paidAt: now,
      })),
      skipDuplicates: true,
    });

    const insertedCount = result.count; // jumlah baris benar-benar baru

    // ── 2. Recompute totalReceived untuk tiap media yang terdampak ──
    // Pakai groupBy untuk ambil semua sum dalam 1 query.
    const affectedMediaIds = Array.from(new Set(items.map((it) => it.mediaId)));

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
      skipped: items.length - insertedCount, // duplikat yang di-skip
    });
  } catch (error) {
    console.error("Error batch recording media payments:", error);
    return NextResponse.json(
      { error: "Gagal mencatat pembayaran media secara batch" },
      { status: 500 }
    );
  }
}
