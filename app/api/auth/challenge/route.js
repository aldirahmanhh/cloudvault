import { NextResponse } from 'next/server';
import { generateChallenge } from '@/lib/captcha';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { challenge, token } = await generateChallenge();
    return NextResponse.json({ challenge, token });
  } catch (error) {
    console.error('GET /api/auth/challenge error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
