import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ensureSalaryMediaSchema } from "@/lib/migrate-settings";

export async function GET() {
  try {
    // Self-heal: pastikan kolom photos ada di OrderItem (idempotent).
    await ensureSalaryMediaSchema();

    const orders = await db.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        store: true,
        employee: true,
        items: true,
      },
    });

    // Parse photos JSON string → array untuk setiap item
    const ordersWithPhotos = orders.map((o) => ({
      ...o,
      items: o.items.map((it) => ({
        ...it,
        photos: JSON.parse(it.photos || "[]") as string[],
      })),
    }));

    return NextResponse.json(ordersWithPhotos);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar pesanan" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Self-heal before write as well.
    await ensureSalaryMediaSchema();

    const body = await request.json();

    // Auto-set paymentStatus based on paymentMethod
    const paymentMethod = body.paymentMethod ?? "Cash";
    const paymentStatus =
      body.paymentStatus ??
      (paymentMethod === "BON" ? "BELUM_BAYAR" : "LUNAS");

    // Normalize item photos: pastikan selalu array → JSON string
    const normalizeItem = (item: {
      itemName: string;
      quantity?: number;
      unit?: string;
      unitPrice?: number;
      totalPrice?: number;
      notes?: string;
      usage?: string;
      photos?: unknown;
    }) => ({
      itemName: item.itemName,
      quantity: item.quantity ?? 1,
      unit: item.unit ?? "Unit",
      unitPrice: item.unitPrice ?? 0,
      totalPrice: item.totalPrice ?? 0,
      usage: item.usage ?? "",
      notes: item.notes ?? "",
      photos: JSON.stringify(
        Array.isArray(item.photos) ? item.photos : []
      ),
    });

    // Check if an order with the same orderNumber already exists
    const existingOrder = await db.order.findFirst({
      where: { orderNumber: body.orderNumber },
      include: { items: true },
    });

    if (existingOrder) {
      // Add items to the existing order instead of creating a new one
      const newItems = body.items ? body.items.map(normalizeItem) : [];

      // Calculate new total
      const existingTotal = existingOrder.items.reduce((sum, i) => sum + i.totalPrice, 0);
      const newItemsTotal = newItems.reduce((sum: number, i: { totalPrice: number }) => sum + i.totalPrice, 0);

      const updatedOrder = await db.order.update({
        where: { id: existingOrder.id },
        data: {
          totalAmount: existingTotal + newItemsTotal,
          status: body.status ?? existingOrder.status,
          paymentMethod,
          paymentStatus,
          notes: body.notes ?? existingOrder.notes,
          items: newItems.length > 0
            ? {
                create: newItems,
              }
            : undefined,
        },
        include: {
          store: true,
          employee: true,
          items: true,
        },
      });

      const updatedWithPhotos = {
        ...updatedOrder,
        items: updatedOrder.items.map((it) => ({
          ...it,
          photos: JSON.parse(it.photos || "[]") as string[],
        })),
      };

      return NextResponse.json({ ...updatedWithPhotos, merged: true }, { status: 200 });
    }

    // Create new order
    const order = await db.order.create({
      data: {
        orderNumber: body.orderNumber,
        orderDate: body.orderDate ? new Date(body.orderDate) : new Date(),
        storeId: body.storeId,
        employeeId: body.employeeId ?? null,
        status: body.status ?? "Draft",
        paymentMethod,
        paymentStatus,
        paidAt: body.paidAt ? new Date(body.paidAt) : null,
        notes: body.notes ?? "",
        totalAmount: body.totalAmount ?? 0,
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

    return NextResponse.json(orderWithPhotos, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Gagal membuat pesanan" },
      { status: 500 }
    );
  }
}
