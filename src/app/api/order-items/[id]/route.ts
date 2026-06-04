import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const orderItem = await db.orderItem.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });

    if (!orderItem) {
      return NextResponse.json(
        { error: "Item pesanan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(orderItem);
  } catch (error) {
    console.error("Error fetching order item:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data item pesanan" },
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

    const orderItem = await db.orderItem.update({
      where: { id },
      data: {
        itemName: body.itemName,
        quantity: body.quantity,
        unit: body.unit,
        unitPrice: body.unitPrice,
        totalPrice: body.totalPrice,
        notes: body.notes,
      },
    });

    return NextResponse.json(orderItem);
  } catch (error) {
    console.error("Error updating order item:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui item pesanan" },
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
    await db.orderItem.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Item pesanan berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting order item:", error);
    return NextResponse.json(
      { error: "Gagal menghapus item pesanan" },
      { status: 500 }
    );
  }
}
