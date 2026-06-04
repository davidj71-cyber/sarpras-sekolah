import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const roomId = searchParams.get("roomId");

    const biliks = await db.bilik.findMany({
      where: roomId ? { roomId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        room: true,
        items: true,
      },
    });

    return NextResponse.json(biliks);
  } catch (error) {
    console.error("Error fetching biliks:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar bilik" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const bilik = await db.bilik.create({
      data: {
        name: body.name,
        number: body.number ?? "",
        description: body.description ?? "",
        roomId: body.roomId,
      },
    });

    return NextResponse.json(bilik, { status: 201 });
  } catch (error) {
    console.error("Error creating bilik:", error);
    return NextResponse.json(
      { error: "Gagal membuat bilik" },
      { status: 500 }
    );
  }
}
