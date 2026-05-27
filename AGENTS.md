# AGENTS.md — CloudVault v2.0 Development Guide

## Project Overview

**CloudVault v2.0** — serverless cloud storage using Discord + Telegram as storage backends.

- **Framework**: Next.js 14 (App Router), React 18
- **Language**: JavaScript (no TypeScript)
- **Auth**: jose (JWT) + bcryptjs, HTTP-only cookies
- **Storage**: Discord API (files >50MB, chunked 4MB), Telegram Bot API (files ≤50MB)
- **Styling**: Plain CSS (globals.css + CSS modules, no Tailwind)
- **Tests**: Vitest + jsdom + @testing-library/react
- **Deploy**: Vercel Edge

**Architecture**: No database. File metadata stored in Discord embeds. In-memory index in `lib/storage.js`. Upload routing threshold controlled by `FILE_SIZE_THRESHOLD` env var (default 50MB).

---

## Commands

### Build
```bash
npm run build        # Production build
npm run dev          # Development server
npm run start        # Production server
```

### Test
```bash
npm test                          # Run all tests
npm run test:ui                   # Vitest browser UI
npm run test:coverage             # Coverage report

# Single file:
npx vitest tests/lib/storage.test.js

# Single test case (by name pattern):
npx vitest -t "test name pattern"

# Single file + filter:
npx vitest tests/lib/storage.test.js -t "test name"
```

### Lint
```bash
npm run lint         # ESLint via Next.js built-in
```

---

## Code Style Guidelines

### Language
- **JavaScript only** — no TypeScript. Do not introduce `.ts`/`.tsx` files.
- Use JSDoc for documentation instead of type annotations.

### Imports

**Named imports** from packages:
```js
import { NextResponse } from 'next/server';
import { SignJWT, jwtVerify } from 'jose';
import { useState, useEffect, useCallback } from 'react';
```

**Namespace imports** for internal service modules:
```js
import * as discord from '@/lib/discord';
import * as telegram from '@/lib/telegram';
```

**Path alias** `@/` for cross-directory, `./` for same-directory:
```js
import { getFiles, rebuildIndex } from '@/lib/storage';
import { getUserFromRequest } from '@/lib/auth';
import { formatFileSize } from './constants';  // same dir = relative
```

**Import ordering**: external packages → internal `@/lib/*` → relative `./`

### Naming Conventions

- **SCREAMING_SNAKE_CASE** — module-level constants and env-derived values:
  ```js
  const CHUNK_SIZE = 4 * 1024 * 1024;
  const MAX_RETRIES = 3;
  export const FILE_SIZE_THRESHOLD = 50 * 1024 * 1024;
  ```

- **camelCase** — variables, functions, parameters, object keys:
  ```js
  let fileCache = new Map();
  async function ensurePolling() { ... }
  export function checkRateLimit(identifier, maxRequests, windowMs) { ... }
  ```

- **PascalCase** — React components only:
  ```js
  export default function AuthForm({ onLogin }) { ... }
  ```

### Error Handling

**API routes** — always `try/catch`, return `NextResponse.json({ error: message }, { status: N })`:
```js
export async function GET(request) {
  try {
    // ...
    return NextResponse.json({ ... });
  } catch (error) {
    console.error('GET /api/files error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

**Auth/validation errors** — throw `new Error('message')`, caller catches:
```js
if (existing) throw new Error('Username sudah dipakai');
if (!valid) throw new Error('Password salah');
```

**Non-critical failures** — silent catch with `console.warn`, never crash main flow:
```js
try {
  telegramBackup = await telegram.uploadFile(...);
} catch (err) {
  console.warn(`  ⚠️ Telegram backup failed: ${err.message}`);
}
```

**Client-side** — `try/catch` in event handlers, set error state:
```js
try {
  const res = await fetch(...);
  if (!res.ok) throw new Error(data.error || 'Failed');
} catch (err) {
  setError(err.message);
} finally {
  setLoading(false);
}
```

### Function Style

**`async function` declarations** for named lib functions and route handlers:
```js
export async function rebuildIndex() { ... }
export async function GET(request) { ... }
```

**Arrow functions** for callbacks, event handlers, React component methods:
```js
const handleSubmit = async (e) => { ... };
files.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
```

**Default parameters** on function signatures:
```js
export function getFiles({ page = 1, limit = 20, search = '', userId = null } = {}) { ... }
```

**Optional chaining** used freely:
```js
onProgress?.(0, `Preparing...`);
request.cookies?.get('token')?.value;
```

### JSDoc

Use JSDoc on all exported functions:
```js
/**
 * Rate limiter with sliding window
 * @param {string} identifier - IP address or username
 * @param {number} maxRequests - Max requests allowed
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Object} { allowed: boolean, remaining: number, resetAt: number }
 */
export function checkRateLimit(identifier, maxRequests = 5, windowMs = 60000) {
```

### File Organization

**`lib/`** — server-side utilities, pure functions, no React. All named exports. Module-level state (Maps, booleans) for caching acceptable.

**`app/api/*/route.js`** — Next.js App Router route handlers. Export named HTTP methods (`GET`, `POST`, `DELETE`). Always export `dynamic = 'force-dynamic'` at top. Auth check first, rate limit second, business logic third.

**`app/components/`** — React components. Default export only. `'use client'` directive at top when needed.

**`app/page.js`** — `'use client'`, default export for page, internal helper components defined in same file acceptable.

---

## Architecture Notes

### Storage Routing
- Files ≤ `FILE_SIZE_THRESHOLD` (default 50MB) → `lib/telegram.js`
- Files > threshold → `lib/discord.js` with 4MB chunking
- Metadata stored as Discord embeds (no database)

### Auth Flow
- `lib/auth.js` — JWT sign/verify, bcrypt hash/compare
- `lib/middleware.js` — auth guard for API routes
- HTTP-only cookies for token storage

### Telegram Bot
- Webhook mode: `app/api/webhook/telegram/route.js`
- Polling fallback: `lib/telegram-polling.js`

### Vercel Config
- Upload/download/webhook routes have 60s timeout via `vercel.json`

---

## Key Constraints

- **No TypeScript** — stay `.js`/`.jsx`
- **No database** — metadata lives in Discord embeds, in-memory index in `lib/storage.js`
- **No type suppression** — no `@ts-ignore`, `@ts-expect-error`, `as any`
- **No empty catch blocks** — except for truly ignorable errors (document why)
- **Match existing patterns** — follow conventions above strictly
