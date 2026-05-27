import { NextResponse } from 'next/server';
import { loginUser, createToken } from '@/lib/auth';
import { checkRateLimit, checkFailedAttempts, recordFailedAttempt, resetFailedAttempts, getClientIp } from '@/lib/rate-limit';
import { verifyChallenge } from '@/lib/captcha';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { username, password, captchaToken, captchaAnswer } = await request.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username dan password wajib diisi' }, { status: 400 });
    }

    const clientIp = getClientIp(request);

    // Verify CAPTCHA
    const captchaResult = await verifyChallenge(captchaToken, captchaAnswer);
    if (!captchaResult.success) {
      return NextResponse.json(
        { error: captchaResult.error || 'Verifikasi CAPTCHA gagal. Silakan coba lagi.' },
        { status: 400 }
      );
    }
    const usernameKey = username.trim().toLowerCase();

    // Rate limiting: 10 login attempts per IP per minute
    const rateCheck = checkRateLimit(`login:${clientIp}`, 10, 60 * 1000);
    
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { 
          error: `Terlalu banyak percobaan login. Coba lagi dalam ${rateCheck.retryAfter} detik.`,
          retryAfter: rateCheck.retryAfter,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateCheck.retryAfter.toString(),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': rateCheck.remaining.toString(),
            'X-RateLimit-Reset': new Date(rateCheck.resetAt).toISOString(),
          },
        }
      );
    }

    // Check failed attempts with exponential backoff
    const failedCheck = checkFailedAttempts(usernameKey);
    
    if (!failedCheck.allowed) {
      return NextResponse.json(
        { 
          error: failedCheck.message,
          waitTime: failedCheck.waitTime,
          attempts: failedCheck.attempts,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': failedCheck.waitTime.toString(),
          },
        }
      );
    }

    try {
      const user = await loginUser(username.trim(), password);
      const token = await createToken(user);

      // Reset failed attempts on successful login
      resetFailedAttempts(usernameKey);

      const response = NextResponse.json({ user, token });
      response.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      return response;
    } catch (loginError) {
      // Record failed attempt
      const failedRecord = recordFailedAttempt(usernameKey);
      
      let errorMessage = loginError.message;
      
      // Add warning after 2 failed attempts
      if (failedRecord.attempts >= 2) {
        const remainingAttempts = 3 - failedRecord.attempts;
        if (remainingAttempts > 0) {
          errorMessage += ` (${remainingAttempts} percobaan tersisa sebelum akun dikunci)`;
        }
      }
      
      return NextResponse.json({ error: errorMessage }, { status: 401 });
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
