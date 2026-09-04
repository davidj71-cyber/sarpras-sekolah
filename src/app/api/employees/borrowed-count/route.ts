import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── /api/employees/borrowed-count ───────────────────────────────────────────
// Return map of employeeId → count of active borrowings (status = "Dipinjam").
// Dipakai di halaman Pegawai untuk tampilkan jumlah barang dipinjam per pegawai.
export async function GET() {
  try {
    // Find all borrowings where status = "Dipinjam" and borrower is an employee
    // Borrower table stores borrowerId. Employee IDs are used as borrowerId
    // when source = "pegawai" (we store employee.id as borrower.id in Borrower table).
    // But actually, employees don't have Borrower records — they're separate.
    // We need to match by name since Borrower and Employee are separate tables.

    // Approach: get all active borrowings with borrower info, then match by name to employees
    const activeBorrowings = await db.borrowingEntry.findMany({
      where: { status: "Dipinjam" },
      include: {
        borrower: true,
        items: true,
      },
    });

    // Get all employees
    const employees = await db.employee.findMany({
      select: { id: true, name: true, nip: true },
    });

    // Build map: employeeId → total items borrowed
    const countMap: Record<string, { count: number; items: number }> = {};

    for (const emp of employees) {
      countMap[emp.id] = { count: 0, items: 0 };
    }

    // Match borrowings to employees by name (case-insensitive)
    for (const borrowing of activeBorrowings) {
      const borrowerName = (borrowing.borrower?.name || "").toLowerCase().trim();
      const matchedEmp = employees.find(
        (e) => e.name.toLowerCase().trim() === borrowerName
      );
      if (matchedEmp) {
        countMap[matchedEmp.id].count += 1;
        countMap[matchedEmp.id].items += borrowing.items?.reduce((s, i) => s + i.quantity, 0) || 0;
      }
    }

    return NextResponse.json(countMap);
  } catch (error) {
    console.error("Error fetching borrowed count:", error);
    return NextResponse.json({ error: "Gagal menghitung barang dipinjam" }, { status: 500 });
  }
}
