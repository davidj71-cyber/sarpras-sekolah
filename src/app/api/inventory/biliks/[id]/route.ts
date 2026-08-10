import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bilik = await db.inventoryBilik.findUnique({
      where: { id },
      include: {
        room: true,
        items: true,
        cabinets: true,
      },
    });

    if (!bilik) {
      return NextResponse.json(
        { error: "Bilik inventaris tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(bilik);
  } catch (error) {
    console.error("Error fetching inventory bilik:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data bilik inventaris" },
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

    const bilik = await db.inventoryBilik.update({
      where: { id },
      data: {
        name: body.name,
        number: body.number,
        description: body.description,
        roomId: body.roomId,
      },
    });

    return NextResponse.json(bilik);
  } catch (error) {
    console.error("Error updating inventory bilik:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui bilik inventaris" },
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
    await db.inventoryBilik.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Bilik inventaris berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting inventory bilik:", error);
    return NextResponse.json(
      { error: "Gagal menghapus bilik inventaris" },
      { status: 500 }
    );
  }
}
