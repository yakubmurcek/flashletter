# Migration Guide

## What Changed?

This guide helps you understand what changed during the refactoring from a single-page app to a properly structured Next.js application.

## File Changes

### Deleted Files ❌

These files were removed as they're now replaced by route pages:

- `components/landing-page.tsx` → Now `app/page.tsx`
- `components/url-input-step.tsx` → Now `app/create/page.tsx`
- `components/configuration-step.tsx` → Now `app/create/configure/page.tsx`
- `components/email-editor.tsx` → Now `app/create/editor/page.tsx`

### New Files ✅

#### Services

- `lib/services/campaign.service.ts` - API calls abstraction

#### Hooks

- `lib/hooks/use-landing-page.ts` - Landing page analysis logic
- `lib/hooks/use-email-generation.ts` - Email generation logic
- `lib/hooks/use-url-state.ts` - URL state management
- `lib/hooks/index.ts` - Barrel export

#### Utils

- `lib/utils/email-helpers.ts` - Email helper functions
- `lib/utils/storage.ts` - SessionStorage abstraction

#### Constants

- `lib/constants/campaign.ts` - Campaign configuration constants

#### Components

- `components/layouts/campaign-layout.tsx` - Reusable layout
- `components/campaign/progress-indicator.tsx` - Progress steps
- `components/campaign/form-card.tsx` - Form container
- `components/campaign/error-message.tsx` - Error display

#### Documentation

- `ARCHITECTURE.md` - Architecture documentation
- `REFACTORING_SUMMARY.md` - Summary of changes
- `MIGRATION_GUIDE.md` - This file

## Code Migration Examples

### Before/After: Making an API Call

**Before:**

```typescript
// In component
const [isLoading, setIsLoading] = useState(false)
const [error, setError] = useState('')

const handleSubmit = async () => {
  setIsLoading(true)
  setError('')
  try {
    const response = await fetch('/api/scrape-landing', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    if (!response.ok) throw new Error('Failed')
    const data = await response.json()
    // handle data
  } catch (err) {
    setError('Failed to analyze')
  } finally {
    setIsLoading(false)
  }
}
```

**After:**

```typescript
// In component
const { isAnalyzing, error, analyzeLandingPage } = useLandingPage()

const handleSubmit = async () => {
  const data = await analyzeLandingPage(url)
  if (data) {
    // handle data
  }
}
```

### Before/After: Using Constants

**Before:**

```typescript
// Hardcoded
<SelectItem value="professional">Professional</SelectItem>
<SelectItem value="friendly">Friendly</SelectItem>
<SelectItem value="casual">Casual</SelectItem>

<Slider min={3} max={30} />
```

**After:**

```typescript
// From constants
import { CAMPAIGN_TONES, CAMPAIGN_DURATION } from '@/lib/constants/campaign'

{
  CAMPAIGN_TONES.map((t) => (
    <SelectItem key={t.value} value={t.value}>
      {t.label}
    </SelectItem>
  ))
}

;<Slider min={CAMPAIGN_DURATION.MIN} max={CAMPAIGN_DURATION.MAX} />
```

### Before/After: Context Usage

**Before:**

```typescript
// Multiple sessionStorage calls
const setLandingPageData = (data) => {
  setLandingPageDataState(data)
  const current = JSON.parse(sessionStorage.getItem('campaign-data') || '{}')
  sessionStorage.setItem(
    'campaign-data',
    JSON.stringify({ ...current, landingPageData: data })
  )
}
```

**After:**

```typescript
// Clean API
import { useCampaign } from '@/lib/campaign-context'

const { landingPageData, setLandingPageData } = useCampaign()
setLandingPageData(data) // Automatically syncs to sessionStorage
```

### Before/After: URL State

**Before:**

```typescript
// Local state only
const [selectedEmailId, setSelectedEmailId] = useState(1)
```

**After:**

