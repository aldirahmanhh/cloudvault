/**
 * Simple auth system — users stored as Discord messages
 * JWT tokens for session, bcrypt for passwords
 */
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import * as discord from './discord';
import './env-validation'; // Validate env vars at startup

// Validate JWT_SECRET at startup
if (!process.env.JWT_SECRET) {
  throw new Error(
    'CRITICAL: JWT_SECRET environment variable is not set. ' +
    'This is required for secure token signing. ' +
    'Generate a secure secret: openssl rand -base64 32'
  );
}

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);
const TOKEN_EXPIRY = '7d';
const RESET_TOKEN_EXPIRY = '15m';

// In-memory user cache
let userCache = new Map();
let usersSynced = false;

/**
 * Create JWT token
 */
export async function createToken(user) {
  return new SignJWT({ userId: user.id, username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(TOKEN_EXPIRY)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

/**
 * Verify JWT token, returns payload or null
 */
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Get user from request (cookie or header)
 */
export async function getUserFromRequest(request) {
  // Try cookie first
  const cookie = request.cookies?.get('token')?.value
    || request.headers.get('cookie')?.match(/token=([^;]+)/)?.[1];

  // Then try Authorization header
  const authHeader = request.headers.get('authorization');
  const token = cookie || authHeader?.replace('Bearer ', '');

  if (!token) return null;
  return verifyToken(token);
}

/**
 * Register a new user
 * @param {string} username
 * @param {string} password
 * @param {Array<{question: string, answer: string}>} [securityQuestions] - optional at register but required for password recovery
 */
export async function registerUser(username, password, securityQuestions = null) {
  await syncUsers();

  // Check if username exists
  const existing = [...userCache.values()].find(u => u.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    throw new Error('Username sudah dipakai');
  }

  const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const hashedPassword = await bcrypt.hash(password, 10);

  let hashedQuestions = null;
  if (Array.isArray(securityQuestions) && securityQuestions.length > 0) {
    hashedQuestions = await Promise.all(
      securityQuestions.map(async (q) => ({
        question: String(q.question || '').trim(),
        answer: await bcrypt.hash(String(q.answer || '').trim().toLowerCase(), 10),
      }))
    );
  }

  const user = {
    id,
    username,
    password: hashedPassword,
    createdAt: new Date().toISOString(),
    securityQuestions: hashedQuestions,
  };

  // Store in Discord and capture message ID for future PATCH
  const { messageId } = await discord.storeUserData(user);
  user._discordMsgId = messageId;
  userCache.set(id, user);

  return { id, username };
}

/**
 * Get user record by username (case-insensitive). Returns null if not found.
 * Exposes securityQuestions[].question (not the hashed answers).
 */
export async function getUserByUsername(username) {
  await syncUsers();
  const user = [...userCache.values()].find(
    (u) => u.username.toLowerCase() === String(username || '').toLowerCase()
  );
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    hasSecurityQuestions: Array.isArray(user.securityQuestions) && user.securityQuestions.length > 0,
    securityQuestions: (user.securityQuestions || []).map((q) => ({ question: q.question })),
  };
}

/**
 * Verify security answers for a user. Returns a short-lived reset token on success.
 * @param {string} username
 * @param {Array<string>} answers - plain-text answers in the same order as questions
 * @returns {Promise<string>} reset token (JWT, 15min)
 */
export async function verifySecurityAnswers(username, answers) {
  await syncUsers();
  const user = [...userCache.values()].find(
    (u) => u.username.toLowerCase() === String(username || '').toLowerCase()
  );
  if (!user) throw new Error('Username tidak ditemukan');
  if (!Array.isArray(user.securityQuestions) || user.securityQuestions.length === 0) {
    throw new Error('Akun ini belum memiliki security questions');
  }
  if (!Array.isArray(answers) || answers.length !== user.securityQuestions.length) {
    throw new Error('Jumlah jawaban tidak sesuai');
  }

  for (let i = 0; i < user.securityQuestions.length; i++) {
    const provided = String(answers[i] || '').trim().toLowerCase();
    const ok = await bcrypt.compare(provided, user.securityQuestions[i].answer);
    if (!ok) throw new Error('Jawaban keamanan salah');
  }

  return new SignJWT({ userId: user.id, purpose: 'password-reset' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime(RESET_TOKEN_EXPIRY)
    .setIssuedAt()
    .sign(JWT_SECRET);
}

/**
 * Verify a password-reset token and return the userId if valid.
 */
export async function verifyResetToken(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    if (payload.purpose !== 'password-reset' || !payload.userId) return null;
    return payload.userId;
  } catch {
    return null;
  }
}

/**
 * Update a user's password (after successful reset token verification).
 */
export async function updatePassword(userId, newPassword) {
  await syncUsers();
  const user = userCache.get(userId);
  if (!user) throw new Error('User tidak ditemukan');
  if (!user._discordMsgId) throw new Error('Record Discord tidak ditemukan untuk user ini');

  const hashed = await bcrypt.hash(newPassword, 10);
  const updated = {
    id: user.id,
    username: user.username,
    password: hashed,
    createdAt: user.createdAt,
    securityQuestions: user.securityQuestions || null,
  };

  await discord.updateUserData(user._discordMsgId, updated);
  updated._discordMsgId = user._discordMsgId;
  userCache.set(userId, updated);
  return true;
}

/**
 * Login user
 */
export async function loginUser(username, password) {
  await syncUsers();

  const user = [...userCache.values()].find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) throw new Error('Username tidak ditemukan');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new Error('Password salah');

  return { id: user.id, username: user.username };
}

/**
 * Sync users from Discord (cold-start recovery)
 */
async function syncUsers() {
  if (usersSynced && userCache.size > 0) return;

  try {
    const users = await discord.scanUsers();
    for (const user of users) {
      // Preserve _discordMsgId field returned by scanUsers so password updates
      // can PATCH the existing embed instead of creating duplicates.
      userCache.set(user.id, user);
    }
    usersSynced = true;
  } catch (err) {
    console.warn('Failed to sync users:', err.message);
  }
}
