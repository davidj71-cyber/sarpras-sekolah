# Task 2-fix-modals — full-stack-developer

## Summary
Fix modal layouts across the app so they extend horizontally (left-right) for a professional look, eliminate the double-scroll overlap in the 3 ScrollArea-wrapped modals, and widen narrow form modals.

## Files modified (11 total)

### Task A — Removed inner `<ScrollArea>` (double-scroll fix)
1. **src/components/pages/orders.tsx**
   - Removed `import { ScrollArea } from '@/components/ui/scroll-area'` (only one usage in file).
   - Removed `<ScrollArea className="max-h-[65vh] pr-4">…</ScrollArea>` wrapper around the form body. Kept inner `<div className="space-y-4">` content unchanged.
   - Changed `DialogContent` className `sm:max-w-3xl` → `sm:max-w-5xl`.
   - Item-list row: changed `grid grid-cols-12` → `grid grid-cols-16` and redistributed columns from `4/2/2/3/1` (Nama/Jumlah/Satuan/Harga/X) → `6/2/2/4/2`. Mobile fallback also rebalanced (Nama full row + 4×col-span-4 below).
2. **src/components/pages/barang-masuk.tsx**
   - Removed `import { ScrollArea } from '@/components/ui/scroll-area'` (only one usage in file).
   - Removed `<ScrollArea className="max-h-[65vh] pr-4">…</ScrollArea>` wrapper.
   - Changed `DialogContent` className `sm:max-w-3xl` → `sm:max-w-5xl`.
   - Item-list row: changed `grid grid-cols-12` → `grid grid-cols-16` and redistributed columns from `4/2/2/3/2` (Nama/Jumlah/Satuan/Kondisi/X) → `6/2/2/4/2`. Mobile fallback rebalanced (Nama full row + 4×col-span-4 below).
3. **src/components/pages/kib.tsx**
   - Removed `import { ScrollArea } from '@/components/ui/scroll-area'` (only one usage in file).
   - Removed `<ScrollArea className="max-h-[60vh] pr-4">…</ScrollArea>` wrapper. Kept inner `<div className="space-y-2">` content unchanged.
   - Changed `DialogContent` className from `sm:max-w-2xl max-h-[90vh]` → `sm:max-w-4xl` (dropped the redundant max-h-[90vh] since DialogContent base already caps at `max-h-[calc(100dvh-2rem)]`).

### Task B — Widened narrow form modals
4. **src/components/pages/employees.tsx** — `sm:max-w-lg` → `sm:max-w-2xl`
5. **src/components/pages/stores.tsx** — `sm:max-w-lg` → `sm:max-w-2xl`
6. **src/components/pages/accounts.tsx**
   - `sm:max-w-md` → `sm:max-w-2xl`
   - Form container changed from single-column `<div className="space-y-4 py-4">` → `<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 py-4">`. "Nama Lengkap" field marked `sm:col-span-2` (full-width on desktop). Other fields (Username, Password, Role, Status) sit side-by-side on ≥640px screens.
7. **src/components/pages/room-items.tsx** (Tambah/Edit Barang) — `sm:max-w-lg` → `sm:max-w-2xl`
8. **src/components/pages/rooms.tsx** (Tambah/Edit Barang item modal at line ~2119) — `sm:max-w-lg` → `sm:max-w-2xl`

### Task C — Widened medium form modals
9. **src/components/pages/buildings.tsx** — `sm:max-w-2xl` → `sm:max-w-4xl`
10. **src/components/pages/rooms.tsx** — 3 modals changed `sm:max-w-2xl` → `sm:max-w-3xl`:
    - Ruang dialog (line 1705)
    - Bilik dialog (line 1840)
    - Lemari dialog (line 1952)
11. **src/components/pages/salary.tsx** (Tambah/Edit Penerima) — `sm:max-w-2xl` → `sm:max-w-3xl`

### Supporting change
- **src/app/globals.css** — Added `--grid-cols-13/14/15/16` and `--col-span-13/14/15/16` entries to `@theme inline` block. This registers the corresponding `grid-cols-16` / `col-span-16` utilities in Tailwind v4 (which only ships 1-12 by default). Needed by the new item-list layouts in orders.tsx and barang-masuk.tsx.

## Lint status
`bun run lint` → PASS (no errors, no warnings).

## Dev server
Dev server compiled cleanly after every edit; `GET / 200` confirmed.

## Notes / issues
- The DialogFooter is sticky-by-default thanks to the prior change in `src/components/ui/dialog.tsx`, so no per-modal sticky classes were added (per task instructions).
- Verified each `ScrollArea` import was only used by the modal being edited before removing the import line (single grep hit per file).
- Did not modify: print-dialog.tsx, photo-gallery.tsx, photo-thumbnail.tsx, payment-dialog.tsx, media.tsx, status-change modals, AlertDialogs — per task instructions.
- The 5 non-form modals in rooms.tsx (Foto Barang at 2096) and the room-items.tsx Foto Barang modal were left untouched (out of scope).
