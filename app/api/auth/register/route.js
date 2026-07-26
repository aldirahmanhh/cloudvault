import { NextResponse } from 'next/server';
import { registerUser, createToken } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';
import { verifyChallenge } from '@/lib/captcha';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { username, password, captchaToken, captchaAnswer, securityQuestions } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }
    if (username.length < 3) {
      return NextResponse.json({ error: 'Username minimal 3 karakter' }, { status: 400 });
    }
    if (password.length < 4) {
      return NextResponse.json({ error: 'Password minimal 4 karakter' }, { status: 400 });
    }

    // Verify CAPTCHA
    const clientIp = getClientIp(request);
    const captchaResult = await verifyChallenge(captchaToken, captchaAnswer);
    if (!captchaResult.success) {
      return NextResponse.json(
        { error: captchaResult.error || 'Verifikasi CAPTCHA gagal. Silakan coba lagi.' },
        { status: 400 }
      );
    }

    // Rate limiting: 3 registrations per IP per 15 minutes
    const rateCheck = checkRateLimit(`register:${clientIp}`, 3, 15 * 60 * 1000);
    
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          error: `Terlalu banyak percobaan registrasi. Coba lagi dalam ${rateCheck.retryAfter} detik.`,
          retryAfter: rateCheck.retryAfter,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateCheck.retryAfter.toString(),
            'X-RateLimit-Limit': '3',
            'X-RateLimit-Remaining': rateCheck.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateCheck.resetAt).toISOString(),
          },
        }
      );
    }

    // Validate optional security questions (if provided, require 2 with non-empty answers)
    let sq = null;
    if (Array.isArray(securityQuestions) && securityQuestions.length > 0) {
      if (securityQuestions.length < 2) {
        return NextResponse.json({ error: 'Minimal 2 security questions untuk password recovery' }, { status: 400 });
      }
      for (const q of securityQuestions) {
        if (!q?.question || !q?.answer || String(q.answer).trim().length < 2) {
          return NextResponse.json({ error: 'Setiap security question butuh jawaban minimal 2 karakter' }, { status: 400 });
        }
      }
      sq = securityQuestions;
    }

    const user = await registerUser(username.trim(), password, sq);
    const token = await createToken(user);

    const response = NextResponse.json({ user, token });
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
