import { NextRequest, NextResponse } from "next/server";
import { ensureBorrowingSchema } from "@/lib/migrate-settings";
import { db } from "@/lib/db";

// ─── /api/returns — Berita Acara Pengembalian ────────────────────────────────
export async function GET() {
  try {
    await ensureBorrowingSchema();
    const returns = await db.returnEntry.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        borrowing: {
          include: { borrower: true, items: true },
        },
      },
    });
    return NextResponse.json(returns);
  } catch (error) {
    console.error("Error fetching returns:", error);
    return NextResponse.json({ error: "Gagal mengambil daftar pengembalian" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureBorrowingSchema();
    const body = await request.json();

    // Generate nomor BA otomatis jika kosong
    let baNumber = String(body.baNumber ?? "").trim();
    if (!baNumber) {
      const count = await db.returnEntry.count();
      baNumber = `${String(count + 1).padStart(3, "0")}/BA-PENG/${new Date().getFullYear()}`;
    }

    // Parse returnItems (JSON array kondisi per item saat dikembalikan)
    let returnItems = "[]";
    if (Array.isArray(body.returnItems)) {
      returnItems = JSON.stringify(body.returnItems);
    }

    const returnEntry = await db.returnEntry.create({
      data: {
        baNumber,
        returnDate: body.returnDate ? new Date(body.returnDate) : new Date(),
        borrowingId: String(body.borrowingId),
        notes: String(body.notes ?? "").trim(),
        receiverName: String(body.receiverName ?? "").trim(),
        receiverNip: String(body.receiverNip ?? "").trim(),
        returnItems,
      },
      include: {
        borrowing: {
          include: { borrower: true, items: true },
        },
      },
    });

    // Update borrowing: set status Dikembalikan & actualReturnDate
    await db.borrowingEntry.update({
      where: { id: body.borrowingId },
      data: {
        status: "Dikembalikan",
        actualReturnDate: body.returnDate ? new Date(body.returnDate) : new Date(),
      },
    });

    return NextResponse.json(returnEntry, { status: 201 });
  } catch (error) {
    console.error("Error creating return:", error);
    return NextResponse.json({ error: "Gagal membuat berita acara pengembalian" }, { status: 500 });
  }
}
