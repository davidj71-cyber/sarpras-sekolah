import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");
    const bilikId = searchParams.get("bilikId");

    const where: { roomId?: string; bilikId?: string } = {};
    if (roomId) where.roomId = roomId;
    if (bilikId) where.bilikId = bilikId;

    const cabinets = await db.inventoryCabinet.findMany({
      where: Object.keys(where).length ? where : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        room: true,
        bilik: true,
        items: true,
      },
    });

    return NextResponse.json(cabinets);
  } catch (error) {
    console.error("Error fetching inventory cabinets:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar lemari inventaris" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // roomId wajib; bilikId opsional (jika diisi, bilik harus milik room tsb)
    const cabinet = await db.inventoryCabinet.create({
      data: {
        number: body.number,
        description: body.description ?? "",
        roomId: body.roomId,
        bilikId: body.bilikId || null,
        condition: body.condition ?? "Baik",
        acquisitionYear: body.acquisitionYear ? Number(body.acquisitionYear) : null,
        acquisitionPrice: body.acquisitionPrice ? Number(body.acquisitionPrice) : 0,
        sumberDana: body.sumberDana ?? "",
        // Dimensi fisik
        length: Number(body.length ?? 0),
        width: Number(body.width ?? 0),
        height: Number(body.height ?? 0),
        area: Number(body.area ?? 0),
        volume: Number(body.volume ?? 0),
        // Metadata aset
        registrationNumber: body.registrationNumber ?? "",
        documentNumber: body.documentNumber ?? "",
        responsiblePerson: body.responsiblePerson ?? "",
        usefulLife: body.usefulLife ? Number(body.usefulLife) : null,
        notes: body.notes ?? "",
      },
      include: { room: true, bilik: true },
    });

    return NextResponse.json(cabinet, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory cabinet:", error);
    return NextResponse.json(
      { error: "Gagal membuat lemari inventaris" },
      { status: 500 }
    );
  }
}
