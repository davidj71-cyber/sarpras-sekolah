import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const stores = await db.store.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(stores);
  } catch (error) {
    console.error("Error fetching stores:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar toko" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const store = await db.store.create({
      data: {
        name: body.name,
        ownerName: body.ownerName ?? "",
        npwp: body.npwp ?? "",
        goodsType: body.goodsType ?? "",
        phone: body.phone ?? "",
        address: body.address ?? "",
      },
    });

    return NextResponse.json(store, { status: 201 });
  } catch (error) {
    console.error("Error creating store:", error);
    return NextResponse.json(
      { error: "Gagal membuat toko" },
      { status: 500 }
    );
  }
}
