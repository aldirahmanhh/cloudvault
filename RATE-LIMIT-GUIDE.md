# Rate Limiting & Anti-Spam Protection

## Implemented Protections

### 1. **Registration Rate Limiting**
- **Limit**: 3 registrations per IP per 15 minutes
- **Purpose**: Prevent mass account creation
- **Response**: HTTP 429 with retry-after header

### 2. **Login Rate Limiting**
- **Limit**: 10 login attempts per IP per minute
- **Purpose**: Prevent brute force attacks
- **Response**: HTTP 429 with retry-after header

### 3. **Failed Login Protection (Exponential Backoff)**
- **Trigger**: After 3 failed login attempts per username
- **Lockout Duration**:
  - 3 failed attempts: 30 seconds
  - 4 failed attempts: 2 minutes
  - 5 failed attempts: 5 minutes
  - 6 failed attempts: 15 minutes
  - 7+ failed attempts: 1 hour
- **Auto-reset**: On successful login
- **Warning**: Shows remaining attempts after 2 failures

### 4. **IP Detection**
- Uses Vercel's `x-forwarded-for` and `x-real-ip` headers
- Tracks both IP and username separately
- Prevents bypass via multiple accounts from same IP

## How It Works

### Registration Flow
```
User → POST /api/auth/register
  ↓
Check IP rate limit (3 per 15min)
  ↓
If exceeded → 429 error with retry-after
  ↓
If allowed → Process registration
```

### Login Flow
```
User → POST /api/auth/login
  ↓
Check IP rate limit (10 per 1min)
  ↓
Check username failed attempts
  ↓
If locked → 429 error with wait time
  ↓
Try login
  ↓
Success → Reset failed attempts
Failure → Increment failed attempts + apply lockout
```

## Response Headers

Rate-limited responses include:
```
HTTP/1.1 429 Too Many Requests
Retry-After: 60
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-05-09T17:00:00.000Z
```

## Error Messages

### Registration
```json
{
  "error": "Terlalu banyak percobaan registrasi. Coba lagi dalam 900 detik.",
  "retryAfter": 900
}
```

### Login (Rate Limit)
```json
{
  "error": "Terlalu banyak percobaan login. Coba lagi dalam 60 detik.",
  "retryAfter": 60
}
```

### Login (Failed Attempts)
```json
{
  "error": "Terlalu banyak percobaan gagal. Coba lagi dalam 120 detik.",
  "waitTime": 120,
  "attempts": 4
}
```

### Login (Warning)
```json
{
  "error": "Username atau password salah (2 percobaan tersisa sebelum akun dikunci)"
}
```

## Storage

- **In-memory storage**: Uses JavaScript Map
- **Auto-cleanup**: Runs every 5 minutes
- **Serverless-friendly**: Works on Vercel Edge Functions
- **No database required**: Stateless per-instance

## Limitations

### Vercel Serverless
- Rate limit state is per-instance
- Cold starts reset counters
- For production, consider:
  - Vercel KV (Redis)
  - Upstash Redis
  - Vercel Edge Config

### Bypass Scenarios
- VPN/Proxy rotation (mitigated by username tracking)
- Distributed attacks (need Cloudflare WAF)
- Cookie/session hijacking (use HTTPS + httpOnly cookies ✅)

## Upgrade Path

### For Better Protection:

1. **Vercel KV (Redis)**
```javascript
import { kv } from '@vercel/kv';

export async function checkRateLimit(key, limit, window) {
  const count = await kv.incr(key);
  if (count === 1) await kv.expire(key, window / 1000);
  return { allowed: count <= limit };
}
```

2. **Cloudflare Turnstile (CAPTCHA)**
```javascript
// Add to login/register forms
<Turnstile sitekey="xxx" onVerify={setToken} />
```

3. **Webhook Signature Verification**
```javascript
// Already recommended in previous response
verifyTelegramWebhook(request);
```

## Testing

### Test Rate Limiting
```bash
# Register spam (should block after 3)
for i in {1..5}; do
  curl -X POST https://cloudvault.my.id/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{"username":"test'$i'","password":"test1234"}'
done

# Login spam (should block after 10)
for i in {1..15}; do
  curl -X POST https://cloudvault.my.id/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}'
done
```

### Test Failed Attempts
```bash
# Try wrong password 5 times
for i in {1..5}; do
  curl -X POST https://cloudvault.my.id/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"wrongpass"}'
  echo ""
done
```

## Monitoring

Watch for:
- High 429 response rates (potential attack)
- Unusual IP patterns (distributed attack)
- Spike in failed login attempts
- Lockout duration trends

Use Vercel Analytics or add logging:
```javascript
console.log('[RATE_LIMIT]', { ip, endpoint, blocked: !allowed });
```

## Security Notes

✅ **Implemented**:
- IP-based rate limiting
- Username-based lockout
- Exponential backoff
- Automatic cleanup
- Secure headers

⚠️ **Consider Adding**:
- CAPTCHA on repeated failures
- Email verification for registration
- 2FA for sensitive accounts
- Cloudflare WAF rules
- Redis for persistent state

## Files Modified

- `lib/rate-limit.js` - Core rate limiting logic
- `app/api/auth/register/route.js` - Registration protection
- `app/api/auth/login/route.js` - Login protection + failed attempts
