import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureBarangMasukSchema } from "@/lib/migrate-settings";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureBarangMasukSchema();

    const { id } = await params;
    const barangMasuk = await db.barangMasuk.findUnique({
      where: { id },
      include: {
        store: true,
        employee: true,
        items: true,
        order: { include: { store: true } },
      },
    });

    if (!barangMasuk) {
      return NextResponse.json(
        { error: "Barang masuk tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(barangMasuk);
  } catch (error) {
    console.error("Error fetching barang masuk:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data barang masuk" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureBarangMasukSchema();

    const { id } = await params;
    const body = await request.json();

    // If only status update
    if (body.status && !body.documentNumber) {
      const updated = await db.barangMasuk.update({
        where: { id },
        data: { status: body.status },
        include: { store: true, employee: true, items: true, order: { include: { store: true } } },
      });
      return NextResponse.json(updated);
    }

    // ── Jika orderId di-set, auto-fill storeId & items dari pesanan ──────────
    let storeId = body.storeId || null;
    let items = body.items;
    let senderName = String(body.senderName ?? "").trim();

    if (body.orderId) {
      const order = await db.order.findUnique({
        where: { id: String(body.orderId) },
        include: { items: true },
      });
      if (order) {
        storeId = order.storeId;
        senderName = "";
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

    // Full update: delete old items and recreate
    await db.barangMasukItem.deleteMany({
      where: { barangMasukId: id },
    });

    const barangMasuk = await db.barangMasuk.update({
      where: { id },
      data: {
        documentNumber: body.documentNumber,
        entryDate: body.entryDate ? new Date(body.entryDate) : undefined,
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

    return NextResponse.json(barangMasuk);
  } catch (error) {
    console.error("Error updating barang masuk:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui barang masuk" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureBarangMasukSchema();

    const { id } = await params;

    await db.barangMasukItem.deleteMany({
      where: { barangMasukId: id },
    });

    await db.barangMasuk.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting barang masuk:", error);
    return NextResponse.json(
      { error: "Gagal menghapus barang masuk" },
      { status: 500 }
    );
  }
}
