'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LogIn, UserPlus, Loader2, RefreshCw } from 'lucide-react';

/**
 * Draw CAPTCHA challenge on canvas with noise and mild distortion.
 * Keeps challenge text out of the DOM so basic bots cannot scrape it.
 * @param {HTMLCanvasElement} canvas
 * @param {string} text
 */
function drawCaptcha(canvas, text) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#f8fafc');
  gradient.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = `rgba(${80 + Math.random() * 120}, ${80 + Math.random() * 120}, ${80 + Math.random() * 120}, 0.28)`;
    ctx.beginPath();
    ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 2 + 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = `rgba(${40 + Math.random() * 100}, ${40 + Math.random() * 100}, ${40 + Math.random() * 100}, 0.35)`;
    ctx.lineWidth = Math.random() * 1.8 + 0.6;
    ctx.beginPath();
    ctx.moveTo(Math.random() * width, Math.random() * height);
    ctx.bezierCurveTo(
      Math.random() * width,
      Math.random() * height,
      Math.random() * width,
      Math.random() * height,
      Math.random() * width,
      Math.random() * height
    );
    ctx.stroke();
  }

  const chars = text.split('');
  const charGap = width / (chars.length + 1);
  ctx.textBaseline = 'middle';

  chars.forEach((char, index) => {
    ctx.save();
    const x = charGap * (index + 1) + (Math.random() * 8 - 4);
    const y = height / 2 + (Math.random() * 10 - 5);
    ctx.translate(x, y);
    ctx.rotate((Math.random() - 0.5) * 0.35);
    ctx.font = `${28 + Math.random() * 6}px Georgia, serif`;
    ctx.fillStyle = `hsl(${210 + Math.random() * 40}, 55%, ${20 + Math.random() * 18}%)`;
    ctx.fillText(char, 0, 0);
    ctx.restore();
  });
}

export default function AuthForm({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [challenge, setChallenge] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [answer, setAnswer] = useState('');
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const captchaCanvasRef = useRef(null);

  const fetchChallenge = useCallback(async () => {
    setLoadingChallenge(true);
    try {
      const res = await fetch('/api/auth/challenge');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load challenge');
      setChallenge(data.challenge);
      setChallengeToken(data.token);
      setAnswer('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingChallenge(false);
    }
  }, []);

  useEffect(() => {
    fetchChallenge();
  }, [fetchChallenge]);

  useEffect(() => {
    if (!challenge || !captchaCanvasRef.current) return;
    drawCaptcha(captchaCanvasRef.current, challenge);
  }, [challenge]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!answer.trim()) {
      setError('Jawaban tidak boleh kosong');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, captchaToken: challengeToken, captchaAnswer: answer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
      fetchChallenge();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo"><img src="/logo.png" alt="CloudVault" width={32} height={32} /></div>
        <h1 className="auth-title">CloudVault</h1>
        <p className="auth-subtitle">Your files. Discord & Telegram powered.</p>

        <div className="auth-tabs" role="tablist">
          <button 
            type="button"
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`} 
            onClick={() => { setMode('login'); setError(''); }}
            role="tab"
            aria-selected={mode === 'login'}
            aria-label="Switch to login"
          >
            <LogIn size={14} /> Login
          </button>
          <button 
            type="button"
            className={`auth-tab ${mode === 'register' ? 'active' : ''}`} 
            onClick={() => { setMode('register'); setError(''); }}
            role="tab"
            aria-selected={mode === 'register'}
            aria-label="Switch to register"
          >
            <UserPlus size={14} /> Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="username">Username</label>
            <input 
              id="username"
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Enter username" 
              required 
              minLength={3}
              autoComplete="username"
            />
          </div>
          <div className="auth-field">
            <label htmlFor="password">Password</label>
            <input 
              id="password"
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Enter password" 
              required 
              minLength={4}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>
          <div className="auth-field">
            <label htmlFor="captcha">Solve this:</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <canvas
                ref={captchaCanvasRef}
                width={200}
                height={50}
                role="img"
                aria-label="Math challenge image"
                style={{
                  borderRadius: '6px',
                  border: '1px solid var(--border-color, #ddd)',
                  background: '#f8fafc',
                  flexShrink: 0,
                }}
              />
              <button 
                type="button"
                onClick={fetchChallenge}
                disabled={loadingChallenge}
                className="btn"
                aria-label="Refresh challenge"
                style={{ padding: '0 12px' }}
              >
                <RefreshCw size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <input 
                id="captcha"
                type="text" 
                inputMode="numeric"
                value={answer} 
                onChange={e => setAnswer(e.target.value)} 
                placeholder="Your answer" 
                required 
                disabled={loadingChallenge}
                autoComplete="off"
              />
            </div>
          </div>
          {error && <div className="auth-error" role="alert">⚠️ {error}</div>}
          <button type="submit" className="btn btn-primary auth-submit" disabled={loading} aria-label={mode === 'login' ? 'Login to account' : 'Create new account'}>
            {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {mode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}
          </button>
        </form>
      </div>
    </div>
  );
}
