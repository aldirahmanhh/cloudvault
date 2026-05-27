'use client';

import { useState, useEffect, useRef } from 'react';
import { LogIn, UserPlus, Loader2 } from 'lucide-react';

export default function AuthForm({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const turnstileRef = useRef(null);

  useEffect(() => {
    // Render Turnstile widget when script loads
    const renderTurnstile = () => {
      if (window.turnstile && turnstileRef.current) {
        window.turnstile.render(turnstileRef.current, {
          sitekey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
          callback: (token) => setCaptchaToken(token),
          'error-callback': () => setError('CAPTCHA verification failed. Please try again.'),
        });
      }
    };

    if (window.turnstile) {
      renderTurnstile();
    } else {
      window.addEventListener('turnstile-load', renderTurnstile);
      return () => window.removeEventListener('turnstile-load', renderTurnstile);
    }
  }, []);

  useEffect(() => {
    // Reset CAPTCHA token on mode change
    setCaptchaToken('');
    if (window.turnstile && turnstileRef.current) {
      window.turnstile.reset(turnstileRef.current);
    }
  }, [mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!captchaToken) {
      setError('Please complete the CAPTCHA verification.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, captchaToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      onLogin(data.user);
    } catch (err) {
      setError(err.message);
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
            className={`auth-tab ${mode === 'login' ? 'active' : ''}`} 
            onClick={() => { setMode('login'); setError(''); }}
            role="tab"
            aria-selected={mode === 'login'}
            aria-label="Switch to login"
          >
            <LogIn size={14} /> Login
          </button>
          <button 
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
              autoFocus
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
          <div className="auth-captcha" ref={turnstileRef}></div>
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
