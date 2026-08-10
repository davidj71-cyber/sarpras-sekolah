import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const buildings = await db.inventoryBuilding.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        rooms: {
          include: {
            _count: {
              select: { items: true, biliks: true, cabinets: true },
            },
          },
        },
        _count: { select: { rooms: true } },
      },
    });

    return NextResponse.json(buildings);
  } catch (error) {
    console.error("Error fetching inventory buildings:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar gedung inventaris" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const building = await db.inventoryBuilding.create({
      data: {
        name: body.name,
        code: body.code ?? "",
        floors: Number(body.floors ?? 1),
        description: body.description ?? "",
      },
    });

    return NextResponse.json(building, { status: 201 });
  } catch (error) {
    console.error("Error creating inventory building:", error);
    return NextResponse.json(
      { error: "Gagal membuat gedung inventaris" },
      { status: 500 }
    );
  }
}
