'use client';

import React, { useState, useEffect } from 'react';
import { X, Send, Link as LinkIcon, Video, Hash, HelpCircle, Check, Loader2, Sparkles, Pencil } from 'lucide-react';
import { useToast } from '@/components/GlobalToast';
import { handleMarkdownKeyDown, handleMarkdownPaste } from '@/lib/markdownShortcuts';

interface HomePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (post: any) => void;
  onUpdated?: (post: any) => void;
  editingPost?: any | null;
}

export default function HomePostModal({
  isOpen,
  onClose,
  onCreated,
  onUpdated,
  editingPost,
}: HomePostModalProps) {
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [levelGdId, setLevelGdId] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  // Poll state
  const [enablePoll, setEnablePoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>(['', '']);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (editingPost) {
      setTitle(editingPost.title || '');
      setBody(editingPost.body || '');
      setLinkUrl(editingPost.linkUrl || '');
      setLevelGdId(editingPost.levelGdId || '');
      setVideoUrl(editingPost.videoUrl || '');
      setIsPinned(Boolean(editingPost.isPinned));
      if (editingPost.poll && Array.isArray(editingPost.poll.options)) {
        setEnablePoll(true);
        setPollQuestion(editingPost.poll.question || '');
        setPollOptions(
          editingPost.poll.options.map((o: any) => (typeof o === 'string' ? o : o.text || ''))
        );
      } else {
        setEnablePoll(false);
        setPollQuestion('');
        setPollOptions(['', '']);
      }
    } else {
      setTitle('');
      setBody('');
      setLinkUrl('');
      setLevelGdId('');
      setVideoUrl('');
      setIsPinned(false);
      setEnablePoll(false);
      setPollQuestion('');
      setPollOptions(['', '']);
    }
  }, [editingPost, isOpen]);

  if (!isOpen) return null;

  const handleAddPollOption = () => {
    if (pollOptions.length < 6) {
      setPollOptions([...pollOptions, '']);
    }
  };

  const handleOptionChange = (idx: number, val: string) => {
    const next = [...pollOptions];
    next[idx] = val;
    setPollOptions(next);
  };

  const handleRemoveOption = (idx: number) => {
    if (pollOptions.length > 2) {
      setPollOptions(pollOptions.filter((_, i) => i !== idx));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      showToast('Vui lòng nhập tiêu đề và nội dung bài viết.', 'error');
      return;
    }

    let pollPayload: any = null;
    if (enablePoll) {
      const validOpts = pollOptions.map((o) => o.trim()).filter(Boolean);
      if (validOpts.length < 2) {
        showToast('Bình chọn phải có ít nhất 2 phương án lựa chọn.', 'error');
        return;
      }
      pollPayload = {
        question: pollQuestion.trim() || title.trim(),
        options: validOpts,
      };
    }

    setSubmitting(true);
    try {
      const isEditing = Boolean(editingPost?.id);
      const url = isEditing ? `/api/home-posts/${editingPost.id}` : '/api/home-posts';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim(),
          linkUrl: linkUrl.trim() || null,
          levelGdId: levelGdId.trim() || null,
          videoUrl: videoUrl.trim() || null,
          poll: enablePoll ? pollPayload : null,
          isPinned,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || (isEditing ? 'Lỗi khi cập nhật bài viết.' : 'Lỗi khi tạo bài viết.'), 'error');
        return;
      }

      if (isEditing) {
        showToast('Cập nhật bài viết trang chủ thành công!', 'success');
        onUpdated?.(data.post);
      } else {
        showToast('Tạo bài viết trang chủ thành công!', 'success');
        onCreated(data.post);
      }
      onClose();
    } catch {
      showToast('Đã xảy ra lỗi mạng.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isEditing = Boolean(editingPost?.id);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="ui-card w-full max-w-xl rounded-2xl p-6 space-y-5 border shadow-2xl my-8 relative"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
      >
        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2 ui-title font-bold text-sm">
            {isEditing ? (
              <>
                <Pencil className="w-4 h-4 text-sky-400" />
                <span>Chỉnh Sửa Bài Viết Trang Chủ</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Tạo Bài Viết Trang Chủ (Spotlight Post)</span>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg ui-dim hover:text-white hover:bg-slate-500/20 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Title */}
          <div className="space-y-1">
            <label className="font-bold ui-title">Tiêu đề bài viết *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='Ví dụ: "Level Của Ngày Hôm Nay", "Bình chọn tính năng mới"...'
              className="w-full px-3.5 py-2.5 rounded-xl ui-input font-medium"
            />
          </div>

          {/* Body */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="font-bold ui-title">Nội dung chi tiết *</label>
              <span className="text-[10px] ui-dim">Hỗ trợ Discord Markdown</span>
            </div>
            <textarea
              rows={4}
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => handleMarkdownKeyDown(e, body, setBody)}
              onPaste={(e) => handleMarkdownPaste(e, body, setBody)}
              placeholder="Nhập nội dung chia sẻ, đánh giá màn chơi, hoặc giải thích sự kiện..."
              className="w-full px-3.5 py-2.5 rounded-xl ui-input resize-y font-sans leading-relaxed"
            />
          </div>

          {/* Attachments: Link, Level ID, Video */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border bg-slate-500/5" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="space-y-1">
              <label className="font-semibold ui-dim flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-sky-400" />
                Link đính kèm (URL)
              </label>
              <input
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg ui-input text-xs"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold ui-dim flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-amber-400" />
                ID Level Geometry Dash
              </label>
              <input
                type="text"
                value={levelGdId}
                onChange={(e) => setLevelGdId(e.target.value)}
                placeholder="Ví dụ: 105829182"
                className="w-full px-3 py-2 rounded-lg ui-input text-xs font-mono"
              />
            </div>

            <div className="space-y-1 sm:col-span-2">
              <label className="font-semibold ui-dim flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-red-400" />
                Video YouTube Embed
              </label>
              <input
                type="url"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-3 py-2 rounded-lg ui-input text-xs"
              />
            </div>
          </div>

          {/* Poll section */}
          <div className="p-3.5 rounded-xl border space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center justify-between">
              <label className="font-bold ui-title flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enablePoll}
                  onChange={(e) => setEnablePoll(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer accent-sky-500"
                />
                <HelpCircle className="w-4 h-4 text-purple-400" />
                <span>Thêm khảo sát / Bình chọn (Poll)</span>
              </label>
            </div>

            {enablePoll && (
              <div className="space-y-3 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="space-y-1">
                  <label className="font-semibold ui-dim">Câu hỏi khảo sát</label>
                  <input
                    type="text"
                    value={pollQuestion}
                    onChange={(e) => setPollQuestion(e.target.value)}
                    placeholder="Bạn thấy tính năng này như thế nào?"
                    className="w-full px-3 py-2 rounded-lg ui-input text-xs"
                  />
                </div>

                <div className="space-y-2">
                  <label className="font-semibold ui-dim">Các lựa chọn (Tối thiểu 2)</label>
                  {pollOptions.map((opt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono ui-dim w-4">{idx + 1}.</span>
                      <input
                        type="text"
                        value={opt}
                        onChange={(e) => handleOptionChange(idx, e.target.value)}
                        placeholder={`Lựa chọn ${idx + 1}`}
                        className="flex-1 px-3 py-1.5 rounded-lg ui-input text-xs"
                      />
                      {pollOptions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(idx)}
                          className="p-1.5 rounded-md text-red-400 hover:bg-red-500/10 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}
                  {pollOptions.length < 6 && (
                    <button
                      type="button"
                      onClick={handleAddPollOption}
                      className="text-xs text-sky-400 hover:underline pt-1 font-semibold cursor-pointer"
                    >
                      + Thêm lựa chọn
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Pin option */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPinned"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="w-4 h-4 rounded cursor-pointer accent-amber-500"
            />
            <label htmlFor="isPinned" className="font-semibold ui-title cursor-pointer">
              Ghim bài viết này lên trên cùng trang chủ
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl ui-dim border hover:bg-slate-500/10 transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl font-bold text-white bg-sky-500 hover:bg-sky-600 flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-sm"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isEditing ? (
                <Check className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              <span>{isEditing ? 'Lưu Thay Đổi' : 'Đăng Bài Viết'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { HomePostModal };
