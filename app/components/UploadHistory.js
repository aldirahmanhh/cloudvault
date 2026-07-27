'use client';

import { useEffect, useState } from 'react';
import { History, CheckCircle2, XCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { getHistory, clearHistory } from '@/lib/upload-history';
import { formatFileSize, timeAgo } from '@/lib/client-api';
import { useTranslation } from '@/lib/i18n';

export default function UploadHistory() {
  const { t } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setEntries(getHistory());
    const handler = () => setEntries(getHistory());
    window.addEventListener('cv-history-updated', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('cv-history-updated', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);

  if (entries.length === 0) return null;

  const successCount = entries.filter((e) => e.status === 'success').length;
  const failedCount = entries.length - successCount;

  return (
    <div className={`upload-history ${open ? 'open' : ''}`}>
      <button
        type="button"
        className="upload-history-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <History size={16} />
        <span className="upload-history-title">{t('history.title')}</span>
        <span className="upload-history-count">
          <span className="ok">{successCount}</span>
          {failedCount > 0 && <span className="fail">{failedCount}</span>}
        </span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {open && (
        <div className="upload-history-body">
          <ul className="upload-history-list">
            {entries.map((e) => (
              <li key={e.id} className={`upload-history-item ${e.status}`}>
                <div className="upload-history-icon">
                  {e.status === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                </div>
                <div className="upload-history-info">
                  <div className="upload-history-name" title={e.name}>{e.name}</div>
                  <div className="upload-history-meta">
                    <span>{formatFileSize(e.size)}</span>
                    <span>{timeAgo(new Date(e.timestamp).toISOString())}</span>
                    {e.storageType && (
                      <span className={`storage-tag ${e.storageType}`}>
                        {e.storageType === 'discord' ? '🎮' : '✈️'} {e.storageType}
                      </span>
                    )}
                  </div>
                  {e.status === 'failed' && e.error && (
                    <div className="upload-history-error">{e.error}</div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          <button type="button" className="upload-history-clear" onClick={clearHistory}>
            <Trash2 size={12} /> {t('history.clear')}
          </button>
        </div>
      )}
    </div>
  );
}
