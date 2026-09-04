# Task BA-1 — Berita Acara Component

**Agent**: full-stack-developer
**Task**: Buat komponen `berita-acara.tsx` (Berita Acara Peminjaman & Pengembalian Barang)
**Status**: Selesai

## Work Log

- Membaca konteks project: pola dialog & section cards dari `barang-masuk.tsx`, signature/print helpers dari `src/lib/print-utils.ts`, API routes (`/api/borrowers`, `/api/borrowings`, `/api/borrowings/[id]`, `/api/returns`), dan model Prisma (Borrower, BorrowingEntry, BorrowingItem, ReturnEntry).
- Membuat `/home/z/my-project/src/components/pages/berita-acara.tsx` dengan struktur 2-tab (Tabs shadcn/ui):
  - Tab "Peminjaman": daftar BA Peminjaman + form tambah/edit + cetak BA + aksi "Buat BA Pengembalian" (auto-switch tab & pre-fill items).
  - Tab "Pengembalian": daftar BA Pengembalian + form tambah (pilih borrowing berstatus "Dipinjam") + cetak BA.
- Mengikuti pola dialog dari `barang-masuk.tsx`: `flex flex-col p-0 overflow-hidden max-h-[92vh]` dengan sticky header, body scrollable, sticky footer.
- Form BA Peminjaman: 3 section (Identitas, Daftar Barang, Penandatangan). Default `lenderName`/`lenderNip` dari `settings.principalName`/`settings.principalNip`.
- Form BA Pengembalian: 4 section (Pilih BA Peminjaman, Tanggal & Catatan, Daftar Barang + Kondisi Awal + Kondisi Saat Dikembalikan, Penandatangan). Auto-fill items dari borrowing terpilih; user bisa edit kondisi.
- Inline dialog "Tambah Peminjam" (Dialog kecil di atas dialog BA) — POST ke `/api/borrowers` lalu auto-select peminjam baru di dropdown.
- Cetak BA Peminjaman: paragraf pembuka dengan hari/tanggal/bulan/tahun, tabel identitas (Pemberi Pinjaman + Peminjam), tabel barang (No, Nama, No. Register, Jumlah, Satuan, Kondisi, Catatan), paragraf penutup, signature block 2 kolom.
- Cetak BA Pengembalian: paragraf pembuka, tabel identitas (Penerima + Peminjam), tabel barang dengan kolom "Kondisi Saat Dipinjam" & "Kondisi Saat Dikembalikan" (parse `returnItems` JSON), paragraf penutup, signature block 2 kolom.
- Daftar BA (kedua tab) juga bisa dicetak via PrintDialog dengan signature Pengurus Barang.
- Badge status: Dipinjam = amber (warning), Dikembalikan = emerald (success).
- Tombol Edit/Hapus/Buat-BA-Pengembalian dinonaktifkan jika status sudah "Dikembalikan".
- Membersihkan import yang tidak terpakai (`toast`, `openPrintWindow`, `sanitizeFilename`).
- Memperbaiki bug duplicate `<AlertDialogHeader>` pada dialog konfirmasi hapus BA Pengembalian.
- `bun run lint` → pass (exit 0). `bunx tsc --noEmit` → tidak ada error di file `berita-acara.tsx`.

## Stage Summary

- **Artifact**: `/home/z/my-project/src/components/pages/berita-acara.tsx` (~1900 baris, named export `BeritaAcaraPage`, `'use client'`).
- **Struktur**: Tabs (Peminjaman | Pengembalian) — masing-masing Card berisi PageHeader, search, tombol Cetak Daftar + Tambah, tabel daftar (Table shadcn/ui), dialog form (sticky header/footer), AlertDialog konfirmasi hapus, PrintDialog pilih orientasi.
- **API dipakai**: GET/POST/PUT/DELETE `/api/borrowings`, GET/POST `/api/borrowers`, GET/POST `/api/returns`, GET `/api/settings` (via `fetchPrintSettings`).
- **Cetak**: `printWithKop` dari `@/lib/print-utils` → KOP sekolah + judul BA + content HTML + signature + footer "Dicetak pada".
- **Known limitation**: tombol "Hapus" pada BA Pengembalian memanggil `DELETE /api/returns/{id}` yang BELUM tersedia (hanya ada `/api/returns/route.ts` GET/POST). Perlu dibuatkan `/api/returns/[id]/route.ts` dengan handler DELETE (paralel dengan `/api/borrowings/[id]/route.ts`). Sengaja tidak dibuat karena aturan "Jangan buat file lain — hanya berita-acara.tsx". Saat ini tombol Hapus akan menampilkan toast error.
- **Belum di-wire**: komponen belum dipakai di sidebar/route `/` — task lain yang menangani navigasi.
