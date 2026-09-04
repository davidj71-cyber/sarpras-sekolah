import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ─── /api/items/suggestions ─────────────────────────────────────────────────
// Return daftar barang unik dari InventoryItem + BarangMasukItem + KIB
// untuk dipakai sebagai suggestions di form BA Peminjaman.
// Include: name, registrationNumber, unit, condition, brand, quantity (sisa tersedia)
export async function GET() {
  try {
    // Fetch dari InventoryItem — include quantity (sisa barang)
    const inventoryItems = await db.inventoryItem.findMany({
      select: {
        name: true,
        registrationNumber: true,
        unit: true,
        condition: true,
        brand: true,
        quantity: true,
      },
    });

    // Fetch dari KIB Item
    const kibItems = await db.item.findMany({
      select: {
        name: true,
        registrationNumber: true,
        unit: true,
        condition: true,
        brand: true,
        quantity: true,
      },
    });

    // Fetch dari BarangMasukItem
    const barangMasukItems = await db.barangMasukItem.findMany({
      select: {
        itemName: true,
        unit: true,
        condition: true,
        quantity: true,
      },
    });

    // Merge & deduplicate by name (case-insensitive)
    // Akumulasi quantity untuk barang dengan nama sama
    const seen = new Map<string, {
      name: string;
      registrationNumber: string;
      unit: string;
      condition: string;
      brand: string;
      quantity: number;
    }>();

    const addItem = (name: string, reg: string, unit: string, cond: string, brand: string, qty: number) => {
      const key = name.toLowerCase().trim();
      if (!key) return;
      const existing = seen.get(key);
      if (existing) {
        existing.quantity += qty;
      } else {
        seen.set(key, { name, registrationNumber: reg, unit, condition: cond, brand, quantity: qty });
      }
    };

    for (const item of inventoryItems) {
      addItem(item.name, item.registrationNumber || "", item.unit || "Unit", item.condition || "Baik", item.brand || "", item.quantity);
    }
    for (const item of kibItems) {
      addItem(item.name, item.registrationNumber || "", item.unit || "Unit", item.condition || "Baik", item.brand || "", item.quantity);
    }
    for (const item of barangMasukItems) {
      addItem(item.itemName, "", item.unit || "Unit", item.condition || "Baik", "", item.quantity);
    }

    const suggestions = Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Error fetching item suggestions:", error);
    return NextResponse.json({ error: "Gagal mengambil daftar barang" }, { status: 500 });
  }
}
