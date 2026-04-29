/**
 * Shared Telegram message handler — used by both webhook and polling
 */
import { v4 as uuidv4 } from 'uuid';
import { cacheFile, getFiles, getStats, getFileById, downloadFile, formatSize } from '@/lib/storage';
import * as telegram from '@/lib/telegram';
import * as discord from '@/lib/discord';

// Deduplication
const processedUpdates = new Set();

export async function handleUpdate(update) {
  const message = update.message;
  if (!message) return;

  // Deduplicate
  const updateId = update.update_id;
  if (processedUpdates.has(updateId)) return;
  processedUpdates.add(updateId);
  if (processedUpdates.size > 200) {
    const arr = [...processedUpdates];
    processedUpdates.clear();
    arr.slice(-50).forEach(id => processedUpdates.add(id));
  }

  const chatId = message.chat.id;

  // Handle commands
  if (message.text) {
    const cmd = message.text.split(' ')[0].toLowerCase().split('@')[0];
    switch (cmd) {
      case '/start': return await handleStart(chatId);
      case '/help': return await handleHelp(chatId);
      case '/list': return await handleList(chatId);
      case '/stats': return await handleStats(chatId);
      case '/get': return await handleGet(chatId, message.text);
      case '/search': return await handleSearch(chatId, message.text);
    }
  }

  // Handle file uploads
  let fileInfo = null;
  if (message.document) {
    fileInfo = { name: message.document.file_name || 'file', size: message.document.file_size || 0, mime: message.document.mime_type };
  } else if (message.photo) {
    const photo = message.photo[message.photo.length - 1];
    fileInfo = { name: `photo_${Date.now()}.jpg`, size: photo.file_size || 0, mime: 'image/jpeg' };
  } else if (message.video) {
    fileInfo = { name: message.video.file_name || `video_${Date.now()}.mp4`, size: message.video.file_size || 0, mime: message.video.mime_type || 'video/mp4' };
  } else if (message.audio) {
    fileInfo = { name: message.audio.file_name || `audio_${Date.now()}.mp3`, size: message.audio.file_size || 0, mime: message.audio.mime_type || 'audio/mpeg' };
  }

  if (fileInfo) {
    await handleFileUpload(chatId, message.message_id, fileInfo);
  }
}

async function handleStart(chatId) {
  await telegram.sendMessage(chatId,
    `☁️ *CloudVault Bot*\n\n` +
    `Kirim file apapun untuk menyimpannya!\n\n` +
    `📤 Upload: Kirim file langsung\n` +
    `📥 /get <no> - Download file\n` +
    `🔍 /search <kata> - Cari file\n` +
    `📋 /list - Daftar file\n` +
    `📊 /stats - Statistik\n` +
    `❓ /help - Bantuan`
  );
}

async function handleHelp(chatId) {
  await telegram.sendMessage(chatId,
    `❓ *Bantuan CloudVault*\n\n` +
    `*Upload:* Kirim file/foto/video/audio\n` +
    `*Download:* /get <nomor dari /list>\n` +
    `*Cari:* /search <kata kunci>\n\n` +
    `File disimpan di Discord & Telegram.\n` +
    `Max 50MB via Telegram, lebih besar via Discord.`
  );
}

async function handleList(chatId) {
  const { files } = getFiles({ limit: 10 });
  if (files.length === 0) {
    await telegram.sendMessage(chatId, '📂 Belum ada file.');
    return;
  }

  let text = `📋 *File Terakhir:*\n_/get <no> untuk download_\n\n`;
  files.forEach((f, i) => {
    const icon = f.storageType === 'telegram' ? '✈️' : '🎮';
    text += `*${i + 1}.* ${icon} \`${f.name}\`\n   📦 ${formatSize(f.size)}\n\n`;
  });

  global._lastTelegramList = files;
  await telegram.sendMessage(chatId, text);
}

async function handleStats(chatId) {
  const s = getStats();
  await telegram.sendMessage(chatId,
    `📊 *Statistics*\n\n📁 Files: *${s.totalFiles}*\n💾 Size: *${formatSize(s.totalSize)}*\n\n✈️ Telegram: ${s.telegramFiles}\n🎮 Discord: ${s.discordFiles}`
  );
}

