# Task ID: 6 - Rooms Print Feature

## Summary
Added professional print/cetak feature to the Rooms (Ruang) page component.

## Changes Made
- **File**: `/home/z/my-project/src/components/pages/rooms.tsx`
  - Added `Printer` import from `lucide-react`
  - Added `printWithKop`, `formatRupiahPrint` imports from `@/lib/print-utils`
  - Added `handlePrintRoomList()` - prints all rooms with summary totals
  - Added `handlePrintRoomDetail()` - prints detailed room inventory with items from room, biliks, and lemari
  - Added "Cetak" button next to "Tambah Ruang" in header (room list view)
  - Added "Cetak" button in room detail header (next to Edit/Hapus)
  - No existing functionality changed

## Print Features
1. **Room List Print** (`handlePrintRoomList`):
   - Title: "DAFTAR RUANGAN"
   - Columns: No, Nama Ruang, Gedung, Lantai, Jumlah Bilik, Jumlah Lemari, Jumlah Barang
   - Total summary row at bottom
   - Uses `printWithKop` for KOP surat header

2. **Room Detail Print** (`handlePrintRoomDetail`):
   - Title: "INVENTARIS RUANG {roomName}"
   - Room info meta table
   - Condition summary (Baik, Rusak Ringan, Rusak Berat, Total)
   - Full items table with 8 columns including Lokasi
   - Signature block (Kepala Sekolah & Pengelola Barang)
   - Fetches items from room, all biliks, and all lemari with deduplication

## Verification
- Lint passes with no errors
- No runtime errors in dev log
