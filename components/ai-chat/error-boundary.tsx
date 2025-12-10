'use client'

import React from 'react'
import { Card } from '@/components/ui/card'

interface ErrorBoundaryProps {
  children: React.ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class AIChatErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch() {}

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          <Card className="p-4 bg-destructive/10 border-destructive/20">
            <p className="text-sm">
              Something went wrong in the AI assistant. Please reload the page.
            </p>
          </Card>
        </div>
      )
    }
    return this.props.children
  }
}
