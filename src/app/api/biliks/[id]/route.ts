import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const bilik = await db.bilik.findUnique({
      where: { id },
      include: {
        room: true,
        items: true,
      },
    });

    if (!bilik) {
      return NextResponse.json(
        { error: "Bilik tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(bilik);
  } catch (error) {
    console.error("Error fetching bilik:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data bilik" },
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

    const bilik = await db.bilik.update({
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
    console.error("Error updating bilik:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui bilik" },
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
    await db.bilik.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Bilik berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting bilik:", error);
    return NextResponse.json(
      { error: "Gagal menghapus bilik" },
      { status: 500 }
    );
  }
}
