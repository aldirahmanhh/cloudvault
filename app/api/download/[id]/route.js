import { NextResponse } from 'next/server';
import { getFileById, downloadFile, rebuildIndex } from '@/lib/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Pro: up to 300s

// GET /api/download/:id
export async function GET(request, { params }) {
  try {
    await rebuildIndex();
    const file = getFileById(params.id);

    if (!file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    console.log(`📥 Downloading "${file.name}" from ${file.storageType.toUpperCase()}`);

    const buffer = await downloadFile(file);

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
