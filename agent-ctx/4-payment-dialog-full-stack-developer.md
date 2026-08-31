# Task 4 — Build PaymentDialog component

## Summary
Built a reusable `PaymentDialog` React component for recording 1–12 month
payments with auto-advance behaviour.

## File
- `/home/z/my-project/src/components/payment-dialog.tsx` (new)

## Key features
- Dialog header: "Pembayaran — {ownerName}" + `ownerSubtitle`
- Summary badges: "{paidCount} dari {durationMonths} bulan dibayar" + total Rupiah
- Year selector: current year ± 2 (5 buttons), active uses `bg-primary text-primary-foreground`
- 12-month grid (3 cols mobile / 4 cols sm+), three card states:
  - Paid → emerald bg + ✓ + amount + date
  - Unpaid & in-range → clickable, opens inline form
  - Out of range → dimmed (`opacity-40`), disabled
- Inline form (expandable Card with `border-primary/40`) — amount + notes inputs,
  POST to `${apiBase}/${ownerId}/payments`. On success:
  toast "Pembayaran {MonthName} {year} tersimpan", refresh, auto-advance to next
  unpaid in-range month.
- Collapsible "Rincian Pembayaran" table with delete (DELETE
  `${apiBase}/${ownerId}/payments/{id}`).
- Sticky footer with "Tutup" button; dialog content `max-h-[85vh] overflow-y-auto`.
- Helpers inline: `MONTHS_ID`, `formatRupiah`, `formatTanggal`.

## Conventions followed
- 'use client', `useState/useEffect/useCallback`, `useToast` from `@/hooks/use-toast`.
- Reused existing shadcn/ui primitives: dialog, button, input, label, badge, card,
  table, collapsible, separator.
- Icons from `lucide-react`: Calendar, Check, Loader2, Trash2, ChevronDown,
  ChevronRight, X.
- ESLint: 0 errors, 0 warnings.

## Worklog
- Appended Task ID 4 entry to `/home/z/my-project/worklog.md`.
