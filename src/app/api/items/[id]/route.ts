import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await db.item.findUnique({
      where: { id },
      include: {
        room: true,
        bilik: true,
        lemari: true,
      },
    });

    if (!item) {
      return NextResponse.json(
        { error: "Barang tidak ditemukan" },
        { status: 404 }
      );
    }

    // Parse photos JSON
    const itemWithPhotos = {
      ...item,
      photos: JSON.parse(item.photos || "[]"),
    };

    return NextResponse.json(itemWithPhotos);
  } catch (error) {
    console.error("Error fetching item:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data barang" },
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

    const item = await db.item.update({
      where: { id },
      data: {
        name: body.name,
        kibType: body.kibType,
        registrationNumber: body.registrationNumber,
        brand: body.brand,
        model: body.model,
        serialNumber: body.serialNumber,
        material: body.material,
        yearMade: body.yearMade ?? null,
        size: body.size,
        condition: body.condition,
        quantity: body.quantity,
        unit: body.unit,
        origin: body.origin,
        price: body.price,
        acquisitionYear: body.acquisitionYear ?? null,
        notes: body.notes,
        roomId: body.roomId ?? null,
        bilikId: body.bilikId ?? null,
        lemariId: body.lemariId ?? null,
        landCertificate: body.landCertificate,
        landArea: body.landArea,
        landStatus: body.landStatus,
        landUsage: body.landUsage,
        buildingLevel: body.buildingLevel,
        buildingConcrete: body.buildingConcrete,
        buildingArea: body.buildingArea,
        buildingLocation: body.buildingLocation,
        roadLength: body.roadLength,
        roadWidth: body.roadWidth,
        roadArea: body.roadArea,
        roadLocation: body.roadLocation,
        contractNumber: body.contractNumber,
        implementationYear: body.implementationYear ?? null,
        photos: JSON.stringify(body.photos ?? []),
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui barang" },
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
    await db.item.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Barang berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json(
      { error: "Gagal menghapus barang" },
      { status: 500 }
    );
  }
}
