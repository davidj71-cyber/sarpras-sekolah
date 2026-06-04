import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    const lemariList = await db.lemari.findMany({
      where: roomId ? { roomId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        room: true,
        items: true,
      },
    });

    return NextResponse.json(lemariList);
  } catch (error) {
    console.error("Error fetching lemari:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar lemari" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const lemari = await db.lemari.create({
      data: {
        number: body.number,
        description: body.description ?? "",
        roomId: body.roomId,
      },
    });

    return NextResponse.json(lemari, { status: 201 });
  } catch (error) {
    console.error("Error creating lemari:", error);
    return NextResponse.json(
      { error: "Gagal membuat lemari" },
      { status: 500 }
    );
  }
}
