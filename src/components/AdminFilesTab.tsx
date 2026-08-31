'use client';

import { useEffect, useState } from 'react';
import { FolderOpen, RefreshCw, Trash2 } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';

type StoredFile = {
  key: string;
  name: string;
  size: number;
  status: string;
  uploadedAt: number;
  url: string;
};

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminFilesTab() {
  const { t } = useLanguage();
  const { showToast, showConfirm } = useToast();
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [usage, setUsage] = useState<{ totalBytes?: number; limitBytes?: number; filesUploaded?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/files');
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || t('admin.files_fail'), 'error');
        return;
      }
      setFiles(data.files || []);
      setUsage(data.usage || null);
    } catch {
      showToast(t('admin.files_fail'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const remove = (file: StoredFile) => {
    showConfirm(t('admin.files_delete_confirm', { name: file.name }), async () => {
      setBusy(file.key);
      try {
        const res = await fetch('/api/admin/files', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: file.key }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          showToast(data.error || t('admin.files_fail'), 'error');
          return;
        }
        setFiles((prev) => prev.filter((item) => item.key !== file.key));
        showToast(t('admin.files_deleted'), 'success');
      } finally {
        setBusy(null);
      }
    });
  };

  return (
    <div className="ui-card p-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black flex items-center gap-2">
            <FolderOpen className="w-5 h-5" />
            {t('admin.files_title')}
          </h2>
          <p className="text-xs ui-dim mt-1 max-w-xl">{t('admin.files_desc')}</p>
          {usage && (
            <p className="text-[11px] ui-dim mt-2">
              {t('admin.files_usage', {
                used: formatBytes(usage.totalBytes || 0),
                limit: formatBytes(usage.limitBytes || 0),
                n: String(usage.filesUploaded || files.length),
              })}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          style={{ borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {t('admin.files_refresh')}
        </button>
      </div>

      {loading ? (
        <p className="text-xs ui-dim">{t('common.loading')}</p>
      ) : files.length === 0 ? (
        <p className="text-xs ui-dim">{t('admin.files_empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left ui-dim border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <th className="py-2 pr-3 font-bold">{t('admin.files_preview')}</th>
                <th className="py-2 pr-3 font-bold">{t('admin.files_name')}</th>
                <th className="py-2 pr-3 font-bold">{t('admin.files_size')}</th>
                <th className="py-2 pr-3 font-bold">{t('admin.files_date')}</th>
                <th className="py-2 font-bold" />
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <tr key={file.key} className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <td className="py-2 pr-3">
                    <a href={file.url} target="_blank" rel="noreferrer">
                      <img src={file.url} alt="" className="w-12 h-12 rounded-lg object-cover border" style={{ borderColor: 'var(--border-ui)' }} />
                    </a>
                  </td>
                  <td className="py-2 pr-3">
                    <a href={file.url} target="_blank" rel="noreferrer" className="font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                      {file.name}
                    </a>
                  </td>
                  <td className="py-2 pr-3 ui-dim">{formatBytes(file.size)}</td>
                  <td className="py-2 pr-3 ui-dim">
                    {file.uploadedAt ? new Date(file.uploadedAt).toLocaleString() : '—'}
                  </td>
                  <td className="py-2 text-right">
                    <button
                      type="button"
                      disabled={busy === file.key}
                      onClick={() => remove(file)}
                      className="p-1.5 rounded-lg ui-dim hover:text-red-500 cursor-pointer disabled:opacity-50"
                      title={t('admin.files_delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
