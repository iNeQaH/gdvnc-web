'use client';

import React, { useState } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { LifeBuoy, Send } from 'lucide-react';
import { useEffect } from 'react';

export default function HelpsPage() {
  const { t } = useLanguage();
  const [currentUser, setCurrentUser] = useState<any>(null);
  useEffect(() => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try { setCurrentUser(JSON.parse(userStr)); } catch {}
    }
  }, []);
  
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError('Bạn cần đăng nhập để gửi yêu cầu hỗ trợ.');
      return;
    }
    if (!title.trim() || !content.trim()) {
      setError('Vui lòng điền đầy đủ tiêu đề và nội dung.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/helps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, userId: currentUser.id })
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Đã gửi yêu cầu hỗ trợ thành công. Chúng tôi sẽ phản hồi sớm nhất có thể.');
        setTitle('');
        setContent('');
      } else {
        setError(data.error || 'Có lỗi xảy ra.');
      }
    } catch (err: any) {
      setError('Lỗi kết nối tới máy chủ.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6 space-y-6 pt-24 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}>
          <LifeBuoy className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black drop-shadow-md">Hỗ trợ / Helps</h1>
          <p className="text-sm font-semibold opacity-80 max-w-xl">
            Gửi yêu cầu hỗ trợ hoặc báo lỗi web. Discord: <a href="https://discord.gg/AsvCSqP8gb" target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">https://discord.gg/AsvCSqP8gb</a>
          </p>
        </div>
      </div>

      <div className="ui-card p-6 rounded-2xl shadow-xl max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase ui-dim mb-2">Tiêu đề</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Báo lỗi tính năng..."
              disabled={!currentUser || isSubmitting}
              className="w-full px-4 py-3 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/50"
              style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase ui-dim mb-2">Mô tả chi tiết</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Mô tả rõ vấn đề bạn đang gặp phải..."
              disabled={!currentUser || isSubmitting}
              rows={6}
              className="w-full px-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-y"
              style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
            />
          </div>

          {error && <div className="text-red-500 text-sm font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</div>}
          {success && <div className="text-emerald-500 text-sm font-bold bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">{success}</div>}

          <button
            type="submit"
            disabled={!currentUser || isSubmitting}
            className="w-full py-3 rounded-xl text-sm font-black transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
            <Send className="w-4 h-4" />
          </button>
          
          {!currentUser && (
            <p className="text-center text-xs text-red-400 font-bold mt-2">
              Bạn cần đăng nhập để gửi biểu mẫu này.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
