import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const buildingId = searchParams.get("buildingId");

    const rooms = await db.inventoryRoom.findMany({
      where: buildingId ? { buildingId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        building: true,
        biliks: true,
        cabinets: { include: { bilik: true } },
        items: true,
      },
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error("Error fetching inventory rooms:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar ruangan inventaris" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const room = await db.inventoryRoom.create({
      data: {
        name: body.name,
        buildingId: body.buildingId || null,
        floor: body.floor ?? "",
        description: body.description ?? "",
      },
      include: { building: true },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory room:", error);
    return NextResponse.json(
      { error: "Gagal membuat ruangan inventaris" },
      { status: 500 }
    );
  }
}
