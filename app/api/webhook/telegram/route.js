import { NextResponse } from 'next/server';
import { handleUpdate } from '@/lib/telegram-handler';
import * as telegram from '@/lib/telegram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/webhook/telegram — receives updates from Telegram (Vercel mode)
export async function POST(request) {
  try {
    const update = await request.json();
    await handleUpdate(update);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error.message);
    return NextResponse.json({ ok: true }); // Always 200 to Telegram
  }
}

// GET /api/webhook/telegram?url=xxx — setup webhook
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const appUrl = searchParams.get('url') || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;

    if (!appUrl) {
      return NextResponse.json({ error: 'No URL provided. Use ?url=https://your-app.vercel.app' }, { status: 400 });
    }

    const webhookUrl = `${appUrl.startsWith('http') ? appUrl : `https://${appUrl}`}/api/webhook/telegram`;
    const result = await telegram.setWebhook(webhookUrl);

    return NextResponse.json({ webhook: webhookUrl, result });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