```typescript
// URL state
import { useUrlState } from '@/lib/hooks/use-url-state'

const { getParam, setParam } = useUrlState()
const selectedEmailId = parseInt(getParam('email') || '1', 10)
const handleSelect = (id: number) => setParam('email', id.toString())
```

## Import Changes

### Before:

```typescript
import { LandingPage } from '@/components/landing-page'
import { URLInputStep } from '@/components/url-input-step'
import { ConfigurationStep } from '@/components/configuration-step'
import { EmailEditor } from '@/components/email-editor'
```

### After:

```typescript
// These are now pages, not components
// Use Next.js routing instead: router.push('/create')

// For shared components:
import { CampaignLayout } from '@/components/layouts/campaign-layout'
import { ProgressIndicator } from '@/components/campaign/progress-indicator'
import { FormCard } from '@/components/campaign/form-card'

// For hooks:
import { useLandingPage, useEmailGeneration, useUrlState } from '@/lib/hooks'

// For services:
import { CampaignService } from '@/lib/services/campaign.service'
```

## Navigation Changes

### Before:

```typescript
// State-based navigation
const [currentStep, setCurrentStep] = useState('landing')
setCurrentStep('config')
```

### After:

```typescript
// Route-based navigation
import { useRouter } from 'next/navigation'

const router = useRouter()
router.push('/create/configure')
```

## New Patterns to Follow

### 1. Creating a New Feature

```typescript
// 1. Add to service
// lib/services/feature.service.ts
export class FeatureService {
  static async getFeature(): Promise<FeatureData> {}
}

// 2. Create hook
// lib/hooks/use-feature.ts
export function useFeature() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFeature = async () => {
    // Use service
  }

  return { loading, error, loadFeature }
}

// 3. Use in component
// app/feature/page.tsx
export default function FeaturePage() {
  const { loading, error, loadFeature } = useFeature()

  return <div>...</div>
}
```

### 2. Adding a New Constant

```typescript
// lib/constants/campaign.ts
export const NEW_CONSTANT = {
  VALUE_1: 'value1',
  VALUE_2: 'value2',
}

// Then use everywhere:
import { NEW_CONSTANT } from '@/lib/constants/campaign'
```

### 3. Creating Reusable Components

```typescript
// components/feature/my-component.tsx
interface MyComponentProps {
  title: string
  children: ReactNode
}

export function MyComponent({ title, children }: MyComponentProps) {
  return <div>...</div>
}
```

## Testing Changes

### Before:

```typescript
// Had to mock fetch, sessionStorage, etc.
```

### After:

```typescript
// Test services independently
test('CampaignService.scrapeLandingPage', async () => {
  const data = await CampaignService.scrapeLandingPage('url')
  expect(data).toBeDefined()
})

// Test hooks independently
test('useLandingPage', () => {
  const { result } = renderHook(() => useLandingPage())
  expect(result.current.isAnalyzing).toBe(false)
})

// Test components with mocked hooks
test('CreatePage', () => {
  render(<CreatePage />)
  // Component is just UI
})
```

## Key Benefits of New Structure

1. **Easier to Test** - Separated concerns
2. **Easier to Maintain** - Single source of truth
3. **Easier to Extend** - Clear patterns
4. **Better TypeScript** - Proper types everywhere
5. **Better Performance** - Proper Next.js patterns
6. **Better DX** - Clear file structure

## Questions?

Refer to:

- `ARCHITECTURE.md` - Full architecture documentation
- `REFACTORING_SUMMARY.md` - Summary of all changes
- Code comments in new files

## Checklist for New Developers

- [ ] Read ARCHITECTURE.md
- [ ] Understand the service layer pattern
- [ ] Understand custom hooks pattern
- [ ] Understand the folder structure
- [ ] Know where constants live
- [ ] Know how to add a new feature
- [ ] Know how to add a new route
- [ ] Know how routing works now
- [ ] Know how state management works
- [ ] Know how to run the app (pnpm dev)
