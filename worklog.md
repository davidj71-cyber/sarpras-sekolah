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
