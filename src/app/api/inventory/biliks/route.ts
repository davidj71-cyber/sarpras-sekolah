import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    const biliks = await db.inventoryBilik.findMany({
      where: roomId ? { roomId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        room: true,
        items: true,
        cabinets: true,
      },
    });

    return NextResponse.json(biliks);
  } catch (error) {
    console.error("Error fetching inventory biliks:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar bilik inventaris" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const bilik = await db.inventoryBilik.create({
      data: {
        name: body.name,
        number: body.number ?? "",
        description: body.description ?? "",
        roomId: body.roomId,
        condition: body.condition ?? "Baik",
        acquisitionYear: body.acquisitionYear ? Number(body.acquisitionYear) : null,
        acquisitionPrice: body.acquisitionPrice ? Number(body.acquisitionPrice) : 0,
        sumberDana: body.sumberDana ?? "",
      },
    });

    return NextResponse.json(bilik, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory bilik:", error);
    return NextResponse.json(
      { error: "Gagal membuat bilik inventaris" },
      { status: 500 }
    );
  }
}
