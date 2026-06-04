import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const store = await db.store.findUnique({
      where: { id },
      include: { orders: true },
    });

    if (!store) {
      return NextResponse.json(
        { error: "Toko tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(store);
  } catch (error) {
    console.error("Error fetching store:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data toko" },
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

    const store = await db.store.update({
      where: { id },
      data: {
        name: body.name,
        ownerName: body.ownerName,
        npwp: body.npwp,
        goodsType: body.goodsType,
        phone: body.phone,
        address: body.address,
      },
    });

    return NextResponse.json(store);
  } catch (error) {
    console.error("Error updating store:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui toko" },
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
    await db.store.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Toko berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting store:", error);
    return NextResponse.json(
      { error: "Gagal menghapus toko" },
      { status: 500 }
    );
  }
}
