---
Task ID: 1
Agent: main
Task: Rename "Ruang" to "Inventaris" in sidebar and navbar

Work Log:
- Changed sidebar nav item label from "Ruang" to "Inventaris" with Archive icon in src/components/app-sidebar.tsx
- Changed navbar sub-tab label from "Ruang" to "Inventaris" in src/app/page.tsx
- Changed page title map entry from "Ruang" to "Inventaris" in src/app/page.tsx
- Changed heading in rooms.tsx from "Ruang" to "Inventaris" with updated subtitle

Stage Summary:
- Sidebar now shows "Inventaris" with Archive icon
- Navbar sub-tab shows "Inventaris" and "Barang di Ruang"
- Page heading shows "Inventaris"

---
Task ID: 2
Agent: main
Task: Ensure Bilik & Lemari are addable/removable in room detail

Work Log:
- Verified Bilik and Lemari add/delete functionality already exists in rooms.tsx
- Tested adding new Lemari via Agent Browser - dialog opens, form works, item saved successfully
- Tested deleting Lemari via Agent Browser - confirmation dialog appears, deletion works
- Both "Tambah Bilik" and "Tambah Lemari" buttons present
- Each Bilik/Lemari card has edit (pencil) and delete (trash) icon buttons

Stage Summary:
- Bilik & Lemari can be added and deleted from room detail page
- Confirmation dialog shows before deletion
- Toast notifications confirm success/failure

---
Task ID: 3
Agent: main
Task: Fix photo upload/camera in Inventaris page and fix PUT API bug

Work Log:
- Discovered items had no roomId assigned, so they weren't showing in the Inventaris page
- Assigned items to rooms via API to make them visible
- Found critical bug in PUT /api/items/[id] endpoint: using `??` operator (e.g., `body.roomId ?? null`) caused fields not included in the request body to be reset to null/empty instead of being preserved
- Rewrote PUT handler with `buildUpdateData()` helper that only includes fields explicitly provided in the request body
- Added photo file cleanup when items are deleted
- Verified photo upload now works end-to-end in both KIB and Inventaris pages
- Photo dialog opens with Kamera and Upload buttons
- Photo thumbnails render correctly with count badges

Stage Summary:
- Photo upload works in Inventaris page (both Camera and Upload buttons)
- PUT API fixed to use partial updates (only updates provided fields)
- Photo files cleaned up when items are deleted
- Item photos properly preserved when other fields are updated

---
Task ID: 5
Agent: main
Task: Add "Sumber Dana" and "Tahun Pengadaan" columns to Inventaris item tables

Work Log:
- Added `sumberDana` (String) field to Item model in prisma/schema.prisma
- Renamed `acquisitionYear` comment from "Tahun perolehan" to "Tahun pengadaan"
- Ran `bun run db:push` to sync database
- Updated POST handler in /api/items/route.ts to include sumberDana
- Updated PUT handler in /api/items/[id]/route.ts to include sumberDana in simpleFields
- Updated rooms.tsx: ItemData interface, itemForm state, openEditItem(), table headers/rows, edit dialog with Sumber Dana dropdown (APBN/APBD/BOS/Donasi/Hibah/Lainnya) and Tahun Pengadaan number input
- Updated room-items.tsx: same changes as rooms.tsx
- Updated kib.tsx: ItemData interfaces, formData state, edit loading, form UI with Sumber Dana dropdown, renamed "Tahun Perolehan" to "Tahun Pengadaan"
- Fixed React controlled/uncontrolled Select warning by using '_none_' sentinel value for empty sumberDana
- Verified with Agent Browser - both columns visible in tables, both fields present in edit dialogs

Stage Summary:
- "Sumber Dana" column added with dropdown (APBN, APBD, BOS, Donasi, Hibah, Lainnya, Tidak Ditentukan)
- "Tahun Pengadaan" column added with number input (year format)
- Both fields visible in Inventaris tables and KIB form
- Edit dialog includes both new fields
- Lint passes, no errors

---
Task ID: 4
Agent: main
Task: REWRITE rooms.tsx to use new Inventory API routes (separate from KIB)

Work Log:
- Rewrote `/src/components/pages/rooms.tsx` with all API routes changed from old KIB routes to new Inventory routes:
  - `/api/rooms` → `/api/inventory/rooms`, `/api/rooms/[id]` → `/api/inventory/rooms/[id]`
  - `/api/biliks` → `/api/inventory/biliks`, `/api/biliks/[id]` → `/api/inventory/biliks/[id]`
  - `/api/lemari` → `/api/inventory/cabinets`, `/api/lemari/[id]` → `/api/inventory/cabinets/[id]`
  - `/api/items` → `/api/inventory/items`, `/api/items/[id]` → `/api/inventory/items/[id]`
