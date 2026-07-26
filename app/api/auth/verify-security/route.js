import { NextResponse } from 'next/server';
import { verifySecurityAnswers } from '@/lib/auth';
import { checkRateLimit, getClientIp, checkFailedAttempts, recordFailedAttempt, resetFailedAttempts } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Step 2: user submits answers; on success returns a 15-min reset token
export async function POST(request) {
  try {
    const { username, answers } = await request.json();
    if (!username || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json({ error: 'Username dan jawaban wajib diisi' }, { status: 400 });
    }

    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`verify-sec:${clientIp}`, 10, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan. Coba lagi dalam ${rateCheck.retryAfter} detik.` },
        { status: 429, headers: { 'Retry-After': rateCheck.retryAfter.toString() } }
      );
    }

    const lockKey = `verify-sec:${username.toLowerCase()}`;
    const lock = checkFailedAttempts(lockKey);
    if (!lock.allowed) {
      return NextResponse.json(
        { error: lock.message || `Akun terkunci untuk pemulihan. Coba lagi dalam ${lock.waitTime} detik.` },
        { status: 429, headers: { 'Retry-After': String(lock.waitTime) } }
      );
    }

    try {
      const resetToken = await verifySecurityAnswers(String(username).trim(), answers);
      resetFailedAttempts(lockKey);
      return NextResponse.json({ resetToken });
    } catch (err) {
      recordFailedAttempt(lockKey);
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
