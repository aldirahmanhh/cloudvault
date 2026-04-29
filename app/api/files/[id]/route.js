import { NextResponse } from 'next/server';
import { getFileById, uncacheFile, deleteFileFromStorage, rebuildIndex } from '@/lib/storage';
import { getUserFromRequest } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/files/:id — get file info
export async function GET(request, { params }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await rebuildIndex();
    const file = getFileById(params.id);
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });
    if (file.userId && file.userId !== user.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    return NextResponse.json({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      storageType: file.storageType,
      chunks: file.chunks.length,
      createdAt: file.createdAt,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/files/:id — delete file
export async function DELETE(request, { params }) {
  try {
    const user = await getUserFromRequest(request);
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await rebuildIndex();
    const file = getFileById(params.id);
    if (!file) return NextResponse.json({ error: 'File not found' }, { status: 404 });
    if (file.userId && file.userId !== user.userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    try {
      await deleteFileFromStorage(file);
    } catch (err) {
      console.warn('Storage delete warning:', err.message);
    }

    uncacheFile(params.id);
    return NextResponse.json({ message: 'File deleted' });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
