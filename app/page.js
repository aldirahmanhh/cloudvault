'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Search, HardDrive, Upload, Download, Trash2, X, ChevronLeft, ChevronRight,
  Image, Film, Music, FileText, Archive, Code, File, AlertTriangle,
  CheckCircle2, Loader2, LogOut, User, Grid, List, Play, RefreshCw,
  Heart, Trophy, Gift,
} from 'lucide-react';
import { uploadFile, getFiles, deleteFile, getDownloadUrl, formatFileSize, getFileCategory, timeAgo } from '@/lib/client-api';
import AuthForm from './components/AuthForm';
import InstallBanner from './components/InstallBanner';

const iconMap = { image: Image, video: Film, audio: Music, document: FileText, archive: Archive, code: Code, default: File };

export default function Home() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setUser(d.user); })
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, []);

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#e8e4dc' }}>
        <div className="spinner" />
      </div>
    );
  }

  if (!user) return <AuthForm onLogin={setUser} />;

  return <Dashboard user={user} onLogout={async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
  }} />;
}

function Dashboard({ user, onLogout }) {
  const [files, setFiles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [stats, setStats] = useState({ totalFiles: 0, totalSize: 0 });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('gallery');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');
  const [statusLog, setStatusLog] = useState([]);
  const uploadLock = useRef(false);

  const [previewFile, setPreviewFile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFiles = useCallback(async (page = 1, background = false) => {
    try {
      if (background) setSyncing(true); else setLoading(true);
      const data = await getFiles(page, 20, search);
      let filtered = data.files || [];
      if (filter !== 'all') filtered = filtered.filter(f => f.storageType === filter);
      setFiles(filtered);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      if (data.stats) setStats(data.stats);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
      setSyncing(false);
    }
  }, [search, filter]);

  useEffect(() => {
    const t = setTimeout(() => fetchFiles(1), 300);
    return () => clearTimeout(t);
  }, [search, filter, fetchFiles]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || uploadLock.current) return;
    uploadLock.current = true;
    setUploading(true); setUploadProgress(0); setUploadFileName(file.name); setStatusLog([]);

    try {
      const result = await uploadFile(file, (pct, msg) => {
        setUploadProgress(pct);
        if (msg) setStatusLog(prev => [...prev, { message: msg, type: pct >= 100 ? 'success' : 'info' }]);
      });

      setFiles(prev => [result, ...prev]);
      setStats(prev => ({ ...prev, totalFiles: prev.totalFiles + 1, totalSize: prev.totalSize + file.size }));

      toast.success(`"${file.name}" uploaded!`);
      setUploadProgress(100);
      setStatusLog(prev => [...prev, { message: 'File saved! May take ~5 min to appear after page refresh.', type: 'success' }]);

      // Keep progress visible for a moment
      setTimeout(() => {
        setUploading(false);
        uploadLock.current = false;
      }, 3000);

      fetchFiles(1, true).catch(() => {});
    } catch (err) {
      setStatusLog(prev => [...prev, { message: err.message, type: 'error' }]);
      toast.error(err.message);
      setTimeout(() => { setUploading(false); uploadLock.current = false; }, 2000);
    }
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.currentTarget.classList.remove('active');
    const file = e.dataTransfer.files[0];
    if (file && !uploadLock.current) {
      const input = document.getElementById('file-input');
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteFile(deleteTarget.id);
      setFiles(prev => prev.filter(f => f.id !== deleteTarget.id));
      setStats(prev => ({ ...prev, totalFiles: prev.totalFiles - 1, totalSize: prev.totalSize - (deleteTarget.size || 0) }));
      toast.success('Deleted!');
      setDeleteTarget(null);
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="app">
      <InstallBanner />

      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo"><img src="/logo.png" alt="CloudVault" width={28} height={28} /></div>
          <div>
            <h1 className="header-title">CloudVault</h1>
            <p className="header-subtitle">Discord & Telegram Storage</p>
          </div>
        </div>
        <div className="header-right">
          <div className="stat-item"><div className="stat-value">{stats.totalFiles}</div><div className="stat-label">Files</div></div>
          <div className="stat-item"><div className="stat-value">{formatFileSize(stats.totalSize)}</div><div className="stat-label">Used</div></div>
          {syncing && <div className="sync-badge"><RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} /> Syncing</div>}
          <div className="user-badge"><User size={14} /> {user.username}</div>
          <button className="btn-logout" onClick={onLogout} title="Logout"><LogOut size={16} /></button>
        </div>
      </header>

      {/* Upload */}
      <div className="upload-zone"
        onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('active'); }}
        onDragLeave={e => e.currentTarget.classList.remove('active')}
        onDrop={handleDrop}
        onClick={() => !uploading && document.getElementById('file-input').click()}
        style={uploading ? { opacity: 0.5, pointerEvents: 'none' } : {}}
      >
        <input id="file-input" type="file" hidden onChange={handleUpload} />
        <div className="upload-icon"><Upload size={40} /></div>
        <p className="upload-title">{uploading ? 'Uploading...' : 'Drop files here'}</p>
        <p className="upload-subtitle">{!uploading && 'or click to browse'}</p>
        <p className="upload-hint">Files saved to Discord + Telegram backup (≤50MB)</p>
      </div>

      {/* Progress */}
      {uploading && (
        <div className="upload-progress">
          <div className="progress-header">
            <div className="progress-name">
              {uploadProgress >= 100 ? <CheckCircle2 size={14} style={{ color: 'var(--success)' }} /> : <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              <span style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadFileName}</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700 }}>{uploadProgress}%</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${uploadProgress}%`, background: uploadProgress >= 100 ? 'var(--success)' : undefined }} /></div>
          {statusLog.length > 0 && (
            <div className="status-log">
              {statusLog.map((l, i) => <div key={i} className={`status-log-item ${l.type}`}>{l.type === 'success' ? '✅' : l.type === 'error' ? '❌' : '→'} {l.message}</div>)}
            </div>
          )}
        </div>
      )}

      {/* Toolbar */}
      <div className="toolbar">
        <div className="search-box">
          <Search size={14} className="search-icon" />
          <input placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="view-toggle">
          <button className={`view-btn ${viewMode === 'gallery' ? 'active' : ''}`} onClick={() => setViewMode('gallery')}><Grid size={16} /></button>
          <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')}><List size={16} /></button>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'discord', 'telegram'].map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? <><HardDrive size={12} /> All</> : f === 'discord' ? '🎮 Discord' : '✈️ Telegram'}
            </button>
          ))}
        </div>
      </div>

      {/* Files */}
      {loading ? (
        <div className="empty-state"><div className="spinner" style={{ margin: '0 auto 16px' }} /><p style={{ color: 'var(--text-muted)' }}>Loading files...</p></div>
      ) : files.length === 0 ? (
        <div className="empty-state">
          <File size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
          <h3 className="empty-state-title">No files yet</h3>
          <p style={{ color: 'var(--text-muted)' }}>Upload your first file!</p>
        </div>
      ) : viewMode === 'gallery' ? (
        <div className="file-gallery">
          {files.map(file => {
            const cat = getFileCategory(file.mimeType);
            const Icon = iconMap[cat] || File;
            return (
              <div key={file.id} className="gallery-item" onClick={() => setPreviewFile(file)}>
                <div className="gallery-thumb">
                  {cat === 'image' ? (
                    <img src={getDownloadUrl(file.id)} alt={file.name} loading="lazy" />
                  ) : cat === 'video' ? (
                    <><video src={getDownloadUrl(file.id)} preload="metadata" muted /><div className="gallery-play"><Play size={18} /></div></>
                  ) : (
                    <div className="gallery-thumb-icon"><Icon size={40} /></div>
                  )}
                </div>
                <span className={`gallery-badge storage-badge ${file.storageType}`}>{file.storageType === 'discord' ? '🎮' : '✈️'}</span>
                <div className="gallery-info">
                  <div className="gallery-name" title={file.name}>{file.name}</div>
                  <div className="gallery-meta"><span>{formatFileSize(file.size)}</span><span>{timeAgo(file.createdAt)}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="file-list">
          {files.map(file => {
            const cat = getFileCategory(file.mimeType);
            const Icon = iconMap[cat] || File;
            return (
              <div key={file.id} className="file-item" onClick={() => setPreviewFile(file)}>
                <div className={`file-icon ${cat}`}><Icon size={18} /></div>
                <div className="file-info">
                  <div className="file-name" title={file.name}>{file.name}</div>
                  <div className="file-meta">
                    <span>{formatFileSize(file.size)}</span>
                    <span className={`storage-badge ${file.storageType}`}>{file.storageType === 'discord' ? '🎮' : '✈️'} {file.storageType}</span>
                    <span>{timeAgo(file.createdAt)}</span>
                  </div>
                </div>
                <div className="file-actions" onClick={e => e.stopPropagation()}>
                  <a href={getDownloadUrl(file.id)} className="btn" download><Download size={14} /><span>Download</span></a>
                  <button className="btn btn-danger btn-icon" onClick={() => setDeleteTarget(file)}><Trash2 size={14} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button disabled={pagination.page <= 1} onClick={() => fetchFiles(pagination.page - 1)}><ChevronLeft size={14} /></button>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Page {pagination.page}/{pagination.totalPages}</span>
          <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchFiles(pagination.page + 1)}><ChevronRight size={14} /></button>
        </div>
      )}

      {/* Preview */}
      {previewFile && (
        <div className="modal-overlay" onClick={() => setPreviewFile(null)}>
          <div className="preview-modal" onClick={e => e.stopPropagation()}>
            <div className="preview-header">
              <div className="preview-title-row">
                <h3 className="preview-title">{previewFile.name}</h3>
                <button className="btn btn-icon" onClick={() => setPreviewFile(null)}><X size={18} /></button>
              </div>
              <div className="preview-meta-row">
                <span>{formatFileSize(previewFile.size)}</span>
                <span className={`storage-badge ${previewFile.storageType}`}>{previewFile.storageType === 'discord' ? '🎮' : '✈️'} {previewFile.storageType}</span>
                <span>{timeAgo(previewFile.createdAt)}</span>
              </div>
            </div>
            <div className="preview-content">
              {getFileCategory(previewFile.mimeType) === 'image' ? (
                <img src={getDownloadUrl(previewFile.id)} alt={previewFile.name} className="preview-image" />
              ) : getFileCategory(previewFile.mimeType) === 'video' ? (
                <video controls className="preview-video"><source src={getDownloadUrl(previewFile.id)} type={previewFile.mimeType} /></video>
              ) : getFileCategory(previewFile.mimeType) === 'audio' ? (
                <audio controls className="preview-audio"><source src={getDownloadUrl(previewFile.id)} type={previewFile.mimeType} /></audio>
              ) : (
                <div className="preview-file-info">
                  <File size={64} style={{ color: 'var(--text-muted)' }} />
                  <div className="preview-file-type">{previewFile.mimeType || 'Unknown'}</div>
                  <div className="preview-detail-row"><span className="preview-detail-label">Name</span><span className="preview-detail-value">{previewFile.name}</span></div>
                  <div className="preview-detail-row"><span className="preview-detail-label">Size</span><span className="preview-detail-value">{formatFileSize(previewFile.size)}</span></div>
                  <div className="preview-detail-row"><span className="preview-detail-label">Type</span><span className="preview-detail-value">{previewFile.mimeType}</span></div>
                </div>
              )}
            </div>
            <div className="preview-footer">
              <button className="btn btn-danger" onClick={() => { setDeleteTarget(previewFile); setPreviewFile(null); }}><Trash2 size={14} /> Delete</button>
              <a href={getDownloadUrl(previewFile.id)} className="btn btn-primary" download><Download size={14} /> Download</a>
            </div>
          </div>
        </div>
      )}

      {/* Delete */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <AlertTriangle size={22} style={{ color: 'var(--danger)' }} />
              <h3 className="modal-title">Delete File</h3>
            </div>
            <p className="modal-text">Delete <strong>&quot;{deleteTarget.name}&quot;</strong>? This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button className="btn btn-primary" onClick={handleDelete} disabled={deleting} style={{ background: 'var(--danger)' }}>
                {deleting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sync Info */}
      {files.length > 0 && (
        <div className="sync-info">
          <p>💡 Files sync every ~5 min. New uploads appear instantly but may take a moment after page refresh.</p>
        </div>
      )}

      {/* Donate + Leaderboard */}
      <DonateSection />

      {/* Footer */}
      <footer className="footer">
        <span>CloudVault — Discord & Telegram Storage</span>
        <a href="https://trakteer.id/anrizz" target="_blank" rel="noopener" className="btn donate-btn trakteer"><Gift size={14} /> Support via Trakteer</a>
      </footer>
    </div>
  );
}

// ===== DONATE LEADERBOARD =====
function DonateSection() {
  const [supporters, setSupporters] = useState([]);
  const [total, setTotal] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch('/api/donations')
      .then(r => r.ok ? r.json() : { supporters: [] })
      .then(d => {
        setSupporters(d.supporters || []);
        setTotal(d.total || 0);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  const formatRupiah = (num) => {
    return 'Rp ' + num.toLocaleString('id-ID');
  };

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="donate-section">
      <div className="donate-header">
        <div className="donate-title-row">
          <Trophy size={20} style={{ color: '#f59e0b' }} />
          <h3 className="donate-title">Supporters</h3>
        </div>
        <a href="https://trakteer.id/anrizz" target="_blank" rel="noopener" className="btn btn-primary donate-cta">
          <Heart size={14} /> Donate
        </a>
      </div>

      {!loaded ? (
        <div style={{ textAlign: 'center', padding: 20 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : supporters.length === 0 ? (
        <div className="donate-empty">
          <p>Belum ada supporter. Jadi yang pertama! 🎉</p>
        </div>
      ) : (
        <div className="leaderboard">
          {supporters.map((s, i) => (
            <div key={i} className={`leaderboard-item ${i < 3 ? 'top' : ''}`}>
              <div className="leaderboard-rank">
                {i < 3 ? medals[i] : <span className="rank-num">{i + 1}</span>}
              </div>
              <div className="leaderboard-info">
                <div className="leaderboard-name">{s.name}</div>
                {s.lastMessage && <div className="leaderboard-msg">&quot;{s.lastMessage}&quot;</div>}
              </div>
              <div className="leaderboard-amount">{formatRupiah(s.amount)}</div>
            </div>
          ))}
        </div>
      )}

      {total > 0 && (
        <div className="donate-total">
          Total: <strong>{formatRupiah(total)}</strong> dari {supporters.length} supporter
        </div>
      )}
    </div>
  );
}
