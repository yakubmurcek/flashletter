'use client'

import { useEffect } from 'react'
import * as Sentry from '@sentry/nextjs'

export default function SentryExamplePage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '1rem',
      }}
    >
      <h1>Sentry Verification Page</h1>
      <button
        type="button"
        style={{
          padding: '1rem 2rem',
          fontSize: '1.2rem',
          backgroundColor: '#ff0000',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
        }}
        onClick={() => {
          throw new Error('Sentry Example Frontend Error')
        }}
      >
        Throw Frontend Error
      </button>

      <button
        type="button"
        style={{
          padding: '1rem 2rem',
          fontSize: '1.2rem',
          backgroundColor: '#0000ff',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
        }}
        onClick={async () => {
          await fetch('/api/sentry-example-api')
        }}
      >
        Trigger Backend Error
      </button>

      <button
        type="button"
        style={{
          padding: '1rem 2rem',
          fontSize: '1.2rem',
          backgroundColor: '#00aa00',
          color: 'white',
          border: 'none',
          borderRadius: '0.5rem',
          cursor: 'pointer',
        }}
        onClick={() => {
          Sentry.captureMessage('Sentry Example Message')
          alert('Message sent to Sentry!')
        }}
      >
        Send Custom Message
      </button>
    </div>
  )
}
