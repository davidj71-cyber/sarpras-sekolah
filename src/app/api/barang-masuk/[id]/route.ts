import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const barangMasuk = await db.barangMasuk.findUnique({
      where: { id },
      include: {
        store: true,
        employee: true,
        items: true,
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
    const { id } = await params;
    const body = await request.json();

    // If only status update
    if (body.status && !body.documentNumber) {
      const updated = await db.barangMasuk.update({
        where: { id },
        data: { status: body.status },
        include: { store: true, employee: true, items: true },
      });
      return NextResponse.json(updated);
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
        storeId: body.storeId || null,
        employeeId: body.employeeId || null,
        source: body.source ?? "",
        notes: body.notes ?? "",
        status: body.status ?? "Draft",
        items: body.items
          ? {
              create: body.items.map(
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
