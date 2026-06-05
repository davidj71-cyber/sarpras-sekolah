import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    const bilikId = searchParams.get("bilikId");
    const cabinetId = searchParams.get("cabinetId");

    const where: Record<string, unknown> = {};
    if (roomId) where.roomId = roomId;
    if (bilikId) where.bilikId = bilikId;
    if (cabinetId) where.cabinetId = cabinetId;

    const items = await db.inventoryItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        room: true,
        bilik: true,
        cabinet: true,
      },
    });

    // Parse photos JSON for each item
    const itemsWithPhotos = items.map((item) => ({
      ...item,
      photos: JSON.parse(item.photos || "[]"),
    }));

    return NextResponse.json(itemsWithPhotos);
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar barang inventaris" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const item = await db.inventoryItem.create({
      data: {
        name: body.name,
        registrationNumber: body.registrationNumber ?? "",
        brand: body.brand ?? "",
        condition: body.condition ?? "Baik",
        quantity: body.quantity ?? 1,
        unit: body.unit ?? "Unit",
        price: body.price ?? 0,
        sumberDana: body.sumberDana ?? "",
        tahunPengadaan: body.tahunPengadaan ?? null,
        notes: body.notes ?? "",
        roomId: body.roomId ?? null,
        bilikId: body.bilikId ?? null,
        cabinetId: body.cabinetId ?? null,
        photos: JSON.stringify(body.photos ?? []),
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory item:", error);
    return NextResponse.json(
      { error: "Gagal membuat barang inventaris" },
      { status: 500 }
    );
  }
}
