/**
 * Simple auth system — users stored as Discord messages
 * JWT tokens for session, bcrypt for passwords
 */
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import * as discord from './discord';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'cloudvault-secret-change-me');
const TOKEN_EXPIRY = '7d';

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
 */
export async function registerUser(username, password) {
  await syncUsers();

  // Check if username exists
  const existing = [...userCache.values()].find(u => u.username.toLowerCase() === username.toLowerCase());
  if (existing) {
    throw new Error('Username sudah dipakai');
  }

  const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = {
    id,
    username,
    password: hashedPassword,
    createdAt: new Date().toISOString(),
  };

  // Store in Discord
  await discord.storeUserData(user);
  userCache.set(id, user);

  return { id, username };
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
      userCache.set(user.id, user);
    }
    usersSynced = true;
  } catch (err) {
    console.warn('Failed to sync users:', err.message);
  }
}
