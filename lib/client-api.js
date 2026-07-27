import { formatFileSize } from './constants';

const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB chunks (under Vercel 4.5MB limit)
const MAX_RETRIES = 3;
const CHUNK_DELAY = 800; // ms between chunks to avoid rate limits

// Upload queue — ensures only 1 upload at a time globally
const uploadQueue = [];
let isProcessingQueue = false;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Upload a file with client-side chunking + queue system
 */
export async function uploadFile(file, onProgress) {
  return new Promise((resolve, reject) => {
    uploadQueue.push({ file, onProgress, resolve, reject });
    processQueue();
  });
}

async function processQueue() {
  if (isProcessingQueue || uploadQueue.length === 0) return;
  isProcessingQueue = true;

  while (uploadQueue.length > 0) {
    const { file, onProgress, resolve, reject } = uploadQueue.shift();
    try {
      const result = await doUpload(file, onProgress);
      resolve(result);
    } catch (err) {
      reject(err);
    }
    // Delay between queued uploads
    if (uploadQueue.length > 0) await sleep(1000);
  }

  isProcessingQueue = false;
}

async function doUpload(file, onProgress) {
  const fileId = crypto.randomUUID();
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const storageType = file.size <= 50 * 1024 * 1024 ? 'telegram' : 'discord';
  const chunks = [];

  onProgress?.(0, `Preparing "${file.name}"...`);
  onProgress?.(2, `Routing to ${storageType === 'telegram' ? 'Telegram ✈️' : 'Discord 🎮'}...`);

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const blob = file.slice(start, end);

    const formData = new FormData();
    formData.append('file', blob, file.name);
    formData.append('fileId', fileId);
    formData.append('fileName', file.name);
    formData.append('chunkIndex', i.toString());
    formData.append('totalChunks', totalChunks.toString());
    formData.append('mimeType', file.type || 'application/octet-stream');
    formData.append('totalSize', file.size.toString());

    onProgress?.(
      Math.round(((i + 0.5) / totalChunks) * 90) + 5,
      `Uploading chunk ${i + 1}/${totalChunks}...`
    );

    // Upload with retry
    let result;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });

      if (res.ok) {
        result = await res.json();
        break;
      } else if (res.status === 429) {
        // Rate limited — wait and retry
        const waitTime = (attempt + 1) * 3000;
        onProgress?.(null, `⏳ Rate limited, waiting ${waitTime / 1000}s...`);
        await sleep(waitTime);
      } else {
        const err = await res.json().catch(() => ({}));
        if (attempt === MAX_RETRIES - 1) throw new Error(err.error || `Upload failed (${res.status})`);
        await sleep(2000);
      }
    }

    chunks.push({
      chunkIndex: i,
      messageId: result.messageId,
      channelId: result.channelId,
      chunkSize: end - start,
    });

    onProgress?.(
      Math.round(((i + 1) / totalChunks) * 90) + 5,
      `Chunk ${i + 1}/${totalChunks} ✓`
    );

    // Delay between chunks to avoid rate limits
    if (i < totalChunks - 1) await sleep(CHUNK_DELAY);
  }

  // Signal completion for multi-chunk files
  if (totalChunks > 1) {
    onProgress?.(95, 'Finalizing...');

    const completeRes = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, fileName: file.name, mimeType: file.type || 'application/octet-stream', totalSize: file.size, storageType, chunks }),
    });

    if (!completeRes.ok) {
      const err = await completeRes.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to complete upload');
    }
  }

  onProgress?.(100, `Done! → ${storageType === 'telegram' ? 'Telegram ✈️' : 'Discord 🎮'}`);

  return {
    id: fileId,
    name: file.name,
    size: file.size,
    mimeType: file.type || 'application/octet-stream',
    storageType,
    chunks: totalChunks,
    createdAt: new Date().toISOString(),
  };
}

export async function getFiles(page = 1, limit = 20, search = '') {
  const params = new URLSearchParams({ page, limit });
  if (search) params.append('search', search);
  const res = await fetch(`/api/files?${params}`);
  if (!res.ok) throw new Error('Failed to load files');
  return res.json();
}

