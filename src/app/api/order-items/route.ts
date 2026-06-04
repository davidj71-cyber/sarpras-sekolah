import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    const orderItems = await db.orderItem.findMany({
      where: orderId ? { orderId } : undefined,
      orderBy: { createdAt: "desc" },
      include: {
        order: true,
      },
    });

    return NextResponse.json(orderItems);
  } catch (error) {
    console.error("Error fetching order items:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar item pesanan" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const orderItem = await db.orderItem.create({
      data: {
        orderId: body.orderId,
        itemName: body.itemName,
        quantity: body.quantity ?? 1,
        unit: body.unit ?? "Unit",
        unitPrice: body.unitPrice ?? 0,
        totalPrice: body.totalPrice ?? 0,
        notes: body.notes ?? "",
      },
    });

    return NextResponse.json(orderItem, { status: 201 });
  } catch (error) {
    console.error("Error creating order item:", error);
    return NextResponse.json(
      { error: "Gagal menambahkan item pesanan" },
      { status: 500 }
    );
  }
}
