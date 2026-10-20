'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Star, Sparkles, Moon, Sun, Medal, Play, Globe, MessageSquare, Gamepad2, ArrowLeft, Camera, Check, X, Pencil, ShieldCheck, Heart, Trash2, Hammer, User as UserIcon, Shield, Crown, Trophy, Award, Zap, Flame, Diamond, StarHalf, CheckCircle, ChevronDown, RotateCcw, UserCheck, MapPin, Edit, ShieldAlert, RefreshCw, Ban, Unlock, Lock, FileText, Save, Minus, Plus, Clock, Calendar } from 'lucide-react';

import BadgePickerModal from '@/components/BadgePickerModal';
import BadgeIcon from '@/components/BadgeIcon';
import { AnimatedTabs } from '@/components/AnimatedTabs';
import { UserDisplayName } from '@/components/UserDisplayName';
import { useLanguage } from '@/components/LanguageContext';
import { useTheme } from '@/components/ThemeProvider';
import { useToast } from '@/components/GlobalToast';
import { formatCp } from '@/lib/creatorPoints';
import { levelPath } from '@/lib/levelUrl';
import { type DictKey } from '@/lib/dictionaries';
import { isFullAdminRole, isStaffRole, isSuperAdminUser } from '@/lib/roles';
import GdUnverifiedNotice from '@/components/GdUnverifiedNotice';
import { logoutClient } from '@/lib/sessionClient';
import { calculateUserSp } from '@/lib/clanTypes';
import DeviceBadge from '@/components/DeviceBadge';
import DiscordMarkdown from '@/components/DiscordMarkdown';

const RECORD_PAGE_SIZE = 10;

