'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Bell,
  Eye,
  Edit3,
  Columns,
  Save,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  FileCode,
  Quote,
  Heading1,
  Heading2,
  Heading3,
  Link2,
  EyeOff,
  List,
  Sparkles,
  ShieldAlert,
  Loader2,
  FileText,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import DiscordMarkdown from '@/components/DiscordMarkdown';
import { htmlToDiscordMarkdown } from '@/lib/htmlToDiscordMarkdown';
import { handleMarkdownKeyDown, handleMarkdownPaste } from '@/lib/markdownShortcuts';
import type { DictKey } from '@/lib/dictionaries';

const AUDIENCES = ['ALL', 'ADMIN', 'MODERATOR', 'SUPPORTER', 'USERS'] as const;

function AnnouncementEditorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');

  const { t } = useLanguage();
  const { showToast } = useToast();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<string>('ALL');
  const [usernames, setUsernames] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [error, setError] = useState('');

  // UI View Mode: 'edit' | 'preview' | 'split'
  const [viewMode, setViewMode] = useState<'edit' | 'preview' | 'split'>('split');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check auth
  useEffect(() => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        setCurrentUser(u);
      } catch {}
    }
    setAuthChecked(true);
  }, []);

  const isAdmin = currentUser?.role === 'ADMIN' || currentUser?.role === 'SUPER_ADMIN';

  // If in edit mode, load existing announcement
  useEffect(() => {
    if (!editId) return;
    const loadExisting = async () => {
      setLoadingEdit(true);
      try {
        const res = await fetch(`/api/announcements/${editId}`);
        const data = await res.json();
        if (res.ok && data.success && data.announcement) {
          const a = data.announcement;
          setTitle(a.title || '');
          setExcerpt(a.excerpt || '');
          const rawBody = a.body || '';
          const containsHtml = /<\/?(p|div|b|strong|i|em|u|h[1-6]|ul|ol|li|br|blockquote|table|pre|code)[^>]*>/i.test(rawBody);
          if (containsHtml) {
            setBody(htmlToDiscordMarkdown(rawBody));
            showToast('Đã tự động chuyển đổi định dạng HTML sang Markdown!', 'info');
          } else {
            setBody(rawBody);
          }
          setAudience(a.audience || 'ALL');
          if (Array.isArray(a.targetUserIds) && a.targetUserIds.length > 0) {
            setUsernames(a.targetUserIds.join(', '));
          }
        } else {
          setError(data.error || 'Không thể tải thông báo cần sửa.');
        }
      } catch {
        setError('Lỗi khi tải thông báo.');
      } finally {
        setLoadingEdit(false);
      }
    };
    loadExisting();
  }, [editId]);

  // Insert markdown at cursor
  const insertFormatting = (prefix: string, suffix: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = body.substring(start, end) || defaultText;

    const replacement = `${prefix}${selected}${suffix}`;
    const nextBody = body.substring(0, start) + replacement + body.substring(end);
    setBody(nextBody);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
    }, 10);
  };

  // Insert line prefix (e.g. '# ', '> ', '- ')
  const insertLinePrefix = (prefix: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    // Find the beginning of current line
    const beforeCursor = body.substring(0, start);
    const lineStartIndex = beforeCursor.lastIndexOf('\n') + 1;

    const nextBody =
      body.substring(0, lineStartIndex) + prefix + body.substring(lineStartIndex);
    setBody(nextBody);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    }, 10);
  };

  // Quick Template Injector - Clean, natural and concise
  const applyTemplate = (type: 'update' | 'event' | 'maintenance') => {
    if (type === 'update') {
      setTitle('Cập nhật hệ thống GDVN');
      setExcerpt('Các thay đổi và sửa lỗi mới nhất trên web.');
      setBody(
        `# Cập nhật hệ thống\n\nMột số thay đổi mới trên web:\n- Bổ sung phím tắt định dạng văn bản cho ô nhập thông báo.\n- Cải thiện hiển thị avatar và giao diện trang cá nhân.\n- Sửa một số lỗi hiển thị và tối ưu hiệu năng.\n\nNếu gặp lỗi trong quá trình sử dụng, các bạn hãy báo lại tại mục [Hỗ trợ](/helps).`
      );
    } else if (type === 'event') {
      setTitle('Sự kiện cộng đồng GDVN');
      setExcerpt('Thông tin thể lệ và thời gian diễn ra sự kiện.');
      setBody(
        `# Sự kiện cộng đồng\n\n- **Thời gian:** Từ ngày ... đến ngày ...\n- **Mục tiêu:** Vượt qua các level được chỉ định trong danh sách sự kiện.\n- **Yêu cầu:** Gửi video kèm clicks/taps qua trang [Nộp](/submit).\n\n### Phần thưởng\n- Top 1: Supporter 1 tháng\n- Top 2 - 3: Huy hiệu sự kiện`
      );
    } else if (type === 'maintenance') {
      setTitle('Thông báo bảo trì hệ thống');
      setExcerpt('Bảo trì máy chủ để nâng cấp hệ thống.');
      setBody(
        `# Thông báo bảo trì\n\nWebsite GDVN sẽ tạm dừng hoạt động để bảo trì và nâng cấp hệ thống:\n- **Thời gian:** 02:00 - 04:00 (ngày ...)\n- **Thời lượng dự kiến:** khoảng 2 tiếng\n\nTrong thời gian này, các tính năng nộp record và cập nhật thông tin sẽ tạm khóa. Dữ liệu tài khoản của các bạn không bị ảnh hưởng.`
      );
    }
    showToast('Đã áp dụng mẫu thông báo!');
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      setError('Vui lòng điền đầy đủ tiêu đề và nội dung.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const url = editId ? `/api/announcements/${editId}` : '/api/announcements';
      const method = editId ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          excerpt: excerpt.trim(),
          body: body.trim(),
          audience,
          usernames: audience === 'USERS' && usernames.trim() ? usernames : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Lỗi khi lưu thông báo.');
        return;
      }

      showToast(editId ? 'Đã cập nhật thông báo thành công!' : 'Đã tạo thông báo mới thành công!');
      router.push(`/announcements/${data.announcement?.id || editId || ''}`);
    } catch {
      setError('Lỗi khi lưu thông báo.');
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked || loadingEdit) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
        <span className="text-xs ui-dim">{t('common.loading')}</span>
      </div>
    );
  }

  // Permission Gate: Only Admin or Super Admin
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto py-20 text-center space-y-4">
        <div className="w-14 h-14 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto shadow-inner">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-black ui-title">Quyền Truy Cập Bị Giới Hạn</h2>
          <p className="text-xs ui-dim leading-relaxed">
            Chỉ Quản trị viên (Admin) trở lên mới có quyền tạo và chỉnh sửa thông báo của hệ thống GDVN.
          </p>
        </div>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Link
            href="/announcements"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border ui-dim hover:text-white transition-all"
            style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Về danh sách thông báo
          </Link>
          <Link
            href="/login?redirect=/announcements/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 transition-colors"
          >
            Đăng nhập tài khoản
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/announcements"
            className="p-2 rounded-xl border ui-dim hover:text-white transition-all"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-black ui-title flex items-center gap-2">
              <Bell className="w-5 h-5 text-sky-400" />
              {editId ? 'Chỉnh Sửa Thông Báo' : 'Tạo Thông Báo Mới'}
            </h1>
            <p className="text-xs ui-dim mt-0.5">
              Hỗ trợ đầy đủ Discord Markdown và xem trước trực tiếp.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Templates Buttons */}
          <div className="flex items-center gap-1 border rounded-xl p-0.5 text-xs font-bold" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}>
            <span className="px-2 text-[10px] uppercase font-black ui-dim flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" /> Mẫu:
            </span>
            <button
              type="button"
              onClick={() => applyTemplate('update')}
              className="px-2 py-1 rounded-lg text-[11px] ui-dim hover:text-white hover:bg-white/5 transition-all"
            >
              Cập nhật
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('event')}
              className="px-2 py-1 rounded-lg text-[11px] ui-dim hover:text-white hover:bg-white/5 transition-all"
            >
              Sự kiện
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('maintenance')}
              className="px-2 py-1 rounded-lg text-[11px] ui-dim hover:text-white hover:bg-white/5 transition-all"
            >
              Bảo trì
            </button>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Settings Box */}
        <div
          className="ui-card p-5 rounded-2xl border space-y-4"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Title */}
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold ui-title">
                Tiêu đề thông báo <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nhập tiêu đề thông báo..."
                className="w-full px-3.5 py-2 rounded-xl border text-sm font-semibold focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-ui)',
                  color: 'var(--text-title)',
                }}
                required
              />
            </div>

            {/* Audience */}
            <div className="space-y-1">
              <label className="text-xs font-bold ui-title">Đối tượng xem</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border text-sm font-bold focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-ui)',
                  color: 'var(--text-title)',
                }}
              >
                {AUDIENCES.map((a) => (
                  <option key={a} value={a}>
                    {t(`announce.audience.${a.toLowerCase()}` as DictKey) || a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Usernames (if USERS) */}
          {audience === 'USERS' && (
            <div className="space-y-1">
              <label className="text-xs font-bold ui-title">
                Danh sách người nhận (phân cách bằng dấu phẩy) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={usernames}
                onChange={(e) => setUsernames(e.target.value)}
                placeholder="vd: ineqah, birii, zzuuixx"
                className="w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-ui)',
                  color: 'var(--text-title)',
                }}
                required
              />
            </div>
          )}

          {/* Excerpt */}
          <div className="space-y-1">
            <label className="text-xs font-bold ui-title">Tóm tắt ngắn gọn (Hiển thị xem trước / Embed)</label>
            <input
              type="text"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Tóm tắt 1-2 câu ngắn gọn cho thẻ thông báo..."
              className="w-full px-3.5 py-2 rounded-xl border text-sm focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-ui)',
                color: 'var(--text-title)',
              }}
            />
          </div>
        </div>

        {/* Content Box with Markdown Editor & Toolbar */}
        <div
          className="ui-card rounded-2xl border overflow-hidden shadow-lg"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
        >
          {/* Top Bar: View Modes & Formatting Toolbar */}
          <div
            className="flex items-center justify-between p-2.5 border-b flex-wrap gap-2"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
          >
            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'edit'
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'ui-dim hover:text-white'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Soạn thảo</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`hidden md:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'split'
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'ui-dim hover:text-white'
                }`}
              >
                <Columns className="w-3.5 h-3.5" />
                <span>Song song</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'preview'
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'ui-dim hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Xem trước</span>
              </button>
            </div>

            {/* Markdown Toolbar */}
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={() => insertFormatting('**', '**', 'chữ đậm')}
                className="p-1.5 rounded-lg border border-white/5 hover:bg-white/10 text-white/80 hover:text-white"
                title="In đậm (**text**)"
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('*', '*', 'chữ nghiêng')}
                className="p-1.5 rounded-lg border border-white/5 hover:bg-white/10 text-white/80 hover:text-white"
                title="In nghiêng (*text*)"
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('__', '__', 'gạch chân')}
                className="p-1.5 rounded-lg border border-white/5 hover:bg-white/10 text-white/80 hover:text-white"
                title="Gạch chân (__text__)"
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('~~', '~~', 'gạch ngang')}
                className="p-1.5 rounded-lg border border-white/5 hover:bg-white/10 text-white/80 hover:text-white"
                title="Gạch ngang (~~text~~)"
              >
                <Strikethrough className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('||', '||', 'nội dung ẩn')}
                className="p-1.5 rounded-lg border border-white/5 hover:bg-white/10 text-amber-400 hover:text-amber-300"
                title="Spoiler (||text||)"
              >
                <EyeOff className="w-3.5 h-3.5" />
              </button>
              <div className="w-[1px] h-4 bg-white/10 mx-1" />
              <button
                type="button"
                onClick={() => insertLinePrefix('# ')}
                className="p-1.5 rounded-lg border border-white/5 hover:bg-white/10 text-white/80 hover:text-white font-black text-xs"
                title="Tiêu đề 1 (# )"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => insertLinePrefix('## ')}
                className="p-1.5 rounded-lg border border-white/5 hover:bg-white/10 text-white/80 hover:text-white font-black text-xs"
                title="Tiêu đề 2 (## )"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => insertLinePrefix('### ')}
                className="p-1.5 rounded-lg border border-white/5 hover:bg-white/10 text-white/80 hover:text-white font-black text-xs"
                title="Tiêu đề 3 (### )"
              >
                H3
              </button>
              <div className="w-[1px] h-4 bg-white/10 mx-1" />
              <button
                type="button"
                onClick={() => insertLinePrefix('> ')}
                className="p-1.5 rounded-lg border border-white/5 hover:bg-white/10 text-white/80 hover:text-white"
                title="Trích dẫn (> )"
              >
                <Quote className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertLinePrefix('- ')}
                className="p-1.5 rounded-lg border border-white/5 hover:bg-white/10 text-white/80 hover:text-white"
                title="Danh sách (- )"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('`', '`', 'mã inline')}
                className="p-1.5 rounded-lg border border-white/5 hover:bg-white/10 text-white/80 hover:text-white"
                title="Mã inline (`code`)"
              >
                <Code className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('```\n', '\n```', 'khối mã')}
                className="p-1.5 rounded-lg border border-white/5 hover:bg-white/10 text-white/80 hover:text-white"
                title="Khối mã (```code```)"
              >
                <FileCode className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('[', '](https://)', 'tiêu đề liên kết')}
                className="p-1.5 rounded-lg border border-white/5 hover:bg-white/10 text-sky-400 hover:text-sky-300"
                title="Chèn liên kết ([tên](url))"
              >
                <Link2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Editor & Preview Body */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-white/10 min-h-[440px]">
            {/* Editor Area */}
            {(viewMode === 'edit' || viewMode === 'split') && (
              <div className={`p-4 flex flex-col ${viewMode === 'edit' ? 'col-span-2' : ''}`}>
                <textarea
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onKeyDown={(e) => handleMarkdownKeyDown(e, body, setBody)}
                  onPaste={(e) => handleMarkdownPaste(e, body, setBody)}
                  placeholder="Nhập nội dung thông báo... Hỗ trợ phím tắt: Ctrl+B (đậm), Ctrl+I (nghiêng), Ctrl+U (gạch chân), Ctrl+K (link), bôi đen rồi paste link để tạo [text](url)..."
                  rows={18}
                  className="w-full flex-1 bg-transparent border-0 focus:outline-none font-mono text-sm leading-relaxed resize-y"
                  style={{ color: 'var(--text-title)' }}
                  required
                />
                <div className="pt-2 text-[11px] ui-dim flex items-center justify-between border-t border-white/5 flex-wrap gap-1">
                  <span>{body.length} ký tự · {body.split(/\s+/).filter(Boolean).length} từ</span>
                  <span className="text-amber-400/80 font-medium">Ctrl+B, Ctrl+I, Ctrl+U, Ctrl+K · Bôi đen + dán URL</span>
                </div>
              </div>
            )}

            {/* Preview Area */}
            {(viewMode === 'preview' || viewMode === 'split') && (
              <div
                className={`p-5 overflow-y-auto max-h-[600px] ${
                  viewMode === 'preview' ? 'col-span-2' : ''
                }`}
                style={{ backgroundColor: 'var(--bg-subtle)' }}
              >
                <div className="text-[11px] uppercase font-black ui-dim tracking-wider mb-3 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  Xem Trước Thông Báo
                </div>

                {body.trim() ? (
                  <div className="space-y-4">
                    {title && (
                      <h2 className="text-xl font-black ui-title border-b border-white/10 pb-2">
                        {title}
                      </h2>
                    )}
                    <DiscordMarkdown content={body} />
                  </div>
                ) : (
                  <div className="py-20 text-center space-y-1">
                    <FileText className="w-8 h-8 ui-dim mx-auto stroke-1" />
                    <div className="text-xs ui-dim">Chưa có nội dung xem trước. Hãy nhập nội dung ở ô bên trái!</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-xs font-semibold">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href="/announcements"
            className="px-4 py-2 rounded-xl text-xs font-bold border ui-dim hover:text-white transition-all"
            style={{ borderColor: 'var(--border-ui)' }}
          >
            Hủy bỏ
          </Link>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-extrabold text-white transition-all shadow-md cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: 'var(--accent)' }}
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{editId ? 'Cập Nhật Thông Báo' : 'Đăng Thông Báo'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewAnnouncementPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
        </div>
      }
    >
      <AnnouncementEditorContent />
    </Suspense>
  );
}
