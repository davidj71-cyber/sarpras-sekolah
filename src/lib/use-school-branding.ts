'use client'

import { useEffect, useState } from 'react'

export interface SchoolBranding {
  /** URL for the application logo image (login & sidebar). */
  appLogoUrl: string
  /** School name from settings, or null when not set. */
  schoolName: string | null
  /** Whether the settings request is in-flight. */
  loading: boolean
}

// Module-level cache so multiple consumers (login, sidebar) share one request
// and avoid re-fetching on every mount.
let cached: { schoolName: string | null; version: number } | null = null
const listeners = new Set<(b: { schoolName: string | null; version: number }) => void>()
let inflight: Promise<{ schoolName: string | null; version: number }> | null = null

async function fetchBranding(): Promise<{ schoolName: string | null; version: number }> {
  if (cached) return cached
  if (!inflight) {
    inflight = (async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' })
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        // Use updatedAt (epoch ms) as a cache-bust version so a newly uploaded
        // app logo / favicon is picked up immediately by the <img> tags.
        const version = data.updatedAt
          ? new Date(data.updatedAt).getTime()
          : Date.now()
        const branding = {
          schoolName: data.schoolName ?? null,
          version,
        }
        cached = branding
        listeners.forEach((l) => l(branding))
        return branding
      } catch {
        const fallback = {
          schoolName: null,
          version: Date.now(),
        }
        cached = fallback
        listeners.forEach((l) => l(fallback))
        return fallback
      } finally {
        inflight = null
      }
    })()
  }
  return inflight
}

/** Force a re-fetch (e.g. after the user uploads a new logo in settings). */
export function refreshSchoolBranding() {
  cached = null
  inflight = null
  void fetchBranding()
}

/**
 * Shared hook that exposes the school's app-logo URL + name from /api/settings.
 * Results are cached at module level so login & sidebar don't double-fetch.
 */
export function useSchoolBranding(): SchoolBranding {
  const [state, setState] = useState<{
    schoolName: string | null
    version: number
    loading: boolean
  }>(() =>
    cached
      ? { ...cached, loading: false }
      : { schoolName: null, version: 0, loading: true }
  )

  useEffect(() => {
    // Subscribe first so we never miss an update from an in-flight fetch.
    const listener = (b: { schoolName: string | null; version: number }) =>
      setState({ ...b, loading: false })
    listeners.add(listener)

    if (!cached && !inflight) {
      void fetchBranding()
    }

    return () => {
      listeners.delete(listener)
    }
  }, [])

  // Build the app-logo URL with a cache-bust query so a new logo is reflected
  // immediately after the user saves settings.
  const appLogoUrl = state.version
    ? `/api/app-logo?v=${state.version}`
    : '/api/app-logo'

  return {
    appLogoUrl,
    schoolName: state.schoolName,
    loading: state.loading,
  }
}
