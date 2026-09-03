import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureBarangMasukSchema } from "@/lib/migrate-settings";

// ─── /api/barang-masuk — Barang Masuk ────────────────────────────────────────
// Jika body.orderId di-set, auto-fill storeId & items dari pesanan terkait.
// Jika orderId null, simpan senderName (pengirim) untuk barang masuk lepas.
export async function GET() {
  try {
    await ensureBarangMasukSchema();

    const barangMasuk = await db.barangMasuk.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        store: true,
        employee: true,
        items: true,
        order: { include: { store: true } },
      },
    });

    return NextResponse.json(barangMasuk);
  } catch (error) {
    console.error("Error fetching barang masuk:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar barang masuk" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureBarangMasukSchema();

    const body = await request.json();

    // ── Jika orderId di-set, auto-fill storeId & items dari pesanan ──────────
    // Logic: barang masuk berasal dari pesanan → toko sudah pasti (dari pesanan),
    // items juga auto-fill dari OrderItem pesanan. senderName dikosongkan.
    let storeId = body.storeId || null;
    let items = body.items;
    let senderName = String(body.senderName ?? "").trim();

    if (body.orderId) {
      const order = await db.order.findUnique({
        where: { id: String(body.orderId) },
        include: { items: true },
      });
      if (order) {
        storeId = order.storeId; // auto-fill toko dari pesanan
        senderName = ""; // pesanan sudah punya toko, tidak perlu pengirim
        // Auto-fill items dari OrderItem kalau tidak dikirim manual
        if (!items || !Array.isArray(items) || items.length === 0) {
          items = order.items.map((oi) => ({
            itemName: oi.itemName,
            quantity: oi.quantity,
            unit: oi.unit,
            condition: "Baik",
            notes: "",
          }));
        }
      }
    }

    // ── Parse proofPhotos — JSON array of base64 data URLs ──
    let proofPhotos = "[]";
    if (Array.isArray(body.proofPhotos)) {
      proofPhotos = JSON.stringify(
        body.proofPhotos.filter((p: unknown) => typeof p === "string" && (p as string).startsWith("data:image/"))
      );
    }

    const barangMasuk = await db.barangMasuk.create({
      data: {
        documentNumber: body.documentNumber,
        entryDate: body.entryDate ? new Date(body.entryDate) : new Date(),
        storeId: storeId || null,
        employeeId: body.employeeId || null,
        source: body.source ?? "",
        notes: body.notes ?? "",
        status: body.status ?? "Draft",
        orderId: body.orderId || null,
        senderName,
        storageLocation: String(body.storageLocation ?? "").trim(),
        proofPhotos,
        items: items
          ? {
              create: items.map(
                (item: {
                  itemName: string;
                  quantity?: number;
                  unit?: string;
                  condition?: string;
                  notes?: string;
                }) => ({
                  itemName: item.itemName,
                  quantity: item.quantity ?? 1,
                  unit: item.unit ?? "Unit",
                  condition: item.condition ?? "Baik",
                  notes: item.notes ?? "",
                })
              ),
            }
          : undefined,
      },
      include: {
        store: true,
        employee: true,
        items: true,
        order: { include: { store: true } },
      },
    });

    return NextResponse.json(barangMasuk, { status: 201 });
  } catch (error) {
    console.error("Error creating barang masuk:", error);
    return NextResponse.json(
      { error: "Gagal membuat barang masuk" },
      { status: 500 }
    );
  }
}
