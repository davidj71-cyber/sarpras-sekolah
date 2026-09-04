import { NextRequest, NextResponse } from "next/server";
import { ensureBorrowingSchema } from "@/lib/migrate-settings";
import { db } from "@/lib/db";

// ─── /api/borrowers — Master Peminjam ────────────────────────────────────────
export async function GET() {
  try {
    await ensureBorrowingSchema();
    const borrowers = await db.borrower.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { borrowings: true } } },
    });
    return NextResponse.json(borrowers);
  } catch (error) {
    console.error("Error fetching borrowers:", error);
    return NextResponse.json({ error: "Gagal mengambil daftar peminjam" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureBorrowingSchema();
    const body = await request.json();
    const borrower = await db.borrower.create({
      data: {
        name: String(body.name ?? "").trim(),
        nip: String(body.nip ?? "").trim(),
        jabatan: String(body.jabatan ?? "").trim(),
        organization: String(body.organization ?? "").trim(),
        address: String(body.address ?? "").trim(),
        phone: String(body.phone ?? "").trim(),
        role: String(body.role ?? "Eksternal").trim(),
      },
    });
    return NextResponse.json(borrower, { status: 201 });
  } catch (error) {
    console.error("Error creating borrower:", error);
    return NextResponse.json({ error: "Gagal membuat peminjam" }, { status: 500 });
  }
}
