import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// POST /api/share — Web Share Target handler
// Receives shared files, redirects to /share page
export async function POST(request) {
  // Redirect to share page — the service worker caches the files
  return NextResponse.redirect(new URL('/share', request.url), 303);
}

// GET /api/share — fallback
export async function GET(request) {
  return NextResponse.redirect(new URL('/share', request.url), 303);
}
