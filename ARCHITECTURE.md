# Architecture Documentation

## Project Structure

```
v0-newsletter-generator/
├── app/                          # Next.js App Router pages
│   ├── create/                   # Campaign creation flow
│   │   ├── page.tsx             # Step 1: URL input
│   │   ├── configure/
│   │   │   └── page.tsx         # Step 2: Campaign configuration
│   │   └── editor/
│   │       └── page.tsx         # Step 3: Email editor
│   ├── api/                     # API routes
│   ├── layout.tsx               # Root layout with providers
│   └── page.tsx                 # Landing page
├── components/
│   ├── campaign/                # Reusable campaign-specific components
│   │   ├── progress-indicator.tsx
│   │   ├── form-card.tsx
│   │   └── error-message.tsx
│   ├── layouts/                 # Layout components
│   │   └── campaign-layout.tsx
│   ├── ui/                      # shadcn/ui components
│   ├── email-list.tsx
│   ├── email-preview.tsx
│   └── ai-chat-assistant.tsx
└── lib/
    ├── services/                # Business logic layer
    │   └── campaign.service.ts
    ├── hooks/                   # Custom React hooks
    │   ├── use-landing-page.ts
    │   ├── use-email-generation.ts
    │   ├── use-url-state.ts
    │   └── index.ts
    ├── utils/                   # Utility functions
    │   ├── email-helpers.ts
    │   ├── storage.ts
    │   └── utils.ts
    ├── constants/               # App constants
    │   └── campaign.ts
    ├── campaign-context.tsx     # Global state management
    └── types.ts                 # TypeScript types
```

## Architecture Patterns

### 1. **Separation of Concerns**

#### Service Layer (`lib/services/`)

- Handles all API communication
- Abstracts fetch logic from components
- Provides typed interfaces for data operations
- Example: `CampaignService.scrapeLandingPage()`

#### Custom Hooks (`lib/hooks/`)

- Encapsulates business logic
- Manages component state
- Provides reusable functionality
- Example: `useLandingPage()`, `useEmailGeneration()`, `useUrlState()`

#### Utility Functions (`lib/utils/`)

- Pure functions without side effects
- Reusable helper functions
- Example: `getSubjectForDay()`, `storage.get()`

#### Components (`components/`)

- Purely presentational when possible
- Minimal business logic
- Reusable and composable
- Example: `FormCard`, `ProgressIndicator`

### 2. **State Management**

#### Context API (`campaign-context.tsx`)

- Global state for campaign data
- Persists to sessionStorage automatically
- Provides `useCampaign()` hook for easy access

#### URL State Management

- Email selection tracked in URL query params
- Chat panel state in URL
- Enables:
  - Shareable URLs
  - Browser back/forward navigation
  - Page refresh persistence

#### Local State

- Form inputs use local `useState`
- Lifted to context only when needed across routes

### 3. **Data Flow**

```
User Input → Custom Hook → Service Layer → API Route → External Service
                ↓
          Context Update
                ↓
          sessionStorage
                ↓
          Component Re-render
```

### 4. **Type Safety**

- All API responses are typed
- Service layer returns typed data
- Context provides typed values
- Components receive typed props

### 5. **Routing Strategy**

#### Next.js App Router

- File-based routing
- Client-side navigation with `useRouter`
- URL state management with `useSearchParams`
- Route guards (redirect if no data)

#### Routes:

- `/` - Landing page
- `/create` - Step 1: URL input
- `/create/configure` - Step 2: Configuration
- `/create/editor?email=X&chat=open` - Step 3: Editor with URL state

### 6. **Error Handling**

- Service layer throws typed errors
- Custom hooks catch and expose errors
- Components display errors via `ErrorMessage` component
- No try-catch in components (handled in hooks)

### 7. **Code Reusability**

#### Reusable Components

- `CampaignLayout` - Shared layout with back button
- `ProgressIndicator` - Multi-step progress display
- `FormCard` - Consistent form container
- `ErrorMessage` - Consistent error display

#### Reusable Hooks

- `useUrlState()` - URL param management
- `useLandingPage()` - Landing page analysis logic
- `useEmailGeneration()` - Email generation logic

#### Constants

- Campaign steps, tones, types defined once
- Used across all components
- Easy to modify in one place

## Best Practices Implemented

### 1. **Single Responsibility Principle**

- Each function/component has one clear purpose
- Services handle API, hooks handle logic, components handle UI

### 2. **DRY (Don't Repeat Yourself)**

- No duplicate code
- Shared logic extracted to hooks
- Reusable components created

### 3. **Composition Over Inheritance**

- Components compose smaller components
- Hooks compose other hooks
- Layouts wrap pages

### 4. **Type Safety**

- TypeScript throughout
- No `any` types
- Proper type inference

### 5. **Performance**

- Only necessary re-renders
- Memoization where needed
- Efficient state updates

### 6. **Scalability**

- Easy to add new campaign steps
- Easy to add new campaign types
- Easy to add new features

## Example Usage

### Creating a New Feature

1. **Add Type** (if needed)

```typescript
// lib/types.ts
export interface NewFeature {
  id: number
  name: string
}
```

2. **Add Service Method**

```typescript
// lib/services/feature.service.ts
export class FeatureService {
  static async getFeature(): Promise<NewFeature> {
    // API call logic
  }
}
```

3. **Create Custom Hook**

```typescript
// lib/hooks/use-feature.ts
export function useFeature() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFeature = async () => {
    setLoading(true)
    try {
      const data = await FeatureService.getFeature()
      return data
    } catch (err) {
      setError(err.message)
      return null
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, loadFeature }
}
```

4. **Use in Component**

```typescript
// app/feature/page.tsx
export default function FeaturePage() {
  const { loading, error, loadFeature } = useFeature()

  // Component logic
}
```

## Testing Strategy

- **Unit Tests**: Service layer, utility functions
- **Integration Tests**: Custom hooks
- **E2E Tests**: Complete user flows
- **Component Tests**: UI components in isolation

## Performance Considerations

- **Code Splitting**: Each route is automatically split
- **Lazy Loading**: Components loaded on demand
- **Memoization**: Expensive computations memoized
- **State Updates**: Batched for efficiency

## Security Considerations

- **API Keys**: Stored in environment variables
- **Input Validation**: zod schemas for validation
- **XSS Prevention**: React automatically escapes
- **CSRF Protection**: Next.js built-in

## Future Improvements

1. Add loading states with Suspense
2. Implement error boundaries
3. Add optimistic UI updates
4. Implement undo/redo functionality
5. Add analytics tracking
6. Implement A/B testing framework
