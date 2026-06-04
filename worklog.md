---
Task ID: 1
Agent: Main Agent
Task: Enhance Ruang (Room) feature with navbar tabs, search, stats, and improved UI

Work Log:
- Reviewed existing Ruang feature code (rooms.tsx, API routes, navigation store, sidebar)
- Updated navigation-store.ts to add RoomSubPage type ('rooms' | 'allItems') and setRoomSubPage action
- Updated page.tsx to add RoomNavbar component with "Ruang" and "Barang di Ruang" tabs, similar to Toko pattern
- Completely rewrote rooms.tsx with:
  - Search/filter functionality for rooms (by name, building, floor)
  - Stats cards (Total Ruang, Total Bilik, Total Lemari, Total Barang)
  - Enhanced room cards with colored icons, building/floor info, condition breakdown (Baik/Rusak Ringan/Rusak Berat)
  - Room detail header with edit/delete buttons and condition stats
  - Better visual design for Bilik/Lemari cards with colored icons
  - Improved items table with condition badges (color-coded)
  - Breadcrumb with ChevronRight icons
- Created room-items.tsx (Barang di Ruang page) with:
  - All items across rooms with location info (Room > Bilik > Lemari)
  - Stats cards (Total, Baik, Rusak Ringan, Rusak Berat)
  - Multi-filter: search query, room filter, condition filter, KIB type filter
  - Total value calculation (Rupiah format)
  - Location display with icons for Room/Bilik/Lemari
- Fixed React import in room-items.tsx (needed for React.Fragment)
- Tested all features via Agent Browser: room CRUD, bilik/lemari CRUD, navbar tabs, search, stats

Stage Summary:
- Ruang feature now has navbar tabs: "Ruang" and "Barang di Ruang"
- Room list page has search, stats, enhanced cards
- Room detail page has header stats, better bilik/lemari items
- Barang di Ruang page shows all items with location and filters
- All APIs already support needed queries (items with room/bilik/lemari includes)
- No errors in dev log or browser console
