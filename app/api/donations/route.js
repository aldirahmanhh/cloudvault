import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Cache donations for 2 minutes
let cache = { data: null, timestamp: 0 };
const CACHE_TTL = 2 * 60 * 1000;

// GET /api/donations — fetch Trakteer supporters leaderboard
export async function GET(request) {
  try {
    // Allow force refresh via ?refresh=1
    const { searchParams } = new URL(request.url);
    const forceRefresh = searchParams.get('refresh') === '1';

    const now = Date.now();
    if (!forceRefresh && cache.data && now - cache.timestamp < CACHE_TTL) {
      return NextResponse.json(cache.data);
    }

    const apiKey = process.env.TRAKTEER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ supporters: [], total: 0, error: 'No API key' });
    }

    // Fetch all pages from Trakteer Support History API
    let supporters = [];
    let page = 1;
    const maxPages = 5;

    while (page <= maxPages) {
      const res = await fetch(`https://api.trakteer.id/v1/public/supports?limit=25&page=${page}`, {
        headers: {
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'key': `Bearer ${apiKey}`,
        },
      });

      if (!res.ok) {
        console.error('Trakteer API error:', res.status, await res.text().catch(() => ''));
        break;
      }

      const json = await res.json();
      const items = json.result?.data || [];

      if (items.length === 0) break;

      for (const s of items) {
        if (s.status !== 'success') continue;
        supporters.push({
          name: s.creator_name || 'Anonymous',
          amount: Number(s.amount) || 0,
          quantity: Number(s.quantity) || 1,
          unit: s.unit_name || '',
          message: s.support_message || '',
          date: s.updated_at || '',
          method: s.payment_method || '',
        });
      }

      page++;
    }

    // Aggregate by name
    const leaderboard = new Map();
    for (const s of supporters) {
      const key = s.name.toLowerCase().trim();
      if (leaderboard.has(key)) {
        const existing = leaderboard.get(key);
        existing.amount += s.amount;
        existing.count++;
        if (s.message) existing.lastMessage = s.message;
      } else {
        leaderboard.set(key, {
          name: s.name,
          amount: s.amount,
          count: 1,
          lastMessage: s.message,
          lastDate: s.date,
        });
      }
    }

    const sorted = [...leaderboard.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20);

    const totalAmount = sorted.reduce((sum, s) => sum + s.amount, 0);

    const result = {
      supporters: sorted,
      total: totalAmount,
      count: supporters.length,
      lastUpdated: new Date().toISOString(),
    };

    cache = { data: result, timestamp: now };
    return NextResponse.json(result);
  } catch (error) {
    console.error('Donations fetch error:', error.message);
    return NextResponse.json({ supporters: [], total: 0, error: error.message });
  }
}
