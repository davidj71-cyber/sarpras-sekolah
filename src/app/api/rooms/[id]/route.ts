import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const room = await db.room.findUnique({
      where: { id },
      include: {
        biliks: true,
        lemari: true,
        items: true,
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: "Ruangan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error("Error fetching room:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data ruangan" },
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

    const room = await db.room.update({
      where: { id },
      data: {
        name: body.name,
        building: body.building,
        floor: body.floor,
        description: body.description,
      },
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error("Error updating room:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui ruangan" },
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
    await db.room.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Ruangan berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting room:", error);
    return NextResponse.json(
      { error: "Gagal menghapus ruangan" },
      { status: 500 }
    );
  }
}
