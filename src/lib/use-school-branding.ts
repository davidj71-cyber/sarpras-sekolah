'use client'

import { useEffect, useState } from 'react'

export interface SchoolBranding {
  /** base64 data URL of the uploaded logo, or null when not set */
  logo: string | null
  /** School name from settings, or null when not set */
  schoolName: string | null
  /** Whether the settings request is in-flight */
  loading: boolean
}

// Module-level cache so multiple consumers (login, sidebar) share one request
// and avoid re-fetching on every mount.
let cached: SchoolBranding | null = null
const listeners = new Set<(b: SchoolBranding) => void>()
let inflight: Promise<SchoolBranding> | null = null

async function fetchBranding(): Promise<SchoolBranding> {
  if (cached) return cached
  if (!inflight) {
    inflight = (async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' })
        if (!res.ok) throw new Error('failed')
        const data = await res.json()
        const branding: SchoolBranding = {
          logo: data.logo ?? null,
          schoolName: data.schoolName ?? null,
          loading: false,
        }
        cached = branding
        listeners.forEach((l) => l(branding))
        return branding
      } catch {
        const fallback: SchoolBranding = {
          logo: null,
          schoolName: null,
          loading: false,
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

/** Force a re-fetch (e.g. after the user uploads a new logo). */
export function refreshSchoolBranding() {
  cached = null
  inflight = null
  void fetchBranding()
}

/**
 * Shared hook that exposes the school's logo + name from /api/settings.
 * Results are cached at module level so login & sidebar don't double-fetch.
 */
export function useSchoolBranding(): SchoolBranding {
  // Initialize lazily from the module cache so a returning consumer
  // doesn't flash a loading state.
  const [state, setState] = useState<SchoolBranding>(
    () => cached ?? { logo: null, schoolName: null, loading: !cached }
  )

  useEffect(() => {
    // Subscribe first so we never miss an update from an in-flight fetch.
    const listener = (b: SchoolBranding) => setState({ ...b, loading: false })
    listeners.add(listener)

    // Kick off the fetch only when nothing is cached and nothing is pending.
    // Updates arrive through the subscription listener (async), never as a
    // synchronous setState inside this effect.
    if (!cached && !inflight) {
      void fetchBranding()
    }

    return () => {
      listeners.delete(listener)
    }
  }, [])

  return state
}
