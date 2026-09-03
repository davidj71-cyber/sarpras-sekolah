import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSalaryMediaSchema } from "@/lib/migrate-settings";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await ensureSalaryMediaSchema();
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

    // Parse photos JSON string → array
    const orderWithPhotos = {
      ...order,
      items: order.items.map((it) => ({
        ...it,
        photos: JSON.parse(it.photos || "[]") as string[],
      })),
    };

    return NextResponse.json(orderWithPhotos);
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

    // Handle mark-as-paid: set paymentStatus to LUNAS and paidAt to now
    if (body.markAsPaid) {
      const order = await db.order.update({
        where: { id },
        data: {
          paymentStatus: "LUNAS",
          paidAt: body.paidAt ? new Date(body.paidAt) : new Date(),
        },
        include: {
          store: true,
          employee: true,
          items: true,
        },
      });
      const orderWithPhotos = {
        ...order,
        items: order.items.map((it) => ({
          ...it,
          photos: JSON.parse(it.photos || "[]") as string[],
        })),
      };
      return NextResponse.json(orderWithPhotos);
    }

    // Auto-set paymentStatus based on paymentMethod if not explicitly provided
    const paymentMethod = body.paymentMethod;
    let paymentStatus = body.paymentStatus;
    if (!paymentStatus && paymentMethod === "BON") {
      paymentStatus = "BELUM_BAYAR";
    } else if (!paymentStatus && paymentMethod === "Cash") {
      paymentStatus = "LUNAS";
    }

    // If items are provided, delete existing items and recreate them
    if (body.items && Array.isArray(body.items)) {
      await db.orderItem.deleteMany({ where: { orderId: id } });
    }

    // Normalize item photos: pastikan selalu array → JSON string
    const normalizeItem = (item: {
      itemName: string;
      quantity?: number;
      unit?: string;
      unitPrice?: number;
      totalPrice?: number;
      notes?: string;
      photos?: unknown;
    }) => ({
      itemName: item.itemName,
      quantity: item.quantity ?? 1,
      unit: item.unit ?? "Unit",
      unitPrice: item.unitPrice ?? 0,
      totalPrice: item.totalPrice ?? 0,
      notes: item.notes ?? "",
      photos: JSON.stringify(
        Array.isArray(item.photos) ? item.photos : []
      ),
    });

    const order = await db.order.update({
      where: { id },
      data: {
        orderNumber: body.orderNumber,
        orderDate: body.orderDate ? new Date(body.orderDate) : undefined,
        storeId: body.storeId,
        employeeId: body.employeeId ?? null,
        status: body.status,
        paymentMethod,
        paymentStatus,
        paidAt: body.paidAt !== undefined ? (body.paidAt ? new Date(body.paidAt) : null) : undefined,
        notes: body.notes,
        totalAmount: body.totalAmount,
        category: body.category ?? "",
        items: body.items
          ? {
              create: body.items.map(normalizeItem),
            }
          : undefined,
      },
      include: {
        store: true,
        employee: true,
        items: true,
      },
    });

    const orderWithPhotos = {
      ...order,
      items: order.items.map((it) => ({
        ...it,
        photos: JSON.parse(it.photos || "[]") as string[],
      })),
    };

    return NextResponse.json(orderWithPhotos);
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
