import { NextRequest, NextResponse } from "next/server";
import { ensureBorrowingSchema } from "@/lib/migrate-settings";
import { db } from "@/lib/db";

// ─── /api/borrowings — Berita Acara Peminjaman ───────────────────────────────
export async function GET() {
  try {
    await ensureBorrowingSchema();
    const borrowings = await db.borrowingEntry.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        borrower: true,
        items: true,
        returnEntry: true,
      },
    });
    return NextResponse.json(borrowings);
  } catch (error) {
    console.error("Error fetching borrowings:", error);
    return NextResponse.json({ error: "Gagal mengambil daftar peminjaman" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureBorrowingSchema();
    const body = await request.json();

    // Generate nomor BA otomatis jika kosong
    let baNumber = String(body.baNumber ?? "").trim();
    if (!baNumber) {
      const count = await db.borrowingEntry.count();
      baNumber = `${String(count + 1).padStart(3, "0")}/BA-PIN/${new Date().getFullYear()}`;
    }

    // Parse proofPhotos — JSON array of base64 data URLs
    let proofPhotos = "[]";
    if (Array.isArray(body.proofPhotos)) {
      proofPhotos = JSON.stringify(
        body.proofPhotos.filter((p: unknown) => typeof p === "string" && (p as string).startsWith("data:image/"))
      );
    }

    const borrowing = await db.borrowingEntry.create({
      data: {
        baNumber,
        borrowDate: body.borrowDate ? new Date(body.borrowDate) : new Date(),
        expectedReturnDate: body.expectedReturnDate ? new Date(body.expectedReturnDate) : null,
        borrowerId: String(body.borrowerId),
        purpose: String(body.purpose ?? "").trim(),
        notes: String(body.notes ?? "").trim(),
        status: "Dipinjam",
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
      include: {
        borrower: true,
        items: true,
        returnEntry: true,
      },
    });

    return NextResponse.json(borrowing, { status: 201 });
  } catch (error) {
    console.error("Error creating borrowing:", error);
    return NextResponse.json({ error: "Gagal membuat berita acara peminjaman" }, { status: 500 });
  }
}
