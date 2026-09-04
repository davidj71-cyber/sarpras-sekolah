import { NextRequest, NextResponse } from "next/server";
import { ensureBorrowingSchema } from "@/lib/migrate-settings";
import { db } from "@/lib/db";

// ─── /api/returns/[id] — Single ReturnEntry operations ──────────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureBorrowingSchema();
    const { id } = await params;
    const returnEntry = await db.returnEntry.findUnique({
      where: { id },
      include: {
        borrowing: {
          include: { borrower: true, items: true },
        },
      },
    });
    if (!returnEntry) {
      return NextResponse.json({ error: "BA Pengembalian tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(returnEntry);
  } catch (error) {
    console.error("Error fetching return entry:", error);
    return NextResponse.json({ error: "Gagal mengambil data pengembalian" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureBorrowingSchema();
    const { id } = await params;
    const body = await request.json();

    // Parse proofPhotos & returnItems
    let proofPhotos = "[]";
    if (Array.isArray(body.proofPhotos)) {
      proofPhotos = JSON.stringify(
        body.proofPhotos.filter((p: unknown) => typeof p === "string" && (p as string).startsWith("data:image/"))
      );
    }
    let returnItems = "[]";
    if (Array.isArray(body.returnItems)) {
      returnItems = JSON.stringify(body.returnItems);
    }

    const returnEntry = await db.returnEntry.update({
      where: { id },
      data: {
        baNumber: body.baNumber,
        returnDate: body.returnDate ? new Date(body.returnDate) : undefined,
        notes: String(body.notes ?? "").trim(),
        receiverName: String(body.receiverName ?? "").trim(),
        receiverNip: String(body.receiverNip ?? "").trim(),
        returnItems,
        proofPhotos,
      },
      include: {
        borrowing: {
          include: { borrower: true, items: true },
        },
      },
    });
    return NextResponse.json(returnEntry);
  } catch (error) {
    console.error("Error updating return entry:", error);
    return NextResponse.json({ error: "Gagal memperbarui pengembalian" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureBorrowingSchema();
    const { id } = await params;

    // Get the borrowingId before deleting so we can reset its status
    const returnEntry = await db.returnEntry.findUnique({
      where: { id },
      select: { borrowingId: true },
    });
    if (!returnEntry) {
      return NextResponse.json({ error: "BA Pengembalian tidak ditemukan" }, { status: 404 });
    }

    // Delete the return entry
    await db.returnEntry.delete({ where: { id } });

    // Reset the borrowing status back to "Dipinjam"
    await db.borrowingEntry.update({
      where: { id: returnEntry.borrowingId },
      data: {
        status: "Dipinjam",
        actualReturnDate: null,
      },
    });

    return NextResponse.json({ message: "BA Pengembalian berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting return entry:", error);
    return NextResponse.json({ error: "Gagal menghapus pengembalian" }, { status: 500 });
  }
}
