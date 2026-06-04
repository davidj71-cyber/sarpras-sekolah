---
Task ID: 1
Agent: Main Agent
Task: Add photo functionality to school inventory app - photos for items in rooms, biliks, and lemari

Work Log:
- Explored current codebase structure - understood Prisma schema, API routes, and page components
- Updated Prisma schema: added `photos` field (JSON string array) to Item model
- Ran `bun run db:push` to sync database
- Created photo upload API endpoint at `/api/upload/route.ts` - handles multipart form data, compresses images with sharp (max 1200px, JPEG 80% quality)
- Created photo delete API endpoint at `/api/upload/[filename]/route.ts` - securely deletes files from uploads/items directory
- Updated Item API routes (`/api/items/route.ts` and `/api/items/[id]/route.ts`) - parse photos JSON on GET, stringify photos on POST/PUT
- Created `PhotoGallery` component (`src/components/photo-gallery.tsx`) - full-featured with camera capture, file upload, delete, and lightbox viewer
- Created `PhotoThumbnail` component (`src/components/photo-thumbnail.tsx`) - compact thumbnail display for table rows with viewer dialog
- Updated Rooms page (`src/components/pages/rooms.tsx`) - added Foto column to items table, clickable item names open photo dialog
- Updated Barang di Ruang page (`src/components/pages/room-items.tsx`) - added Foto column with PhotoThumbnail
- Updated KIB page (`src/components/pages/kib.tsx`) - added Foto column, Camera button in actions, photo gallery in edit dialog, standalone photo dialog
- Created `public/uploads/items/` directory for photo storage
- Ran lint check - all passed with no errors
- Browser tested all features - KIB table shows Foto column, Kelola Foto button opens dialog, Edit dialog shows Kamera/Upload buttons

Stage Summary:
- Full photo management feature implemented across all item views
- Photos stored as compressed JPEG files in `public/uploads/items/`
- Photo filenames stored as JSON array in Item.photos field
- Camera capture (mobile) and file upload (desktop) both supported
- Lightbox viewer with navigation for multiple photos
- Delete photos individually with server-side file cleanup
- Max 10 photos per item, max 10MB per file