export async function deleteFile(id) {
  const res = await fetch(`/api/files/${id}`, { method: 'DELETE' });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Delete failed');
  }
  return res.json();
}

export function getDownloadUrl(id) {
  return `/api/download/${id}`;
}

export function getThumbnailUrl(id) {
  return `/api/thumbnail/${id}`;
}

/**
 * Generate a JPEG thumbnail from a video File on the client and upload it.
 * @param {File} videoFile
 * @param {string} fileId - Server-side file id (uuid) associated with this upload
 * @param {Object} [opts]
 * @param {number} [opts.size=256] - Max longer edge in px
 * @param {number} [opts.quality=0.72] - JPEG quality 0..1
 * @returns {Promise<boolean>} true if upload succeeded
 */
export async function generateAndUploadVideoThumbnail(videoFile, fileId, opts = {}) {
  const size = opts.size || 256;
  const quality = opts.quality || 0.72;
  if (typeof window === 'undefined') return false;
  if (!videoFile?.type?.startsWith('video/')) return false;

  const dataUrl = await new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = 'anonymous';
    const objectUrl = URL.createObjectURL(videoFile);
    const cleanup = () => { URL.revokeObjectURL(objectUrl); };

    video.onloadeddata = () => {
      try {
        // Seek slightly in to avoid black frame at t=0
        video.currentTime = Math.min(1, (video.duration || 1) * 0.1);
      } catch { resolve(null); cleanup(); }
    };
    video.onseeked = () => {
      try {
        const vw = video.videoWidth || size;
        const vh = video.videoHeight || size;
        const scale = size / Math.max(vw, vh);
        const w = Math.max(1, Math.round(vw * scale));
        const h = Math.max(1, Math.round(vh * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch { resolve(null); }
      finally { cleanup(); }
    };
    video.onerror = () => { resolve(null); cleanup(); };
    video.src = objectUrl;
  });

  if (!dataUrl) return false;

  try {
    const res = await fetch('/api/thumbnail/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, thumbnail: dataUrl }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Refactor helper: seek video element to safe frame + snapshot to JPEG data URL.
 */
async function snapshotVideoToDataUrl(videoEl, size, quality) {
  return new Promise((resolve) => {
    videoEl.onloadeddata = () => {
      try {
        videoEl.currentTime = Math.min(1, (videoEl.duration || 1) * 0.1);
      } catch { resolve(null); }
    };
    videoEl.onseeked = () => {
      try {
        const vw = videoEl.videoWidth || size;
        const vh = videoEl.videoHeight || size;
        const scale = size / Math.max(vw, vh);
        const w = Math.max(1, Math.round(vw * scale));
        const h = Math.max(1, Math.round(vh * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(videoEl, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch { resolve(null); }
    };
    videoEl.onerror = () => resolve(null);
  });
}

/**
 * Regenerate thumbnail for an already-uploaded video by streaming from server.
 * Uses same authenticated /api/download/[id] which supports Range for efficient seek.
 * @param {string} fileId
 * @param {Object} [opts]
 * @returns {Promise<boolean>}
 */
export async function regenerateVideoThumbnail(fileId, opts = {}) {
  const size = opts.size || 256;
  const quality = opts.quality || 0.72;
  if (typeof window === 'undefined') return false;

  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;
  video.crossOrigin = 'use-credentials';
  video.src = `/api/download/${fileId}`;

  const dataUrl = await snapshotVideoToDataUrl(video, size, quality);
  if (!dataUrl) return false;

  try {
    const res = await fetch('/api/thumbnail/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fileId, thumbnail: dataUrl }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export { formatFileSize };

export function getFileCategory(mimeType) {
  if (!mimeType) return 'default';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar') || mimeType.includes('compressed')) return 'archive';
  if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word') || mimeType.startsWith('text/')) return 'document';
  if (mimeType.includes('javascript') || mimeType.includes('json') || mimeType.includes('xml')) return 'code';
  return 'default';
}

export function timeAgo(dateString) {
  const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(dateString).toLocaleDateString();
}
