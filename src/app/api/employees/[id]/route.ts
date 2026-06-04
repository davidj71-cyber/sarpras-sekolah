import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const employee = await db.employee.findUnique({
      where: { id },
      include: { orders: true },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Pegawai tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Error fetching employee:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data pegawai" },
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

    const employee = await db.employee.update({
      where: { id },
      data: {
        name: body.name,
        nip: body.nip,
        position: body.position,
        department: body.department,
        phone: body.phone,
        address: body.address,
      },
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui pegawai" },
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
    await db.employee.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Pegawai berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting employee:", error);
    return NextResponse.json(
      { error: "Gagal menghapus pegawai" },
      { status: 500 }
    );
  }
}
