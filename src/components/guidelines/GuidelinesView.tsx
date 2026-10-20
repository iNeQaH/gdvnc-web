'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  Trophy,
  Gamepad2,
  ListChecks,
  Edit3,
  Save,
  X,
  Eye,
  FileCode,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Info,
} from 'lucide-react';
import { AnimatedTabs } from '@/components/AnimatedTabs';
import DiscordMarkdown from '@/components/DiscordMarkdown';
import { GuidelineTab, getDefaultGuidelineContent } from '@/lib/guidelinesDefaults';

interface GuidelinesViewProps {
  currentTab: GuidelineTab;
}

export default function GuidelinesView({ currentTab }: GuidelinesViewProps) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [content, setContent] = useState<string>(() => getDefaultGuidelineContent(currentTab));
  const [draft, setDraft] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editTab, setEditTab] = useState<'editor' | 'preview'>('editor');
  const [saveToast, setSaveToast] = useState<string>('');

  const isAdmin = currentUser?.role === 'ADMIN';

  // Load user
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('gdvnc_user');
      if (userStr) {
        setCurrentUser(JSON.parse(userStr));
      }
    } catch {}
  }, []);

  // Fetch content from API for currentTab
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setIsEditing(false);

    fetch(`/api/guidelines?tab=${currentTab}`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.success) {
          const val = typeof data.content === 'string' ? data.content : getDefaultGuidelineContent(currentTab);
          setContent(val);
          setDraft(val);
        }
      })
      .catch(() => {
        if (!cancelled) {
          const val = getDefaultGuidelineContent(currentTab);
          setContent(val);
          setDraft(val);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentTab]);

  const handleTabChange = (tabId: string) => {
    const route = tabId === 'main' ? '/guidelines' : `/guidelines/${tabId}`;
    router.push(route);
  };

  const startEdit = () => {
    setDraft(content);
    setEditTab('editor');
    setIsEditing(true);
  };

  const cancelEdit = () => {
    setDraft(content);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/guidelines', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tab: currentTab, markdown: draft }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setContent(data.content);
        setIsEditing(false);
        setSaveToast('Đã lưu nội dung quy định thành công!');
        setTimeout(() => setSaveToast(''), 3000);
      } else {
        alert(data.error || 'Có lỗi xảy ra khi lưu.');
      }
    } catch {
      alert('Không thể kết nối đến máy chủ.');
    } finally {
      setSaving(false);
    }
  };

  const tabOptions = [
    { id: 'main', label: '📌 Trang chính' },
    { id: 'classic', label: '🏆 Classic List' },
    { id: 'challenge', label: '⚡ Challenge List' },
    { id: 'platformer', label: '🎮 Platformer List' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20">
      {/* Toast Alert */}
      {saveToast && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <Sparkles className="w-4 h-4" />
          {saveToast}
        </div>
      )}

      {/* Header Banner */}
      <div
        className="p-6 sm:p-8 rounded-3xl border relative overflow-hidden shadow-sm"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-ui)',
        }}
      >
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <BookOpen className="w-3.5 h-3.5" /> Official Guidelines
            </div>
            <h1 className="text-2xl sm:text-3xl font-black ui-title tracking-tight">
              Luật & Quy Định Geometry Dash Việt Nam
            </h1>
            <p className="text-xs sm:text-sm ui-dim max-w-2xl leading-relaxed">
              Tổng hợp tiêu chuẩn xét duyệt kỷ lục, quy định nộp tác phẩm và nguyên tắc cộng đồng GDVN.
            </p>
          </div>

          {/* Admin Edit Button */}
          {isAdmin && (
            <div className="shrink-0 flex items-center gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? 'Đang lưu…' : 'Lưu thay đổi'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    disabled={saving}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-1"
                    style={{ borderColor: 'var(--border-ui)', color: 'var(--text-dim)' }}
                  >
                    <X className="w-3.5 h-3.5" />
                    Hủy
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={startEdit}
                  className="px-4 py-2 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Sửa trang này
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
        <AnimatedTabs
          active={currentTab}
          onChange={handleTabChange}
          options={tabOptions}
        />
      </div>

      {/* Editing Area */}
      {isEditing && isAdmin ? (
        <div
          className="p-5 sm:p-6 rounded-3xl border shadow-sm space-y-4"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEditTab('editor')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  editTab === 'editor'
                    ? 'shadow-xs'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: editTab === 'editor' ? 'var(--accent)' : 'var(--bg-subtle)',
                  color: editTab === 'editor' ? 'var(--accent-fg)' : 'var(--text-title)',
                }}
              >
                <FileCode className="w-3.5 h-3.5" /> Soạn thảo (Markdown)
              </button>
              <button
                type="button"
                onClick={() => setEditTab('preview')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  editTab === 'preview'
                    ? 'shadow-xs'
                    : 'opacity-70 hover:opacity-100'
                }`}
                style={{
                  backgroundColor: editTab === 'preview' ? 'var(--accent)' : 'var(--bg-subtle)',
                  color: editTab === 'preview' ? 'var(--accent-fg)' : 'var(--text-title)',
                }}
              >
                <Eye className="w-3.5 h-3.5" /> Xem trước
              </button>
            </div>

            <div className="text-[11px] ui-dim flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Hỗ trợ cú pháp Discord Markdown: <code># H1</code>, <code>## H2</code>, <code>**in đậm**</code>, <code>||spoiler||</code>, <code>- danh sách</code></span>
            </div>
          </div>

          {editTab === 'editor' ? (
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Nhập nội dung quy định bằng cú pháp Discord Markdown..."
                rows={22}
                className="w-full px-4 py-3 rounded-2xl border text-xs sm:text-sm font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-sky-500 resize-y min-h-[420px]"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-ui)',
                  color: 'var(--text-title)',
                }}
              />
            </div>
          ) : (
            <div
              className="p-6 rounded-2xl border min-h-[300px]"
              style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}
            >
              <div className="text-[11px] uppercase font-bold ui-dim mb-3 pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                Bản xem trước trực tiếp:
              </div>
              {draft.trim() ? (
                <DiscordMarkdown content={draft} />
              ) : (
                <div className="text-xs ui-dim italic">Chưa có nội dung để xem trước.</div>
              )}
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer"
              style={{ borderColor: 'var(--border-ui)', color: 'var(--text-dim)' }}
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Đang lưu…' : 'Lưu quy định'}
            </button>
          </div>
        </div>
      ) : loading ? (
        <div
          className="p-12 rounded-3xl border text-center text-xs ui-dim"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
        >
          Đang tải nội dung quy định...
        </div>
      ) : currentTab === 'main' && !content.trim() ? (
        /* Empty Main Guidelines Page View */
        <div className="space-y-6">
          <div
            className="p-8 sm:p-10 rounded-3xl border text-center space-y-4"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
          >
            <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
              <BookOpen className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-lg mx-auto">
              <h2 className="text-lg font-black ui-title">Trang Hướng Dẫn Chung</h2>
              <p className="text-xs ui-dim leading-relaxed">
                Nội dung phần hướng dẫn chính này đang được biên soạn. Bạn có thể xem chi tiết bộ quy định dành cho từng danh sách chơi ở 3 mục bên dưới:
              </p>
            </div>

            {isAdmin && (
              <div className="inline-flex items-center gap-2 p-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-bold">
                <Info className="w-4 h-4 shrink-0" />
                <span>Bạn là Quản trị viên: Nhấn nút <b>"Sửa trang này"</b> ở góc trên để tự viết nội dung bằng Discord Markdown.</span>
              </div>
            )}
          </div>

          {/* 3 Subpage Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => handleTabChange('classic')}
              className="p-5 rounded-2xl border text-left transition-all hover:scale-[1.02] hover:border-amber-500/50 hover:shadow-lg cursor-pointer group space-y-3"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <Trophy className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 ui-dim group-hover:translate-x-1 group-hover:text-amber-400 transition-all" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-sm ui-title group-hover:text-amber-400 transition-colors">
                  GDVN Classic List
                </h3>
                <p className="text-xs ui-dim leading-relaxed">
                  Quy chuẩn xét duyệt Extreme Demon, bắt buộc Raw footage, tiếng click tách riêng, cheat indicator và ngoại lệ thời gian.
                </p>
              </div>
              <div className="text-[11px] font-bold text-amber-500 flex items-center gap-1 pt-1">
                Xem quy định <ChevronRight className="w-3 h-3" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('challenge')}
              className="p-5 rounded-2xl border text-left transition-all hover:scale-[1.02] hover:border-purple-500/50 hover:shadow-lg cursor-pointer group space-y-3"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500">
                  <ListChecks className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 ui-dim group-hover:translate-x-1 group-hover:text-purple-400 transition-all" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-sm ui-title group-hover:text-purple-400 transition-colors">
                  GDVN Challenge List
                </h3>
                <p className="text-xs ui-dim leading-relaxed">
                  Quy định màn chơi thử thách dưới 30s, hạn chế microclick/spam 10 CPS, tiêu chuẩn structure và điều kiện submit kỷ lục.
                </p>
              </div>
              <div className="text-[11px] font-bold text-purple-400 flex items-center gap-1 pt-1">
                Xem quy định <ChevronRight className="w-3 h-3" />
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('platformer')}
              className="p-5 rounded-2xl border text-left transition-all hover:scale-[1.02] hover:border-sky-500/50 hover:shadow-lg cursor-pointer group space-y-3"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            >
              <div className="flex items-center justify-between">
                <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-500">
                  <Gamepad2 className="w-5 h-5" />
                </div>
                <ChevronRight className="w-4 h-4 ui-dim group-hover:translate-x-1 group-hover:text-sky-400 transition-all" />
              </div>
              <div className="space-y-1">
                <h3 className="font-black text-sm ui-title group-hover:text-sky-400 transition-colors">
                  GDVN Platformer List
                </h3>
                <p className="text-xs ui-dim leading-relaxed">
                  Tiêu chuẩn hoàn thành Platformer từ checkpoint, cấm Pause Buffering, yêu cầu handcam cho màn chơi Extreme Demon 2P.
                </p>
              </div>
              <div className="text-[11px] font-bold text-sky-400 flex items-center gap-1 pt-1">
                Xem quy định <ChevronRight className="w-3 h-3" />
              </div>
            </button>
          </div>
        </div>
      ) : (
        /* Markdown Content View */
        <div
          className="p-6 sm:p-8 rounded-3xl border shadow-sm leading-relaxed"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
        >
          <DiscordMarkdown content={content} />
        </div>
      )}

      {/* Footer Support Note */}
      <div className="text-center py-4 border-t ui-dim text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
        Nếu có thắc mắc hoặc cần giải đáp thêm về các quy định, vui lòng liên hệ Ban Quản Trị qua mục{' '}
        <a href="/helps" className="text-sky-400 underline font-bold">
          Gửi Hỗ Trợ
        </a>{' '}
        hoặc máy chủ{' '}
        <a
          href="https://discord.gg/AsvCSqP8gb"
          target="_blank"
          rel="noreferrer"
          className="text-sky-400 underline font-bold"
        >
          Discord GDVN (15+)
        </a>
        .
      </div>
    </div>
  );
}
