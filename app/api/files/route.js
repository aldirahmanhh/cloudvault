import { NextResponse } from 'next/server';
import { getFiles, rebuildIndex, getStats } from '@/lib/storage';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Auto-start Telegram polling in local dev (not on Vercel)
let pollingStarted = false;
async function ensurePolling() {
  if (pollingStarted || process.env.VERCEL) return;
  pollingStarted = true;
  try {
    const { startPolling } = await import('@/lib/telegram-polling');
    startPolling();
  } catch (err) {
    console.warn('Polling start failed:', err.message);
  }
}

// GET /api/files — list user's files
export async function GET(request) {
  try {
    ensurePolling(); // Don't await — fire and forget

    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Rebuild index — blocks only on cold start (empty cache)
    await rebuildIndex();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 20;
    const search = searchParams.get('search') || '';

    const { files, pagination } = getFiles({ page, limit, search, userId: user.userId });

    return NextResponse.json({
      files: files.map(f => ({
        id: f.id,
        name: f.name,
        mimeType: f.mimeType,
        size: f.size,
        storageType: f.storageType,
        createdAt: f.createdAt,
      })),
      pagination,
      stats: getStats(user.userId),
    });
  } catch (error) {
    console.error('GET /api/files error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
