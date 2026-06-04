import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const kibType = searchParams.get("kibType");
    const roomId = searchParams.get("roomId");
    const bilikId = searchParams.get("bilikId");
    const lemariId = searchParams.get("lemariId");

    const where: Record<string, unknown> = {};
    if (kibType) where.kibType = kibType;
    if (roomId) where.roomId = roomId;
    if (bilikId) where.bilikId = bilikId;
    if (lemariId) where.lemariId = lemariId;

    const items = await db.item.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        room: true,
        bilik: true,
        lemari: true,
      },
    });

    // Parse photos JSON for each item
    const itemsWithPhotos = items.map((item) => ({
      ...item,
      photos: JSON.parse(item.photos || "[]"),
    }));

    return NextResponse.json(itemsWithPhotos);
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar barang" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const item = await db.item.create({
      data: {
        name: body.name,
        kibType: body.kibType ?? "B",
        registrationNumber: body.registrationNumber ?? "",
        brand: body.brand ?? "",
        model: body.model ?? "",
        serialNumber: body.serialNumber ?? "",
        material: body.material ?? "",
        yearMade: body.yearMade ?? null,
        size: body.size ?? "",
        condition: body.condition ?? "Baik",
        quantity: body.quantity ?? 1,
        unit: body.unit ?? "Unit",
        origin: body.origin ?? "",
        sumberDana: body.sumberDana ?? "",
        price: body.price ?? 0,
        acquisitionYear: body.acquisitionYear ?? null,
        notes: body.notes ?? "",
        roomId: body.roomId ?? null,
        bilikId: body.bilikId ?? null,
        lemariId: body.lemariId ?? null,
        landCertificate: body.landCertificate ?? "",
        landArea: body.landArea ?? 0,
        landStatus: body.landStatus ?? "",
        landUsage: body.landUsage ?? "",
        buildingLevel: body.buildingLevel ?? "",
        buildingConcrete: body.buildingConcrete ?? "",
        buildingArea: body.buildingArea ?? 0,
        buildingLocation: body.buildingLocation ?? "",
        roadLength: body.roadLength ?? 0,
        roadWidth: body.roadWidth ?? 0,
        roadArea: body.roadArea ?? 0,
        roadLocation: body.roadLocation ?? "",
        contractNumber: body.contractNumber ?? "",
        implementationYear: body.implementationYear ?? null,
        photos: JSON.stringify(body.photos ?? []),
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating item:", error);
    return NextResponse.json(
      { error: "Gagal membuat barang" },
      { status: 500 }
    );
  }
}
