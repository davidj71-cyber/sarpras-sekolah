import { NextRequest, NextResponse } from "next/server";
import { unlink, access } from "fs/promises";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "items");

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Security: prevent directory traversal
    if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
      return NextResponse.json(
        { error: "Nama file tidak valid" },
        { status: 400 }
      );
    }

    // Only allow deleting files in the uploads/items directory
    if (!filename.startsWith("item_")) {
      return NextResponse.json(
        { error: "Hanya file foto barang yang dapat dihapus" },
        { status: 400 }
      );
    }

    const filePath = path.join(UPLOAD_DIR, filename);

    // Check file exists
    try {
      await access(filePath);
    } catch {
      // File doesn't exist, but that's OK - it may have been deleted already
      return NextResponse.json({ message: "File sudah dihapus" });
    }

    // Delete file
    await unlink(filePath);

    return NextResponse.json({ message: "File berhasil dihapus" });
  } catch (error) {
    console.error("Error deleting file:", error);
    return NextResponse.json(
      { error: "Gagal menghapus file" },
      { status: 500 }
    );
  }
}
