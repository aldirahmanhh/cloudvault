/**
 * Math CAPTCHA challenge generation and verification
 * @module lib/captcha
 */

import { SignJWT, jwtVerify } from 'jose';
import { createHash } from 'crypto';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const CHALLENGE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate random math challenge
 * @returns {Promise<{challenge: string, token: string}>}
 */
export async function generateChallenge() {
  const operations = [
    { op: '+', fn: (a, b) => a + b },
    { op: '-', fn: (a, b) => a - b },
    { op: '×', fn: (a, b) => a * b },
  ];

  const { op, fn } = operations[Math.floor(Math.random() * operations.length)];
  const num1 = Math.floor(Math.random() * 20) + 1;
  const num2 = Math.floor(Math.random() * 20) + 1;
  
  // Ensure subtraction doesn't produce negative results
  const [a, b] = op === '-' && num1 < num2 ? [num2, num1] : [num1, num2];
  
  const answer = fn(a, b);
  const challenge = `${a} ${op} ${b}`;
  
  // Hash answer for verification
  const answerHash = createHash('sha256').update(String(answer)).digest('hex');
  
  // Sign JWT with challenge and answer hash
  const token = await new SignJWT({ challenge, answerHash })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(Math.floor(Date.now() / 1000) + CHALLENGE_EXPIRY_MS / 1000)
    .sign(JWT_SECRET);

  return { challenge, token };
}

/**
 * Verify math challenge answer
 * @param {string} token - Challenge token from generateChallenge
 * @param {string|number} userAnswer - User's answer
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function verifyChallenge(token, userAnswer) {
  if (!token || typeof token !== 'string') {
    return { success: false, error: 'Invalid challenge token' };
  }

  if (userAnswer === null || userAnswer === undefined || userAnswer === '') {
    return { success: false, error: 'Jawaban tidak boleh kosong' };
  }

  try {
    // Verify JWT signature and expiry
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Hash user's answer
    const userAnswerHash = createHash('sha256').update(String(userAnswer)).digest('hex');
    
    // Compare hashes
    if (userAnswerHash !== payload.answerHash) {
      return { success: false, error: 'Jawaban salah' };
    }

    return { success: true };
  } catch (error) {
    if (error.code === 'ERR_JWT_EXPIRED') {
      return { success: false, error: 'Challenge expired, refresh halaman' };
    }
    console.error('Challenge verification error:', error);
    return { success: false, error: 'Verifikasi challenge gagal' };
  }
}
