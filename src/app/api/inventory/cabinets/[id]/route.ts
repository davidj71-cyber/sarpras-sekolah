import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cabinet = await db.inventoryCabinet.findUnique({
      where: { id },
      include: {
        room: true,
        items: true,
      },
    });

    if (!cabinet) {
      return NextResponse.json(
        { error: "Lemari inventaris tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(cabinet);
  } catch (error) {
    console.error("Error fetching inventory cabinet:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data lemari inventaris" },
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

    const cabinet = await db.inventoryCabinet.update({
      where: { id },
      data: {
        number: body.number,
        description: body.description,
        roomId: body.roomId,
      },
    });

    return NextResponse.json(cabinet);
  } catch (error) {
    console.error("Error updating inventory cabinet:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui lemari inventaris" },
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
    await db.inventoryCabinet.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Lemari inventaris berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting inventory cabinet:", error);
    return NextResponse.json(
      { error: "Gagal menghapus lemari inventaris" },
      { status: 500 }
    );
  }
}
