
---
Task ID: 1
Agent: Main
Task: Analyze PDF and implement matching Surat Pesanan print template + enhanced KOP settings

Work Log:
- Analyzed uploaded PDF (Pesanan_9 UD. NISEL REKLAME_2025.pdf) using pymupdf text extraction and VLM vision analysis
- Extracted detailed layout information: font sizes, positions, text blocks, drawing commands
- Identified KOP structure: Logo (left) + Header lines (big, above school name) + School name (biggest, bold) + Detail lines (small, below) + Separator line
- Identified surat body: SURAT PESANAN title (underlined), date right-aligned, No/Perihal with colons, Kepada Yth address, body text, 6-column table, total row, signature section
- Enhanced kopLines format from string[] to {text, style: 'header'|'detail', bold: boolean}[] for flexible KOP line styling
- Updated settings page UI with Header/Detail add buttons, style selector per line, bold toggle, move up/down buttons
- Updated settings API with backward compatibility (old string format auto-converts to detail type)
- Rewrote print function in orders.tsx to match PDF exactly: KOP layout, surat structure, table with proper columns, signature section
- Updated KOP preview in settings to show header lines above school name and detail lines below with different font sizes
- All pages verified via browser: Dashboard, Settings (with KOP config), Toko (with Pesanan navbar tab), Pesanan
- Lint check passed, no errors

Stage Summary:
- PDF analysis complete with pixel-level precision
- KOP settings now support 3 visual tiers: Header lines (big), School name (biggest), Detail lines (small)
- Print template matches reference PDF layout exactly
- Backward compatible: old kopLines string format auto-converts to new object format
- All pages verified working via browser automation
