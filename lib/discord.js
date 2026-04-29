import axios from 'axios';
import FormData from 'form-data';

const DISCORD_API = 'https://discord.com/api/v10';
const MAX_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB

function getHeaders() {
  return { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` };
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Discord API request with rate limit retry
 */
async function apiRequest(config, retries = 5) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await axios(config);
    } catch (err) {
      if (err.response?.status === 429) {
        const retryAfter = (err.response.data?.retry_after || 2) * 1000;
        console.log(`⏳ Discord rate limited, waiting ${retryAfter}ms...`);
        await sleep(retryAfter + 500);
      } else {
        throw err;
      }
    }
  }
  throw new Error('Discord rate limit exceeded after max retries');
}

/**
 * Upload a single chunk to Discord
 * Embeds file metadata in the message content as JSON
 */
export async function uploadChunk(buffer, filename, chunkIndex, totalChunks, fileId, mimeType, userId) {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const chunkName = totalChunks > 1
    ? `${filename}.part${String(chunkIndex).padStart(3, '0')}`
    : filename;

  const metadata = JSON.stringify({
    _cv: 1,
    fileId,
    fileName: filename,
    mimeType: mimeType || 'application/octet-stream',
    chunkIndex,
    totalChunks,
    chunkSize: buffer.length,
    userId: userId || null,
    uploadedAt: new Date().toISOString(),
  });

  const sizeStr = formatBytes(buffer.length);

  const form = new FormData();
  form.append('files[0]', Buffer.from(buffer), {
    filename: chunkName,
    contentType: mimeType || 'application/octet-stream',
  });
  form.append('payload_json', JSON.stringify({
    embeds: [{
      title: totalChunks > 1 ? `📦 Chunk ${chunkIndex + 1}/${totalChunks}` : `📁 ${filename}`,
      description: totalChunks > 1 ? `File: \`${filename}\`` : undefined,
      color: 0x5865F2,
      fields: [
        { name: 'Size', value: sizeStr, inline: true },
        { name: 'Type', value: mimeType || 'unknown', inline: true },
      ],
      footer: { text: metadata },
      timestamp: new Date().toISOString(),
    }],
  }));

  const response = await apiRequest({
    method: 'post',
    url: `${DISCORD_API}/channels/${channelId}/messages`,
    data: form,
    headers: { ...getHeaders(), ...form.getHeaders() },
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  return {
    messageId: response.data.id,
    channelId,
    chunkIndex,
    chunkSize: buffer.length,
    url: response.data.attachments[0]?.url,
  };
}

/**
 * Download a chunk from Discord
 */
export async function downloadChunk(messageId, channelId) {
  const ch = channelId || process.env.DISCORD_CHANNEL_ID;
  const response = await apiRequest({
    method: 'get',
    url: `${DISCORD_API}/channels/${ch}/messages/${messageId}`,
    headers: getHeaders(),
  });

  const attachment = response.data.attachments[0];
  if (!attachment) throw new Error('No attachment in Discord message');

  const file = await axios.get(attachment.url, { responseType: 'arraybuffer' });
  return Buffer.from(file.data);
}

/**
 * Delete a message from Discord
 */
export async function deleteMessage(messageId, channelId) {
  const ch = channelId || process.env.DISCORD_CHANNEL_ID;
  await apiRequest({
    method: 'delete',
    url: `${DISCORD_API}/channels/${ch}/messages/${messageId}`,
    headers: getHeaders(),
  });
  await sleep(500);
}

/**
 * Store a metadata-only record in Discord (for Telegram files, bot uploads, etc.)
 * This is a text message (no attachment) used for cold-start recovery.
 */
export async function storeMetadata(fileId, fileName, mimeType, size, storageType, chunkInfo, userId) {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const metadata = JSON.stringify({
    _cv: 1,
    _meta: true,
    fileId,
    fileName,
    mimeType: mimeType || 'application/octet-stream',
    size,
    storageType,
    chunkIndex: chunkInfo.chunkIndex,
    totalChunks: 1,
    chunkSize: chunkInfo.chunkSize,
    messageId: chunkInfo.messageId,
    channelId: chunkInfo.channelId,
    userId: userId || null,
    uploadedAt: new Date().toISOString(),
  });

  const icon = storageType === 'telegram' ? '✈️' : '🎮';

  await apiRequest({
    method: 'post',
    url: `${DISCORD_API}/channels/${channelId}/messages`,
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    data: {
      embeds: [{
        title: `${icon} ${fileName}`,
        color: storageType === 'telegram' ? 0x26A5E4 : 0x5865F2,
        fields: [
          { name: 'Size', value: formatBytes(size), inline: true },
          { name: 'Storage', value: storageType, inline: true },
          { name: 'Type', value: mimeType || 'unknown', inline: true },
        ],
        footer: { text: metadata },
        timestamp: new Date().toISOString(),
      }],
    },
  });
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB'];
  let i = 0, s = bytes;
  while (s >= 1024 && i < u.length - 1) { s /= 1024; i++; }
  return `${s.toFixed(2)} ${u[i]}`;
}

/**
 * Scan Discord channel for all CloudVault files (metadata recovery)
 */
export async function scanFiles(limit = 100) {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const files = new Map();
  let before = null;
  let fetched = 0;

  while (fetched < limit) {
    const params = { limit: 100 };
    if (before) params.before = before;

    const response = await apiRequest({
      method: 'get',
      url: `${DISCORD_API}/channels/${channelId}/messages`,
      headers: getHeaders(),
      params,
    });

    const messages = response.data;
    if (messages.length === 0) break;

    for (const msg of messages) {
      try {
        // Try embed footer first (new format), then content (old format)
        let metaStr = msg.embeds?.[0]?.footer?.text || msg.content;
        const meta = JSON.parse(metaStr);
        if (!meta._cv || !meta.fileId) continue;

        if (meta._meta) {
          if (!files.has(meta.fileId)) {
            files.set(meta.fileId, {
              id: meta.fileId,
              name: meta.fileName,
              mimeType: meta.mimeType,
              size: meta.size,
              totalChunks: 1,
              storageType: meta.storageType || 'telegram',
              userId: meta.userId || null,
              createdAt: meta.uploadedAt,
              chunks: [{
                chunkIndex: 0,
                messageId: meta.messageId,
                channelId: meta.channelId,
                chunkSize: meta.chunkSize,
              }],
              _discordMetaMsgId: msg.id,
            });
          }
        } else {
          if (!files.has(meta.fileId)) {
            files.set(meta.fileId, {
              id: meta.fileId,
              name: meta.fileName,
              mimeType: meta.mimeType,
              totalChunks: meta.totalChunks,
              storageType: 'discord',
              userId: meta.userId || null,
              createdAt: meta.uploadedAt,
              chunks: [],
            });
          }
          files.get(meta.fileId).chunks.push({
            chunkIndex: meta.chunkIndex,
            messageId: msg.id,
            channelId,
            chunkSize: meta.chunkSize,
          });
        }
      } catch {
        // Not a CloudVault message, skip
      }
    }

    before = messages[messages.length - 1].id;
    fetched += messages.length;
    if (messages.length < 100) break;
    await sleep(500);
  }

  // Sort chunks and calculate total size
  const result = [];
  for (const file of files.values()) {
    file.chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
    if (!file.size) {
      file.size = file.chunks.reduce((sum, c) => sum + c.chunkSize, 0);
    }
    result.push(file);
  }

  return result;
}

/**
 * Store user data in Discord (for auth)
 */
export async function storeUserData(user) {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const data = JSON.stringify({ _cv: 1, _user: true, ...user });

  await apiRequest({
    method: 'post',
    url: `${DISCORD_API}/channels/${channelId}/messages`,
    headers: { ...getHeaders(), 'Content-Type': 'application/json' },
    data: {
      embeds: [{
        title: `👤 User: ${user.username}`,
        color: 0x22c55e,
        footer: { text: data },
        timestamp: new Date().toISOString(),
      }],
    },
  });
}

/**
 * Scan Discord for user records
 */
export async function scanUsers(limit = 200) {
  const channelId = process.env.DISCORD_CHANNEL_ID;
  const users = [];
  let before = null;
  let fetched = 0;

  while (fetched < limit) {
    const params = { limit: 100 };
    if (before) params.before = before;

    const response = await apiRequest({
      method: 'get',
      url: `${DISCORD_API}/channels/${channelId}/messages`,
      headers: getHeaders(),
      params,
    });

    const messages = response.data;
    if (messages.length === 0) break;

    for (const msg of messages) {
      try {
        const metaStr = msg.embeds?.[0]?.footer?.text || msg.content;
        const meta = JSON.parse(metaStr);
        if (meta._cv && meta._user) {
          users.push({
            id: meta.id,
            username: meta.username,
            password: meta.password,
            createdAt: meta.createdAt,
          });
        }
      } catch { /* skip */ }
    }

    before = messages[messages.length - 1].id;
    fetched += messages.length;
    if (messages.length < 100) break;
    await sleep(500);
  }

  return users;
}

export const CHUNK_SIZE = MAX_CHUNK_SIZE;
