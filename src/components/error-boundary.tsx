'use client'

import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * Error Boundary
 *
 * Catches runtime DOM errors that are typically caused by browser extensions
 * (Grammarly, Google Translate, password managers, etc.) injecting/modifying
 * DOM nodes that React manages. These errors are harmless to app logic but
 * show up as "Uncaught NotFoundError: removeChild" in the console.
 *
 * When such an error is caught, we silently reset the boundary so React can
 * re-render cleanly without crashing the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Silently swallow DOM mutation errors from browser extensions
    // These include: removeChild NotFoundError, insertBefore NotFoundError, etc.
    const isDomMutationError =
      error.name === 'NotFoundError' ||
      error.message.includes('removeChild') ||
      error.message.includes('insertBefore') ||
      error.message.includes('not a child of this node')

    if (isDomMutationError) {
      // Reset immediately so React re-renders cleanly
      // Use setTimeout to avoid setState during render
      setTimeout(() => {
        this.setState({ hasError: false, error: null })
      }, 0)
    }
    // Other genuine errors are also caught to prevent full app crash,
    // but we log them for debugging
    if (!isDomMutationError) {
      console.error('App error caught by boundary:', error, errorInfo)
    }
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      const isDomMutationError =
        this.state.error.name === 'NotFoundError' ||
        this.state.error.message.includes('removeChild') ||
        this.state.error.message.includes('insertBefore')

      if (isDomMutationError) {
        // Render children again — React will reconcile cleanly
        return this.props.children
      }

      // For other errors, show a minimal fallback (avoid crashing the page)
      return (
        <div style={{ padding: '20px', textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
          <p style={{ color: '#666', fontSize: '14px' }}>
            Terjadi kesalahan. Muat ulang halaman untuk melanjutkan.
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: '8px',
              padding: '6px 16px',
              background: '#0f172a',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            Coba Lagi
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
