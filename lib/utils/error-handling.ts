/**
 * Standardized error handling utilities
 */

export interface ErrorContext {
  operation: string
  component?: string
  userId?: string
  campaignId?: string
  timestamp?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  additionalData?: Record<string, any>
}

/**
 * Standardized error logging function
 */
export function logError(error: unknown, context: ErrorContext): void {
  const errorInfo = {
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    name: error instanceof Error ? error.name : 'UnknownError',
    ...context,
    timestamp: context.timestamp || new Date().toISOString(),
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Application Error:', errorInfo)
  }

  // In production, you would send this to your error tracking service
  // Example: Sentry.captureException(error, { extra: errorInfo })
}

/**
 * Standardized error message for user display
 */
export function getUserFriendlyMessage(
  error: unknown,
  operation: string
): string {
  if (error instanceof Error) {
    // Handle specific error types
    if (error.name === 'AbortError') {
      return 'Operation was cancelled'
    }

    if (error.message.includes('Failed to fetch')) {
      return 'Network error. Please check your connection and try again.'
    }

    if (error.message.includes('API key')) {
      return 'Configuration error. Please contact support.'
    }

    if (
      error.message.includes('permission') ||
      error.message.includes('unauthorized')
    ) {
      return 'You do not have permission to perform this action.'
    }

    // Return the original message for other errors
    return error.message
  }

  // Fallback for unknown errors
  return `Failed to ${operation}. Please try again.`
}

/**
 * Wrapper for async operations with standardized error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext
): Promise<T | null> {
  try {
    return await operation()
  } catch (error) {
    logError(error, context)
    return null
  }
}

/**
 * Wrapper for async operations that should throw errors
 */
export async function withErrorLogging<T>(
  operation: () => Promise<T>,
  context: ErrorContext
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    logError(error, context)
    throw error
  }
}

/**
 * Standard error handling for React components
 */
export function handleComponentError(
  error: unknown,
  component: string,
  operation: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  additionalData?: Record<string, any>
): string {
  logError(error, {
    operation,
    component,
    additionalData,
  })

  return getUserFriendlyMessage(error, operation)
}
