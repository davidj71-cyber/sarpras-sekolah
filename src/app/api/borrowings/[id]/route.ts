import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const borrowing = await db.borrowingEntry.findUnique({
      where: { id },
      include: { borrower: true, items: true, returnEntry: true },
    });
    if (!borrowing) {
      return NextResponse.json({ error: "Peminjaman tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(borrowing);
  } catch (error) {
    console.error("Error fetching borrowing:", error);
    return NextResponse.json({ error: "Gagal mengambil data peminjaman" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Update items: delete old & recreate
    if (body.items) {
      await db.borrowingItem.deleteMany({ where: { borrowingId: id } });
    }

    // Parse proofPhotos — JSON array of base64 data URLs
    let proofPhotos = "[]";
    if (Array.isArray(body.proofPhotos)) {
      proofPhotos = JSON.stringify(
        body.proofPhotos.filter((p: unknown) => typeof p === "string" && (p as string).startsWith("data:image/"))
      );
    }

    const borrowing = await db.borrowingEntry.update({
      where: { id },
      data: {
        baNumber: body.baNumber,
        borrowDate: body.borrowDate ? new Date(body.borrowDate) : undefined,
        expectedReturnDate: body.expectedReturnDate ? new Date(body.expectedReturnDate) : null,
        borrowerId: String(body.borrowerId),
        purpose: String(body.purpose ?? "").trim(),
        notes: String(body.notes ?? "").trim(),
        lenderName: String(body.lenderName ?? "").trim(),
        lenderNip: String(body.lenderNip ?? "").trim(),
        proofPhotos,
        items: body.items
          ? {
              create: (body.items as Array<{
                itemName: string;
                registrationNumber?: string;
                quantity?: number;
                unit?: string;
                condition?: string;
                notes?: string;
              }>).map((item) => ({
                itemName: item.itemName,
                registrationNumber: item.registrationNumber ?? "",
                quantity: item.quantity ?? 1,
                unit: item.unit ?? "Unit",
                condition: item.condition ?? "Baik",
                notes: item.notes ?? "",
              })),
            }
          : undefined,
      },
      include: { borrower: true, items: true, returnEntry: true },
    });

    return NextResponse.json(borrowing);
  } catch (error) {
    console.error("Error updating borrowing:", error);
    return NextResponse.json({ error: "Gagal memperbarui peminjaman" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.borrowingItem.deleteMany({ where: { borrowingId: id } });
    await db.borrowingEntry.delete({ where: { id } });
    return NextResponse.json({ message: "Berita acara peminjaman berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting borrowing:", error);
    return NextResponse.json({ error: "Gagal menghapus peminjaman" }, { status: 500 });
  }
}
