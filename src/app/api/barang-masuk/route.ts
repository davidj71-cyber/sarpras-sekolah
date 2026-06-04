import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const barangMasuk = await db.barangMasuk.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        store: true,
        employee: true,
        items: true,
      },
    });

    return NextResponse.json(barangMasuk);
  } catch (error) {
    console.error("Error fetching barang masuk:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar barang masuk" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const barangMasuk = await db.barangMasuk.create({
      data: {
        documentNumber: body.documentNumber,
        entryDate: body.entryDate ? new Date(body.entryDate) : new Date(),
        storeId: body.storeId || null,
        employeeId: body.employeeId || null,
        source: body.source ?? "",
        notes: body.notes ?? "",
        status: body.status ?? "Draft",
        items: body.items
          ? {
              create: body.items.map(
                (item: {
                  itemName: string;
                  quantity?: number;
                  unit?: string;
                  condition?: string;
                  notes?: string;
                }) => ({
                  itemName: item.itemName,
                  quantity: item.quantity ?? 1,
                  unit: item.unit ?? "Unit",
                  condition: item.condition ?? "Baik",
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

    return NextResponse.json(barangMasuk, { status: 201 });
  } catch (error) {
    console.error("Error creating barang masuk:", error);
    return NextResponse.json(
      { error: "Gagal membuat barang masuk" },
      { status: 500 }
    );
  }
}
