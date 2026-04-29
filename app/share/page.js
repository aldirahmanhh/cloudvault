'use client';

import { useState, useEffect } from 'react';
import { Upload, CheckCircle2, Loader2, X, LogIn } from 'lucide-react';
import { uploadFile, formatFileSize } from '@/lib/client-api';
import toast from 'react-hot-toast';

export default function SharePage() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('');

  // Check auth
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setUser(d.user); })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  // Check for shared files via Service Worker / Share Target
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Pick up shared files from service worker cache
    const params = new URLSearchParams(window.location.search);
    const sharedParam = params.get('shared');

    if (sharedParam) {
      (async () => {
        try {
          const fileData = JSON.parse(sharedParam);
          const cache = await caches.open('share-target');
          const loadedFiles = [];

          for (const info of fileData) {
            const response = await cache.match(`/shared/${info.id}`);
            if (response) {
              const blob = await response.blob();
              const file = new File([blob], info.name || 'shared-file', { type: info.type || 'application/octet-stream' });
              loadedFiles.push(file);
              await cache.delete(`/shared/${info.id}`);
            }
          }

          if (loadedFiles.length > 0) {
            setFiles(loadedFiles);
            setStatusMsg(`${loadedFiles.length} file(s) shared`);
          }

          // Clean URL
          window.history.replaceState({}, '', '/share');
        } catch (e) {
          console.warn('Failed to load shared files:', e);
        }
      })();
    }
  }, []);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...selected]);
  };

  const handleUploadAll = async () => {
    if (!user || files.length === 0) return;
    setUploading(true);
    const uploadResults = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setStatusMsg(`Uploading ${i + 1}/${files.length}: ${file.name}`);
      setProgress(Math.round((i / files.length) * 100));

      try {
        const result = await uploadFile(file, (pct, msg) => {
          setProgress(Math.round((i / files.length) * 100 + (pct / files.length)));
          if (msg) setStatusMsg(msg);
        });
        uploadResults.push({ name: file.name, success: true, storageType: result.storageType });
      } catch (err) {
        uploadResults.push({ name: file.name, success: false, error: err.message });
      }
    }

    setResults(uploadResults);
    setProgress(100);
    setStatusMsg('Done!');
    setUploading(false);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  if (authLoading) {
    return (
      <div className="share-page">
        <div className="share-card"><div className="spinner" style={{ margin: '40px auto' }} /></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="share-page">
        <div className="share-card">
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <LogIn size={48} style={{ color: 'var(--accent)', marginBottom: 16 }} />
            <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: 8 }}>Login Required</h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: 20 }}>Login dulu untuk upload file.</p>
            <a href="/" className="btn btn-primary" style={{ display: 'inline-flex', padding: '12px 24px' }}>Go to Login</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="share-page">
      <div className="share-card">
        <div className="share-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="header-logo" style={{ width: 36, height: 36, fontSize: 18 }}>⚡</div>
            <div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20 }}>Quick Upload</h2>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Hi, {user.username}</p>
            </div>
          </div>
        </div>

        {/* File picker */}
        {results.length === 0 && (
          <>
            <div className="share-dropzone" onClick={() => document.getElementById('share-input').click()}>
              <input id="share-input" type="file" multiple hidden onChange={handleFileSelect} />
              <Upload size={32} style={{ color: 'var(--accent)', marginBottom: 8 }} />
              <p style={{ fontFamily: 'var(--font-display)', fontSize: 16 }}>
                {files.length > 0 ? `${files.length} file(s) selected` : 'Tap to select files'}
              </p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="share-files">
                {files.map((file, i) => (
                  <div key={i} className="share-file-item">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatFileSize(file.size)}</div>
                    </div>
                    {!uploading && (
                      <button className="btn btn-icon" onClick={() => removeFile(i)}><X size={14} /></button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Upload button */}
            {files.length > 0 && !uploading && (
              <button className="btn btn-primary" onClick={handleUploadAll} style={{ width: '100%', padding: 14, justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 15, marginTop: 12 }}>
                <Upload size={16} /> UPLOAD {files.length} FILE{files.length > 1 ? 'S' : ''}
              </button>
            )}

            {/* Progress */}
            {uploading && (
              <div style={{ marginTop: 16 }}>
                <div className="progress-header">
                  <span className="progress-name"><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> {statusMsg}</span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{progress}%</span>
                </div>
                <div className="progress-bar"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
              </div>
            )}
          </>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="share-results">
            <CheckCircle2 size={40} style={{ color: 'var(--success)', margin: '0 auto 12px', display: 'block' }} />
            <h3 style={{ textAlign: 'center', fontFamily: 'var(--font-display)', marginBottom: 16 }}>Upload Complete!</h3>
            {results.map((r, i) => (
              <div key={i} className="share-file-item">
                <span style={{ fontSize: 13, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.success ? '✅' : '❌'} {r.name}
                </span>
                {r.success && <span className={`storage-badge ${r.storageType}`}>{r.storageType === 'discord' ? '🎮' : '✈️'}</span>}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <a href="/" className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', padding: 12 }}>Open Dashboard</a>
              <button className="btn" onClick={() => { setResults([]); setFiles([]); setStatusMsg(''); }} style={{ flex: 1, justifyContent: 'center', padding: 12 }}>Upload More</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
