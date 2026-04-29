import axios from 'axios';
import FormData from 'form-data';

function getApiBase() {
  return `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
}

function getFileApiBase() {
  return `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}`;
}

/**
 * Upload a file to Telegram with clean caption
 */
export async function uploadFile(buffer, filename, fileId, mimeType) {
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('document', Buffer.from(buffer), {
    filename,
    contentType: mimeType || 'application/octet-stream',
  });
  // Clean caption — no JSON metadata visible to user
  form.append('caption', `☁️ CloudVault | ${filename}`);

  const response = await axios.post(`${getApiBase()}/sendDocument`, form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
  });

  if (!response.data.ok) {
    throw new Error(`Telegram upload failed: ${response.data.description}`);
  }

  return {
    messageId: String(response.data.result.message_id),
    channelId: String(chatId),
    chunkIndex: 0,
    chunkSize: buffer.length,
  };
}

/**
 * Download a file from Telegram
 */
export async function downloadFile(messageId, chatId) {
  const sourceChatId = chatId || process.env.TELEGRAM_CHAT_ID;
  const targetChatId = process.env.TELEGRAM_CHAT_ID;

  // Forward to get file_id
  const fwd = await axios.post(`${getApiBase()}/forwardMessage`, {
    chat_id: targetChatId,
    from_chat_id: sourceChatId,
    message_id: messageId,
  });

  const result = fwd.data.result;
  const fwdMsgId = result.message_id;

  let fileId = null;
  if (result.document) fileId = result.document.file_id;
  else if (result.photo) fileId = result.photo[result.photo.length - 1].file_id;
  else if (result.video) fileId = result.video.file_id;
  else if (result.audio) fileId = result.audio.file_id;

  if (!fileId) {
    await deleteMsg(fwdMsgId, targetChatId);
    throw new Error('No file found in Telegram message');
  }

  const fileInfo = await axios.get(`${getApiBase()}/getFile?file_id=${fileId}`);
  const filePath = fileInfo.data.result.file_path;
  const fileData = await axios.get(`${getFileApiBase()}/${filePath}`, { responseType: 'arraybuffer' });

  await deleteMsg(fwdMsgId, targetChatId);
  return Buffer.from(fileData.data);
}

/**
 * Delete a Telegram message
 */
export async function deleteMsg(messageId, chatId) {
  try {
    await axios.post(`${getApiBase()}/deleteMessage`, {
      chat_id: chatId || process.env.TELEGRAM_CHAT_ID,
      message_id: messageId,
    });
  } catch { /* ignore */ }
}

/**
 * Send a text message
 */
export async function sendMessage(chatId, text, parseMode = 'Markdown') {
  try {
    const res = await axios.post(`${getApiBase()}/sendMessage`, {
      chat_id: chatId, text, parse_mode: parseMode,
    });
    return res.data.result;
  } catch { return null; }
}

/**
 * Edit a text message
 */
export async function editMessage(chatId, messageId, text, parseMode = 'Markdown') {
  try {
    await axios.post(`${getApiBase()}/editMessageText`, {
      chat_id: chatId, message_id: messageId, text, parse_mode: parseMode,
    });
  } catch { /* ignore */ }
}

/**
 * Send a document to a chat
 */
export async function sendDocument(chatId, buffer, filename, caption) {
  const form = new FormData();
  form.append('chat_id', chatId);
  form.append('document', Buffer.from(buffer), { filename });
  if (caption) form.append('caption', caption);

  await axios.post(`${getApiBase()}/sendDocument`, form, {
    headers: form.getHeaders(),
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    timeout: 300000,
  });
}

/**
 * Set webhook URL for the bot
 */
export async function setWebhook(url) {
  const res = await axios.post(`${getApiBase()}/setWebhook`, {
    url,
    allowed_updates: ['message'],
  });
  return res.data;
}

/**
 * Scan Telegram channel for CloudVault files
 */
export async function scanFiles() {
  // Telegram Bot API doesn't support fetching channel history easily
  // We rely on the webhook to capture new files
  // For existing files, we'd need to use a userbot or MTProto
  return [];
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
