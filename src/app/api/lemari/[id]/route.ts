import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const lemari = await db.lemari.findUnique({
      where: { id },
      include: {
        room: true,
        items: true,
      },
    });

    if (!lemari) {
      return NextResponse.json(
        { error: "Lemari tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(lemari);
  } catch (error) {
    console.error("Error fetching lemari:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data lemari" },
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

    const lemari = await db.lemari.update({
      where: { id },
      data: {
        number: body.number,
        description: body.description,
        roomId: body.roomId,
      },
    });

    return NextResponse.json(lemari);
  } catch (error) {
    console.error("Error updating lemari:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui lemari" },
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
    await db.lemari.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Lemari berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting lemari:", error);
    return NextResponse.json(
      { error: "Gagal menghapus lemari" },
      { status: 500 }
    );
  }
}
