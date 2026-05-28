/**
 * Math CAPTCHA challenge generation and verification
 * Stateless: challenge encoded in JWT with answer hash + jti nonce.
 * Edge-compatible: uses Web Crypto API (no node:crypto).
 * @module lib/captcha
 */

import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const CHALLENGE_TTL = '2m'; // short TTL reduces replay window
const USED_TOKENS_TTL_MS = 5 * 60 * 1000;

// Replay protection: track consumed jti within their TTL window.
// Map<jti, expiresAtMs>
const usedTokens = new Map();

function pruneUsedTokens() {
  const now = Date.now();
  for (const [jti, expiresAt] of usedTokens.entries()) {
    if (expiresAt <= now) usedTokens.delete(jti);
  }
}

if (typeof setInterval !== 'undefined') {
  setInterval(pruneUsedTokens, 60 * 1000);
}

/**
 * SHA-256 hex digest using Web Crypto (works on Node 18+ and Edge).
 * @param {string} text
 * @returns {Promise<string>} lowercase hex
 */
async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time string compare for hex strings of equal length.
 * @param {string} a
 * @param {string} b
 * @returns {boolean}
 */
function constantTimeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Random integer in [min, max] inclusive.
 * @param {number} min
 * @param {number} max
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Random URL-safe ID for jti (replay nonce).
 * @returns {string}
 */
function randomId() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Generate random math challenge.
 * Multiplication uses smaller operands so the problem stays solvable in head.
 * @returns {Promise<{challenge: string, token: string}>}
 */
export async function generateChallenge() {
  const ops = ['+', '-', '×'];
  const op = ops[Math.floor(Math.random() * ops.length)];

  let a;
  let b;
  let answer;

  if (op === '+') {
    a = randInt(1, 20);
    b = randInt(1, 20);
    answer = a + b;
  } else if (op === '-') {
    a = randInt(1, 20);
    b = randInt(1, 20);
    if (a < b) [a, b] = [b, a]; // avoid negatives
    answer = a - b;
  } else {
    a = randInt(2, 9);
    b = randInt(2, 9);
    answer = a * b;
  }

  const challenge = `${a} ${op} ${b}`;
  const answerHash = await sha256Hex(String(answer));
  const jti = randomId();

  const token = await new SignJWT({ challenge, answerHash })
    .setProtectedHeader({ alg: 'HS256' })
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime(CHALLENGE_TTL)
    .sign(JWT_SECRET);

  return { challenge, token };
}

/**
 * Verify math challenge answer.
 * Single-use: a token cannot be redeemed twice.
 * @param {string} token - Challenge token from generateChallenge
 * @param {string|number} userAnswer - User's answer
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function verifyChallenge(token, userAnswer) {
  if (!token || typeof token !== 'string') {
    return { success: false, error: 'Invalid challenge token' };
  }

  if (userAnswer === null || userAnswer === undefined || String(userAnswer).trim() === '') {
    return { success: false, error: 'Jawaban tidak boleh kosong' };
  }

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Replay protection
    const jti = payload.jti;
    if (!jti) {
      return { success: false, error: 'Challenge token tidak valid' };
    }
    pruneUsedTokens();
    if (usedTokens.has(jti)) {
      return { success: false, error: 'Challenge sudah dipakai, refresh dulu' };
    }

    const userAnswerHash = await sha256Hex(String(userAnswer).trim());

    if (!constantTimeEqual(userAnswerHash, String(payload.answerHash))) {
      return { success: false, error: 'Jawaban salah' };
    }

    // Mark token consumed
    const expMs = typeof payload.exp === 'number'
      ? payload.exp * 1000
      : Date.now() + USED_TOKENS_TTL_MS;
    usedTokens.set(jti, expMs);

    return { success: true };
  } catch (error) {
    if (error?.code === 'ERR_JWT_EXPIRED') {
      return { success: false, error: 'Challenge expired, refresh dulu' };
    }
    if (error?.code === 'ERR_JWS_INVALID' || error?.code === 'ERR_JWS_SIGNATURE_VERIFICATION_FAILED') {
      return { success: false, error: 'Challenge token tidak valid' };
    }
    console.error('Challenge verification error:', error);
    return { success: false, error: 'Verifikasi challenge gagal' };
  }
}
