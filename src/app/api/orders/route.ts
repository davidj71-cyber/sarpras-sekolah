import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const orders = await db.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        store: true,
        employee: true,
        items: true,
      },
    });

    return NextResponse.json(orders);
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
    const body = await request.json();

    // Check if an order with the same orderNumber already exists
    const existingOrder = await db.order.findFirst({
      where: { orderNumber: body.orderNumber },
      include: { items: true },
    });

    if (existingOrder) {
      // Add items to the existing order instead of creating a new one
      const newItems = body.items
        ? body.items.map(
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
          )
        : [];

      // Calculate new total
      const existingTotal = existingOrder.items.reduce((sum, i) => sum + i.totalPrice, 0);
      const newItemsTotal = newItems.reduce((sum, i) => sum + i.totalPrice, 0);

      const updatedOrder = await db.order.update({
        where: { id: existingOrder.id },
        data: {
          totalAmount: existingTotal + newItemsTotal,
          status: body.status ?? existingOrder.status,
          paymentMethod: body.paymentMethod ?? existingOrder.paymentMethod,
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

      return NextResponse.json({ ...updatedOrder, merged: true }, { status: 200 });
    }

    // Create new order
    const order = await db.order.create({
      data: {
        orderNumber: body.orderNumber,
        orderDate: body.orderDate ? new Date(body.orderDate) : new Date(),
        storeId: body.storeId,
        employeeId: body.employeeId ?? null,
        status: body.status ?? "Draft",
        paymentMethod: body.paymentMethod ?? "Cash",
        notes: body.notes ?? "",
        totalAmount: body.totalAmount ?? 0,
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

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Gagal membuat pesanan" },
      { status: 500 }
    );
  }
}