- Updated data model types:
  - `LemariData` → `CabinetData` (used internally, UI still shows "Lemari")
  - `ItemData` → `InventoryItemData` with `cabinetId` instead of `lemariId`, `tahunPengadaan` instead of `acquisitionYear`, removed `kibType`
  - `RoomData.lemari` → `RoomData.cabinets`
  - Added `cabinet` relation to InventoryItemData instead of `lemari`
- `selectedLemariId` from store maps to `cabinetId` in API calls (e.g., `?cabinetId=${selectedLemariId}`)
- Breadcrumb changed from "Ruang" to "Inventaris"
- Added "Harga" column to items table
- Added "Sumber Dana" and "Tahun Pengadaan" columns to items table and print detail
- Added "Tambah Barang" button in both room detail view and bilik/lemari item view
- Add item dialog POSTs to `/api/inventory/items` with location data auto-set from current selection (roomId/bilikId/cabinetId)
- Edit item uses PUT `/api/inventory/items/[id]`
- Delete item uses DELETE `/api/inventory/items/[id]`
- Delete room/bilik/cabinet uses `/api/inventory/rooms/[id]`, `/api/inventory/biliks/[id]`, `/api/inventory/cabinets/[id]`
- Stats card `totalLemari` now counts `cabinets` instead of `lemari`
- Photo gallery passes `itemApiPath="/api/inventory/items"` to PhotoGallery component
- Updated PhotoGallery component to accept optional `itemApiPath` prop for customizable API base path
- Added helper functions `refreshItemsList()` and `refreshRoomData()` to reduce code duplication
- Lint passes with no errors

Stage Summary:
- All API routes in rooms.tsx now use `/api/inventory/*` routes
- Data model uses `cabinetId`/`cabinets` internally, "Lemari" displayed in UI
- "Tambah Barang" feature added with location auto-set
- Items table includes Harga, Sumber Dana, Tahun Pengadaan columns
- Print detail includes Sumber Dana and Tahun Pengadaan columns
- Breadcrumb shows "Inventaris" instead of "Ruang"
- PhotoGallery component now supports custom API path via `itemApiPath` prop

---
Task ID: 5
Agent: main
Task: REWRITE room-items.tsx to use new Inventory API routes (separate from KIB)

Work Log:
- Rewrote `/src/components/pages/room-items.tsx` with all API routes changed from old KIB routes to new Inventory routes:
  - `/api/items` → `/api/inventory/items`
  - `/api/items/[id]` → `/api/inventory/items/[id]`
  - `/api/rooms` → `/api/inventory/rooms`
- Updated data model: `ItemData` → `InventoryItemData` with new fields:
  - Removed `kibType`, `acquisitionYear`, `lemariId`, `lemari`
  - Added `cabinetId`, `cabinet` (with `number` field), `tahunPengadaan`
- Removed all KIB references: `filterKibType` state, `kibLabels` object, KIB filter Select dropdown, KIB badge in table, KIB column
- Added "Tambah Barang" button next to the "Cetak" button in the page header
- Item add/edit dialog now supports both add and edit modes:
  - Add: POST to `/api/inventory/items` with form data including roomId from room select
  - Edit: PUT to `/api/inventory/items/[id]`
- Added "Lokasi / Ruang" select field to the add/edit dialog form
- Location display uses `cabinet` data instead of `lemari`, but shows "Lemari" label in UI
- Edit form uses `tahunPengadaan` instead of `acquisitionYear`
- Print function updated:
  - Removed KIB column from print table
  - Added Sumber Dana and Tahun Pengadaan columns to print table
  - Print title changed from "DAFTAR BARANG DI RUANGAN" to "DAFTAR BARANG INVENTARIS"
  - Removed KIB filter from print subtitle
- Page title changed from "Barang di Ruang" to "Barang Inventaris"
- Stats card label changed from "Total Barang" to "Barang Inventaris"
- PhotoGallery passes `itemApiPath="/api/inventory/items"` prop
- Delete uses DELETE `/api/inventory/items/[id]`
- Lint passes with no errors

Stage Summary:
- All API routes in room-items.tsx now use `/api/inventory/*` routes
- Data model uses `cabinetId`/`cabinet` internally, "Lemari" displayed in UI
- KIB type filter, badge, and column completely removed
- "Tambah Barang" feature added with room select for location
- Items table columns: No, Foto, Nama Barang, No. Register, Merk, Kondisi, Jumlah, Harga, Sumber Dana, Tahun Pengadaan, Lokasi, Keterangan, Aksi
- Print includes Sumber Dana and Tahun Pengadaan columns, no KIB
- Page title is "Barang Inventaris"

---
Task ID: 6
Agent: main
Task: Separate Inventaris from KIB - create completely independent data models

