import { NextResponse } from 'next/server';
import { getUserByUsername } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Step 1: user submits username; we return their security questions (question text only)
export async function POST(request) {
  try {
    const { username } = await request.json();
    if (!username || String(username).trim().length < 3) {
      return NextResponse.json({ error: 'Username wajib diisi' }, { status: 400 });
    }

    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`forgot:${clientIp}`, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan. Coba lagi dalam ${rateCheck.retryAfter} detik.` },
        { status: 429, headers: { 'Retry-After': rateCheck.retryAfter.toString() } }
      );
    }

    const user = await getUserByUsername(String(username).trim());
    // Do not reveal whether the username exists — always return a generic shape
    if (!user || !user.hasSecurityQuestions) {
      return NextResponse.json({
        found: false,
        message: 'Jika akun ada dan memiliki security questions, pertanyaan akan tampil di sini.',
      });
    }

    return NextResponse.json({
      found: true,
      username: user.username,
      questions: user.securityQuestions.map((q) => q.question),
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
