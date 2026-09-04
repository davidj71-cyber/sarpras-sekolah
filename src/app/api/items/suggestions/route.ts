import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── /api/items/suggestions ─────────────────────────────────────────────────
// Return daftar barang unik dari InventoryItem + BarangMasukItem untuk
// dipakai sebagai suggestions (datalist) di form BA Peminjaman.
// User bisa pilih dari daftar (auto-fill No. Register, Satuan, Kondisi)
// atau ketik manual kalau barang belum di inventarisasi.
export async function GET() {
  try {
    // Fetch dari InventoryItem
    const inventoryItems = await db.inventoryItem.findMany({
      select: {
        name: true,
        registrationNumber: true,
        unit: true,
        condition: true,
        brand: true,
      },
    });

    // Fetch dari BarangMasukItem (barang yang sudah masuk)
    const barangMasukItems = await db.barangMasukItem.findMany({
      select: {
        itemName: true,
        unit: true,
        condition: true,
      },
    });

    // Fetch dari Item (KIB)
    const kibItems = await db.item.findMany({
      select: {
        name: true,
        registrationNumber: true,
        unit: true,
        condition: true,
        brand: true,
      },
    });

    // Merge & deduplicate by name (case-insensitive)
    const seen = new Set<string>();
    const suggestions: Array<{
      name: string;
      registrationNumber: string;
      unit: string;
      condition: string;
      brand: string;
    }> = [];

    // Add from InventoryItem
    for (const item of inventoryItems) {
      const key = item.name.toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        name: item.name,
        registrationNumber: item.registrationNumber || "",
        unit: item.unit || "Unit",
        condition: item.condition || "Baik",
        brand: item.brand || "",
      });
    }

    // Add from KIB Item
    for (const item of kibItems) {
      const key = item.name.toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        name: item.name,
        registrationNumber: item.registrationNumber || "",
        unit: item.unit || "Unit",
        condition: item.condition || "Baik",
        brand: item.brand || "",
      });
    }

    // Add from BarangMasukItem
    for (const item of barangMasukItems) {
      const key = item.itemName.toLowerCase().trim();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      suggestions.push({
        name: item.itemName,
        registrationNumber: "",
        unit: item.unit || "Unit",
        condition: item.condition || "Baik",
        brand: "",
      });
    }

    // Sort alphabetically
    suggestions.sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Error fetching item suggestions:", error);
    return NextResponse.json(
      { error: "Gagal mengambil daftar barang" },
      { status: 500 }
    );
  }
}
