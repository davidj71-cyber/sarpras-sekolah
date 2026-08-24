import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = await db.salaryEntry.findUnique({ where: { id } });

    if (!entry) {
      return NextResponse.json(
        { error: "Data gaji tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error fetching salary entry:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data gaji" },
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

    const lessonCount = Number(body.lessonCount) || 0;
    const pricePerLesson = Number(body.pricePerLesson) || 0;
    const totalReceived = lessonCount * pricePerLesson;

    const entry = await db.salaryEntry.update({
      where: { id },
      data: {
        name: String(body.name ?? "").trim(),
        nip: String(body.nip ?? "").trim(),
        bankAccount: String(body.bankAccount ?? "").trim(),
        gender: String(body.gender ?? "L").trim(),
        status: String(body.status ?? "").trim(),
        jabatan: String(body.jabatan ?? "").trim(),
        lessonCount,
        unit: String(body.unit ?? "Jam").trim(),
        pricePerLesson,
        totalReceived,
        period: String(body.period ?? "").trim(),
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error updating salary entry:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data gaji" },
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
    await db.salaryEntry.delete({ where: { id } });

    return NextResponse.json({ message: "Data gaji berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting salary entry:", error);
    return NextResponse.json(
      { error: "Gagal menghapus data gaji" },
      { status: 500 }
    );
  }
}
