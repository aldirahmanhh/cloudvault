'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LogIn, UserPlus, Loader2, RefreshCw, ArrowLeft, ShieldCheck, KeyRound } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const SECURITY_QUESTION_KEYS = [
  { en: 'What was the name of your first pet?', id: 'Nama hewan peliharaan pertama kamu?' },
  { en: 'In what city were you born?', id: 'Kamu lahir di kota apa?' },
  { en: "What is your mother's maiden name?", id: 'Nama gadis ibu kamu?' },
  { en: 'What was the name of your first school?', id: 'Nama sekolah pertama kamu?' },
  { en: 'What is your favorite book?', id: 'Buku favorit kamu?' },
  { en: 'What was your childhood nickname?', id: 'Nama panggilan waktu kecil?' },
];

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
      Math.random() * width, Math.random() * height,
      Math.random() * width, Math.random() * height,
      Math.random() * width, Math.random() * height
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
  const { t, lang } = useTranslation();
  const [view, setView] = useState('login'); // login | register | forgot-username | forgot-answer | forgot-reset | forgot-done
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [challenge, setChallenge] = useState('');
  const [challengeToken, setChallengeToken] = useState('');
  const [answer, setAnswer] = useState('');
  const [loadingChallenge, setLoadingChallenge] = useState(false);
  const captchaCanvasRef = useRef(null);

  // Security questions for register
  const [securityQuestions, setSecurityQuestions] = useState([
    { question: '', answer: '' },
    { question: '', answer: '' },
  ]);

  // Forgot password state
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotQuestions, setForgotQuestions] = useState([]);
  const [forgotAnswers, setForgotAnswers] = useState([]);
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const needsCaptcha = view === 'login' || view === 'register';

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
    if (needsCaptcha) fetchChallenge();
  }, [needsCaptcha, fetchChallenge]);

  useEffect(() => {
    if (!challenge || !captchaCanvasRef.current || !needsCaptcha) return;
    drawCaptcha(captchaCanvasRef.current, challenge);
  }, [challenge, needsCaptcha]);

  const goTo = (next) => {
    setView(next);
    setError('');
  };

  const updateSecurityQuestion = (idx, field, value) => {
    setSecurityQuestions((prev) => prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q)));
  };

  const addSecurityQuestion = () => {
    if (securityQuestions.length >= 4) return;
    setSecurityQuestions((prev) => [...prev, { question: '', answer: '' }]);
  };

  const removeSecurityQuestion = (idx) => {
    if (securityQuestions.length <= 2) return;
    setSecurityQuestions((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!answer.trim()) {
      setError(t('auth.captchaPlaceholder'));
      return;
    }
    if (view === 'register') {
      for (const q of securityQuestions) {
        if (!q.question || !q.answer.trim() || q.answer.trim().length < 2) {
          setError(lang === 'id' ? 'Semua pertanyaan keamanan wajib diisi' : 'All security questions are required');
          return;
        }
      }
      const seen = new Set();
      for (const q of securityQuestions) {
        if (seen.has(q.question)) {
          setError(lang === 'id' ? 'Pertanyaan keamanan tidak boleh sama' : 'Security questions must be unique');
          return;
        }
        seen.add(q.question);
      }
    }

    setLoading(true);
    try {
      const body = { username, password, captchaToken: challengeToken, captchaAnswer: answer };
      if (view === 'register') body.securityQuestions = securityQuestions;
      const res = await fetch(view === 'login' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  const handleForgotUsername = async (e) => {
    e.preventDefault();
    setError('');
    if (!forgotUsername.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: forgotUsername.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      if (!data.found || !data.questions || data.questions.length === 0) {
        setError(lang === 'id' ? 'Akun tidak ditemukan atau tidak punya pertanyaan keamanan' : 'Account not found or has no security questions');
        return;
      }
      setForgotQuestions(data.questions);
      setForgotAnswers(data.questions.map(() => ''));
      goTo('forgot-answer');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotAnswer = async (e) => {
    e.preventDefault();
    setError('');
    if (forgotAnswers.some((a) => !a.trim())) {
      setError(lang === 'id' ? 'Semua jawaban wajib diisi' : 'All answers required');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/verify-security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: forgotUsername, answers: forgotAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setResetToken(data.resetToken);
      goTo('forgot-reset');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotReset = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 4) {
      setError(t('auth.passwordHint'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(lang === 'id' ? 'Password tidak cocok' : 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      goTo('forgot-done');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetToLogin = () => {
    setForgotUsername('');
    setForgotQuestions([]);
    setForgotAnswers([]);
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    goTo('login');
  };

  // Forgot views
  if (view.startsWith('forgot')) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-logo"><img src="/logo.png" alt="CloudVault" width={32} height={32} /></div>
          <h1 className="auth-title">{t('auth.forgotTitle')}</h1>
          <p className="auth-subtitle">
            {view === 'forgot-username' && t('auth.forgotStep1')}
            {view === 'forgot-answer' && t('auth.forgotStep2')}
            {view === 'forgot-reset' && t('auth.forgotStep3')}
            {view === 'forgot-done' && t('auth.resetSuccess')}
          </p>

          {view === 'forgot-username' && (
            <form onSubmit={handleForgotUsername} className="auth-form">
              <div className="auth-field">
                <label htmlFor="fu">{t('auth.username')}</label>
                <input id="fu" type="text" value={forgotUsername} onChange={(e) => setForgotUsername(e.target.value)} required minLength={3} autoFocus />
              </div>
              {error && <div className="auth-error" role="alert">⚠️ {error}</div>}
              <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                {t('common.next')}
              </button>
              <button type="button" className="auth-link-btn auth-back-btn" onClick={resetToLogin}>
                <ArrowLeft size={12} /> {t('auth.backToLogin')}
              </button>
            </form>
          )}

          {view === 'forgot-answer' && (
            <form onSubmit={handleForgotAnswer} className="auth-form">
              {forgotQuestions.map((q, i) => (
                <div className="auth-field" key={i}>
                  <label>{q}</label>
                  <input
                    type="text"
                    value={forgotAnswers[i] || ''}
                    onChange={(e) => setForgotAnswers((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))}
                    required
                    autoComplete="off"
                  />
                </div>
              ))}
              {error && <div className="auth-error" role="alert">⚠️ {error}</div>}
              <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                <ShieldCheck size={14} /> {t('common.confirm')}
              </button>
              <button type="button" className="auth-link-btn auth-back-btn" onClick={() => goTo('forgot-username')}>
                <ArrowLeft size={12} /> {t('common.back')}
              </button>
            </form>
          )}

          {view === 'forgot-reset' && (
            <form onSubmit={handleForgotReset} className="auth-form">
              <div className="auth-field">
                <label htmlFor="np">{t('auth.newPassword')}</label>
                <input id="np" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={4} autoComplete="new-password" />
              </div>
              <div className="auth-field">
                <label htmlFor="cp">{t('auth.confirmPassword')}</label>
                <input id="cp" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={4} autoComplete="new-password" />
              </div>
              {error && <div className="auth-error" role="alert">⚠️ {error}</div>}
              <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
                {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
                <KeyRound size={14} /> {t('common.save')}
              </button>
            </form>
          )}

          {view === 'forgot-done' && (
            <div className="auth-form">
              <div className="auth-error" style={{ background: 'var(--success-bg)', color: 'var(--text)', borderColor: 'var(--success)' }} role="status">
                ✓ {t('auth.resetSuccess')}
              </div>
              <button type="button" className="btn btn-primary auth-submit" onClick={resetToLogin}>
                {t('auth.backToLogin')}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Login / register views
  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-logo"><img src="/logo.png" alt="CloudVault" width={32} height={32} /></div>
        <h1 className="auth-title">CloudVault</h1>
        <p className="auth-subtitle">{t('footer.tagline')}</p>

        <div className="auth-tabs" role="tablist">
          <button type="button" className={`auth-tab ${view === 'login' ? 'active' : ''}`} onClick={() => goTo('login')} role="tab" aria-selected={view === 'login'}>
            <LogIn size={14} /> {t('auth.loginTab')}
          </button>
          <button type="button" className={`auth-tab ${view === 'register' ? 'active' : ''}`} onClick={() => goTo('register')} role="tab" aria-selected={view === 'register'}>
            <UserPlus size={14} /> {t('auth.registerTab')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="username">{t('auth.username')}</label>
            <input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t('auth.usernamePlaceholder')} required minLength={3} autoComplete="username" />
          </div>
          <div className="auth-field">
            <label htmlFor="password">{t('auth.password')}</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t('auth.passwordPlaceholder')} required minLength={4} autoComplete={view === 'login' ? 'current-password' : 'new-password'} />
          </div>

          {view === 'register' && (
            <div className="security-questions-section">
              <div className="security-questions-title">{t('auth.securityQuestionsTitle')}</div>
              <div className="security-questions-hint">{t('auth.securityQuestionsHint')}</div>
              {securityQuestions.map((sq, i) => (
                <div className="security-question-row" key={i}>
                  <select value={sq.question} onChange={(e) => updateSecurityQuestion(i, 'question', e.target.value)} required>
                    <option value="">{t('auth.selectQuestion')}</option>
                    {SECURITY_QUESTION_KEYS.map((q) => (
                      <option key={q.en} value={q[lang] || q.en}>{q[lang] || q.en}</option>
                    ))}
                  </select>
                  <input type="text" value={sq.answer} onChange={(e) => updateSecurityQuestion(i, 'answer', e.target.value)} placeholder={t('auth.answer')} required minLength={2} autoComplete="off" />
                  {securityQuestions.length > 2 && (
                    <button type="button" className="security-question-remove" onClick={() => removeSecurityQuestion(i)}>
                      {t('auth.removeQuestion')}
                    </button>
                  )}
                </div>
              ))}
              {securityQuestions.length < 4 && (
                <button type="button" className="auth-link-btn" onClick={addSecurityQuestion}>
                  + {t('auth.addQuestion')}
                </button>
              )}
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="captcha">{t('auth.captchaLabel')}</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <canvas ref={captchaCanvasRef} width={200} height={50} role="img" aria-label="Math challenge image" style={{ borderRadius: '6px', border: '1px solid #ddd', background: '#f8fafc', flexShrink: 0 }} />
              <button type="button" onClick={fetchChallenge} disabled={loadingChallenge} className="btn" aria-label={t('auth.captchaRefresh')} style={{ padding: '0 12px' }}>
                <RefreshCw size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              <input id="captcha" type="text" inputMode="numeric" value={answer} onChange={(e) => setAnswer(e.target.value)} placeholder={t('auth.captchaPlaceholder')} required disabled={loadingChallenge} autoComplete="off" />
            </div>
          </div>

          {error && <div className="auth-error" role="alert">⚠️ {error}</div>}

          <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
            {loading && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
            {view === 'login' ? t('auth.loginBtn') : t('auth.registerBtn')}
          </button>

          {view === 'login' && (
            <button type="button" className="auth-link-btn" onClick={() => goTo('forgot-username')}>
              {t('auth.forgotLink')}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}
