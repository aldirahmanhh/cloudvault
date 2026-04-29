import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Cache donations for 10 minutes
let cache = { data: null, timestamp: 0 };
const CACHE_TTL = 10 * 60 * 1000;

// GET /api/donations — fetch Trakteer supporters leaderboard
export async function GET() {
  try {
    const now = Date.now();
    if (cache.data && now - cache.timestamp < CACHE_TTL) {
      return NextResponse.json(cache.data);
    }

    const apiKey = process.env.TRAKTEER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ supporters: [], total: 0 });
    }

    // Fetch from Trakteer API
    const res = await fetch('https://api.trakteer.id/v1/public/supporters?limit=50', {
      headers: { 'Key': `Bearer ${apiKey}` },
      next: { revalidate: 600 },
    });

    if (!res.ok) {
      console.error('Trakteer API error:', res.status);
      return NextResponse.json({ supporters: [], total: 0 });
    }

    const json = await res.json();
    const supporters = (json.result?.data || []).map(s => ({
      name: s.supporter_name || 'Anonymous',
      amount: s.quantity * (s.unit?.price || 0),
      message: s.supporter_message || '',
      date: s.updated_at || s.created_at,
      unit: s.unit?.name || '',
    }));

    // Aggregate by name — sum total donations per person
    const leaderboard = new Map();
    for (const s of supporters) {
      const key = s.name.toLowerCase();
      if (leaderboard.has(key)) {
        const existing = leaderboard.get(key);
        existing.amount += s.amount;
        existing.count++;
      } else {
        leaderboard.set(key, { name: s.name, amount: s.amount, count: 1, lastMessage: s.message, lastDate: s.date });
      }
    }

    // Sort by total amount descending
    const sorted = [...leaderboard.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 20);

    const totalAmount = sorted.reduce((sum, s) => sum + s.amount, 0);

    const result = { supporters: sorted, total: totalAmount, count: supporters.length };
    cache = { data: result, timestamp: now };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Donations fetch error:', error.message);
    return NextResponse.json({ supporters: [], total: 0 });
  }
}