async function handleGet(chatId, text) {
  const num = parseInt(text.split(' ')[1]);
  if (!num) {
    await telegram.sendMessage(chatId, '❓ Gunakan: `/get <nomor>`\nContoh: `/get 3`');
    return;
  }

  const list = global._lastTelegramList || getFiles({ limit: 10 }).files;
  if (num > list.length) {
    await telegram.sendMessage(chatId, `❌ File #${num} tidak ada. Jalankan /list dulu.`);
    return;
  }

  const file = list[num - 1];
  const fullFile = getFileById(file.id);
  if (!fullFile) {
    await telegram.sendMessage(chatId, '❌ File tidak ditemukan di storage.');
    return;
  }

  const status = await telegram.sendMessage(chatId,
    `📥 *Downloading...*\n📁 \`${file.name}\`\n📦 ${formatSize(file.size)}`
  );

  try {
    const buffer = await downloadFile(fullFile);

    if (buffer.length > 50 * 1024 * 1024) {
      await telegram.editMessage(chatId, status.message_id,
        `⚠️ *File terlalu besar* (${formatSize(buffer.length)})\nMax Telegram: 50MB\n\nDownload dari web.`
      );
    } else {
      await telegram.sendDocument(chatId, buffer, file.name,
        `📁 ${file.name} | ${formatSize(file.size)}`
      );
      await telegram.deleteMsg(status.message_id, chatId);
    }
  } catch (err) {
    await telegram.editMessage(chatId, status.message_id, `❌ Error: ${err.message}`);
  }
}

async function handleSearch(chatId, text) {
  const query = text.split(' ').slice(1).join(' ').trim();
  if (!query) {
    await telegram.sendMessage(chatId, '🔍 Gunakan: `/search <kata>`');
    return;
  }

  const { files } = getFiles({ search: query, limit: 10 });
  if (files.length === 0) {
    await telegram.sendMessage(chatId, `🔍 Tidak ditemukan: "${query}"`);
    return;
  }

  global._lastTelegramList = files;
  let t = `🔍 *"${query}":*\n\n`;
  files.forEach((f, i) => {
    t += `*${i + 1}.* \`${f.name}\`\n   📦 ${formatSize(f.size)}\n\n`;
  });
  await telegram.sendMessage(chatId, t);
}

async function handleFileUpload(chatId, messageId, info) {
  const fileUuid = uuidv4();
  const mimeType = info.mime || 'application/octet-stream';
  const storageChatId = process.env.TELEGRAM_CHAT_ID;

  // Forward file to storage channel so it's accessible later
  let storedMessageId = String(messageId);
  let storedChannelId = String(chatId);

  if (String(chatId) !== String(storageChatId)) {
    try {
      const axios = (await import('axios')).default;
      const apiBase = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
      const fwd = await axios.post(`${apiBase}/forwardMessage`, {
        chat_id: storageChatId,
        from_chat_id: chatId,
        message_id: messageId,
      });
      storedMessageId = String(fwd.data.result.message_id);
      storedChannelId = String(storageChatId);
    } catch (err) {
      console.warn('Could not forward to storage channel, using original:', err.message);
    }
  }

  const chunkInfo = { chunkIndex: 0, messageId: storedMessageId, channelId: storedChannelId, chunkSize: info.size };

  cacheFile({
    id: fileUuid,
    name: info.name,
    mimeType,
    size: info.size,
    storageType: 'telegram',
    chunks: [chunkInfo],
    createdAt: new Date().toISOString(),
  });

  // Store metadata in Discord for cold-start recovery
  try {
    await discord.storeMetadata(fileUuid, info.name, mimeType, info.size, 'telegram', chunkInfo);
  } catch (err) {
    console.warn('Failed to store metadata in Discord:', err.message);
  }

  await telegram.sendMessage(chatId,
    `✅ *Tersimpan!*\n📁 \`${info.name}\`\n📦 ${formatSize(info.size)}`
  );
}
