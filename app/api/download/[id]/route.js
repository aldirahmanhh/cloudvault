import { NextResponse } from 'next/server';
import { getFileById, downloadFile, downloadFromTelegramBackup, rebuildIndex } from '@/lib/storage';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request, { params }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await rebuildIndex();
    const file = getFileById(params.id);

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }
    if (file.userId && file.userId !== user.userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log(`📥 Downloading "${file.name}" from ${file.storageType.toUpperCase()}`);

    // Try primary storage, fallback to backup
    let buffer;
    try {
      buffer = await downloadFile(file);
    } catch (primaryErr) {
      console.warn(`⚠️ Primary download failed: ${primaryErr.message}, trying backup...`);
      if (file.telegramBackup) {
        buffer = await downloadFromTelegramBackup(file);
        console.log(`✅ Downloaded from Telegram backup`);
      } else {
        throw primaryErr;
      }
    }

    const mimeType = file.mimeType || 'application/octet-stream';
    const isPreviewable = mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType.startsWith('audio/');
    const disposition = isPreviewable ? 'inline' : 'attachment';

    return new Response(buffer, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': buffer.length.toString(),
        'Content-Disposition': `${disposition}; filename="${encodeURIComponent(file.name)}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Download error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
