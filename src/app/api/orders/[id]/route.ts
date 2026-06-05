import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await db.order.findUnique({
      where: { id },
      include: {
        store: true,
        employee: true,
        items: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Pesanan tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data pesanan" },
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

    // If items are provided, delete existing items and recreate them
    if (body.items && Array.isArray(body.items)) {
      await db.orderItem.deleteMany({ where: { orderId: id } });
    }

    const order = await db.order.update({
      where: { id },
      data: {
        orderNumber: body.orderNumber,
        orderDate: body.orderDate ? new Date(body.orderDate) : undefined,
        storeId: body.storeId,
        employeeId: body.employeeId ?? null,
        status: body.status,
        paymentMethod: body.paymentMethod,
        notes: body.notes,
        totalAmount: body.totalAmount,
        items: body.items
          ? {
              create: body.items.map(
                (item: {
                  itemName: string;
                  quantity?: number;
                  unit?: string;
                  unitPrice?: number;
                  totalPrice?: number;
                  notes?: string;
                }) => ({
                  itemName: item.itemName,
                  quantity: item.quantity ?? 1,
                  unit: item.unit ?? "Unit",
                  unitPrice: item.unitPrice ?? 0,
                  totalPrice: item.totalPrice ?? 0,
                  notes: item.notes ?? "",
                })
              ),
            }
          : undefined,
      },
      include: {
        store: true,
        employee: true,
        items: true,
      },
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error("Error updating order:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui pesanan" },
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
    // Cascade delete will handle order items
    await db.order.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Pesanan berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting order:", error);
    return NextResponse.json(
      { error: "Gagal menghapus pesanan" },
      { status: 500 }
    );
  }
}
