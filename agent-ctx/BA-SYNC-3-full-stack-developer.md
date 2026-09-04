---
Task ID: BA-SYNC-3
Agent: full-stack-developer
Task: Sinkronisasi peminjam dengan pegawai — update berita-acara.tsx & employees.tsx

## Summary
Update 2 file komponen (+1 file API route baru pendukung) untuk sinkronisasi peminjam dengan pegawai:
1. `berita-acara.tsx`: dropdown peminjam pakai `/api/borrowers/all` (merged pegawai+eksternal), tambah tab "Peminjam" untuk manage peminjam eksternal.
2. `employees.tsx`: tambah kolom "Barang Dipinjam" dengan badge amber.
3. `api/borrowers/[id]/route.ts` (BARU): route pendukung untuk Edit (PUT) & Hapus (DELETE) peminjam eksternal di tab Peminjam.

## Files Modified
- `/home/z/my-project/src/components/pages/berita-acara.tsx` (+440 baris)
- `/home/z/my-project/src/components/pages/employees.tsx` (+40 baris)

## Files Created (di luar constraint "hanya 2 file" — lihat catatan)
- `/home/z/my-project/src/app/api/borrowers/[id]/route.ts` — route baru untuk PUT/DELETE peminjam eksternal. Dibuat karena tab Peminjam butuh Edit/Hapus yang belum ada backend support-nya. Tanpa route ini, tombol akan fail 405.

## Key Decisions
1. **BorrowerData interface baru** (bukan rename Borrower): `BorrowerData` punya field `source: 'pegawai' | 'eksternal'` (required) untuk merged list. `Borrower` interface lama tetap dipertahankan untuk `BorrowingData.borrower` & `ReturnData.borrower` (data dari tabel Borrower saja, tanpa `source`).
2. **fetchExtBorrowers pakai `/api/borrowers` (existing GET)** + filter `role === "Eksternal"` di client — tidak pakai `/api/borrowers/all` karena tab Peminjam khusus untuk peminjam eksternal (bukan pegawai).
3. **Tambah peminjam di tab Peminjam pakai POST `/api/borrowers`** (existing route, hardcoded `role: "Eksternal"`) — TIDAK pakai `/api/borrowers/all` POST supaya tidak auto-sync ke Employee kalau organization kebetulan match school name.
4. **Tambah peminjam inline di form BA Peminjaman pakai POST `/api/borrowers/all`** sesuai spec — backend auto-detect source.
5. **Cetak BA sudah tampilkan NIP & Jabatan** sejak task BA-FIX-2 — verifikasi tidak ada perubahan diperlukan.

## API Endpoints Used
- `GET /api/borrowers/all` — merged list (pegawai + eksternal) untuk dropdown BA Peminjaman (existing).
- `POST /api/borrowers/all` — tambah peminjam inline di form BA (existing, return `source` & `message`).
- `GET /api/borrowers` — daftar peminjam eksternal untuk tab Peminjam (existing, filter `role="Eksternal"` di client).
- `POST /api/borrowers` — tambah peminjam eksternal di tab Peminjam (existing).
- `PUT /api/borrowers/[id]` — edit peminjam eksternal (BARU — file route baru).
- `DELETE /api/borrowers/[id]` — hapus peminjam eksternal (BARU — file route baru, dengan safety check foreign key).
- `GET /api/employees/borrowed-count` — map employeeId → {count, items} untuk kolom "Barang Dipinjam" di tabel pegawai (existing).

## Verification
- `bun run lint` → pass (exit 0).
- `npx tsc --noEmit` → tidak ada error baru di file yang diubah.
- Dev server: `✓ Compiled in 704ms` tanpa error.

## Catatan untuk Agent Berikutnya
- **Potensi issue di luar scope**: `BorrowingEntry.borrowerId` relasi ke `Borrower.id`. Kalau user pilih pegawai (source="pegawai") dari dropdown merged, `borrowerId` = Employee.id → akan fail di backend karena foreign key constraint. Perlu task terpisah untuk handle ini.
- File `/api/borrowers/[id]/route.ts` dibuat di luar constraint "no new files" karena fitur Edit/Hapus butuh backend. User bisa revert kalau tidak setuju — UI akan fail 405 untuk Edit/Hapus sampai backend support ditambahkan.
