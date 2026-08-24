import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const entry = await db.mediaEntry.findUnique({ where: { id } });

    if (!entry) {
      return NextResponse.json(
        { error: "Data media tidak ditemukan" },
        { status: 404 }
      );
    }

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error fetching media entry:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data media" },
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

    const unitCount = Number(body.unitCount) || 0;
    const pricePerMonth = Number(body.pricePerMonth) || 0;
    const totalReceived = unitCount * pricePerMonth;

    const entry = await db.mediaEntry.update({
      where: { id },
      data: {
        name: String(body.name ?? "").trim(),
        mediaName: String(body.mediaName ?? "").trim(),
        paymentType: String(body.paymentType ?? "Tunai").trim(),
        pricePerMonth,
        unitCount,
        totalReceived,
        period: String(body.period ?? "").trim(),
      },
    });

    return NextResponse.json(entry);
  } catch (error) {
    console.error("Error updating media entry:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data media" },
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
    await db.mediaEntry.delete({ where: { id } });

    return NextResponse.json({ message: "Data media berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting media entry:", error);
    return NextResponse.json(
      { error: "Gagal menghapus data media" },
      { status: 500 }
    );
  }
}