Work Log:
- Created new Prisma models: InventoryRoom, InventoryBilik, InventoryCabinet, InventoryItem (completely separate from KIB's Room, Bilik, Lemari, Item)
- InventoryItem has: sumberDana (String), tahunPengadaan (Int?), NO kibType or KIB-specific fields
- Pushed schema to database with `bun run db:push`
- Created 8 API route files under /api/inventory/:
  - rooms/route.ts, rooms/[id]/route.ts
  - biliks/route.ts, biliks/[id]/route.ts
  - cabinets/route.ts, cabinets/[id]/route.ts
  - items/route.ts, items/[id]/route.ts
- Updated rooms.tsx to use /api/inventory/* routes with new data types
- Updated room-items.tsx to use /api/inventory/* routes, removed KIB filter/column
- Both frontend pages now show Sumber Dana and Tahun Pengadaan columns
- "Tambah Barang" feature added to both pages for direct item creation in Inventaris
- KIB remains fully functional with its own data (Item model)
- Verified with Agent Browser: Inventaris and KIB show completely separate data
- Tested CRUD operations: add room, add bilik, add lemari, add item, edit item - all working

Stage Summary:
- Inventaris is now completely independent from KIB with its own database tables
- New models: InventoryRoom, InventoryBilik, InventoryCabinet, InventoryItem
- Sumber Dana and Tahun Pengadaan columns visible and functional in Inventaris
- Bilik and Lemari can be added/deleted per room
- Edit barang feature works in both Inventaris pages
- Tambah Barang feature allows direct item creation in Inventaris
- KIB still works with its own Item model - no cross-contamination

---
Task ID: 1
Agent: Main Agent
Task: Implement BON (credit) and Cash payment tracking for orders, including ability to add old BON records

Work Log:
- Added `paymentStatus` (LUNAS/BELUM_BAYAR) and `paidAt` (DateTime?) fields to Order model in Prisma schema
- Ran `db:push` to sync schema changes to database
- Updated POST /api/orders route to auto-set paymentStatus based on paymentMethod (Cash→LUNAS, BON→BELUM_BAYAR)
- Updated PUT /api/orders/[id] route with `markAsPaid` handling - sets paymentStatus to LUNAS and paidAt date
- Updated PUT route to auto-derive paymentStatus when paymentMethod changes
- Completely rewrote orders page UI with:
  - 4 BON summary cards: Total Pesanan, Cash (Tunai), BON Belum Bayar, BON Lunas
  - Payment filter tabs: Semua, Cash, BON Belum Bayar, BON Lunas
  - BON-specific fields in add/edit dialog: Status Pembayaran dropdown, Tanggal Pelunasan date picker
  - "Pengaturan BON" section with amber styling when BON method selected
  - Payment status badges in table: "📝 BON" + "BELUM BAYAR" (red) or "LUNAS" (green)
  - "Tandai Lunas" button for unpaid BON orders
  - "Tandai BON Lunas" dialog with date picker for payment date
  - Unpaid BON rows highlighted with amber background
  - Expanded items view shows payment info (status and paid date) for BON orders
  - Print format includes BON payment status info
  - Hint text for adding old BON with past dates

Stage Summary:
- All BON/Cash features fully implemented and browser-verified
- Can add old BON records by setting past dates and BON method
- Can mark BON as paid with date tracking
- Summary cards show real-time totals
- Filter tabs correctly segment orders by payment type/status

---
Task ID: 2
Agent: Main Agent
Task: Make BON recording easier - add "Catat BON" button, make order number optional for BON

Work Log:
- Added "Catat BON" button alongside "Tambah Pesanan" - pre-fills BON method, BELUM_BAYAR status, Diterima status
- Made order number optional for BON entries - when empty, auto-generates format: BON/[romanMonth]/[year]-[sequentialNo]
- Updated order number label to show "(opsional untuk BON)" when BON is selected
- Updated placeholder text to "Kosongkan untuk auto-generate" when BON selected
- Added hint text showing auto-generate format when BON and no number entered
- Changed table header from "Nomor Surat" to "Nomor / Kode" to accommodate BON entries
- Updated edit dialog to handle BON auto-generated numbers (keeps existing BON/ number)
- When editing BON with auto-number and no input, preserves the existing BON number
- Changed "Tanggal Pesanan" label to "Tanggal Pembelian" with BON-specific hint "Isi tanggal ketika BON terjadi"

Stage Summary:
- Users can now easily record old BON debts by clicking "Catat BON" button
- No surat pesanan number required for BON entries - auto-generated as BON/VI/2026-1 etc.
- Verified via browser: BON/VI/2026-1 created successfully without order number
- All 4 order types working: Cash, BON with surat, BON without surat (auto-number), BON Lunas
