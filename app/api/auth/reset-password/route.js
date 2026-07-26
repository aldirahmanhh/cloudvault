import { NextResponse } from 'next/server';
import { verifyResetToken, updatePassword } from '@/lib/auth';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

// Step 3: user submits reset token + new password
export async function POST(request) {
  try {
    const { resetToken, newPassword } = await request.json();
    if (!resetToken || !newPassword) {
      return NextResponse.json({ error: 'Reset token dan password baru wajib diisi' }, { status: 400 });
    }
    if (String(newPassword).length < 4) {
      return NextResponse.json({ error: 'Password minimal 4 karakter' }, { status: 400 });
    }

    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(`reset-pw:${clientIp}`, 5, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Terlalu banyak percobaan. Coba lagi dalam ${rateCheck.retryAfter} detik.` },
        { status: 429, headers: { 'Retry-After': rateCheck.retryAfter.toString() } }
      );
    }

    const userId = await verifyResetToken(resetToken);
    if (!userId) {
      return NextResponse.json({ error: 'Reset token tidak valid atau kadaluarsa' }, { status: 401 });
    }

    await updatePassword(userId, String(newPassword));
    return NextResponse.json({ success: true, message: 'Password berhasil direset. Silakan login.' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
