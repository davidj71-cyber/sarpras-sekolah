import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const rooms = await db.inventoryRoom.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        biliks: true,
        cabinets: true,
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
        building: body.building ?? "",
        floor: body.floor ?? "",
        description: body.description ?? "",
      },
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
