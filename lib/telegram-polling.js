/**
 * Telegram Bot Polling — for local development only
 * On Vercel, webhook is used instead (see /api/webhook/telegram)
 */
import axios from 'axios';
import { handleUpdate } from './telegram-handler';

let polling = false;
let timeoutId = null;
let lastUpdateId = 0;
let started = false;
let errorCount = 0;

function getApiBase() {
  return `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
}

export async function startPolling() {
  if (started || !process.env.TELEGRAM_BOT_TOKEN) return;
  started = true;

  // MUST delete webhook first — polling and webhook can't coexist (409 error)
  try {
    console.log('🤖 Telegram Bot: Removing webhook for local polling...');
    await axios.post(`${getApiBase()}/deleteWebhook`, { drop_pending_updates: true });
    console.log('🤖 Telegram Bot: Webhook removed ✓');
  } catch (err) {
    console.warn('🤖 Bot: Could not delete webhook:', err.message);
  }

  // Flush old updates
  try {
    const res = await axios.get(`${getApiBase()}/getUpdates`, {
      params: { offset: -1, limit: 1 },
      timeout: 5000,
    });
    if (res.data.ok && res.data.result.length > 0) {
      lastUpdateId = res.data.result[res.data.result.length - 1].update_id;
    }
  } catch (err) {
    console.warn('🤖 Bot: Could not flush updates:', err.message);
  }

  console.log('🤖 Telegram Bot: Polling started (local dev mode)');
  polling = true;
  errorCount = 0;
  poll();
}

export function stopPolling() {
  polling = false;
  started = false;
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
}

async function poll() {
  if (!polling) return;

  try {
    const response = await axios.get(`${getApiBase()}/getUpdates`, {
      params: {
        offset: lastUpdateId + 1,
        timeout: 30,
        allowed_updates: ['message'],
      },
      timeout: 35000,
    });

    if (response.data.ok && response.data.result.length > 0) {
      for (const update of response.data.result) {
        lastUpdateId = update.update_id;
        try {
          await handleUpdate(update);
        } catch (err) {
          console.error('🤖 Bot handler error:', err.message);
        }
      }
    }
    // Reset error count on success
    errorCount = 0;
  } catch (err) {
    if (err.code !== 'ECONNABORTED') {
      errorCount++;
      // Only log first error + every 30th to avoid spam
      if (errorCount === 1 || errorCount % 30 === 0) {
        console.error(`🤖 Bot polling error (${errorCount}x): ${err.response?.status || ''} ${err.message}`);
      }
      // If 409 conflict, try deleting webhook again
      if (err.response?.status === 409 && errorCount <= 3) {
        try {
          await axios.post(`${getApiBase()}/deleteWebhook`, { drop_pending_updates: true });
          console.log('🤖 Webhook deleted, retrying polling...');
        } catch { /* ignore */ }
      }
    }
  }

  if (polling) {
    // Backoff on errors: 1s normal, up to 10s on repeated errors
    const delay = errorCount > 0 ? Math.min(1000 * Math.pow(2, errorCount), 10000) : 1000;
    timeoutId = setTimeout(poll, delay);
  }
}
