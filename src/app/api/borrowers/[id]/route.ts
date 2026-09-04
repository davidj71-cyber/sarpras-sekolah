import { NextRequest, NextResponse } from "next/server";
import { ensureBorrowingSchema } from "@/lib/migrate-settings";
import { db } from "@/lib/db";

// ─── /api/borrowers/[id] — Edit & Hapus peminjam eksternal ───────────────────
// Dipakai oleh tab "Peminjam" di halaman BA untuk Edit (PUT) dan Hapus (DELETE).
// Hanya mengelola record di tabel Borrower (peminjam eksternal) — pegawai dikelola
// lewat /api/employees/[id].

type RouteParams = { params: Promise<{ id: string }> };

// GET — detail satu peminjam (untuk debugging/inspeksi).
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    await ensureBorrowingSchema();
    const { id } = await params;
    const borrower = await db.borrower.findUnique({
      where: { id },
      include: { _count: { select: { borrowings: true } } },
    });
    if (!borrower) {
      return NextResponse.json({ error: "Peminjam tidak ditemukan" }, { status: 404 });
    }
    return NextResponse.json(borrower);
  } catch (error) {
    console.error("Error fetching borrower:", error);
    return NextResponse.json({ error: "Gagal mengambil data peminjam" }, { status: 500 });
  }
}

// PUT — perbarui data peminjam eksternal.
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await ensureBorrowingSchema();
    const { id } = await params;
    const body = await request.json();

    // Pastikan record ada dulu sebelum update
    const existing = await db.borrower.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Peminjam tidak ditemukan" }, { status: 404 });
    }

    const updated = await db.borrower.update({
      where: { id },
      data: {
        name: String(body.name ?? "").trim() || existing.name,
        nip: String(body.nip ?? "").trim(),
        jabatan: String(body.jabatan ?? "").trim(),
        organization: String(body.organization ?? "").trim(),
        address: String(body.address ?? "").trim(),
        phone: String(body.phone ?? "").trim(),
        role: String(body.role ?? existing.role ?? "Eksternal").trim(),
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating borrower:", error);
    return NextResponse.json({ error: "Gagal memperbarui peminjam" }, { status: 500 });
  }
}

// DELETE — hapus peminjam eksternal.
// Catatan: kalau peminjam masih punya relasi BorrowingEntry, hapus akan gagal
// karena ada foreign key constraint. Frontend tetap mengizinkan klik hapus —
// kalau gagal, backend akan return 400/500 dengan pesan error.
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    await ensureBorrowingSchema();
    const { id } = await params;

    const existing = await db.borrower.findUnique({
      where: { id },
      include: { _count: { select: { borrowings: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Peminjam tidak ditemukan" }, { status: 404 });
    }

    // Cegah hapus kalau masih ada BA Peminjaman yang mereferensikan peminjam ini.
    // Foreign key constraint akan throw kalau kita tetap hapus — lebih baik kasih
    // pesan jelas di awal.
    if (existing._count.borrowings > 0) {
      return NextResponse.json(
        {
          error: `Tidak dapat menghapus peminjam karena masih terkait dengan ${existing._count.borrowings} BA Peminjaman. Hapus BA terkait terlebih dahulu.`,
        },
        { status: 400 }
      );
    }

    await db.borrower.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting borrower:", error);
    return NextResponse.json({ error: "Gagal menghapus peminjam" }, { status: 500 });
  }
}
