import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const room = await db.inventoryRoom.findUnique({
      where: { id },
      include: {
        building: true,
        biliks: { include: { cabinets: true } },
        cabinets: { include: { bilik: true } },
        items: true,
      },
    });

    if (!room) {
      return NextResponse.json(
        { error: "Ruangan inventaris tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(room);
  } catch (error) {
    console.error("Error fetching inventory room:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data ruangan inventaris" },
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

    const room = await db.inventoryRoom.update({
      where: { id },
      data: {
        name: body.name,
        buildingId: body.buildingId || null,
        floor: body.floor ?? "",
        description: body.description ?? "",
      },
      include: { building: true },
    });

    return NextResponse.json(room);
  } catch (error) {
    console.error("Error updating inventory room:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui ruangan inventaris" },
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
    await db.inventoryRoom.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Ruangan inventaris berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting inventory room:", error);
    return NextResponse.json(
      { error: "Gagal menghapus ruangan inventaris" },
      { status: 500 }
    );
  }
}
