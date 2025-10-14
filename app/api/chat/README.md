# AI Chat API

Clean, maintainable structure for the AI chat assistant endpoint.

## 📁 File Structure

```
/app/api/chat/
├── route.ts              # Main API route handler (58 lines)
├── schemas.ts            # Zod validation schemas
├── prompts.ts            # All AI prompts organized by section
├── prompt-builder.ts     # Logic for assembling prompts
├── response-handler.ts   # OpenAI response parsing
└── README.md            # This file
```

## 🎯 Purpose of Each File

### `route.ts` - Main Handler

- Clean, simple request/response flow
- Validates input, calls OpenAI, returns parsed response
- All business logic extracted to other modules

### `schemas.ts` - Data Validation

- All Zod schemas for type-safe validation
- TypeScript types exported for use across app
- Single source of truth for request/response shapes

### `prompts.ts` - ⭐ Prompt Templates

**This is where you edit AI behavior!**

Organized sections:

- **Selected Text Prompts** - How AI handles text selection
- **Campaign Context** - How AI uses campaign data
- **System Role & Behavior** - AI personality and approach
- **Edit Decision Logic** - When to edit vs give advice
- **JSON Response Format** - Output structure rules

All prompts are exported constants for easy editing.

### `prompt-builder.ts` - Assembly Logic

- Takes prompts from `prompts.ts` and adds dynamic data
- Handles context building and formatting
- Clean separation between prompts and logic

### `response-handler.ts` - Response Processing

- Parses OpenAI responses
- Error handling and fallbacks
- Type-safe response formatting

## ✏️ How to Edit Prompts

1. Open `prompts.ts`
2. Find the section you want to edit (clear headers!)
3. Modify the prompt text
4. No need to touch any other files

Example sections:

```typescript
// Change AI personality
export const SYSTEM_ROLE = `...`

// Modify response style
export const RESPONSE_STYLE = `...`

// Update edit detection
export const EDIT_DECISION_TREE = `...`
```

## 🧪 Testing

To test prompt changes:

1. Edit `prompts.ts`
2. Save the file
3. Test in the UI - changes are immediate
4. No restart needed (Next.js hot reload)

## 🔄 Adding New Context

To add new context types:

1. **Add schema** in `schemas.ts`:

   ```typescript
   export const newContextSchema = z.object({ ... })
   ```

2. **Add prompt** in `prompts.ts`:

   ```typescript
   export const NEW_CONTEXT_PROMPT = `...`
   ```

3. **Add builder function** in `prompt-builder.ts`:

   ```typescript
   export function buildNewContext(...) { ... }
   ```

4. **Use in route** in `route.ts`:
   ```typescript
   const instructions = buildSystemInstructions(...)
   ```