function RecordPager({
  page,
  total,
  onPage,
  t,
}: {
  page: number;
  total: number;
  onPage: (p: number) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
}) {
  const pages = Math.max(1, Math.ceil(total / RECORD_PAGE_SIZE));
  if (total <= RECORD_PAGE_SIZE) return null;
  return (
    <div className="flex items-center justify-center gap-2 px-5 py-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className="px-3 py-1 rounded-xl text-[11px] font-bold border disabled:opacity-40 cursor-pointer"
        style={{ borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
      >
        {t('admin.prev')}
      </button>
      <span className="text-[11px] ui-dim font-semibold">{t('admin.page_of', { n: page, total: pages })}</span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        className="px-3 py-1 rounded-xl text-[11px] font-bold border disabled:opacity-40 cursor-pointer"
        style={{ borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
      >
        {t('admin.next')}
      </button>
    </div>
  );
}

function extractSafeFavoriteEmbedSrc(rawInput: string): { src: string; title: string } | null {
  const input = rawInput.trim();
  // If user pasted an <iframe ...> tag, extract the src="..." attribute
  let candidateUrl = input;
  if (/<iframe\b/i.test(input)) {
    const srcMatch = input.match(/\bsrc\s*=\s*(?:["']([^"']+)["']|([^\s>]+))/i);
    if (!srcMatch) return null;
    candidateUrl = (srcMatch[1] || srcMatch[2] || '').trim().replace(/&amp;/g, '&');
  }

  // 1. Check YouTube (watch, youtu.be, shorts, embed, youtube-nocookie)
  const ytMatch = candidateUrl.match(
    /(?:youtu\.be\/|(?:www\.)?youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    return {
      src: `https://www.youtube.com/embed/${ytMatch[1]}`,
      title: 'YouTube video player',
    };
  }

  // 2. Check Google Drive (file/d/<id>/view, file/d/<id>/preview, open?id=<id>, uc?id=<id>)
  const driveFileMatch =
    candidateUrl.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i) ||
    candidateUrl.match(/docs\.google\.com\/(?:file|presentation|document|spreadsheets)\/d\/([a-zA-Z0-9_-]+)/i) ||
    candidateUrl.match(/drive\.google\.com\/(?:open|uc|thumbnail)\?(?:.*&)?id=([a-zA-Z0-9_-]+)/i);
  if (driveFileMatch && driveFileMatch[1]) {
    return {
      src: `https://drive.google.com/file/d/${driveFileMatch[1]}/preview`,
      title: 'Google Drive media player',
    };
  }

  // 3. If it was an explicit <iframe>, allow other safe HTTPS embed hosts in CSP (Spotify, Vimeo)
  if (/<iframe\b/i.test(input)) {
    try {
      const parsed = new URL(candidateUrl);
      const allowedHosts = new Set([
        'www.youtube.com',
        'youtube.com',
        'www.youtube-nocookie.com',
        'drive.google.com',
        'docs.google.com',
        'player.vimeo.com',
        'open.spotify.com',
      ]);
      if (parsed.protocol === 'https:' && allowedHosts.has(parsed.hostname.toLowerCase())) {
        return {
          src: parsed.toString(),
          title: 'Embedded media player',
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}

function renderFavoriteContent(raw: string | undefined | null) {
  if (!raw || !raw.trim()) {
    return <span className="text-xs font-bold ui-dim p-4 text-center">Chưa có gì ở đây cả</span>;
  }
  const content = raw.trim();

  const safeEmbed = extractSafeFavoriteEmbedSrc(content);
  if (safeEmbed) {
    return (
      <iframe
        src={safeEmbed.src}
        title={safeEmbed.title}
        className="w-full h-full aspect-video rounded-xl border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
         referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }

  return (
    <div className="w-full h-full p-4 flex items-center justify-center text-sm font-medium text-center ui-title whitespace-pre-wrap">
      {content}
    </div>
  );
}

export default function ProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const { t, language } = useLanguage();
  const isEn = language === 'en';
  const { showConfirm, showToast } = useToast();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'classic' | 'platformer' | 'creator'>('classic');
  const [recordPage, setRecordPage] = useState(1);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { theme, setOverrideTheme, setOverrideMode, resolvedMode } = useTheme();
  const configuredProfileMode = data?.profileConfig?.profileMode;
  const isProfileDark = configuredProfileMode ? configuredProfileMode === 'dark' : resolvedMode === 'dark';
  const isDark = isProfileDark;
  const isLavender = (data?.profileTheme ? data.profileTheme === 'lavender' : theme === 'lavender');

  useEffect(() => {
    if (!data) return;
    if (typeof window !== 'undefined') {
      const overrideObj: any = {};
      if (data.profileConfig) {
        Object.assign(overrideObj, data.profileConfig);
      }
      (window as any).__profileOverride = overrideObj;
      window.dispatchEvent(new Event('gdvnc_user_update'));
    }
  }, [data?.profileConfig]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__profileOverride;
        window.dispatchEvent(new Event('gdvnc_user_update'));
      }
    };
  }, []);
  const isOwner = !!(currentUser && currentUser.username === username);
  const isStaff = isStaffRole(currentUser?.role);
  const isFullAdmin = isFullAdminRole(currentUser?.role);
  const isAdmin = isFullAdmin;
  const isSuperAdmin = isSuperAdminUser(currentUser);
  const canEditInfo = isOwner || isSuperAdmin;

  // Direct editing states
  const [saving, setSaving] = useState(false);
  const [verifyingGd, setVerifyingGd] = useState(false);

  // Super Admin Password Reset & Ban States
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReasonInput, setBanReasonInput] = useState('');
  const [banDuration, setBanDuration] = useState<'permanent' | '1' | '3' | '7' | '30' | '90' | 'custom'>('permanent');
  const [banCustomDays, setBanCustomDays] = useState<string>('14');
  const [banningUser, setBanningUser] = useState(false);

  // Image Editor Modal state
  const [show2faModal, setShow2faModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpInput, setTotpInput] = useState('');
  const [totpError, setTotpError] = useState('');
  const [settingUp2fa, setSettingUp2fa] = useState(false);

  // Admin Management States
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('USER');
  const [manageTargetType, setManageTargetType] = useState<'supporter' | 'sp_coin'>('supporter');
  const [supporterOp, setSupporterOp] = useState<'add' | 'sub'>('add');
  const [supporterAmount, setSupporterAmount] = useState<number>(0);
  const [spCoinOp, setSpCoinOp] = useState<'add' | 'sub'>('add');
  const [spCoinAmount, setSpCoinAmount] = useState<number>(0);
  const [savingAdminChanges, setSavingAdminChanges] = useState(false);
  const [badgesList, setBadgesList] = useState<any[]>([]);
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<string[]>([]);
  const [cpInput, setCpInput] = useState('');
  const [isEditingCp, setIsEditingCp] = useState(false);
  const [isEditingHardest, setIsEditingHardest] = useState(false);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [showClassicPoints, setShowClassicPoints] = useState(false);
  const [showPlatformerPoints, setShowPlatformerPoints] = useState(false);
  const [showCreatorRank, setShowCreatorRank] = useState(false);
  const [hardestInput, setHardestInput] = useState('');
  const [showBadgePicker, setShowBadgePicker] = useState(false);
  const [editingField, setEditingField] = useState<null | 'country' | 'gdUsername' | 'discordTag'>(null);
  const [fieldDraft, setFieldDraft] = useState('');

  // Delete Account States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAccountReason, setDeleteAccountReason] = useState('');
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Glitch Theme States & Effects (placed at top level to obey React Hook Rules)
  const isGlitchTheme = Boolean(data?.profileTheme ? data.profileTheme === 'glitch' : theme === 'glitch');
  const profileContainerRef = React.useRef<HTMLDivElement>(null);
  const [isCardsActive, setIsCardsActive] = useState(false);
  const [isAvatarActive, setIsAvatarActive] = useState(false);
  const [isPanelActive, setIsPanelActive] = useState(false);
  const [isTextActive, setIsTextActive] = useState(false);
  const [showAvatarJumpscare, setShowAvatarJumpscare] = useState(false);
  const [showCrossOverlay, setShowCrossOverlay] = useState(false);
  const [crossMode, setCrossMode] = useState<'box' | 'fullscreen'>('box');

  // Glitch Rhythm: 5s of COMPLETE STILLNESS, then 3s of CHAOS
  // In the 3s chaos window, each effect runs for an independent random duration of 1s to 3s
  useEffect(() => {
    if (!isGlitchTheme) {
      setIsCardsActive(false);
      setIsAvatarActive(false);
      setIsPanelActive(false);
      setIsTextActive(false);
      setShowAvatarJumpscare(false);
      setShowCrossOverlay(false);
      return;
    }

    let isMounted = true;
    const timeouts: NodeJS.Timeout[] = [];

    const scheduleTimeout = (fn: () => void, ms: number) => {
      const t = setTimeout(() => {
        if (isMounted) fn();
      }, ms);
      timeouts.push(t);
      return t;
    };

    const runLoop = () => {
      if (!isMounted) return;

      // 1. Tĩnh hoàn toàn 5 giây (5000ms)
      const calmMs = 5000;
      const chaosMs = 3000;

      scheduleTimeout(() => {
        if (!isMounted) return;

        // 2. Bắt đầu đợt hỗn loạn kéo dài 3 giây (3000ms)
        // Mỗi hiệu ứng có tỉ lệ 30% xuất hiện (thay vì tất cả cùng xuất hiện)
        const scheduleEffect = (
          setter: React.Dispatch<React.SetStateAction<boolean>>,
          customDuration?: number,
          onStart?: () => void
        ) => {
          // Tỉ lệ 30% xuất hiện thay vì tất cả cùng xuất hiện
          if (Math.random() > 0.30) return;

          // Riêng avatar lớn có customDuration ~0.1s, các hiệu ứng khác ngẫu nhiên từ 1s đến 3s
          const duration = customDuration !== undefined ? customDuration : (1000 + Math.random() * 2000);
          const maxStartOffset = Math.max(0, chaosMs - duration);
          const startOffset = Math.random() * maxStartOffset;

          scheduleTimeout(() => {
            if (onStart) onStart();
            setter(true);
          }, startOffset);

          scheduleTimeout(() => {
            setter(false);
          }, startOffset + duration);
        };

        // Kích hoạt với tỉ lệ 30% (mỗi hiệu ứng kéo dài 1s - 3s)
        scheduleEffect(setIsCardsActive);
        scheduleEffect(setIsAvatarActive);
        scheduleEffect(setIsPanelActive);
        scheduleEffect(setIsTextActive);
        // Riêng avatar lớn chỉ nháy khoảng 0.1s (~90ms - 120ms)
        scheduleEffect(setShowAvatarJumpscare, 90 + Math.random() * 30);
        // Hiệu ứng đen toàn màn hình / cây thánh giá cũng chỉ nháy nhanh 1 phát (~100ms - 130ms) chứ không duy trì lâu
        scheduleEffect(setShowCrossOverlay, 100 + Math.random() * 30, () => {
          setCrossMode(Math.random() < 0.5 ? 'box' : 'fullscreen');
        });

        // 3. Kết thúc đợt hỗn loạn sau 3s: dọn dẹp tắt hết và lặp lại chu kỳ 5s tĩnh
        scheduleTimeout(() => {
          setIsCardsActive(false);
          setIsAvatarActive(false);
          setIsPanelActive(false);
          setIsTextActive(false);
          setShowAvatarJumpscare(false);
          setShowCrossOverlay(false);
          runLoop();
        }, chaosMs);
      }, calmMs);
    };

    runLoop();

    return () => {
      isMounted = false;
      for (const t of timeouts) clearTimeout(t);
      setIsCardsActive(false);
      setIsAvatarActive(false);
      setIsPanelActive(false);
      setIsTextActive(false);
      setShowAvatarJumpscare(false);
      setShowCrossOverlay(false);
    };
  }, [isGlitchTheme]);

  // Scramble 100% of visible characters on the page during text glitch bursts, restore completely when inactive
  useEffect(() => {
    if (!isGlitchTheme || !isTextActive) return;
    const container = profileContainerRef.current;
    if (!container) return;

    const GLITCH_GLYPHS = '0123456789ABCDEF!@#$%&*?/~|\\{}[]<>øØ§¥‡◊∆¿∄╳꩜█▓▒░⚡✕⨂†††';
    const textNodes: Text[] = [];
    const originalTextMap = new Map<Text, string>();

    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (['SCRIPT', 'STYLE', 'SVG', 'NOSCRIPT', 'TEXTAREA'].includes(parent.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    let cur = walker.nextNode();
    while (cur) {
      const tn = cur as Text;
      textNodes.push(tn);
      originalTextMap.set(tn, tn.nodeValue || '');
      cur = walker.nextNode();
    }

    const mutateAll = () => {
      for (const node of textNodes) {
        if (!node.isConnected) continue;
        const orig = originalTextMap.get(node);
        if (!orig) continue;

        const scrambled = orig
          .split('')
          .map((ch) => {
            if (ch === ' ' || ch === '\n' || ch === '\t') return ch;
            return GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)];
          })
          .join('');
        node.nodeValue = scrambled;
      }
    };

    mutateAll();
    const scramblerInterval = window.setInterval(mutateAll, 35);

    return () => {
      window.clearInterval(scramblerInterval);
      for (const [node, orig] of originalTextMap.entries()) {
        if (node.isConnected) {
          node.nodeValue = orig;
        }
      }
    };
  }, [isGlitchTheme, isTextActive]);

  useEffect(() => {
    const userStr = localStorage.getItem('gdvnc_user');
    if (userStr) {
      try {
        setCurrentUser(JSON.parse(userStr));
      } catch (e) {}
    }
    if (username) {
      fetchProfile();
    }
  }, [username]);

  useEffect(() => {
    if ((showManageModal || showBadgePicker) && badgesList.length === 0) {
      fetch('/api/admin/badges')
        .then((res) => res.json())
        .then((json) => {
          if (json.success && Array.isArray(json.badges)) {
            setBadgesList(json.badges);
          }
        })
        .catch(() => {});
    }
  }, [showManageModal, showBadgePicker, badgesList.length]);

  const fetchProfile = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch(`/api/profile/${username}`, { cache: 'no-store' });
      const json = await res.json();
      if (json.success) {
        setData(json.user);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateProfileField = async (fields: { bio?: string; avatarUrl?: string; coverUrl?: string; country?: string; gdUsername?: string; discordTag?: string; profileConfig?: any; profileTheme?: string }) => {
    if (!currentUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/profile/${username}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...fields,
        }),
      });
      const resData = await res.json();
      if (resData.success) {
        const merged = resData.updated ? { ...data, ...resData.updated } : { ...data, ...fields };
        setData(merged);
        // Also update local storage if it's the current logged in user
        if (currentUser.username === username) {
          const updatedLocalUser = { ...currentUser, ...merged };
          localStorage.setItem('gdvnc_user', JSON.stringify(updatedLocalUser));
          window.dispatchEvent(new Event('gdvnc_user_update'));
        }
      } else {
        showToast(resData.error || t('profile.update_fail'), 'error');
      }
    } catch (e) {
      showToast(t('common.server_error'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const startInlineEdit = (field: 'country' | 'gdUsername' | 'discordTag', value?: string | null) => {
    if (!canEditInfo) return;
    setEditingField(field);
    setFieldDraft(value || '');
  };

  const saveInlineField = async () => {
    if (!editingField) return;
    await updateProfileField({ [editingField]: fieldDraft.trim() });
    setEditingField(null);
  };


  const handleSetup2FA = async () => {
    setSettingUp2fa(true);
    setTotpError('');
    try {
      const res = await fetch('/api/auth/2fa');
      const json = await res.json();
      if (!res.ok) {
        setTotpError(json.error || 'Failed to generate 2FA');
        return;
      }
      setQrCode(json.qrDataUrl);
      setTotpSecret(json.secret);
      setShow2faModal(true);
    } catch (e) {
      setTotpError('Server error');
    } finally {
      setSettingUp2fa(false);
    }
  };

  const handleVerify2FA = async () => {
    setSettingUp2fa(true);
    setTotpError('');
    try {
      const res = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: totpInput })
      });
      const json = await res.json();
      if (!res.ok) {
        setTotpError(json.error || 'Invalid Token');
        return;
      }
      setShow2faModal(false);
      showToast('2FA đã được bật thành công!', 'success');
      setData({ ...data, totpEnabled: true });
    } catch (e) {
      setTotpError('Server error');
    } finally {
      setSettingUp2fa(false);
    }
  };

  const handleDeleteRecord = async (recordId: string, levelName: string) => {
    showConfirm(`Bạn có chắc chắn muốn xóa kỷ lục của màn "${levelName}"?`, async () => {
      try {
        const res = await fetch(`/api/admin/records/${recordId}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ requesterId: currentUser?.id })
        });
        const resData = await res.json();
        if (resData.success) {
          showToast('Xóa thành công!', 'success');
          void fetchProfile({ silent: true });
        } else {
          showToast('Lỗi: ' + resData.error, 'error');
        }
      } catch (e) {
        showToast('Lỗi kết nối khi xóa kỷ lục.', 'error');
      }
    });
  };

  const handleDeleteWork = async (item: { id?: string; workId?: string | null; name?: string }) => {
    showConfirm(t('profile.delete_work_confirm'), async () => {
      try {
        if (item.workId) {
          const res = await fetch(`/api/admin/works/${item.workId}`, { method: 'DELETE' });
          const resData = await res.json();
          if (!res.ok || !resData.success) {
            showToast(resData.error || t('admin.action_fail'), 'error');
            return;
          }
        }
        if (item.id && !String(item.id).startsWith('work:')) {
          const res = await fetch('/api/admin/levels', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: item.id, unlinkCreator: true }),
          });
          const resData = await res.json();
          if (!res.ok || !resData.success) {
            showToast(resData.error || t('admin.action_fail'), 'error');
            return;
          }
        }
        showToast('Xóa thành công!', 'success');
        setData((prev: any) => {
          if (!prev) return prev;
          const nextLevels = (prev.createdLevels || []).filter((row: any) => {
            if (item.workId && row.workId === item.workId) return false;
            if (item.id && row.id === item.id) return false;
            return true;
          });
          return { ...prev, createdLevels: nextLevels };
        });
        void fetchProfile({ silent: true });
      } catch {
        showToast('Lỗi kết nối khi xóa tác phẩm.', 'error');
      }
    });
  };

  const handleOpenManageModal = async () => {
    if (!currentUser || !isStaff || !data) return;
    setSelectedRole(data.role);
    setManageTargetType('supporter');
    setSupporterOp('add');
    setSupporterAmount(0);
    setSpCoinOp('add');
    setSpCoinAmount(0);
    setSelectedBadgeIds((data.badges || []).map((b: any) => b.id));
    setCpInput(String(data.creatorPoints ?? 0));
    setIsEditingCp(false);
    setShowManageModal(true);
    // Fetch available badges for assigning
    if (badgesList.length === 0) {
      try {
        const res = await fetch('/api/admin/badges');
        const badgeData = await res.json();
        if (badgeData.success) setBadgesList(badgeData.badges);
      } catch (e) {}
    }
  };

  const handleSaveAdminManagement = async () => {
    if (!currentUser || !isStaff || !data) return;
    setSavingAdminChanges(true);

    try {
      const isRoleChanged = selectedRole !== data.role;
      const hasSupporterChange = supporterAmount > 0;
      const hasSpCoinChange = spCoinAmount > 0;

      if (isFullAdmin && (isRoleChanged || hasSupporterChange || hasSpCoinChange)) {
        const payload: any = {
          currentAdminUsername: currentUser.username,
        };
        if (isRoleChanged) payload.newRole = selectedRole;
        if (hasSupporterChange) {
          payload.grantSupporterMonths = supporterOp === 'add' ? supporterAmount : -supporterAmount;
        }
        if (hasSpCoinChange) {
          payload.grantSpCoin = spCoinOp === 'add' ? spCoinAmount : -spCoinAmount;
        }

        const res = await fetch(`/api/admin/users/${data.id}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const resData = await res.json();
        if (!res.ok || !resData.success) {
          showToast(resData.error || t('admin.action_fail'), 'error');
          setSavingAdminChanges(false);
          return;
        }
      }

      const currentBadgeIds = (data.badges || []).map((b: any) => b.id).sort().join(',');
      const nextBadgeIds = [...selectedBadgeIds].sort().join(',');
      if (currentBadgeIds !== nextBadgeIds) {
        const badgeRes = await fetch(`/api/admin/users/${data.id}/badges`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            badgeIds: selectedBadgeIds,
            currentAdminUsername: currentUser.username,
          }),
        });
        const badgeData = await badgeRes.json();
        if (!badgeRes.ok || !badgeData.success) {
          showToast(badgeData.error || t('admin.action_fail'), 'error');
          setSavingAdminChanges(false);
          return;
        }
      }

      if (isFullAdmin && isEditingCp) {
        const value = Number(cpInput);
        if (!Number.isFinite(value) || value < 0) {
          showToast('Creator Points không hợp lệ.', 'error');
          setSavingAdminChanges(false);
          return;
        }
        const cpRes = await fetch(`/api/admin/users/${data.id}/cp`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'set',
            creatorPoints: value,
            currentAdminUsername: currentUser.username,
          }),
        });
        const cpData = await cpRes.json();
        if (!cpRes.ok || !cpData.success) {
          showToast(cpData.error || t('admin.action_fail'), 'error');
          setSavingAdminChanges(false);
          return;
        }
      }
      
      showToast('Đã lưu thông tin quyền hạn, badge và CP!', 'success');
      setShowManageModal(false);
      fetchProfile();
    } catch (e) {
      showToast(t('common.server_error'), 'error');
    } finally {
      setSavingAdminChanges(false);
    }
  };

  const openDeleteModal = () => {
    if (!currentUser || (!isOwner && !isFullAdmin) || !data) return;
    setDeleteAccountReason('');
    setDeleteAccountPassword('');
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = async () => {
    if (!currentUser || (!isOwner && !isFullAdmin) || !data) return;
    const reason = deleteAccountReason.trim();
    if (!reason) {
      showToast('Vui lòng nhập lý do xoá tài khoản.', 'error');
      return;
    }
    setDeletingAccount(true);
    try {
      const res = await fetch(`/api/profile/${data.username}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason,
          ...(isOwner ? { password: deleteAccountPassword } : {}),
        }),
      });
      const resData = await res.json();
      if (res.ok && resData.success) {
        showToast('Đã xoá tài khoản thành công.', 'success');
        setShowDeleteModal(false);
        if (currentUser.id === data.id) {
          await logoutClient();
        }
        window.location.href = '/';
      } else {
        showToast(resData.error || t('admin.action_fail'), 'error');
      }
    } catch (e) {
      showToast(t('common.server_error'), 'error');
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleResetCp = () => {
    if (!currentUser || !isFullAdmin || !data) return;
    showConfirm(t('profile.cp_reset_confirm'), async () => {
      try {
        const res = await fetch(`/api/admin/users/${data.id}/cp`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'reset',
            currentAdminUsername: currentUser.username,
          }),
        });
        const resData = await res.json();
        if (res.ok && resData.success) {
          showToast(t('profile.cp_reset_ok'), 'success');
          setCpInput(String(resData.creatorPoints ?? 0));
          setIsEditingCp(false);
          fetchProfile();
        } else {
          showToast(resData.error || t('admin.action_fail'), 'error');
        }
      } catch (e) {
        showToast(t('common.server_error'), 'error');
      }
    });
  };

  const handleResetPassword = async () => {
    if (!currentUser || !isSuperAdmin || !data) return;
    const pwd = newPasswordInput.trim();
    if (!pwd || pwd.length < 6) {
      showToast('Mật khẩu mới phải từ 6 ký tự trở lên.', 'error');
      return;
    }
    setResettingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${data.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: pwd }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(json.message || 'Đã đổi mật khẩu thành công!', 'success');
        setShowResetPasswordModal(false);
        setNewPasswordInput('');
      } else {
        showToast(json.error || 'Lỗi đặt lại mật khẩu.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối khi đặt lại mật khẩu.', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleToggleBan = async (action: 'ban' | 'unban', reason?: string, durationDays?: number | null) => {
    if (!currentUser || !isFullAdmin || !data) return;
    setBanningUser(true);
    try {
      const res = await fetch(`/api/admin/users/${data.id}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason, durationDays }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(json.message || 'Cập nhật trạng thái thành công!', 'success');
        setShowBanModal(false);
        setBanReasonInput('');
        setBanDuration('permanent');
        setBanCustomDays('14');
        fetchProfile();
      } else {
        showToast(json.error || 'Lỗi cập nhật trạng thái.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối.', 'error');
    } finally {
      setBanningUser(false);
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center ui-dim text-xs font-medium">
        {t('profile.loading', { username })}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-12 text-center space-y-3">
        <div className="text-sm font-bold ui-title">{t('profile.not_found', { username })}</div>
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs hover:underline" style={{ color: 'var(--accent)' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> {t('profile.back')}
        </Link>
      </div>
    );
  }

  if (data.isBanned) {
    const isTemp = Boolean(data.bannedUntil);
    const bannedUntilDate = data.bannedUntil ? new Date(data.bannedUntil) : null;
    const remainingMs = bannedUntilDate ? bannedUntilDate.getTime() - Date.now() : 0;
    const remainingDays = Math.floor(remainingMs / (24 * 60 * 60 * 1000));
    const remainingHours = Math.floor((remainingMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const timeRemainingStr = remainingDays > 0 ? `${remainingDays} ngày ${remainingHours} giờ` : `${Math.max(1, remainingHours)} giờ`;

    return (
      <div className="max-w-2xl mx-auto py-16 px-4 space-y-6 animate-in fade-in duration-300">
        <div
          className="rounded-3xl border p-8 sm:p-12 text-center space-y-6 shadow-xl relative overflow-hidden"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
        >
          {/* Subtle Red Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-32 bg-red-500/10 blur-3xl pointer-events-none rounded-full" />

          {/* Ban Icon */}
          <div className="mx-auto w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/25 flex items-center justify-center text-red-500 shadow-lg shadow-red-500/10">
            <Ban className="w-10 h-10" />
          </div>

          <div className="space-y-2 relative">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-500/15 text-red-500 border border-red-500/30">
              <ShieldAlert className="w-3.5 h-3.5" /> Tài khoản bị đình chỉ
            </div>
            <h1 className="text-2xl sm:text-3xl font-black ui-title">
              {data.username}
            </h1>
            <p className="text-xs sm:text-sm ui-dim max-w-md mx-auto leading-relaxed">
              Tài khoản này đã bị đình chỉ hoạt động. Toàn bộ thông tin cá nhân, hình ảnh và kỷ lục đã bị ẩn theo quy định của hệ thống.
            </p>
          </div>

          {/* Status Box */}
          <div
            className="p-5 rounded-2xl border text-left text-xs space-y-2.5 max-w-md mx-auto"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <span className="ui-dim font-medium">Thời hạn đình chỉ:</span>
              <span className="font-bold text-right text-red-500">
                {isTemp && bannedUntilDate
                  ? `Đến ${bannedUntilDate.toLocaleDateString('vi-VN')} (${timeRemainingStr} nữa)`
                  : 'Vĩnh viễn'}
              </span>
            </div>
            {data.banReason && (
              <div className="flex items-start justify-between gap-4 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="ui-dim font-medium shrink-0">Lý do:</span>
                <span className="font-semibold text-right ui-title">
                  {data.banReason}
                </span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-xs text-white"
              style={{ backgroundColor: 'var(--accent)' }}
            >
              <ArrowLeft className="w-4 h-4" /> Về Trang Chủ
            </Link>
          </div>

          {/* Admin Management Toolbar */}
          {isFullAdmin && (
            <div
              className="mt-8 pt-6 border-t text-left space-y-3"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Bảng điều khiển Quản trị viên
                </span>
                <span className="text-[10px] ui-dim">Chỉ hiển thị cho Admin</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={banningUser}
                  onClick={() => handleToggleBan('unban')}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-green-600 hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" /> Mở khoá tài khoản
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBanReasonInput(data.banReason || '');
                    setShowBanModal(true);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ui-title flex items-center gap-1.5"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
                >
                  <Clock className="w-3.5 h-3.5" /> Thay đổi thời hạn đình chỉ
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Ban Duration Modal for Admin */}
        {showBanModal && (
          <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={() => setShowBanModal(false)}>
            <div
              className="w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <h3 className="font-extrabold text-sm sm:text-base ui-title text-red-500 flex items-center gap-2">
                  <Flame className="w-5 h-5" />
                  Đình chỉ tài khoản: {data.username}
                </h3>
                <button type="button" onClick={() => setShowBanModal(false)} className="p-1 rounded-xl border ui-dim cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Duration selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold ui-title flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-red-500" />
                    Thời hạn đình chỉ:
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { id: '1', label: '1 ngày' },
                      { id: '3', label: '3 ngày' },
                      { id: '7', label: '7 ngày' },
                      { id: '30', label: '30 ngày' },
                      { id: '90', label: '90 ngày' },
                      { id: 'custom', label: 'Tuỳ chỉnh' },
                      { id: 'permanent', label: 'Vĩnh viễn' },
                    ].map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setBanDuration(opt.id as any)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                          banDuration === opt.id
                            ? 'bg-red-500 text-white border-red-500 shadow-xs'
                            : 'border-[color:var(--border-ui)] hover:bg-[color:var(--bg-card)] ui-dim'
                        } ${opt.id === 'permanent' ? 'col-span-2' : ''}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {banDuration === 'custom' && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs ui-dim shrink-0">Số ngày:</span>
                      <input
                        type="number"
                        min="1"
                        max="3650"
                        value={banCustomDays}
                        onChange={(e) => setBanCustomDays(e.target.value)}
                        placeholder="Số ngày..."
                        className="w-24 px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                      />
                      <span className="text-xs ui-dim">ngày</span>
                    </div>
                  )}

                  <div className="p-2.5 rounded-xl border text-[11px] flex items-center gap-2" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                    <Calendar className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="ui-dim">
                      {banDuration === 'permanent' ? (
                        <strong className="text-red-500">Đình chỉ vĩnh viễn không có thời hạn.</strong>
                      ) : (
                        <>
                          Dự kiến mở khoá:{' '}
                          <strong className="text-[color:var(--text-title)]">
                            {new Date(
                              Date.now() +
                                (banDuration === 'custom' ? Math.max(1, parseInt(banCustomDays, 10) || 1) : parseInt(banDuration, 10)) *
                                  24 * 60 * 60 * 1000
                            ).toLocaleDateString('vi-VN')}
                          </strong>
                        </>
                      )}
                    </span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold ui-title">Lý do đình chỉ:</label>
                  <textarea
                    rows={3}
                    value={banReasonInput}
                    onChange={(e) => setBanReasonInput(e.target.value)}
                    placeholder="Nhập lý do đình chỉ..."
                    className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-y"
                    style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => setShowBanModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold ui-dim border cursor-pointer"
                  style={{ borderColor: 'var(--border-ui)' }}
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={banningUser}
                  onClick={() => {
                    const days = banDuration === 'permanent' ? null : (banDuration === 'custom' ? Math.max(1, parseInt(banCustomDays, 10) || 1) : parseInt(banDuration, 10));
                    handleToggleBan('ban', banReasonInput, days);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {banningUser ? 'Đang xử lý...' : 'Cập nhật đình chỉ'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const hardest = data.hardestClassic;
  const breakdown = data.classicBreakdown;
  const ppByRecordId = new Map<string, any>(
    [...(breakdown?.items || []), ...(breakdown?.unused || [])].map((item: any) => [item.recordId, item])
  );

  const classicRecords = [...(data.classicRecords || breakdown?.items || [])].sort((a: any, b: any) => {
    const ppA = ppByRecordId.get(a.recordId)?.weightedPp ?? (a.qualifiesForPp ? (a.awardedPp ?? 0) : 0);
    const ppB = ppByRecordId.get(b.recordId)?.weightedPp ?? (b.qualifiesForPp ? (b.awardedPp ?? 0) : 0);
    if (ppB !== ppA) return ppB - ppA;
    const awA = a.qualifiesForPp ? (a.awardedPp ?? 0) : 0;
    const awB = b.qualifiesForPp ? (b.awardedPp ?? 0) : 0;
    if (awB !== awA) return awB - awA;
    const progA = a.progress ?? 0;
    const progB = b.progress ?? 0;
    if (progB !== progA) return progB - progA;
    const plA = a.placement ?? 999999;
    const plB = b.placement ?? 999999;
    return plA - plB;
  });

  const platformerRecords = data.platformerCompletions || [];
  const createdLevels = data.createdLevels || [];
  const pagedClassic = classicRecords.slice((recordPage - 1) * RECORD_PAGE_SIZE, recordPage * RECORD_PAGE_SIZE);
  const pagedPlatformer = platformerRecords.slice((recordPage - 1) * RECORD_PAGE_SIZE, recordPage * RECORD_PAGE_SIZE);
  const pagedCreated = createdLevels.slice((recordPage - 1) * RECORD_PAGE_SIZE, recordPage * RECORD_PAGE_SIZE);

  const isTargetSuperAdmin = Boolean(data?.isSuperAdmin || isSuperAdminUser(data));
  const isSupporter = Boolean(data?.supporterUntil && new Date(data.supporterUntil) > new Date());
  const userSp = typeof data?.userSp === 'number' ? data.userSp : calculateUserSp(data);
  const supporterMonths = isSupporter ? userSp : 0;

  const roleBadges: Array<{
    id: string;
    name: string;
    description?: string;
    icon: string;
    color: string;
    glowColor?: string;
    sortOrder: number;
  }> = [];

  if (isTargetSuperAdmin) {
    if (isStaff || isSuperAdmin) {
      roleBadges.push({
        id: 'role-super-admin',
        name: 'Owner',
        description: 'Website Owner',
        icon: 'Crown',
        color: '#ef4444',
        glowColor: '#ef4444',
        sortOrder: 10000,
      });
    }
  } else if (data.role === 'ADMIN') {
    roleBadges.push({
      id: 'role-admin',
      name: 'Admin',
      description: 'Administrator',
      icon: 'Shield',
      color: '#ef4444',
      glowColor: '#ef4444',
      sortOrder: 9999,
    });
  } else if (data.role === 'MODERATOR') {
    roleBadges.push({
      id: 'role-mod',
      name: 'Moderator',
      description: 'Moderator',
      icon: 'ShieldCheck',
      color: '#22c55e',
      glowColor: '#22c55e',
      sortOrder: 9998,
    });
  }

  if (isSupporter) {
    roleBadges.push({
      id: 'role-supporter',
      name: 'Supporter',
      description: 'GDVN Supporter',
      icon: 'Heart',
      color: '#ec4899',
      glowColor: '#ec4899',
      sortOrder: 9997,
    });
  }

  const allBadges = [...roleBadges, ...(data.badges || [])].sort((a: any, b: any) => (a.sortOrder ?? 999) - (b.sortOrder ?? 999));
  let headerBadges: any[] = [];
  if (!data.hideAllBadges) {
    if (Array.isArray(data.displayedBadgeIds) && data.displayedBadgeIds.length > 0) {
      const selected = data.displayedBadgeIds
        .map((id: string) => allBadges.find((b: any) => b.id === id || b.systemKey === id))
        .filter(Boolean);
      headerBadges = selected.length > 0 ? selected.slice(0, 3) : allBadges.slice(0, 3);
    } else {
      headerBadges = allBadges.slice(0, 3);
    }
  }

  return (
    <div
      ref={profileContainerRef}
      data-theme={data?.profileTheme || theme}
      data-mode={isProfileDark ? 'dark' : 'light'}
      className={`max-w-[1200px] mx-auto py-8 px-4 space-y-6 relative ${isProfileDark ? 'dark' : ''} ${isGlitchTheme ? 'gdvn-profile-glitch' : ''} ${isGlitchTheme && isCardsActive ? 'gdvn-glitch-cards-active' : ''} ${isGlitchTheme && isAvatarActive ? 'gdvn-glitch-avatar-active' : ''} ${isGlitchTheme && isTextActive ? 'gdvn-glitch-text-active' : ''}`}
      style={{
        colorScheme: isProfileDark ? 'dark' : 'light',
        ...(isProfileDark
          ? {
              '--bg-page': (data?.profileTheme || theme) === 'lavender' ? '#150f24' : '#0b0c10',
              '--bg-card': (data?.profileTheme || theme) === 'lavender' ? '#1f1733' : '#12131a',
              '--bg-subtle': (data?.profileTheme || theme) === 'lavender' ? '#281e42' : '#181a24',
              '--text-title': '#ffffff',
              '--text-body': '#cbd5e1',
              '--text-dim': '#94a3b8',
              '--border-ui': 'rgba(255, 255, 255, 0.12)',
              '--border-subtle': 'rgba(255, 255, 255, 0.08)',
            }
          : {
              '--bg-page': '#f1f5f9',
              '--bg-card': '#ffffff',
              '--bg-subtle': '#f8fafc',
              '--text-title': '#0f172a',
              '--text-body': '#334155',
              '--text-dim': '#64748b',
              '--border-ui': '#e2e8f0',
              '--border-subtle': '#f1f5f9',
            }),
      } as any}
    >
      {isGlitchTheme && (
        <>
          {/* Avatar Giant Flash Overlay (chỉ nháy nhanh) */}
          {showAvatarJumpscare && data.avatarUrl && (
            <div className="fixed inset-0 z-[9998] pointer-events-none flex items-center justify-center bg-black/80">
              <div className="relative w-[80vw] max-w-[480px] aspect-square rounded-2xl overflow-hidden border-4 border-red-600 shadow-[0_0_100px_#ff0033]">
                <img
                  src={data.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover filter contrast-[500%] saturate-0 brightness-150 invert drop-shadow-[0_0_40px_#001144]"
                />
                <div className="absolute inset-0 bg-red-600/30 mix-blend-color-burn" />
              </div>
            </div>
          )}

          {/* Overlay hình vuông đen to hoặc đen hình vuông che hết profile và có kí hiệu thánh giá ở giữa */}
          {showCrossOverlay && (
            <div className={`fixed inset-0 z-[9999] pointer-events-none flex items-center justify-center ${crossMode === 'fullscreen' ? 'bg-black' : 'bg-black/85'}`}>
              <div className={`${crossMode === 'fullscreen' ? 'w-full h-full flex-col justify-center' : 'w-[320px] h-[320px] sm:w-[460px] sm:h-[460px] border-4 border-white shadow-[0_0_80px_rgba(255,255,255,0.4)]'} bg-black flex flex-col items-center justify-center p-6 text-center select-none`}>
                <div className="text-white text-8xl sm:text-9xl font-serif drop-shadow-[0_0_25px_rgba(255,0,51,0.9)] leading-none select-none">
                  ✝
                </div>
              </div>
            </div>
          )}

          <div className={`gdvn-glitch-overlay pointer-events-none fixed inset-0 z-[5] ${(isCardsActive || isAvatarActive || isTextActive || isPanelActive) ? 'opacity-100' : 'opacity-0'} transition-opacity duration-75`} aria-hidden="true" />
          {isPanelActive && (
            <div className="gdvn-dead-panel-glitch pointer-events-none fixed inset-0 z-[6] overflow-hidden" aria-hidden="true">
              <div className="gdvn-glitch-slab-1" />
              <div className="gdvn-glitch-slab-2" />
              <div className="gdvn-glitch-slab-3" />
            </div>
          )}
        </>
      )}
      {data?.profileConfig?.backgroundUrl && (
        <div className="fixed inset-0 z-[-1] pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url(" + data.profileConfig.backgroundUrl + ")", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }} />
      )}

      {data.isBanned && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 space-y-1">
          <div className="text-xs font-extrabold uppercase flex items-center gap-2">
            <Flame className="w-4 h-4" />
            Tài khoản này đã bị đình chỉ hoạt động
          </div>
          {data.banReason && (
            <div className="text-xs font-medium opacity-90">
              Lý do: {data.banReason}
            </div>
          )}
        </div>
      )}

      {isOwner && data.gdUsername && !data.gdVerified && <GdUnverifiedNotice />}


      {/* Unified Hero Card */}
      <div className={`ui-card shadow-sm ${isGlitchTheme ? 'overflow-visible' : 'overflow-hidden'}`}>
        {/* Banner Cover */}
        <div data-glitch-cover className={`relative w-full h-36 sm:h-48 md:h-56 bg-slate-100 dark:bg-zinc-800 ${isGlitchTheme ? 'overflow-visible' : 'overflow-hidden'}`}>
          {data.coverUrl ? (
            <img
              data-glitch-cover-img
              src={data.coverUrl}
              alt=""
              onError={(e) => {
                e.currentTarget.src = '/default-banner.svg';
              }}
              className="w-full h-full object-cover"
            />
          ) : (
            <img data-glitch-cover-img src="/default-banner.svg" alt="" className="w-full h-full object-cover opacity-50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          
          
        </div>

        {/* Info Bar */}
        <div className="px-5 pb-5 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-4">
            {/* Avatar - self-start w-fit to prevent horizontal stretch on mobile */}
            <div data-glitch-avatar className={`relative shrink-0 self-start w-fit -mt-12 sm:-mt-14 ${isGlitchTheme ? 'overflow-visible z-30' : ''}`}>
              <div
                className={`p-1.5 rounded-2xl sm:rounded-3xl shadow-xl inline-block w-fit ${isLavender ? 'tsumiki-btn !m-0 !p-1.5' : 'bg-white dark:bg-zinc-900 border'} ${isGlitchTheme ? 'overflow-visible' : ''}`}
                style={!isLavender ? { backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' } : {}}
              >
                <div className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-xl sm:rounded-2xl overflow-hidden shadow-inner ${isGlitchTheme ? 'overflow-visible' : ''}`}>
                  {data.avatarUrl ? (
                    <>
                      <img
                        data-glitch-avatar-img
                        src={data.avatarUrl}
                        alt=""
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fb = e.currentTarget.parentElement?.querySelector('.profile-avatar-fb');
                          if (fb) (fb as HTMLElement).style.display = 'flex';
                        }}
                        className="w-full h-full object-cover rounded-xl sm:rounded-2xl"
                      />
                      <div className="profile-avatar-fb hidden w-full h-full items-center justify-center bg-slate-200 dark:bg-zinc-800 rounded-xl sm:rounded-2xl">
                        <UserIcon className="w-12 h-12 text-slate-400" />
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-zinc-800 rounded-xl sm:rounded-2xl">
                      <UserIcon className="w-12 h-12 text-slate-400" />
                    </div>
                  )}
                  {canEditInfo && (
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold backdrop-blur-xs rounded-xl sm:rounded-2xl">
                      <Camera className="w-4 h-4 mb-0.5" />
                      <span>Sửa Avatar</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Primary Details (Name, Badges, Roles) */}
            <div className="flex-1 min-w-0 space-y-1.5 pt-2 sm:pt-3.5">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <UserDisplayName
                    user={data}
                    fallbackName={data.username}
                    linkClan
                    tagPosition="left"
                    showClanRole={false}
                    className="text-xl sm:text-2xl font-black ui-title drop-shadow-sm"
                  />

                  {/* Header Badges */}
                  {headerBadges.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {headerBadges.map((b: any) => (
                        <div
                          key={b.id}
                          className={
                            isLavender
                              ? "inline-flex items-center justify-center p-1.5 rounded-xl tsumiki-btn tsumiki-badge-btn !m-0 !mb-0 shadow-sm cursor-default"
                              : "inline-flex items-center justify-center p-1.5 rounded-lg bg-black text-white border border-zinc-800/80 shadow-xs cursor-default"
                          }
                          title={b.name + (b.description ? `: ${b.description}` : '')}
                        >
                          <BadgeIcon
                            icon={b.icon || 'Star'}
                            color={b.color}
                            color2={b.color2}
                            effect={b.effect}
                            glow={b.glowColor}
                            className={isLavender ? "w-4 h-4" : "w-3.5 h-3.5"}
                          />
                        </div>
                      ))}
                    </div>
                  )}

                  {data.isBanned && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30 flex items-center gap-1">
                      <Flame className="w-3 h-3" /> Bị đình chỉ
                    </span>
                  )}
                </div>

                {/* Supporter Duration Badge */}
                {isSupporter && (
                  <div
                    className="ml-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider border shadow-xs"
                    style={{
                      backgroundColor: 'color-mix(in srgb, #ec4899 14%, var(--bg-card))',
                      borderColor: 'color-mix(in srgb, #ec4899 35%, var(--border-ui))',
                      color: '#ec4899',
                    }}
                    title={isEn ? 'Supporter active' : 'Đang là Supporter'}
                  >
                    <Heart className="w-3.5 h-3.5 text-pink-500 fill-pink-500 shrink-0" />
                    <span>Supporter</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Info (Pills & Badges) - Clean Full Width Layout */}
          <div className="space-y-3 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            {/* Metadata Pills Row (GD, Discord, Location, Clan) */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* GD Username */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                <Gamepad2 className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                <span className="ui-dim font-bold text-[11px] uppercase">GD:</span>
                <span className="ui-title font-semibold">{data.gdUsername || 'Chưa liên kết'}</span>
                {data.gdVerified && <span title="Đã xác minh"><CheckCircle className="w-3 h-3 text-emerald-500" /></span>}
              </div>

              {/* Discord */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                <MessageSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                <span className="ui-dim font-bold text-[11px] uppercase">Discord:</span>
                <span className="ui-title font-semibold">{data.discordTag || 'Chưa liên kết'}</span>
              </div>

              {/* Location */}
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span className="ui-dim font-bold text-[11px] uppercase">Vị trí:</span>
                <span className="ui-title font-semibold">{data.country || 'Việt Nam'}</span>
              </div>

              {/* GD Stats: Stars, Moons, Demons */}
              {(Number(data.gdStars || 0) > 0 || Number(data.gdMoons || 0) > 0 || Number(data.gdDemons || 0) > 0) && (
                <>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }} title={data.gdStatsUpdatedAt ? `Cập nhật: ${new Date(data.gdStatsUpdatedAt).toLocaleString()}` : undefined}>
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                    <span className="ui-dim font-bold text-[11px] uppercase">Stars:</span>
                    <span className="ui-title font-semibold">{Number(data.gdStars || 0).toLocaleString()}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }} title={data.gdStatsUpdatedAt ? `Cập nhật: ${new Date(data.gdStatsUpdatedAt).toLocaleString()}` : undefined}>
                    <Moon className="w-3.5 h-3.5 text-sky-400 fill-sky-400 shrink-0" />
                    <span className="ui-dim font-bold text-[11px] uppercase">Moons:</span>
                    <span className="ui-title font-semibold">{Number(data.gdMoons || 0).toLocaleString()}</span>
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }} title={data.gdStatsUpdatedAt ? `Cập nhật: ${new Date(data.gdStatsUpdatedAt).toLocaleString()}` : undefined}>
                    <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500 shrink-0" />
                    <span className="ui-dim font-bold text-[11px] uppercase">Demons:</span>
                    <span className="ui-title font-semibold">{Number(data.gdDemons || 0).toLocaleString()}</span>
                  </div>
                </>
              )}

              {/* Clan */}
              {data.clanMember?.clan && (
                <Link
                  href={`/clan/${data.clanMember.clan.slug}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium border hover:opacity-80 transition-opacity"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
                >
                  <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="ui-dim font-bold text-[11px] uppercase">Clan:</span>
                  <span
                    className="font-bold font-mono inline-block"
                    style={{
                      ...(data.clanMember.clan.colorGradient &&
                      ((data.clanMember.clan as any).tier === undefined || (data.clanMember.clan as any).tier >= 2)
                        ? {
                            backgroundImage: data.clanMember.clan.colorGradient,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }
                        : { color: data.clanMember.clan.color || 'var(--accent)' }),
                      filter: ((data.clanMember.clan as any)?.tier >= 3 || ((data.clanMember.clan as any)?.totalSp !== undefined && (data.clanMember.clan as any).totalSp >= 20))
                        ? `drop-shadow(0 0 4px ${
                            (data.clanMember.clan.colorGradient?.match(/#([0-9a-fA-F]{3,8})/g)?.[0]) ||
                            data.clanMember.clan.color ||
                            '#38bdf8'
                          }99)`
                        : undefined,
                    }}
                  >
                    [{data.clanMember.clan.tag}]
                  </span>
                  <span className="font-bold ui-title">
                    {data.clanMember.clan.name}
                  </span>
                </Link>
              )}
            </div>

            {/* All Badges Showcase (if any) */}
            {allBadges.length > 0 && (
              <div className="pt-2 border-t flex flex-col gap-1.5" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="text-[11px] font-bold uppercase ui-dim flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-500" /> {t('profile.all_badges')} ({allBadges.length}):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {allBadges.map((b: any) => (
                    <div
                      key={b.id}
                      className={
                        isLavender
                          ? "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl tsumiki-btn tsumiki-badge-btn !m-0 !mb-0 shadow-sm cursor-default"
                          : "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-black text-white border border-zinc-800/80 shadow-xs cursor-default"
                      }
                      title={b.description || b.name}
                    >
                      <BadgeIcon
                        icon={b.icon || 'Star'}
                        color={b.color}
                        glow={b.glowColor}
                        className={isLavender ? "w-3.5 h-3.5 shrink-0" : "w-3 h-3 shrink-0"}
                      />
                      <span className="text-[11px] font-bold text-white drop-shadow-sm">{b.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats & Favorite Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Stats Cards (Left 6 cols) */}
        <div className="lg:col-span-6 flex flex-col justify-between gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 h-full">
            {/* Classic */}
            <button 
              type="button"
              onClick={() => setShowClassicPoints(!showClassicPoints)}
              className={
                isLavender
                  ? 'p-4 rounded-2xl flex flex-col items-center justify-center text-center relative transition-all cursor-pointer active:scale-95 tsumiki-btn-yellow text-white'
                  : 'p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-xs hover:shadow-md relative transition-all cursor-pointer active:scale-95 border group'
              }
              style={
                !isLavender
                  ? {
                      backgroundColor: isDark
                        ? 'var(--bg-card)'
                        : 'color-mix(in srgb, var(--accent) 8%, var(--bg-subtle))',
                      borderColor: 'color-mix(in srgb, #f59e0b 35%, var(--border-ui))',
                    }
                  : undefined
              }
            >
              <Star className={`w-5 h-5 mb-1.5 ${isLavender ? 'text-white drop-shadow' : 'text-amber-500 dark:text-amber-400 group-hover:scale-110 transition-transform'}`} />
              <div className={`text-[11px] font-bold uppercase tracking-wider ${isLavender ? 'text-white/95 drop-shadow-xs' : 'ui-dim'}`}>Classic</div>
              <div className={`text-xl font-black mt-0.5 transition-all ${isLavender ? 'text-white drop-shadow-sm' : 'text-amber-600 dark:text-amber-400'}`}>
                {showClassicPoints ? (data.classicPp?.toFixed(2) || '0.00') : ((data.classicPp || 0) > 0.005 && data.classicRank ? "#" + data.classicRank : '#-')}
              </div>
              <div className={`text-[10px] font-semibold mt-1 ${isLavender ? 'text-white/90 drop-shadow-xs' : 'ui-dim'}`}>
                {showClassicPoints ? 'Points (Pt)' : 'Xếp hạng'}
              </div>
            </button>

            {/* Platformer */}
            <button 
              type="button"
              onClick={() => setShowPlatformerPoints(!showPlatformerPoints)}
              className={
                isLavender
                  ? 'p-4 rounded-2xl flex flex-col items-center justify-center text-center relative transition-all cursor-pointer active:scale-95 tsumiki-btn-blue text-white'
                  : 'p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-xs hover:shadow-md relative transition-all cursor-pointer active:scale-95 border group'
              }
              style={
                !isLavender
                  ? {
                      backgroundColor: isDark
                        ? 'var(--bg-card)'
                        : 'color-mix(in srgb, var(--accent) 8%, var(--bg-subtle))',
                      borderColor: 'color-mix(in srgb, #0ea5e9 35%, var(--border-ui))',
                    }
                  : undefined
              }
            >
              <Moon className={`w-5 h-5 mb-1.5 ${isLavender ? 'text-white drop-shadow' : 'text-sky-500 dark:text-sky-400 group-hover:scale-110 transition-transform'}`} />
              <div className={`text-[11px] font-bold uppercase tracking-wider ${isLavender ? 'text-white/95 drop-shadow-xs' : 'ui-dim'}`}>Platformer</div>
              <div className={`text-xl font-black mt-0.5 transition-all ${isLavender ? 'text-white drop-shadow-sm' : 'text-sky-600 dark:text-sky-400'}`}>
                {showPlatformerPoints ? (data.platformerPp?.toFixed(2) || '0.00') : ((data.platformerPp || 0) > 0.005 && data.platformerRank ? "#" + data.platformerRank : '#-')}
              </div>
              <div className={`text-[10px] font-semibold mt-1 ${isLavender ? 'text-white/90 drop-shadow-xs' : 'ui-dim'}`}>
                {showPlatformerPoints ? 'Points (Pt)' : 'Xếp hạng'}
              </div>
            </button>

            {/* Creator Points */}
            <button
              type="button"
              onClick={() => !isEditingCp && setShowCreatorRank(!showCreatorRank)}
              className={
                isLavender
                  ? 'col-span-2 sm:col-span-1 p-4 rounded-2xl flex flex-col items-center justify-center text-center relative transition-all cursor-pointer active:scale-95 tsumiki-btn-pink-cyan text-white'
                  : 'col-span-2 sm:col-span-1 p-4 rounded-2xl flex flex-col items-center justify-center text-center shadow-xs hover:shadow-md relative transition-all cursor-pointer active:scale-95 border group'
              }
              style={
                !isLavender
                  ? {
                      backgroundColor: isDark
                        ? 'var(--bg-card)'
                        : 'color-mix(in srgb, var(--accent) 8%, var(--bg-subtle))',
                      borderColor: 'color-mix(in srgb, #ec4899 35%, var(--border-ui))',
                    }
                  : undefined
              }
            >
              <Hammer className={`w-5 h-5 mb-1.5 ${isLavender ? 'text-white drop-shadow' : 'text-pink-500 dark:text-pink-400 group-hover:scale-110 transition-transform'}`} />
              <div className={`text-[11px] font-bold uppercase tracking-wider ${isLavender ? 'text-white/95 drop-shadow-xs' : 'ui-dim'}`}>Creator Points</div>
              <div className={`text-xl font-black mt-0.5 transition-all ${isLavender ? 'text-white drop-shadow-sm' : 'text-pink-600 dark:text-pink-400'}`}>
                {showCreatorRank
                  ? (data.creatorRank ? `#${data.creatorRank}` : '#-')
                  : formatCp(data.creatorPoints)}
              </div>
              <div className={`text-[10px] font-semibold mt-1 ${isLavender ? 'text-white/90 drop-shadow-xs' : 'ui-dim'}`}>
                {showCreatorRank ? 'Xếp hạng CP' : `${data.createdLevels?.length || 0} tác phẩm`}
              </div>
            </button>
          </div>
        </div>

        {/* Bio Card (Right 6 cols, replaces Favorite, supports Discord Markdown) */}
        <div className="lg:col-span-6">
          <div className="ui-card p-4 rounded-2xl h-full flex flex-col justify-between space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold ui-title flex items-center gap-1.5 uppercase tracking-wide">
                <FileText className="w-3.5 h-3.5 text-sky-500" />
                {t('profile.bio') || 'Tiểu sử'}
              </span>
              {canEditInfo && !isEditingBio && (
                <button
                  type="button"
                  onClick={() => {
                    setBioInput(data.bio || '');
                    setIsEditingBio(true);
                  }}
                  className="p-1 rounded-lg text-sky-500 hover:bg-sky-500/10 transition-colors cursor-pointer"
                  title="Chỉnh sửa tiểu sử"
                >
                  <Edit className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {isEditingBio ? (
              <div className="space-y-2 flex-1 flex flex-col">
                <textarea
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  className="w-full flex-1 min-h-[140px] p-3 rounded-xl border text-xs resize-none"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                  placeholder="Nhập tiểu sử (hỗ trợ Discord Markdown: **đậm**, *nghiêng*, # tiêu đề, > trích dẫn, `code`, v.v.)..."
                  autoFocus
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingBio(false)}
                    className="px-3 py-1.5 text-xs font-bold border rounded-xl hover:opacity-80 transition-all cursor-pointer"
                    style={{ borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const trimmedBio = bioInput.trim();
                      await updateProfileField({ bio: trimmedBio });
                      setData((prev: any) => ({ ...prev, bio: trimmedBio }));
                      setIsEditingBio(false);
                      fetchProfile({ silent: true });
                    }}
                    className="px-3.5 py-1.5 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full flex-1 rounded-xl p-3.5 border min-h-[140px] max-h-[220px] overflow-y-auto" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                {data.bio ? (
                  <DiscordMarkdown content={data.bio} className="text-xs leading-relaxed" />
                ) : (
                  <div className="h-full flex items-center justify-center text-xs ui-dim opacity-60 italic py-6">
                    {isEn ? 'No bio written yet.' : 'Chưa có tiểu sử.'}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Box 3 - Tabs */}
      <div className="ui-card p-4 md:p-6 space-y-4 mt-6">
        
        <AnimatedTabs<'classic' | 'platformer' | 'creator'>
          active={activeTab}
          onChange={(tab) => {
            setActiveTab(tab);
            setRecordPage(1);
          }}
          themeOverride={data?.profileTheme || undefined}
          options={[
            {
              id: 'classic',
              label: `Classic (${classicRecords.length})`,
              icon: <Star className="w-4 h-4" />,
            },
            {
              id: 'platformer',
              label: `Platformer (${data.platformerCompletions?.length || 0})`,
              icon: <Moon className="w-4 h-4" />,
            },
            {
              id: 'creator',
              label: `${t('profile.tab_created')} (${data.createdLevels?.length || 0})`,
              icon: <Hammer className="w-4 h-4" />,
            },
          ]}
        />

        {/* Tab Content with animation */}
        <div key={activeTab} className="transition-all duration-300 animate-in fade-in-50 slide-in-from-bottom-2">

      {/* Tab Content */}
      {activeTab === 'classic' && (
        <div className="ui-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b text-[11px] font-bold uppercase ui-dim" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                  <th className="px-4 py-2.5 w-12 text-center">#</th>
                  <th className="px-4 py-2.5">{t("profile.col_level")}</th>
                  <th className="px-3 py-2.5 text-center w-24">{t("profile.col_device") || 'Thiết bị'}</th>
                  <th className="px-4 py-2.5 text-center">{t("profile.col_progress")}</th>
                  <th className="px-4 py-2.5 text-right">Base Points</th>
                  <th className="px-4 py-2.5 text-center">{t("profile.col_weight")}</th>
                  <th className="px-4 py-2.5 text-right">{t("profile.col_pp")}</th>
                  <th className="px-4 py-2.5 text-center w-24">Video</th>
                </tr>
              </thead>
              <tbody className="ui-zebra">
                {classicRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center ui-dim italic">
                      {t('profile.no_records')}
                    </td>
                  </tr>
                ) : pagedClassic.map((item: any, idx: number) => {
                  const pp = ppByRecordId.get(item.recordId);
                  const rankNum = (recordPage - 1) * RECORD_PAGE_SIZE + idx + 1;
                  return (
                  <tr key={item.recordId || item.id || `breakdown-${idx}`} className="hover:opacity-90">
                    <td className="px-4 py-2.5 text-center font-bold ui-dim">{rankNum}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        {item.placement != null ? (
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold ui-subtle">#{item.placement}</span>
                        ) : (
                          <span className="px-1 py-0.2 rounded text-[9px] font-bold ui-subtle">-</span>
                        )}
                        {item.gdLevelId ? (
                          <Link href={levelPath({ gdLevelId: item.gdLevelId })} className="font-bold ui-title hover:underline" style={{ color: 'var(--accent)' }}>
                            {item.name || item.levelName}
                          </Link>
                        ) : (
                          <span className="font-bold ui-title">{item.name || item.levelName}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <DeviceBadge device={item.device} />
                    </td>
                    <td className="px-4 py-2.5 text-center font-semibold ui-title">
                      {item.progress != null ? `${item.progress}%` : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right ui-dim">
                      {item.awardedPp != null && item.progress != null && item.progress < 100
                        ? `${Number(item.awardedPp).toFixed(2)} / ${item.basePp.toFixed(2)}`
                        : item.basePp.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {pp ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                          {pp.weightPercent}%
                        </span>
                      ) : (
                        <span className="text-[10px] ui-dim">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-black" style={{ color: pp && pp.weightedPp > 0 ? 'var(--accent)' : 'var(--text-dim)' }}>
                      {pp ? pp.weightedPp.toFixed(2) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <a href={item.videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-semibold hover:underline" style={{ color: 'var(--accent)' }}>
                          <Play className="w-3 h-3" /> {t("profile.watch")}
                        </a>
                        {isStaff && (
                          <button
                            onClick={() => handleDeleteRecord(item.recordId, item.name || item.levelName)}
                            className="p-1 rounded hover:bg-red-500/20 text-red-500 transition-colors"
                            title="Xóa kỷ lục"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
          <RecordPager page={recordPage} total={classicRecords.length} onPage={setRecordPage} t={t} />
        </div>
      )}

      {activeTab === 'platformer' && (
        <div className="ui-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b text-[11px] font-bold uppercase ui-dim" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                  <th className="px-4 py-2.5 w-12 text-center">#</th>
                  <th className="px-4 py-2.5">{t("profile.col_level")}</th>
                  <th className="px-3 py-2.5 text-center w-24">{t("profile.col_device") || 'Thiết bị'}</th>
                  <th className="px-4 py-2.5 text-center">{t("profile.col_time")}</th>
                  <th className="px-4 py-2.5 text-right">Base Points</th>
                  <th className="px-4 py-2.5 text-center">Video</th>
                </tr>
              </thead>
              <tbody className="ui-zebra">
                {platformerRecords.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center ui-dim italic">
                      {t('profile.no_records')}
                    </td>
                  </tr>
                ) : pagedPlatformer.map((rec: any, idx: number) => {
                  const rankNum = (recordPage - 1) * RECORD_PAGE_SIZE + idx + 1;
                  return (
                  <tr key={rec.recordId || rec.id || `plat-${idx}`} className="hover:opacity-90">
                    <td className="px-4 py-2.5 text-center font-bold ui-dim">{rankNum}</td>
                    <td className="px-4 py-2.5">
                      {rec.gdLevelId ? (
                        <Link href={levelPath({ gdLevelId: rec.gdLevelId })} className="font-bold ui-title hover:underline" style={{ color: 'var(--accent)' }}>
                          {rec.name}
                        </Link>
                      ) : (
                        <span className="font-bold ui-title">{rec.name}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <DeviceBadge device={rec.device} />
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono font-bold" style={{ color: 'var(--badge-green-text)' }}>
                      {(rec.timeMs / 1000).toFixed(3)}s
                    </td>
                    <td className="px-4 py-2.5 text-right ui-dim">{rec.basePp.toFixed(2)}</td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <a href={rec.videoUrl} target="_blank" rel="noreferrer" className="font-semibold hover:underline flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                          <Play className="w-3 h-3" /> {t("profile.watch")}
                        </a>
                        {isStaff && (
                          <button
                            onClick={() => handleDeleteRecord(rec.recordId, rec.name)}
                            className="p-1 rounded hover:bg-red-500/20 text-red-500 transition-colors"
                            title="Xóa kỷ lục"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );})}
              </tbody>
            </table>
          </div>
          <RecordPager page={recordPage} total={platformerRecords.length} onPage={setRecordPage} t={t} />
        </div>
      )}

      {activeTab === 'creator' && (
        <div className="ui-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b text-[11px] font-bold uppercase ui-dim" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                  <th className="px-4 py-2.5">Level Name</th>
                  <th className="px-4 py-2.5 text-center">Base Points</th>
                  <th className="px-4 py-2.5 text-center">Rating</th>
                  <th className="px-4 py-2.5 text-center">Mode</th>
                  {isStaff && <th className="px-4 py-2.5 text-center w-16"></th>}
                </tr>
              </thead>
              <tbody className="ui-zebra">
                {pagedCreated.map((level: any, idx: number) => (
                  <tr key={level.id || `created-${idx}`} className="hover:opacity-90">
                    <td className="px-4 py-2.5">
                      {level.gdLevelId ? (
                        <Link href={levelPath(level)} className="font-bold ui-title hover:underline" style={{ color: 'var(--accent)' }}>
                          {level.name}
                        </Link>
                      ) : (
                        <span className="font-bold ui-title">{level.name}</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center ui-dim">
                      {level.basePp.toFixed(2)}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold">
                      <span className="px-2 py-0.5 rounded text-[10px]" style={{
                        backgroundColor: level.ratingType === 'MYTHIC' ? 'rgba(168, 85, 247, 0.15)' : 
                                         level.ratingType === 'LEGENDARY' ? 'rgba(236, 72, 153, 0.15)' : 
                                         level.ratingType === 'EPIC' ? 'rgba(234, 179, 8, 0.15)' :
                                         level.ratingType === 'FEATURE' ? 'rgba(250, 204, 21, 0.15)' :
                                         level.ratingType === 'RATE' ? 'rgba(202, 138, 4, 0.15)' : 'var(--bg-subtle)',
                        color: level.ratingType === 'MYTHIC' ? '#a855f7' :
                               level.ratingType === 'LEGENDARY' ? '#ec4899' :
                               level.ratingType === 'EPIC' ? '#eab308' :
                               level.ratingType === 'FEATURE' ? '#facc15' :
                               level.ratingType === 'RATE' ? '#ca8a04' : 'var(--text-dim)',
                      }}>
                        {level.ratingType !== 'NONE' ? level.ratingType : 'UNRATED'}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-black/5 dark:bg-white/5 ui-dim">
                        {level.mode}
                      </span>
                    </td>
                    {isStaff && (
                      <td className="px-4 py-2.5 text-center">
                        <button
                          onClick={() => handleDeleteWork(level)}
                          className="p-1 rounded hover:bg-red-500/20 text-red-500 transition-colors"
                          title={t('profile.delete_work')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
                {(!data.createdLevels || data.createdLevels.length === 0) && (
                  <tr>
                    <td colSpan={isStaff ? 5 : 4} className="px-4 py-8 text-center text-xs ui-dim">
                      {t('profile.no_works')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <RecordPager page={recordPage} total={createdLevels.length} onPage={setRecordPage} t={t} />
        </div>
      )}

        </div>
      </div>

      {/* Box Cài Đặt Người Dùng Cho Admin (ở dưới cùng trang profile) */}
      {(isStaff || isFullAdmin || isSuperAdmin) && (
        <div className="ui-card p-5 md:p-6 rounded-3xl border border-red-500/25 bg-gradient-to-b from-red-500/[0.04] to-transparent shadow-sm space-y-4">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0 border border-red-500/20 shadow-xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-extrabold text-sm sm:text-base ui-title">
                    Cài Đặt Người Dùng (Admin)
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-red-500/15 text-red-500 border border-red-500/30">
                    Chỉ dành cho BQT
                  </span>
                </div>
                <p className="text-xs ui-dim mt-0.5">
                  Bảng quản trị tài khoản <strong>@{data.username}</strong>
                </p>
              </div>
            </div>

            {/* Status pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-1 rounded-xl text-xs font-bold border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}>
                Role: {data.role}
              </span>
              {data.isBanned ? (
                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" /> Bị đình chỉ
                </span>
              ) : (
                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Hoạt động
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Quản lý Role & Huy hiệu */}
            <button
              type="button"
              onClick={handleOpenManageModal}
              className="p-3.5 rounded-2xl border transition-all text-left group hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <Medal className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500">
                  {isFullAdmin ? 'Role & Badge' : 'Huy hiệu'}
                </span>
              </div>
              <div className="text-xs font-bold ui-title group-hover:text-amber-500 transition-colors">
                Quản Lý Role & Huy Hiệu
              </div>
              <div className="text-[11px] ui-dim mt-0.5 leading-snug">
                Cấp quyền, hạn Supporter và gán huy hiệu danh dự
              </div>
            </button>

            {/* 2. Sửa / Reset Creator Points */}
            <button
              type="button"
              disabled={!isFullAdmin && !isSuperAdmin}
              onClick={handleResetCp}
              className="p-3.5 rounded-2xl border transition-all text-left group hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-500 flex items-center justify-center border border-pink-500/20 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                  <Hammer className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-pink-500">
                  {formatCp(data.creatorPoints)} CP
                </span>
              </div>
              <div className="text-xs font-bold ui-title group-hover:text-pink-500 transition-colors">
                Reset Creator Points
              </div>
              <div className="text-[11px] ui-dim mt-0.5 leading-snug">
                Đặt lại điểm sáng tạo về 0 hoặc tính toán lại
              </div>
            </button>

            {/* 3. Đặt lại Mật khẩu (Owner web) */}
            <button
              type="button"
              disabled={!isSuperAdmin}
              onClick={() => {
                if (!isSuperAdmin) {
                  showToast('Chỉ Owner web mới có quyền đặt lại mật khẩu!', 'error');
                  return;
                }
                setNewPasswordInput('');
                setShowResetPasswordModal(true);
              }}
              className="p-3.5 rounded-2xl border transition-all text-left group hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center border border-sky-500/20 group-hover:bg-sky-500 group-hover:text-white transition-colors">
                  <Lock className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-500">
                  Owner Web
                </span>
              </div>
              <div className="text-xs font-bold ui-title group-hover:text-sky-500 transition-colors">
                Đặt Lại Mật Khẩu
              </div>
              <div className="text-[11px] ui-dim mt-0.5 leading-snug">
                Cấp mật khẩu mới trực tiếp không cần qua email
              </div>
            </button>

            {/* 4. Đình chỉ / Mở khóa tài khoản */}
            <button
              type="button"
              disabled={!isFullAdmin && !isSuperAdmin}
              onClick={() => {
                if (data.isBanned) {
                  handleToggleBan('unban');
                } else {
                  setBanReasonInput('');
                  setShowBanModal(true);
                }
              }}
              className="p-3.5 rounded-2xl border transition-all text-left group hover:scale-[1.01] active:scale-[0.99] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-colors ${
                  data.isBanned 
                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-white' 
                    : 'bg-orange-500/10 text-orange-500 border-orange-500/20 group-hover:bg-orange-500 group-hover:text-white'
                }`}>
                  {data.isBanned ? <Unlock className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${data.isBanned ? 'text-emerald-500' : 'text-orange-500'}`}>
                  {data.isBanned ? 'Đang khóa' : 'Admin'}
                </span>
              </div>
              <div className={`text-xs font-bold transition-colors ${data.isBanned ? 'group-hover:text-emerald-500' : 'group-hover:text-orange-500'} ui-title`}>
                {data.isBanned ? 'Mở Khóa Tài Khoản' : 'Đình Chỉ Tài Khoản'}
              </div>
              <div className="text-[11px] ui-dim mt-0.5 leading-snug">
                {data.isBanned ? 'Khôi phục quyền truy cập cho người dùng' : 'Tạm dừng đăng nhập và hủy phiên làm việc'}
              </div>
            </button>
          </div>

          {/* Bottom row: Audit note + Delete User */}
          <div className="pt-3 border-t flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-center gap-2 text-xs ui-dim">
              <Shield className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
              <span>Mọi hành động quản trị viên được ghi nhận vào nhật ký hệ thống (Audit Log).</span>
            </div>
            {(isSuperAdmin || isFullAdmin) && (
              <button
                type="button"
                onClick={openDeleteModal}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa Tài Khoản Này
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modern Role & Supporter Management Modal */}
      {showManageModal && data && (
        <div className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-ui)',
            }}
          >
            {/* Modal Header with User info */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                {data.avatarUrl ? (
                  <img src={data.avatarUrl} alt="Avatar" className="w-11 h-11 rounded-2xl object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm text-[color:var(--accent-fg)]" style={{ backgroundColor: 'var(--accent)' }}>
                    {data.username[0]}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-extrabold text-base ui-title">
                      {data.username}
                    </h2>
                    {data.supporterUntil && new Date(data.supporterUntil) > new Date() && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase" style={{ backgroundColor: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' }}>
                        Supporter
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] ui-dim flex items-center gap-2">
                    <span>{t('admin.classic_rank', { n: data.classicPp?.toFixed(1) || '0' })}</span>
                    <span>·</span>
                    <span>{t('admin.current_role', { role: data.role })}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowManageModal(false)}
                className="p-1.5 rounded-xl border hover:opacity-80 transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isFullAdmin && (
            <>
            {/* Section 1: Role Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider ui-dim flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
                {t('admin.section_role')}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'USER', label: 'User', desc: t('admin.role_user_desc'), icon: UserIcon },
                  { id: 'MODERATOR', label: 'Moderator', desc: t('admin.role_mod_desc'), icon: ShieldCheck },
                  { id: 'ADMIN', label: 'Admin', desc: t('admin.role_admin_desc'), icon: ShieldCheck },
                ].map((r) => {
                  const isSelected = selectedRole === r.id;
                  const Icon = r.icon;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRole(r.id as any)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        isSelected ? 'ring-2' : 'hover:opacity-80'
                      }`}
                      style={{
                        backgroundColor: isSelected ? 'var(--accent)' : 'var(--bg-subtle)',
                        borderColor: isSelected ? 'var(--accent)' : 'var(--border-ui)',
                        color: isSelected ? '#fff' : 'var(--text-title)'
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'ui-dim'}`} />
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </div>
                      <div className={`text-xs ${isSelected ? 'font-black' : 'font-bold'}`}>
                        {r.label}
                      </div>
                      <div className={`text-[10px] ${isSelected ? 'opacity-90' : 'ui-dim'}`}>{r.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Supporter & SP Coin */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold uppercase tracking-wider ui-dim flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-pink-500" />
                  2. Cấp / Điều Chỉnh Supporter & SP Coin
                </span>
                {(supporterAmount > 0 || spCoinAmount > 0) && (
                  <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Đang điều chỉnh
                  </span>
                )}
              </label>

              {/* Status info */}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div
                  className="p-2.5 rounded-xl border flex flex-col justify-between gap-0.5"
                  style={{
                    backgroundColor: data.supporterUntil && new Date(data.supporterUntil) > new Date()
                      ? 'var(--badge-green-bg)'
                      : 'var(--bg-subtle)',
                    borderColor: data.supporterUntil && new Date(data.supporterUntil) > new Date()
                      ? 'var(--badge-green-text)'
                      : 'var(--border-ui)',
                    color: data.supporterUntil && new Date(data.supporterUntil) > new Date()
                      ? 'var(--badge-green-text)'
                      : 'var(--text-dim)',
                  }}
                >
                  <span className="font-semibold text-[10px] uppercase opacity-75">Hạn Supporter:</span>
                  <span className="font-bold text-xs truncate">
                    {data.supporterUntil && new Date(data.supporterUntil) > new Date()
                      ? new Date(data.supporterUntil).toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN')
                      : (isEn ? 'Not active' : 'Chưa kích hoạt')}
                  </span>
                </div>

                <div
                  className="p-2.5 rounded-xl border flex flex-col justify-between gap-0.5"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
                >
                  <span className="font-semibold text-[10px] uppercase opacity-75 ui-dim">SP Coin khả dụng:</span>
                  <span className="font-bold text-xs text-amber-500 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" />
                    {calculateUserSp(data)} SP
                  </span>
                </div>
              </div>

              {/* Switch 1: Chuyển giữa Tháng Support vs SP Coin */}
              <div className="p-1 rounded-xl border flex gap-1 text-xs font-bold" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                <button
                  type="button"
                  onClick={() => setManageTargetType('supporter')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    manageTargetType === 'supporter'
                      ? 'bg-pink-500 text-white shadow-sm'
                      : 'ui-dim hover:text-[var(--text-title)]'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  {isEn ? 'Supporter Months' : 'Tháng Support'}
                </button>
                <button
                  type="button"
                  onClick={() => setManageTargetType('sp_coin')}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    manageTargetType === 'sp_coin'
                      ? 'bg-amber-500 text-black shadow-sm font-black'
                      : 'ui-dim hover:text-[var(--text-title)]'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  SP Coin
                </button>
              </div>

              {/* Switch 2: Chọn thao tác Cộng (+) vs Trừ (-) */}
              <div className="p-1 rounded-xl border flex gap-1 text-xs font-bold" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (manageTargetType === 'supporter') setSupporterOp('add');
                    else setSpCoinOp('add');
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    (manageTargetType === 'supporter' ? supporterOp === 'add' : spCoinOp === 'add')
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'ui-dim hover:text-[var(--text-title)]'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isEn ? 'Add (+)' : 'Cộng (+)'} {manageTargetType === 'supporter' ? (isEn ? 'months' : 'tháng') : 'coin'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (manageTargetType === 'supporter') setSupporterOp('sub');
                    else setSpCoinOp('sub');
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                    (manageTargetType === 'supporter' ? supporterOp === 'sub' : spCoinOp === 'sub')
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'ui-dim hover:text-[var(--text-title)]'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  {isEn ? 'Subtract (-)' : 'Trừ (-)'} {manageTargetType === 'supporter' ? (isEn ? 'months' : 'tháng') : 'coin'}
                </button>
              </div>

              {/* Stepper Input: [-] [ Input ] [+] */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={manageTargetType === 'supporter' ? supporterAmount <= 0 : spCoinAmount <= 0}
                    onClick={() => {
                      if (manageTargetType === 'supporter') {
                        setSupporterAmount((prev) => Math.max(0, prev - 1));
                      } else {
                        setSpCoinAmount((prev) => Math.max(0, prev - 1));
                      }
                    }}
                    className="w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-base cursor-pointer hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-title)' }}
                    title="Giảm 1"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="relative flex-1">
                    <input
                      type="number"
                      min={0}
                      max={manageTargetType === 'supporter' ? 120 : 10000}
                      value={
                        manageTargetType === 'supporter'
                          ? (supporterAmount === 0 ? '' : supporterAmount)
                          : (spCoinAmount === 0 ? '' : spCoinAmount)
                      }
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        const sanitized = isNaN(val) || val < 0 ? 0 : val;
                        if (manageTargetType === 'supporter') {
                          setSupporterAmount(sanitized);
                        } else {
                          setSpCoinAmount(sanitized);
                        }
                      }}
                      placeholder="0"
                      className="w-full text-center py-2 px-3 rounded-xl border text-sm font-black focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                      style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ui-dim pointer-events-none">
                      {manageTargetType === 'supporter' ? (isEn ? 'months' : 'tháng') : 'SP'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (manageTargetType === 'supporter') {
                        setSupporterAmount((prev) => prev + 1);
                      } else {
                        setSpCoinAmount((prev) => prev + 1);
                      }
                    }}
                    className="w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-base cursor-pointer hover:bg-white/10 transition-all"
                    style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-title)' }}
                    title="Tăng 1"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Status Preview */}
                <div className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border flex items-center justify-between" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
                  <span className="ui-dim">Trạng thái áp dụng:</span>
                  {manageTargetType === 'supporter' ? (
                    supporterAmount === 0 ? (
                      <span className="ui-title">Không thay đổi</span>
                    ) : supporterOp === 'add' ? (
                      <span className="text-emerald-500 font-bold">
                        Cộng +{supporterAmount} tháng (~{new Date((data.supporterUntil && new Date(data.supporterUntil) > new Date() ? new Date(data.supporterUntil).getTime() : Date.now()) + supporterAmount * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN')})
                      </span>
                    ) : (
                      <span className="text-rose-500 font-bold">
                        Trừ -{supporterAmount} tháng {(() => {
                          const current = data.supporterUntil && new Date(data.supporterUntil) > new Date() ? new Date(data.supporterUntil).getTime() : Date.now();
                          const target = current - supporterAmount * 30 * 24 * 60 * 60 * 1000;
                          return target <= Date.now() ? '(Hết hạn)' : `(~${new Date(target).toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN')})`;
                        })()}
                      </span>
                    )
                  ) : (
                    spCoinAmount === 0 ? (
                      <span className="ui-title">Không thay đổi</span>
                    ) : spCoinOp === 'add' ? (
                      <span className="text-amber-500 font-bold">
                        Cộng +{spCoinAmount} SP Coin (Duy trì theo hạn Supporter)
                      </span>
                    ) : (
                      <span className="text-rose-500 font-bold">
                        Trừ -{spCoinAmount} SP Coin
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
            </>
            )}

            {/* Section 3: Badges */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider ui-dim flex items-center gap-1.5">
                <Medal className="w-3.5 h-3.5 text-amber-500" />
                {t('admin.section_badges')}
              </label>
              <button
                type="button"
                onClick={() => setShowBadgePicker(true)}
                className="w-full p-3 rounded-2xl border text-left hover:opacity-90 cursor-pointer"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
              >
                <div className="text-xs font-bold ui-title">{t('badge.open_picker')}</div>
                <div className="text-[11px] ui-dim mt-0.5">
                  {selectedBadgeIds.length === 0
                    ? t('admin.no_badges')
                    : t('badge.picker_selected', { n: selectedBadgeIds.length })}
                </div>
                {selectedBadgeIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {badgesList.filter((b: any) => selectedBadgeIds.includes(b.id)).map((b: any) => (
                      <BadgeIcon
                        key={b.id}
                        icon={b.icon || 'Star'}
                        color={b.color}
                        glow={b.glowColor}
                        className="w-5 h-5"
                        title={b.name}
                      />
                    ))}
                  </div>
                )}
              </button>
              {isFullAdmin && (
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleResetCp}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border hover:opacity-80"
                  style={{ borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                >
                  <RotateCcw className="w-3 h-3" /> {t('profile.reset_cp')}
                </button>
              </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="pt-3 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setShowManageModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={savingAdminChanges}
                onClick={handleSaveAdminManagement}
                className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}
              >
                <Check className="w-3.5 h-3.5" />
                {savingAdminChanges ? t('common.saving') : t('editor.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBadgePicker && (
        <BadgePickerModal
          isOpen
          onClose={() => setShowBadgePicker(false)}
          badges={badgesList}
          selectedIds={selectedBadgeIds}
          onConfirm={setSelectedBadgeIds}
        />
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={() => setShowDeleteModal(false)}>
          <div 
            className="w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm sm:text-base ui-title text-red-500 flex items-center gap-2">
                <Trash2 className="w-5 h-5" />
                Xoá tài khoản: {data.username}
              </h3>
              <button type="button" onClick={() => setShowDeleteModal(false)} className="p-1 rounded-xl border ui-dim cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 leading-relaxed font-semibold">
              Hành động này sẽ gỡ người dùng khỏi hệ thống và chuyển các bản ghi đã duyệt thành kỷ lục vô chủ. Không thể hoàn tác.
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold ui-title">Lý do xoá tài khoản (bắt buộc):</label>
              <textarea
                rows={3}
                value={deleteAccountReason}
                onChange={(e) => setDeleteAccountReason(e.target.value)}
                placeholder="Nhập lý do muốn xoá tài khoản..."
                className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-y"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                autoFocus
              />
            </div>

            {isOwner && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold ui-title">Mật khẩu xác nhận (bắt buộc):</label>
                <input
                  type="password"
                  value={deleteAccountPassword}
                  onChange={(e) => setDeleteAccountPassword(e.target.value)}
                  placeholder="Nhập mật khẩu đăng nhập"
                  className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold ui-dim border cursor-pointer"
                style={{ borderColor: 'var(--border-ui)' }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={
                  deletingAccount ||
                  !deleteAccountReason.trim() ||
                  (isOwner && !deleteAccountPassword.trim())
                }
                onClick={confirmDeleteAccount}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {deletingAccount ? 'Đang xoá...' : 'Xác nhận xoá'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showResetPasswordModal && (
        <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={() => setShowResetPasswordModal(false)}>
          <div
            className="w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm sm:text-base ui-title text-amber-500 flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                Reset mật khẩu: {data.username}
              </h3>
              <button type="button" onClick={() => setShowResetPasswordModal(false)} className="p-1 rounded-xl border ui-dim cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 leading-relaxed font-semibold">
              Với quyền Super Admin, bạn có thể thiết lập trực tiếp mật khẩu mới cho tài khoản này. Sau khi đổi, phiên đăng nhập hiện tại của người dùng sẽ bị thu hồi.
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold ui-title">Mật khẩu mới (tối thiểu 6 ký tự):</label>
              <input
                type="text"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                placeholder="Nhập mật khẩu mới..."
                className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetPasswordModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold ui-dim border cursor-pointer"
                style={{ borderColor: 'var(--border-ui)' }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={resettingPassword || newPasswordInput.trim().length < 6}
                onClick={handleResetPassword}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {resettingPassword ? 'Đang cập nhật...' : 'Xác nhận đổi mật khẩu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {show2faModal && (
        <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={() => setShow2faModal(false)}>
          <div className="bg-card w-full max-w-sm rounded-3xl p-5 md:p-6 shadow-2xl relative border" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-emerald-500">
                <ShieldCheck className="w-5 h-5" />
                Cài đặt Bảo Mật 2FA
              </h3>
              <button type="button" onClick={() => setShow2faModal(false)} className="p-1 rounded-xl border ui-dim cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-xs ui-dim leading-relaxed">
                Sử dụng ứng dụng Authenticator (Google Authenticator, Authy, v.v.) để quét mã QR bên dưới, hoặc nhập mã bí mật thủ công:
              </p>
              
              {qrCode ? (
                <div className="bg-white p-3 rounded-2xl mx-auto w-fit border-2 border-emerald-500/20 shadow-xl shadow-emerald-500/10">
                  <img src={qrCode} alt="2FA QR Code" className="w-40 h-40" />
                </div>
              ) : (
                <div className="w-40 h-40 mx-auto bg-gray-100 dark:bg-zinc-800 rounded-2xl animate-pulse"></div>
              )}

              <div className="text-center">
                <p className="text-[10px] uppercase font-bold ui-dim mb-1">Mã bí mật (Secret Key)</p>
                <code className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-mono font-bold tracking-widest text-emerald-600 dark:text-emerald-400 select-all border border-zinc-200 dark:border-zinc-700">
                  {totpSecret || '...'}
                </code>
              </div>

              <div className="pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <label className="text-xs font-bold mb-1.5 block">Nhập mã gồm 6 chữ số từ app</label>
                <input
                  type="text"
                  maxLength={6}
                  value={totpInput}
                  onChange={e => setTotpInput(e.target.value)}
                  placeholder="Ví dụ: 123456"
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-mono tracking-widest text-center border focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
                />
              </div>

              {totpError && <p className="text-[11px] text-rose-500 font-bold text-center bg-rose-500/10 py-1.5 rounded-lg">{totpError}</p>}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={() => setShow2faModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold ui-subtle border border-transparent hover:border-zinc-500/20 cursor-pointer transition-colors">
                Đóng
              </button>
              <button
                type="button"
                onClick={handleVerify2FA}
                disabled={settingUp2fa || totpInput.length < 6}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {settingUp2fa ? 'Đang xác thực...' : 'Kích hoạt 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showBanModal && (
        <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={() => setShowBanModal(false)}>
          <div
            className="w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="font-extrabold text-sm sm:text-base ui-title text-red-500 flex items-center gap-2">
                <Flame className="w-5 h-5" />
                Đình chỉ tài khoản: {data.username}
              </h3>
              <button type="button" onClick={() => setShowBanModal(false)} className="p-1 rounded-xl border ui-dim cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs ui-dim leading-relaxed">
              Khi bị đình chỉ, người dùng sẽ bị đăng xuất ngay lập tức, hồ sơ cá nhân sẽ bị ẩn toàn bộ thông tin với người ngoài và bị khóa các tính năng.
            </p>

            {/* Duration selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold ui-title flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-red-500" />
                Thời hạn đình chỉ:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: '1', label: '1 ngày' },
                  { id: '3', label: '3 ngày' },
                  { id: '7', label: '7 ngày' },
                  { id: '30', label: '30 ngày' },
                  { id: '90', label: '90 ngày' },
                  { id: 'custom', label: 'Tuỳ chỉnh' },
                  { id: 'permanent', label: 'Vĩnh viễn' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setBanDuration(opt.id as any)}
                    className={`py-1.5 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      banDuration === opt.id
                        ? 'bg-red-500 text-white border-red-500 shadow-xs'
                        : 'border-[color:var(--border-ui)] hover:bg-[color:var(--bg-card)] ui-dim'
                    } ${opt.id === 'permanent' ? 'col-span-2' : ''}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {banDuration === 'custom' && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs ui-dim shrink-0">Số ngày:</span>
                  <input
                    type="number"
                    min="1"
                    max="3650"
                    value={banCustomDays}
                    onChange={(e) => setBanCustomDays(e.target.value)}
                    placeholder="Số ngày..."
                    className="w-24 px-3 py-1.5 rounded-xl text-xs font-bold border focus:outline-none focus:ring-2 focus:ring-red-500/50"
                    style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                  />
                  <span className="text-xs ui-dim">ngày</span>
                </div>
              )}

              <div className="p-2.5 rounded-xl border text-[11px] flex items-center gap-2" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                <Calendar className="w-4 h-4 text-red-500 shrink-0" />
                <span className="ui-dim">
                  {banDuration === 'permanent' ? (
                    <strong className="text-red-500">Đình chỉ vĩnh viễn không có thời hạn.</strong>
                  ) : (
                    <>
                      Dự kiến mở khoá:{' '}
                      <strong className="text-[color:var(--text-title)]">
                        {new Date(
                          Date.now() +
                            (banDuration === 'custom' ? Math.max(1, parseInt(banCustomDays, 10) || 1) : parseInt(banDuration, 10)) *
                              24 * 60 * 60 * 1000
                        ).toLocaleDateString('vi-VN')}
                      </strong>
                    </>
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold ui-title">Lý do đình chỉ (tùy chọn):</label>
              <textarea
                rows={3}
                value={banReasonInput}
                onChange={(e) => setBanReasonInput(e.target.value)}
                placeholder="Nhập lý do đình chỉ..."
                className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-y"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                autoFocus
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setShowBanModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold ui-dim border cursor-pointer"
                style={{ borderColor: 'var(--border-ui)' }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={banningUser}
                onClick={() => {
                  const days = banDuration === 'permanent' ? null : (banDuration === 'custom' ? Math.max(1, parseInt(banCustomDays, 10) || 1) : parseInt(banDuration, 10));
                  handleToggleBan('ban', banReasonInput, days);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {banningUser ? 'Đang xử lý...' : 'Xác nhận đình chỉ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
