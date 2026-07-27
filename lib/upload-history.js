'use client';

const STORAGE_KEY = 'cv-upload-history';
const MAX_ENTRIES = 50;

/**
 * Read all history entries (newest first).
 * @returns {Array<{id, name, size, mimeType, status, storageType, error, timestamp}>}
 */
export function getHistory() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Push a new entry and trim to MAX_ENTRIES. Returns the new list.
 */
export function pushHistory(entry) {
  if (typeof window === 'undefined') return [];
  const list = getHistory();
  const normalized = {
    id: entry.id || `h_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    name: entry.name || 'unknown',
    size: entry.size || 0,
    mimeType: entry.mimeType || '',
    status: entry.status || 'success', // success | failed
    storageType: entry.storageType || null,
    error: entry.error || null,
    timestamp: entry.timestamp || Date.now(),
  };
  const next = [normalized, ...list].slice(0, MAX_ENTRIES);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('cv-history-updated'));
  } catch {
    // Silently ignore storage errors (quota, private mode)
  }
  return next;
}

export function clearHistory() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent('cv-history-updated'));
  } catch {
    // Silently ignore storage errors
  }
}
