# AGENTS.md — CloudVault v2.0

Serverless cloud storage using Discord + Telegram as storage backends. No database.

## Stack

- **Framework**: Next.js 14 (App Router), React 18
- **Language**: JavaScript only (no TypeScript, no `.ts`/`.tsx`)
- **Auth**: `jose` (JWT) + `bcryptjs`, HTTP-only cookies
- **Storage**: Discord API (files >50MB, chunked 4MB) + Telegram Bot API (files ≤50MB)
- **Styling**: Plain CSS (globals.css + CSS modules, no Tailwind)
- **Tests**: Vitest + jsdom + @testing-library/react
- **Deploy**: Vercel Edge

**Architecture**: No DB. Metadata stored in Discord embeds. In-memory index in `lib/storage.js`. Routing threshold via `FILE_SIZE_THRESHOLD` env (default 50MB).

## Commands

```bash
# Build / Dev
npm run dev          # dev server
npm run build        # production build
npm run start        # production server
npm run lint         # ESLint (Next.js built-in)

# Tests
npm test                              # all tests
npm run test:ui                       # Vitest UI
npm run test:coverage                 # coverage report
npx vitest tests/lib/storage.test.js  # single file
npx vitest -t "test name pattern"     # single test by name
npx vitest tests/lib/storage.test.js -t "name"  # file + filter
```

## Code Style

### Imports

- **Named imports** from packages: `import { NextResponse } from 'next/server';`
- **Namespace imports** for internal services: `import * as discord from '@/lib/discord';`
- **Path alias** `@/` for cross-directory, `./` for same-directory relative
- **Ordering**: external packages → internal `@/lib/*` → relative `./`

### Naming

- **SCREAMING_SNAKE_CASE** — module-level constants and env-derived values (`CHUNK_SIZE`, `FILE_SIZE_THRESHOLD`)
- **camelCase** — variables, functions, parameters, object keys
- **PascalCase** — React components only (`AuthForm`)

### Functions

- `async function` declarations for named lib functions and route handlers (`export async function GET(request)`)
- Arrow functions for callbacks, event handlers, React component methods
- Default parameters on signatures: `getFiles({ page = 1, limit = 20 } = {})`
- Optional chaining used freely: `onProgress?.(0, msg)`, `request.cookies?.get('token')?.value`

### JSDoc

Required on all exported functions. Use `@param`, `@returns` with type in braces.

```js
/**
 * Rate limiter with sliding window
 * @param {string} identifier - IP or username
 * @param {number} maxRequests
 * @returns {Object} { allowed, remaining, resetAt }
 */
export function checkRateLimit(identifier, maxRequests = 5, windowMs = 60000) { ... }
```

### Error Handling

**API routes** — always `try/catch`, return `NextResponse.json({ error }, { status })`:

```js
export async function GET(request) {
  try { /* ... */ return NextResponse.json({ ... }); }
  catch (error) {
    console.error('GET /api/files error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Auth/validation** — throw `new Error('message')`, caller catches.

**Non-critical failures** — silent catch with `console.warn`, never crash main flow:

```js
try { telegramBackup = await telegram.uploadFile(...); }
catch (err) { console.warn(`  ⚠️ Telegram backup failed: ${err.message}`); }
```

**Client-side** — `try/catch` in handlers, set error state, use `finally` for loading flag.

### File Organization

- **`lib/`** — server-side utils, pure functions, no React. Named exports only. Module-level state (Maps, booleans) for caching acceptable.
- **`app/api/*/route.js`** — route handlers. Export named HTTP methods (`GET`, `POST`, `DELETE`). Always `export const dynamic = 'force-dynamic'` at top. Order: auth check → rate limit → business logic.
- **`app/components/`** — React components. Default export only. `'use client'` directive at top when needed.
- **`app/page.js`** — `'use client'`, default export, internal helper components in same file acceptable.

## Architecture Notes

### Storage Routing
- Files ≤ `FILE_SIZE_THRESHOLD` → `lib/telegram.js` (single upload)
- Files > threshold → `lib/discord.js` (4MB chunks)
- Metadata → Discord embeds (no DB)

### Auth
- `lib/auth.js` — JWT sign/verify, bcrypt hash/compare
- `lib/middleware.js` — auth guard for API routes
- HTTP-only cookies for token storage

### Telegram Bot
- Webhook: `app/api/webhook/telegram/route.js`
- Polling fallback: `lib/telegram-polling.js`

### Vercel
- Upload/download/webhook routes: 60s timeout via `vercel.json`

## Hard Constraints

- **No TypeScript** — stay `.js`/`.jsx`. Never introduce `.ts`/`.tsx`.
- **No database** — metadata lives in Discord embeds + in-memory `lib/storage.js` index.
- **No type suppression** — no `@ts-ignore`, `@ts-expect-error`, `as any`.
- **No empty catch blocks** — except truly ignorable errors (document why).
- **Match existing patterns** — follow conventions above strictly. When in doubt, grep for similar code in `lib/` or `app/api/`.
- **No new dependencies** without justification — prefer existing packages (`axios`, `jose`, `bcryptjs`, `uuid`, `form-data`).

## Testing Notes

- Tests in `tests/` mirror source structure (`tests/lib/storage.test.js` → `lib/storage.js`)
- Vitest config uses jsdom for React component tests
- Use `@testing-library/react` for component rendering, `@testing-library/jest-dom` for matchers
- No mocks for Discord/Telegram in unit tests — mock at `fetch` level or extract pure functions

## Cursor/Copilot Rules

None present in repo (`.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md` all absent).
