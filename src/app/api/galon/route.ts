import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── /api/galon — Galon (Catatan Penerimaan & Pembayaran Galon) ───────────────
// List semua entry galon, atau buat baru.
export async function GET() {
  try {
    const entries = await db.galonEntry.findMany({
      orderBy: { receivedDate: "desc" },
      include: {
        store: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(entries);
  } catch (error) {
    console.error("Error fetching galon entries:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar galon" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const emptyCount = Number(body.emptyCount) || 0;
    const filledCount = Number(body.filledCount) || 0;

    // Payment logic: Cash = langsung LUNAS, Bon = BELUM_BAYAR sampai ditandai lunas
    const paymentMethod = String(body.paymentMethod ?? "Cash").trim() === "Bon" ? "Bon" : "Cash";
    const paymentStatus = paymentMethod === "Cash" ? "LUNAS" : String(body.paymentStatus ?? "BELUM_BAYAR").trim();

    // Parse tanggal terima (default: now)
    const receivedDateRaw = body.receivedDate ? new Date(body.receivedDate) : new Date();
    if (isNaN(receivedDateRaw.getTime())) {
      return NextResponse.json(
        { error: "Tanggal terima tidak valid" },
        { status: 400 }
      );
    }

    // Parse tanggal bayar (nullable). Untuk Cash, default = tanggal terima.
    let paidAt: Date | null = null;
    if (paymentMethod === "Cash") {
      paidAt = receivedDateRaw;
    } else if (body.paidAt) {
      const d = new Date(body.paidAt);
      if (!isNaN(d.getTime())) paidAt = d;
    }

    // StoreId opsional. Kalau ada storeId, snapshot nama toko untuk cetak.
    const storeId = body.storeId ? String(body.storeId) : null;
    let storeName = String(body.storeName ?? "").trim();
    if (storeId && !storeName) {
      const store = await db.store.findUnique({ where: { id: storeId }, select: { name: true } });
      if (store) storeName = store.name;
    }

    const entry = await db.galonEntry.create({
      data: {
        emptyCount,
        filledCount,
        storeId: storeId || null,
        storeName,
        courier: String(body.courier ?? "").trim(),
        recipient: String(body.recipient ?? "").trim(),
        receivedDate: receivedDateRaw,
        paymentMethod,
        paymentStatus,
        paidAt,
        notes: String(body.notes ?? "").trim(),
      },
      include: { store: { select: { id: true, name: true } } },
    });

    return NextResponse.json(entry, { status: 201 });
  } catch (error) {
    console.error("Error creating galon entry:", error);
    return NextResponse.json(
      { error: "Gagal membuat data galon" },
      { status: 500 }
    );
  }
}
