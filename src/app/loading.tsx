/**
 * Route-level loading UI shown by Next.js App Router while the route
 * segment is loading (e.g. during the very first paint before client JS
 * hydrates, or while a dynamic chunk is being fetched).
 *
 * This file lives next to `layout.tsx` and wraps every page transition.
 * Kept completely self-contained (no imports) so it renders instantly
 * with zero extra JS shipped to the client.
 */
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="relative size-10">
          <div className="absolute inset-0 rounded-full border-2 border-muted" />
          <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-muted-foreground">Memuat aplikasi...</p>
      </div>
    </div>
  )
}
