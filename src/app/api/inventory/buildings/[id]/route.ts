import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const building = await db.inventoryBuilding.findUnique({
      where: { id },
      include: {
        rooms: {
          include: {
            _count: {
              select: { items: true, biliks: true, cabinets: true },
            },
          },
        },
        _count: { select: { rooms: true } },
      },
    });

    if (!building) {
      return NextResponse.json(
        { error: "Gedung inventaris tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(building);
  } catch (error) {
    console.error("Error fetching inventory building:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data gedung inventaris" },
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

    const building = await db.inventoryBuilding.update({
      where: { id },
      data: {
        name: body.name,
        code: body.code ?? "",
        floors: Number(body.floors ?? 1),
        description: body.description ?? "",
      },
    });

    return NextResponse.json(building);
  } catch (error) {
    console.error("Error updating inventory building:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui gedung inventaris" },
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
    await db.inventoryBuilding.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Gedung inventaris berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting inventory building:", error);
    return NextResponse.json(
      { error: "Gagal menghapus gedung inventaris" },
      { status: 500 }
    );
  }
}
