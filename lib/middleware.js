/**
 * Auth middleware for API routes
 * Reduces code duplication across protected endpoints
 */
import { NextResponse } from 'next/server';
import { getUserFromRequest } from './auth';
import { rebuildIndex } from './storage';

/**
 * Middleware wrapper for protected API routes
 * Handles auth check and index rebuild automatically
 * 
 * @param {Function} handler - Async function(request, context, user) => Response
 * @param {Object} options - { requireAuth: boolean, rebuildIndex: boolean }
 * @returns {Function} Next.js API route handler
 */
export function withAuth(handler, options = {}) {
  const { requireAuth = true, rebuildIndexOnRequest = false } = options;

  return async function (request, context) {
    try {
      // Check authentication
      let user = null;
      if (requireAuth) {
        user = await getUserFromRequest(request);
        if (!user) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
      }

      // Rebuild index if needed
      if (rebuildIndexOnRequest) {
        await rebuildIndex();
      }

      // Call the actual handler
      return await handler(request, context, user);
    } catch (error) {
      console.error(`API error [${request.method} ${request.url}]:`, error);
      return NextResponse.json(
        { error: error.message || 'Internal server error' },
        { status: 500 }
      );
    }
  };
}

/**
 * Shorthand for auth + index rebuild (common pattern)
 */
export function withAuthAndIndex(handler) {
  return withAuth(handler, { requireAuth: true, rebuildIndexOnRequest: true });
}
