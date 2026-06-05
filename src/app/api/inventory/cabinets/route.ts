import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    const cabinets = await db.inventoryCabinet.findMany({
      where: roomId ? { roomId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        room: true,
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

    const cabinet = await db.inventoryCabinet.create({
      data: {
        number: body.number,
        description: body.description ?? "",
        roomId: body.roomId,
      },
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
