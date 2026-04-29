'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import {
  Search, HardDrive, Upload, Download, Trash2, X, ChevronLeft, ChevronRight,
  Image, Film, Music, FileText, Archive, Code, File, AlertTriangle,
  CheckCircle2, Loader2, LogOut, User, Grid, List, Play,
} from 'lucide-react';
import { uploadFile, getFiles, deleteFile, getDownloadUrl, formatFileSize, getFileCategory, timeAgo } from '@/lib/client-api';
import AuthForm from './components/AuthForm';
import InstallBanner from './components/InstallBanner';

const iconMap = { image: Image, video: Film, audio: Music, document: FileText, archive: Archive, code: Code, default: File };

// ===== AUTH WRAPPER =====
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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0a0a12' }}>
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

// ===== DASHBOARD =====
function Dashboard({ user, onLogout }) {
  const [files, setFiles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [stats, setStats] = useState({ totalFiles: 0, totalSize: 0 });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [viewMode, setViewMode] = useState('gallery'); // gallery | list
  const [loading, setLoading] = useState(true);

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');
  const [statusLog, setStatusLog] = useState([]);
  const uploadLock = useRef(false);

  const [previewFile, setPreviewFile] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFiles = useCallback(async (page = 1) => {
    try {
      setLoading(true);
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
      await uploadFile(file, (pct, msg) => {
        setUploadProgress(pct);
        if (msg) setStatusLog(prev => [...prev, { message: msg, type: pct >= 100 ? 'success' : 'info' }]);
      });
      toast.success(`"${file.name}" uploaded!`);
      setUploadProgress(100);
      // Instant refresh
      await fetchFiles(1);
      setUploading(false);
      uploadLock.current = false;
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
      toast.success('Deleted!');
      setDeleteTarget(null);
      fetchFiles(pagination.page);
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

  const isMedia = (mime) => mime && (mime.startsWith('image/') || mime.startsWith('video/'));

  return (
    <div className="app">
      <InstallBanner />
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">⚡</div>
          <div>
            <h1 className="header-title">CLOUDVAULT</h1>
            <p className="header-subtitle">Discord & Telegram Storage</p>
          </div>
        </div>
        <div className="header-right">
          <div className="header-stats">
            <div className="stat-item"><div className="stat-value">{stats.totalFiles}</div><div className="stat-label">Files</div></div>
            <div className="stat-item"><div className="stat-value">{formatFileSize(stats.totalSize)}</div><div className="stat-label">Used</div></div>
          </div>
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
        <p className="upload-title">{uploading ? 'UPLOADING...' : 'DROP FILES HERE'}</p>
        <p className="upload-subtitle">{!uploading && 'or click to browse'}</p>
        <p className="upload-hint">≤50MB → Telegram | &gt;50MB → Discord (auto-split)</p>
      </div>

      {/* Upload Progress */}
      {uploading && (
        <div className="upload-progress">
          <div className="progress-header">
            <div className="progress-name">
              {uploadProgress >= 100 ? <CheckCircle2 size={14} style={{ color: 'var(--success)' }} /> : <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              <span style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadFileName}</span>
            </div>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{uploadProgress}%</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${uploadProgress}%`, background: uploadProgress >= 100 ? 'var(--success)' : undefined }} /></div>
          {statusLog.length > 0 && (
            <div className="status-log">
              {statusLog.map((l, i) => <div key={i} className={`status-log-item ${l.type}`}>{l.type === 'success' ? '✅' : l.type === 'error' ? '❌' : '⏳'} {l.message}</div>)}
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
          <button className={`view-btn ${viewMode === 'gallery' ? 'active' : ''}`} onClick={() => setViewMode('gallery')} title="Gallery"><Grid size={16} /></button>
          <button className={`view-btn ${viewMode === 'list' ? 'active' : ''}`} onClick={() => setViewMode('list')} title="List"><List size={16} /></button>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', 'discord', 'telegram'].map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? <><HardDrive size={12} /> All</> : f === 'discord' ? '🎮 Discord' : '✈️ Telegram'}
            </button>
          ))}
        </div>
      </div>

      {/* Files */}
      {loading ? (
        <div className="empty-state"><div className="spinner" style={{ margin: '0 auto 16px' }} /><p>Loading...</p></div>
      ) : files.length === 0 ? (
        <div className="empty-state">
          <File size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
          <h3 className="empty-state-title">No files yet</h3>
          <p>Upload your first file to get started!</p>
        </div>
      ) : viewMode === 'gallery' ? (
        /* ===== GALLERY VIEW ===== */
        <div className="file-gallery">
          {files.map(file => {
            const cat = getFileCategory(file.mimeType);
            const Icon = iconMap[cat] || File;
            const isImg = cat === 'image';
            const isVid = cat === 'video';

            return (
              <div key={file.id} className="gallery-item" onClick={() => setPreviewFile(file)}>
                <div className="gallery-thumb">
                  {isImg ? (
                    <img src={getDownloadUrl(file.id)} alt={file.name} loading="lazy" />
                  ) : isVid ? (
                    <>
                      <video src={getDownloadUrl(file.id)} preload="metadata" muted />
                      <div className="gallery-play"><Play size={18} /></div>
                    </>
                  ) : (
                    <div className="gallery-thumb-icon"><Icon size={40} /></div>
                  )}
                </div>
                <span className={`gallery-badge storage-badge ${file.storageType}`}>
                  {file.storageType === 'discord' ? '🎮' : '✈️'}
                </span>
                <div className="gallery-info">
                  <div className="gallery-name" title={file.name}>{file.name}</div>
                  <div className="gallery-meta">
                    <span>{formatFileSize(file.size)}</span>
                    <span>{timeAgo(file.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ===== LIST VIEW ===== */
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
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Page {pagination.page}/{pagination.totalPages}</span>
          <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchFiles(pagination.page + 1)}><ChevronRight size={14} /></button>
        </div>
      )}

      {/* Preview Modal */}
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
                <video controls className="preview-video" preload="metadata"><source src={getDownloadUrl(previewFile.id)} type={previewFile.mimeType} /></video>
              ) : getFileCategory(previewFile.mimeType) === 'audio' ? (
                <audio controls className="preview-audio"><source src={getDownloadUrl(previewFile.id)} type={previewFile.mimeType} /></audio>
              ) : (
                <div className="preview-file-info">
                  <File size={64} style={{ color: 'var(--text-muted)' }} />
                  <div className="preview-file-type">{previewFile.mimeType || 'Unknown File'}</div>
                  <div className="preview-detail-row"><span className="preview-detail-label">Name</span><span className="preview-detail-value">{previewFile.name}</span></div>
                  <div className="preview-detail-row"><span className="preview-detail-label">Size</span><span className="preview-detail-value">{formatFileSize(previewFile.size)}</span></div>
                  <div className="preview-detail-row"><span className="preview-detail-label">Type</span><span className="preview-detail-value">{previewFile.mimeType}</span></div>
                </div>
              )}
            </div>
            <div className="preview-footer">
              <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); setDeleteTarget(previewFile); setPreviewFile(null); }} style={{ marginRight: 8 }}><Trash2 size={14} /> Delete</button>
              <a href={getDownloadUrl(previewFile.id)} className="btn btn-primary" download><Download size={14} /> Download</a>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
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
              <button className="btn btn-primary" onClick={handleDelete} disabled={deleting} style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}>
                {deleting ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Deleting...</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
