# Feature Flags Configuration Guide

## Overview

The feature flag system allows you to easily switch between different versions of your landing page and control app behavior without code changes.

## Environment Variables

Add these to your `.env.local` file:

```bash
# Feature Flags Configuration
# Set these environment variables to control app behavior

# Landing Page Variants
# Set to 'true' to show waitlist version (default)
NEXT_PUBLIC_SHOW_WAITLIST=true

# Set to 'true' to show full product version
NEXT_PUBLIC_SHOW_FULL_PRODUCT=false

# App Launch Status
# Set to 'true' when app is officially launched
NEXT_PUBLIC_APP_LAUNCHED=false

# Beta Features
# Set to 'true' to enable beta features
NEXT_PUBLIC_ENABLE_BETA_FEATURES=false

# Waitlist Features
# Set to 'true' to show waitlist order numbers
NEXT_PUBLIC_ENABLE_WAITLIST_ORDER=true

# Set to 'true' to enable region detection for GDPR
NEXT_PUBLIC_ENABLE_REGION_DETECTION=true

# Analytics and Tracking
# Set to 'true' to enable analytics
NEXT_PUBLIC_ENABLE_ANALYTICS=true

# Set to 'true' to enable Sentry error tracking
NEXT_PUBLIC_ENABLE_SENTRY=true
```

## Configuration Examples

### Waitlist Mode (Current Default)

```bash
NEXT_PUBLIC_SHOW_WAITLIST=true
NEXT_PUBLIC_SHOW_FULL_PRODUCT=false
NEXT_PUBLIC_APP_LAUNCHED=false
```

### Full Product Mode (When Ready to Launch)

```bash
NEXT_PUBLIC_SHOW_WAITLIST=false
NEXT_PUBLIC_SHOW_FULL_PRODUCT=true
NEXT_PUBLIC_APP_LAUNCHED=true
```

### Beta Testing Mode

```bash
NEXT_PUBLIC_SHOW_WAITLIST=false
NEXT_PUBLIC_SHOW_FULL_PRODUCT=true
NEXT_PUBLIC_APP_LAUNCHED=false
NEXT_PUBLIC_ENABLE_BETA_FEATURES=true
```

## How It Works

1. **Feature flags** are defined in `lib/constants/app.ts`
2. **Dynamic hero section** automatically switches based on flags
3. **Environment variables** control the behavior
4. **No code changes** needed to switch modes

## Usage in Code

```typescript
import { FEATURE_FLAGS, LANDING_PAGE_CONFIG } from '@/lib/constants/app'

// Check if feature is enabled
if (FEATURE_FLAGS.SHOW_WAITLIST) {
  // Show waitlist form
}

// Get landing page configuration
const variant = LANDING_PAGE_CONFIG.variant // 'waitlist' | 'full-product'
const showWaitlist = LANDING_PAGE_CONFIG.showWaitlist
```

## Switching Modes

1. **To switch to full product**: Set `NEXT_PUBLIC_SHOW_FULL_PRODUCT=true`
2. **To switch back to waitlist**: Set `NEXT_PUBLIC_SHOW_WAITLIST=true`
3. **Restart your dev server** after changing environment variables

## Benefits

- ✅ **Easy switching** between versions
- ✅ **A/B testing** capabilities
- ✅ **Gradual rollout** support
- ✅ **No code deployments** needed
- ✅ **Environment-specific** configurations
