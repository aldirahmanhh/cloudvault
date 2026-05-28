'use client';

import { useState, useEffect, useCallback } from 'react';
import { LogIn, UserPlus, Loader2, RefreshCw } from 'lucide-react';

/**
 * Convert math challenge string to screen-reader friendly text.
 * "12 × 4" -> "12 times 4"
 * @param {string} c
 */
function challengeToA11y(c) {
  if (!c) return '';
  return c
    .replace(/\+/g, 'plus')
    .replace(/-/g, 'minus')
    .replace(/×/g, 'times');
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
        body: JSON.stringify({ username, password, challengeToken, answer }),
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
            <label htmlFor="captcha">
              Solve this:{' '}
              <span role="math" aria-label={loadingChallenge ? 'Loading challenge' : challengeToA11y(challenge)}>
                {loadingChallenge ? '...' : challenge}
              </span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
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
