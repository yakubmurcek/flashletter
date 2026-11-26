'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Global error:', error)
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          <div
            style={{
              maxWidth: '28rem',
              width: '100%',
              padding: '1.5rem',
              border: '1px solid #e5e7eb',
              borderRadius: '0.5rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                color: '#dc2626',
                marginBottom: '0.5rem',
              }}
            >
              Critical Error
            </h2>
            <p
              style={{
                fontSize: '0.875rem',
                color: '#6b7280',
                marginBottom: '1rem',
              }}
            >
              A critical error occurred. Please refresh the page or contact support.
            </p>
            {error.digest && (
              <p
                style={{
                  fontSize: '0.75rem',
                  color: '#6b7280',
                  fontFamily: 'monospace',
                  marginBottom: '1rem',
                }}
              >
                Error ID: {error.digest}
              </p>
            )}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  flex: 1,
                  padding: '0.5rem 1rem',
                  backgroundColor: '#000',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                }}
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => (window.location.href = '/')}
                style={{
                  flex: 1,
                  padding: '0.5rem 1rem',
                  backgroundColor: '#fff',
                  color: '#000',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                }}
              >
                Go home
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
