'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/components/LanguageContext';
import { AnimatedTabs } from '@/components/AnimatedTabs';
import {
  Send,
  HelpCircle,
  Edit3,
  Save,
  X,
  FileCode,
  Eye,
  Columns2,
  Sparkles,
  Copy,
  Check,
  AlertCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';
import DiscordMarkdown from '@/components/DiscordMarkdown';

const DISCORD_URL = 'https://discord.gg/AsvCSqP8gb';

const DEFAULT_FAQ_TEMPLATE = `# 🎮 CẨM NANG HỎI - ĐÁP (GDVN FAQ)
-# Hướng dẫn toàn diện mọi tính năng và giải đáp thắc mắc trên hệ thống GDVN

---

## 📌 1. TÀI KHOẢN, HỒ SƠ & XÁC MINH GD

> **❓ Web GDVN này là gì?**
> Cổng thông tin cộng đồng, bảng xếp hạng kỷ lục (*Demonlist, Platformer, Challenge*), hệ thống vinh danh Creator và mạng xã hội Bang hội (*Clan*) chính thức của cộng đồng Geometry Dash Việt Nam.

> **❓ Tên hiển thị (Display Name) khác gì Tên Geometry Dash (GD Username)?**
> - **Tên hiển thị:** Biệt danh trên web (có thể tùy chỉnh màu sắc, font chữ, đổi tùy thích).
> - **GD Username:** Nickname tài khoản GD trong game của bạn, dùng để đồng bộ chỉ số (*Stars, Moons, Demons*) và gán kỷ lục màn chơi.

> **❓ Tại sao hồ sơ của tôi báo "Chưa xác minh" (Unverified)?**
> Không bắt buộc để lướt web. Nhưng nếu muốn các kỷ lục cũ được gán vào tài khoản và có tên chính thức trên BXH, bạn hãy gửi bằng chứng (*link YouTube / Profile GD*) tại kênh hỗ trợ hoặc Discord để Admin cấp tích xanh xác minh.

> **❓ Tại sao Stars, Moons, Demons trên profile của tôi bằng 0 hoặc không cập nhật?**
> Hệ thống áp dụng cơ chế tự đồng bộ: Chỉ số chỉ cập nhật khi **chính bạn tự đăng nhập và xem trang cá nhân của mình**. Ngoài ra, tài khoản GD cần có thứ hạng toàn cầu (*Global Rank trong game*) và thời gian giãn cách giữa các lần đồng bộ là 5 phút.

> **❓ Làm sao để đổi avatar, ảnh bìa, màu tên, font chữ và viền phát sáng (Glow)?**
> Vào **Cài đặt (Settings)** -> tab **Trang cá nhân**. Các tính năng cao cấp như đổi màu tên Gradient, font chữ độc quyền, hiệu ứng phát sáng Neon Glow và viền RGB là đặc quyền dành cho thành viên **Supporter**.

---

## 🏆 2. BẢNG XẾP HẠNG & DANH SÁCH MÀN CHƠI

> **❓ Điểm Pt (Performance Points) là gì? Khác gì Star trong game?**
> Điểm Pt phản ánh trình độ kỹ năng thực tế khi bạn beat các màn chơi khó trên Demonlist. Điểm tổng không cộng dồn đơn thuần mà nhân trọng số lũy thừa **0.95^i**, ưu tiên chất lượng kỷ lục (*màn càng khó điểm càng cao*) thay vì cày số lượng màn dễ.

> **❓ Tôi vừa beat một Demon, tại sao trên BXH chưa có tên?**
> Bạn cần quay video quá trình chơi và nộp tại trang **Nộp Kỷ Lục (Submit)**. Sau khi Ban Quản trị kiểm duyệt hợp lệ, điểm số và thứ hạng của bạn sẽ tự động xuất hiện.

> **❓ Các danh sách màn chơi trên web khác nhau thế nào?**
> - **Classic Demonlist:** Top 1000 màn chơi truyền thống khó nhất (#1 đến #1000).
> - **Platformerlist:** Danh sách các màn chơi chế độ đi cảnh (Platformer).
> - **Challenge List:** Các màn thử thách kỹ năng ngắn, độ khó cực hạn (Wave, Ship...).
> - **VN List:** Tổng hợp các màn chơi do cộng đồng Creator Việt Nam sáng tác.

---

## 📝 3. NỘP KỶ LỤC & HƯỚNG DẪN DUYỆT (SUBMIT)

> **❓ Nộp kỷ lục cần điền những gì?**
> Bạn chọn màn chơi, nhập phần trăm hoàn thành (*hoặc thời gian mili-giây với Platformer*), điền Hz/FPS, thiết bị chơi và dán link video YouTube chứng minh.

> **❓ Video bằng chứng cần đáp ứng yêu cầu gì để không bị từ chối?**
> Video phải rõ nét, liền mạch (*không cắt ghép*), quay từ màn hình chọn level đến khi hoàn thành, có tiếng bấm chuột/phím (*clicks/taps*) rõ ràng đối với các level khó. Xem chi tiết tại trang **Quy định (Guidelines)**.

---

## 🛡️ 4. HỆ THỐNG CLAN & ĐIỂM HOẠT ĐỘNG

> **❓ Clan là gì? Làm sao để tham gia?**
> Clan là bang hội nơi các người chơi cùng gắn bó và thi đua cày điểm. Bạn vào mục **Clan**, chọn Clan mình thích và bấm **Gửi đơn gia nhập**.

> **❓ Điều kiện tự lập Clan riêng là gì?**
> Bạn cần sở hữu tối thiểu **3 SP Coin** (*tương đương ít nhất 3 tháng Supporter*) hoặc thuộc nhóm Ban Quản trị.

> **❓ "Điểm hoạt động Clan" (Daily Activity Points) tính như thế nào?**
> Điểm làm mới mỗi ngày (múi giờ Việt Nam):
> - Mỗi **Star** cày thêm trong ngày: **+1 điểm**.
> - Mỗi **Moon** cày thêm trong ngày: **+1 điểm**.
> - Mỗi **Demon** cày thêm trong ngày: **+10 điểm**.
> *Lưu ý: Chỉ tính điểm cày mới trong ngày, không tính dồn số sao quá khứ. Tự động cập nhật khi bạn xem trang profile cá nhân.*

---

## 💎 5. GÓI SUPPORTER, SP COIN & ỦNG HỘ SERVER

> **❓ Gói Supporter là gì? Làm sao để ủng hộ?**
> Gói ủng hộ duy trì chi phí máy chủ và vận hành website. Bạn vào trang **Ủng Hộ (Support)**, chọn gói và quét mã QR chuyển khoản (hệ thống tự động kích hoạt sau 30 giây qua cổng SePay).

> **❓ Đặc quyền dành riêng cho Supporter:**
> - Nhận huy hiệu **Trái tim Supporter** trên toàn hệ thống.
> - Tặng SP Coin để thành lập hoặc nâng cấp sức chứa Clan.
> - Mở khóa toàn bộ theme cao cấp (\`mint\`, \`peach\`, \`lavender\`...).
> - Tự do tùy biến phong cách tên: Màu Gradient, Neon Glow, Font chữ riêng.
> - Xuất hiện trong bảng vinh danh **Best Support / Hall of Fame** trên trang chủ.
`;

export default function HelpsPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<'faq' | 'submit'>('faq');
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [faqContent, setFaqContent] = useState('');
  const [faqDraft, setFaqDraft] = useState('');
  const [faqLoading, setFaqLoading] = useState(true);
  const [faqSaving, setFaqSaving] = useState(false);
  const [editingFaq, setEditingFaq] = useState(false);
  const [editMode, setEditMode] = useState<'split' | 'editor' | 'preview'>('split');

  const [saveToast, setSaveToast] = useState('');
  const [saveError, setSaveError] = useState('');
  const [copied, setCopied] = useState(false);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isAdmin =
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'MODERATOR' ||
    currentUser?.isSuperAdmin;

  const fetchFaq = () => {
    setFaqLoading(true);
    fetch('/api/faq', { cache: 'no-store' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          const val = data.content ?? data.html ?? '';
          setFaqContent(val);
          setFaqDraft(val);
        }
      })
      .catch((err) => {
        console.error('Fetch FAQ error:', err);
      })
      .finally(() => setFaqLoading(false));
  };

  useEffect(() => {
    // 1. Fetch current session user
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data?.user) setCurrentUser(data.user);
      })
      .catch(() => {
        const userStr = localStorage.getItem('gdvnc_user');
        if (userStr) {
          try {
            setCurrentUser(JSON.parse(userStr));
          } catch {}
        }
      });

    // 2. Fetch FAQ
    fetchFaq();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      setError(t('helps.need_login'));
      return;
    }
    if (!title.trim() || !content.trim()) {
      setError(t('helps.fill_all'));
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/helps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(t('helps.ok'));
        setTitle('');
        setContent('');
      } else {
        setError(data.error || t('helps.error'));
      }
    } catch {
      setError(t('helps.network'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveFaq = async () => {
    setFaqSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/faq', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: faqDraft,
          markdown: faqDraft,
          html: faqDraft,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        const saved = data.content ?? data.html ?? faqDraft;
        setFaqContent(saved);
        setFaqDraft(saved);
        setEditingFaq(false);
        setSaveToast('Đã lưu nội dung FAQ thành công!');
        setTimeout(() => setSaveToast(''), 3500);
      } else {
        setSaveError(data.error || 'Có lỗi xảy ra khi lưu FAQ.');
      }
    } catch {
      setSaveError('Không thể kết nối đến máy chủ.');
    } finally {
      setFaqSaving(false);
    }
  };

  const insertFormat = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const current = faqDraft;
    const selected = current.substring(start, end) || defaultText;
    const replacement = `${before}${selected}${after}`;
    const nextVal = current.substring(0, start) + replacement + current.substring(end);
    setFaqDraft(nextVal);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 15);
  };

  const handleCopyRaw = () => {
    navigator.clipboard.writeText(faqDraft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLoadTemplate = () => {
    if (faqDraft.trim() && !window.confirm('Nạp mẫu FAQ chuẩn sẽ thay thế nội dung đang soạn thảo hiện tại. Bạn có chắc chắn muốn nạp?')) {
      return;
    }
    setFaqDraft(DEFAULT_FAQ_TEMPLATE);
  };

  const descParts = t('helps.desc', { url: DISCORD_URL }).split(DISCORD_URL);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-20">
      {/* Toast Alert */}
      {saveToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <Sparkles className="w-4 h-4 shrink-0" />
          <span>{saveToast}</span>
        </div>
      )}

      {saveError && (
        <div className="p-3.5 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-xs flex items-center gap-2 shadow-lg animate-in fade-in">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
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
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl text-xs font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <HelpCircle className="w-3.5 h-3.5" /> GDVN Support & FAQ
            </div>
            <h1 className="text-2xl sm:text-3xl font-black drop-shadow-md text-[color:var(--text-title,#fff)]">
              {t('helps.title')}
            </h1>
            <p className="text-xs sm:text-sm font-semibold opacity-80 max-w-2xl mt-1 leading-relaxed">
              {descParts[0]}
              <a href={DISCORD_URL} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline">
                {DISCORD_URL}
              </a>
              {descParts[1] || ''}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
        <AnimatedTabs
          active={tab}
          onChange={(newTab) => setTab(newTab as any)}
          options={[
            { id: 'faq', label: t('helps.tab_faq') || 'Câu Hỏi Thường Gặp (FAQ)' },
            { id: 'submit', label: t('helps.tab_submit') || 'Gửi Yêu Cầu Hỗ Trợ' },
          ]}
        />
      </div>

      {tab === 'faq' && (
        <div className="space-y-5">
          {/* Admin Toolbar Header */}
          {isAdmin && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {editingFaq ? (
                  <>
                    <button
                      type="button"
                      onClick={saveFaq}
                      disabled={faqSaving}
                      className="px-4 py-2 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all hover:scale-105"
                      style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {faqSaving ? (t('helps.faq_saving') || 'Đang lưu…') : (t('helps.faq_save') || 'Lưu FAQ')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFaqDraft(faqContent);
                        setEditingFaq(false);
                        setSaveError('');
                      }}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold border cursor-pointer hover:bg-white/5 transition-colors"
                      style={{ borderColor: 'var(--border-ui)', color: 'var(--text-dim)' }}
                    >
                      <X className="w-3.5 h-3.5 inline mr-1" />
                      {t('common.cancel') || 'Hủy bỏ'}
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setFaqDraft(faqContent);
                      setEditingFaq(true);
                      setSaveError('');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    {t('helps.faq_edit') || 'Chỉnh sửa FAQ'}
                  </button>
                )}
              </div>

              {editingFaq && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadTemplate}
                    title="Nạp mẫu FAQ đầy đủ định dạng Discord Markdown"
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-amber-500/30 text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Nạp mẫu FAQ chuẩn
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyRaw}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold border border-white/10 hover:bg-white/5 transition-colors flex items-center gap-1.5 cursor-pointer text-zinc-300"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'Đã sao chép' : 'Sao chép Raw'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* EDITING INTERFACE */}
          {editingFaq && isAdmin ? (
            <div
              className="p-5 sm:p-6 rounded-3xl border shadow-sm space-y-4"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            >
              {/* Mode Switcher & Quick Toolbars */}
              <div
                className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                {/* View Mode Switcher */}
                <div className="flex items-center gap-1.5 p-1 rounded-xl bg-black/20 border border-white/5">
                  <button
                    type="button"
                    onClick={() => setEditMode('split')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      editMode === 'split' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: editMode === 'split' ? 'var(--accent)' : 'transparent',
                      color: editMode === 'split' ? 'var(--accent-fg)' : 'var(--text-title)',
                    }}
                  >
                    <Columns2 className="w-3.5 h-3.5" /> Chia đôi (Song song)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode('editor')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      editMode === 'editor' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: editMode === 'editor' ? 'var(--accent)' : 'transparent',
                      color: editMode === 'editor' ? 'var(--accent-fg)' : 'var(--text-title)',
                    }}
                  >
                    <FileCode className="w-3.5 h-3.5" /> Soạn thảo (Raw)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditMode('preview')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      editMode === 'preview' ? 'shadow-xs' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{
                      backgroundColor: editMode === 'preview' ? 'var(--accent)' : 'transparent',
                      color: editMode === 'preview' ? 'var(--accent-fg)' : 'var(--text-title)',
                    }}
                  >
                    <Eye className="w-3.5 h-3.5" /> Xem trước
                  </button>
                </div>

                <div className="text-[11px] ui-dim flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span>Render trực tiếp theo cú pháp Discord Markdown</span>
                </div>
              </div>

              {/* Formatting Quick Toolbar */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-2xl bg-black/10 border border-white/5 text-xs">
                <button
                  type="button"
                  onClick={() => insertFormat('# ', '', 'Tiêu đề')}
                  title="Heading 1"
                  className="px-2 py-1 rounded-md font-black hover:bg-white/10 transition-colors cursor-pointer text-zinc-300"
                >
                  H1
                </button>
                <button
                  type="button"
                  onClick={() => insertFormat('## ', '', 'Tiêu đề')}
                  title="Heading 2"
                  className="px-2 py-1 rounded-md font-black hover:bg-white/10 transition-colors cursor-pointer text-zinc-300"
                >
                  H2
                </button>
                <button
                  type="button"
                  onClick={() => insertFormat('### ', '', 'Tiêu đề')}
                  title="Heading 3"
                  className="px-2 py-1 rounded-md font-black hover:bg-white/10 transition-colors cursor-pointer text-zinc-300"
                >
                  H3
                </button>
                <span className="w-px h-4 bg-white/10 mx-1" />
                <button
                  type="button"
                  onClick={() => insertFormat('**', '**', 'in đậm')}
                  title="In đậm (Bold)"
                  className="px-2 py-1 rounded-md font-bold hover:bg-white/10 transition-colors cursor-pointer text-zinc-300"
                >
                  B
                </button>
                <button
                  type="button"
                  onClick={() => insertFormat('*', '*', 'in nghiêng')}
                  title="In nghiêng (Italic)"
                  className="px-2 py-1 rounded-md italic hover:bg-white/10 transition-colors cursor-pointer text-zinc-300"
                >
                  I
                </button>
                <button
                  type="button"
                  onClick={() => insertFormat('__', '__', 'gạch chân')}
                  title="Gạch chân (Underline)"
                  className="px-2 py-1 rounded-md underline hover:bg-white/10 transition-colors cursor-pointer text-zinc-300"
                >
                  U
                </button>
                <button
                  type="button"
                  onClick={() => insertFormat('~~', '~~', 'gạch ngang')}
                  title="Gạch ngang (Strikethrough)"
                  className="px-2 py-1 rounded-md line-through hover:bg-white/10 transition-colors cursor-pointer text-zinc-300"
                >
                  S
                </button>
                <span className="w-px h-4 bg-white/10 mx-1" />
                <button
                  type="button"
                  onClick={() => insertFormat('> ', '', 'Nội dung trích dẫn')}
                  title="Trích dẫn (Quote)"
                  className="px-2 py-1 rounded-md font-mono hover:bg-white/10 transition-colors cursor-pointer text-zinc-300"
                >
                  &gt; Quote
                </button>
                <button
                  type="button"
                  onClick={() => insertFormat('||', '||', 'spoiler')}
                  title="Nội dung ẩn (Spoiler)"
                  className="px-2 py-1 rounded-md font-mono hover:bg-white/10 transition-colors cursor-pointer text-zinc-300"
                >
                  || Spoiler
                </button>
                <button
                  type="button"
                  onClick={() => insertFormat('- ', '', 'Mục danh sách')}
                  title="Gạch đầu dòng"
                  className="px-2 py-1 rounded-md hover:bg-white/10 transition-colors cursor-pointer text-zinc-300"
                >
                  • Danh sách
                </button>
                <button
                  type="button"
                  onClick={() => insertFormat('`', '`', 'code')}
                  title="Inline code"
                  className="px-2 py-1 rounded-md font-mono hover:bg-white/10 transition-colors cursor-pointer text-amber-400"
                >
                  `Code`
                </button>
                <button
                  type="button"
                  onClick={() => insertFormat('```\n', '\n```', 'code block')}
                  title="Code block"
                  className="px-2 py-1 rounded-md font-mono hover:bg-white/10 transition-colors cursor-pointer text-amber-400"
                >
                  ```Code Block```
                </button>
                <button
                  type="button"
                  onClick={() => insertFormat('\n---\n', '', '')}
                  title="Dải phân cách (Divider)"
                  className="px-2 py-1 rounded-md font-mono hover:bg-white/10 transition-colors cursor-pointer text-zinc-300"
                >
                  --- Divider
                </button>
              </div>

              {/* Editor & Preview Panels */}
              {editMode === 'split' ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 min-h-[460px]">
                  {/* Left: Raw Textarea */}
                  <div className="space-y-1.5 flex flex-col">
                    <div className="text-[11px] uppercase font-bold ui-dim flex items-center justify-between">
                      <span>Soạn thảo Raw Markdown:</span>
                      <span className="font-mono text-[10px]">{faqDraft.length.toLocaleString()} ký tự</span>
                    </div>
                    <textarea
                      ref={textareaRef}
                      value={faqDraft}
                      onChange={(e) => setFaqDraft(e.target.value)}
                      placeholder="Nhập nội dung FAQ bằng Discord Markdown..."
                      rows={22}
                      className="w-full flex-1 px-4 py-3 rounded-2xl border text-xs sm:text-sm font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-sky-500 resize-y min-h-[400px]"
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        borderColor: 'var(--border-ui)',
                        color: 'var(--text-title)',
                      }}
                    />
                  </div>

                  {/* Right: Live Preview */}
                  <div className="space-y-1.5 flex flex-col">
                    <div className="text-[11px] uppercase font-bold text-sky-400 flex items-center justify-between">
                      <span>Xem trước thời gian thực:</span>
                      <span className="text-[10px] ui-dim">Live preview</span>
                    </div>
                    <div
                      className="flex-1 p-5 rounded-2xl border overflow-y-auto max-h-[580px] min-h-[400px]"
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      {faqDraft.trim() ? (
                        <DiscordMarkdown content={faqDraft} />
                      ) : (
                        <div className="text-xs ui-dim italic p-4 text-center">
                          Chưa có nội dung để xem trước. Nhập mã markdown bên trái để xem kết quả.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : editMode === 'editor' ? (
                <div className="space-y-1.5">
                  <div className="text-[11px] uppercase font-bold ui-dim flex items-center justify-between">
                    <span>Soạn thảo Raw Markdown:</span>
                    <span className="font-mono text-[10px]">{faqDraft.length.toLocaleString()} ký tự</span>
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={faqDraft}
                    onChange={(e) => setFaqDraft(e.target.value)}
                    placeholder="Nhập nội dung FAQ bằng Discord Markdown..."
                    rows={22}
                    className="w-full px-4 py-3 rounded-2xl border text-xs sm:text-sm font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-sky-500 resize-y min-h-[440px]"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border-ui)',
                      color: 'var(--text-title)',
                    }}
                  />
                </div>
              ) : (
                <div
                  className="p-6 sm:p-8 rounded-2xl border min-h-[350px]"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <div className="text-[11px] uppercase font-bold ui-dim mb-4 pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    Bản xem trước trực tiếp:
                  </div>
                  {faqDraft.trim() ? (
                    <DiscordMarkdown content={faqDraft} />
                  ) : (
                    <div className="text-xs ui-dim italic">Chưa có nội dung để xem trước.</div>
                  )}
                </div>
              )}

              {/* Bottom Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setFaqDraft(faqContent);
                    setEditingFaq(false);
                    setSaveError('');
                  }}
                  disabled={faqSaving}
                  className="px-4 py-2 rounded-xl text-xs font-bold border cursor-pointer hover:bg-white/5 transition-colors"
                  style={{ borderColor: 'var(--border-ui)', color: 'var(--text-dim)' }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={saveFaq}
                  disabled={faqSaving}
                  className="px-5 py-2.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all hover:scale-105"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  <Save className="w-3.5 h-3.5" />
                  {faqSaving ? 'Đang lưu…' : 'Lưu FAQ'}
                </button>
              </div>
            </div>
          ) : faqLoading ? (
            <div
              className="p-12 rounded-3xl border text-center text-xs ui-dim"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            >
              Đang tải nội dung FAQ...
            </div>
          ) : faqContent.trim() ? (
            /* Discord Markdown FAQ Presentation View (Styled like Guidelines) */
            <div
              className="p-6 sm:p-8 rounded-3xl border shadow-sm leading-relaxed"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            >
              <DiscordMarkdown content={faqContent} />
            </div>
          ) : (
            <div
              className="p-10 rounded-3xl border text-center space-y-3"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            >
              <div className="text-sm ui-dim">{t('helps.faq_empty') || 'Chưa có nội dung FAQ.'}</div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setFaqDraft(DEFAULT_FAQ_TEMPLATE);
                    setEditingFaq(true);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Nạp mẫu FAQ chuẩn ngay
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'submit' && (
        <div className="ui-card p-6 sm:p-8 rounded-3xl shadow-xl max-w-2xl border" style={{ borderColor: 'var(--border-ui)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase ui-dim mb-2">{t('helps.field_title')}</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t('helps.title_ph')}
                disabled={!currentUser || isSubmitting}
                className="w-full px-4 py-3 rounded-xl border text-sm font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase ui-dim mb-2">{t('helps.field_content')}</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t('helps.content_ph')}
                disabled={!currentUser || isSubmitting}
                rows={6}
                className="w-full px-4 py-3 rounded-xl border text-sm font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/50 resize-y"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
              />
            </div>
            {error && (
              <div className="text-red-500 text-sm font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20">{error}</div>
            )}
            {success && (
              <div className="text-emerald-500 text-sm font-bold bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                {success}
              </div>
            )}
            <button
              type="submit"
              disabled={!currentUser || isSubmitting}
              className="w-full py-3 rounded-xl text-sm font-black transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
            >
              {isSubmitting ? t('helps.submitting') : t('helps.submit')}
              <Send className="w-4 h-4" />
            </button>
            {!currentUser && (
              <p className="text-center text-xs text-red-400 font-bold mt-2">{t('helps.need_login')}</p>
            )}
          </form>
        </div>
      )}
    </div>
  );
}
