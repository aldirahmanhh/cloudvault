import { NextResponse } from 'next/server';
import { generateChallenge } from '@/lib/captcha';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const clientIp = getClientIp(request);

    // Rate limit: 20 challenges per IP per minute
    const rateCheck = checkRateLimit(`challenge:${clientIp}`, 20, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: `Terlalu banyak permintaan. Coba lagi dalam ${rateCheck.retryAfter} detik.`,
          retryAfter: rateCheck.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': rateCheck.retryAfter.toString(),
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': rateCheck.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateCheck.resetAt).toISOString(),
          },
        }
      );
    }

    const { challenge, token } = await generateChallenge();
    return NextResponse.json({ challenge, token });
  } catch (error) {
    console.error('GET /api/auth/challenge error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
