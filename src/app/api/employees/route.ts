import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const employees = await db.employee.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar pegawai" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const employee = await db.employee.create({
      data: {
        name: body.name,
        nip: body.nip ?? "",
        position: body.position ?? "",
        department: body.department ?? "",
        phone: body.phone ?? "",
        address: body.address ?? "",
      },
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "Gagal membuat pegawai" },
      { status: 500 }
    );
  }
}
