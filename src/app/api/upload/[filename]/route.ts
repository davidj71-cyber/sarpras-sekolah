import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Security: only allow deleting files from uploads/items directory
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json({ error: "Filename tidak valid" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "public", "uploads", "items", filename);

    try {
      await unlink(filePath);
    } catch {
      // File may not exist, that's okay
    }

    return NextResponse.json({ message: "File berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Gagal menghapus file" },
      { status: 500 }
    );
  }
}
