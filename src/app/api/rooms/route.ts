import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const rooms = await db.room.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        biliks: true,
        lemari: true,
      },
    });

    return NextResponse.json(rooms);
  } catch (error) {
    console.error("Error fetching rooms:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar ruangan" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const room = await db.room.create({
      data: {
        name: body.name,
        building: body.building ?? "",
        floor: body.floor ?? "",
        description: body.description ?? "",
      },
    });

    return NextResponse.json(room, { status: 201 });
  } catch (error) {
    console.error("Error creating room:", error);
    return NextResponse.json(
      { error: "Gagal membuat ruangan" },
      { status: 500 }
    );
  }
}
