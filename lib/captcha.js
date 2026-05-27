/**
 * Cloudflare Turnstile CAPTCHA verification
 * @module lib/captcha
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY;

/**
 * Verify Cloudflare Turnstile CAPTCHA token
 * @param {string} token - CAPTCHA token from client
 * @param {string} [remoteIp] - Optional client IP address
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function verifyCaptcha(token, remoteIp = null) {
  if (!TURNSTILE_SECRET_KEY) {
    console.error('TURNSTILE_SECRET_KEY not configured');
    return { success: false, error: 'CAPTCHA not configured' };
  }

  if (!token || typeof token !== 'string') {
    return { success: false, error: 'Invalid CAPTCHA token' };
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      console.error(`Turnstile API error: ${response.status} ${response.statusText}`);
      return { success: false, error: 'CAPTCHA verification failed' };
    }

    const data = await response.json();

    if (!data.success) {
      const errorCodes = data['error-codes'] || [];
      console.warn('Turnstile verification failed:', errorCodes);
      return { success: false, error: 'CAPTCHA verification failed' };
    }

    return { success: true };
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return { success: false, error: 'CAPTCHA verification error' };
  }
}
