'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Search, HardDrive, Upload, UploadCloud, Download, Trash2, X, ChevronLeft, ChevronRight, Image, Film, Music, FileText, Archive, Code, File, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import { uploadFile, getFiles, deleteFile, getDownloadUrl, formatFileSize, getFileCategory, timeAgo } from '@/lib/client-api';

const iconMap = { image: Image, video: Film, audio: Music, document: FileText, archive: Archive, code: Code, default: File };

export default function Home() {
  const [files, setFiles] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [stats, setStats] = useState({ totalFiles: 0, totalSize: 0 });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
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
      let filtered = data.files;
      if (filter !== 'all') filtered = filtered.filter(f => f.storageType === filter);
      setFiles(filtered);
      setPagination(data.pagination);
      if (data.stats) setStats(data.stats);
    } catch { toast.error('Failed to load files'); }
    finally { setLoading(false); }
  }, [search, filter]);

  useEffect(() => { const t = setTimeout(() => fetchFiles(1), 300); return () => clearTimeout(t); }, [search, filter, fetchFiles]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || uploadLock.current) return;
    uploadLock.current = true;

    setUploading(true);
    setUploadProgress(0);
    setUploadFileName(file.name);
    setStatusLog([]);

    try {
      await uploadFile(file, (pct, msg) => {
        setUploadProgress(pct);
        if (msg) setStatusLog(prev => [...prev, { message: msg, type: pct >= 100 ? 'success' : 'info' }]);
      });
      toast.success(`"${file.name}" uploaded!`);
      setTimeout(() => { setUploading(false); uploadLock.current = false; fetchFiles(1); }, 2000);
    } catch (err) {
      setStatusLog(prev => [...prev, { message: `Error: ${err.message}`, type: 'error' }]);
      toast.error(err.message);
      setTimeout(() => { setUploading(false); uploadLock.current = false; }, 3000);
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
      toast.success(`"${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
      fetchFiles(pagination.page);
    } catch { toast.error('Delete failed'); }
    finally { setDeleting(false); }
  };

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <div className="header-logo">☁️</div>
          <div>
            <h1 className="header-title">CloudVault</h1>
            <p className="header-subtitle">Discord & Telegram Storage</p>
          </div>
        </div>
        <div className="header-stats">
          <div className="stat-item"><div className="stat-value">{stats.totalFiles}</div><div className="stat-label">Files</div></div>
          <div className="stat-item"><div className="stat-value">{formatFileSize(stats.totalSize)}</div><div className="stat-label">Used</div></div>
        </div>
      </header>

      {/* Upload */}
      <div className={`upload-zone ${uploading ? '' : ''}`}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('active'); }}
        onDragLeave={(e) => e.currentTarget.classList.remove('active')}
        onDrop={handleDrop}
        onClick={() => !uploading && document.getElementById('file-input').click()}
        style={uploading ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
      >
        <input id="file-input" type="file" hidden onChange={handleUpload} />
        <div className="upload-icon"><Upload size={48} /></div>
        <p className="upload-title">{uploading ? 'Uploading...' : 'Drag & drop or click to upload'}</p>
        <p className="upload-subtitle">{!uploading && 'Any file type supported'}</p>
        <p className="upload-hint">📦 ≤50MB → Telegram | 📦 &gt;50MB → Discord (auto-split 4MB chunks)</p>
      </div>

      {uploading && (
        <div className="upload-progress">
          <div className="upload-progress-header">
            <div className="upload-progress-name">
              {uploadProgress >= 100 ? <CheckCircle2 size={16} style={{ color: 'var(--success)' }} /> : <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />}
              <span style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploadFileName}</span>
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{uploadProgress}%</span>
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
          <Search size={16} className="search-icon" />
          <input placeholder="Search files..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'discord', 'telegram'].map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? <><HardDrive size={14} /> All</> : f === 'discord' ? '🎮 Discord' : '✈️ Telegram'}
            </button>
          ))}
        </div>
      </div>

      {/* Files */}
      {loading ? (
        <div className="empty-state"><div className="spinner" style={{ margin: '0 auto 16px' }} /><p>Loading...</p></div>
      ) : files.length === 0 ? (
        <div className="empty-state"><File size={48} style={{ opacity: 0.3, marginBottom: 16 }} /><h3 className="empty-state-title">No files yet</h3><p>Upload your first file!</p></div>
      ) : (
        <div className="file-list">
          {files.map(file => {
            const cat = getFileCategory(file.mimeType);
            const Icon = iconMap[cat] || File;
            return (
              <div key={file.id} className="file-item" onClick={() => setPreviewFile(file)}>
                <div className={`file-icon ${cat}`}><Icon size={20} /></div>
                <div className="file-info">
                  <div className="file-name" title={file.name}>{file.name}</div>
                  <div className="file-meta">
                    <span>{formatFileSize(file.size)}</span>
                    <span className={`storage-badge ${file.storageType}`}>{file.storageType === 'discord' ? '🎮' : '✈️'} {file.storageType}</span>
                    <span>{timeAgo(file.createdAt)}</span>
                  </div>
                </div>
                <div className="file-actions" onClick={e => e.stopPropagation()}>
                  <a href={getDownloadUrl(file.id)} className="btn" download><Download size={16} /><span>Download</span></a>
                  <button className="btn btn-danger btn-icon" onClick={() => setDeleteTarget(file)}><Trash2 size={16} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button disabled={pagination.page <= 1} onClick={() => fetchFiles(pagination.page - 1)}><ChevronLeft size={16} /></button>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Page {pagination.page} of {pagination.totalPages}</span>
          <button disabled={pagination.page >= pagination.totalPages} onClick={() => fetchFiles(pagination.page + 1)}><ChevronRight size={16} /></button>
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
                  <File size={72} style={{ color: 'var(--text-muted)' }} />
                  <div className="preview-file-type">{previewFile.mimeType || 'Unknown'}</div>
                  <div className="preview-detail-row"><span className="preview-detail-label">Name</span><span className="preview-detail-value">{previewFile.name}</span></div>
                  <div className="preview-detail-row"><span className="preview-detail-label">Size</span><span className="preview-detail-value">{formatFileSize(previewFile.size)}</span></div>
                  <div className="preview-detail-row"><span className="preview-detail-label">Type</span><span className="preview-detail-value">{previewFile.mimeType}</span></div>
                  <div className="preview-detail-row"><span className="preview-detail-label">Storage</span><span className="preview-detail-value">{previewFile.storageType}</span></div>
                </div>
              )}
            </div>
            <div className="preview-footer">
              <a href={getDownloadUrl(previewFile.id)} className="btn btn-primary" download><Download size={16} /> Download</a>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <AlertTriangle size={24} style={{ color: 'var(--danger)' }} />
              <h3 className="modal-title">Delete File</h3>
            </div>
            <p className="modal-text">Delete <strong>"{deleteTarget.name}"</strong>? This cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleDelete} disabled={deleting} style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
