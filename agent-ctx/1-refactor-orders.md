# Task ID: 1 - Refactor Orders Page Print Utilities

## Summary
Refactored the Orders page (`src/components/pages/orders.tsx`) to use shared print utilities from `@/lib/print-utils` instead of duplicating KOP building logic.

## Changes Made
1. **Removed duplicated code**: `KopLine` interface, `SettingsData` interface, `parseKopLines()`, `formatRupiah()`, `formatDate()`, `formatNumber()` functions (~100 lines)
2. **Added imports**: `fetchPrintSettings`, `buildKopHtml`, `openPrintWindow`, `formatRupiahPrint`, `formatDatePrint`, `formatNumberPrint` from `@/lib/print-utils`
3. **Refactored `handlePrint()`**:
   - `fetchPrintSettings()` replaces manual fetch + fallback
   - `buildKopHtml(settings)` replaces ~70 lines of manual KOP HTML
   - `openPrintWindow(title, bodyHtml)` replaces manual `window.open` + `document.write`
   - `formatNumberPrint()` replaces `formatNumber()` in print output
   - `formatDatePrint()` replaces manual date formatting
   - Added `<style>` override in bodyHtml to preserve original Surat Pesanan styling
4. **Updated JSX**: `formatRupiahPrint()` and `formatDatePrint()` replace local helpers in table/dialog

## Visual Output
- Surat Pesanan print output preserved exactly (same margins, font sizes, colors, layout)
- Did NOT use `printWithKop()` because Surat Pesanan needs custom layout (no title div, no footer-info div)

## Verification
- ESLint: passes with no errors
- Dev log: no runtime errors
