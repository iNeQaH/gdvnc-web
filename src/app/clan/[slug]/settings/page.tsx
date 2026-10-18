'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Settings,
  ArrowLeft,
  Users,
  Shield,
  Palette,
  Image as ImageIcon,
  Video,
  Heart,
  Crown,
  AlertTriangle,
  Trash2,
  Check,
  X,
  Upload,
  Sparkles,
  Lock,
  UserCheck,
  UserX,
  Ban,
  Calendar,
  Clock,
  Loader2,
  FileText,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import { useTheme } from '@/components/ThemeProvider';
import { UserDisplayName } from '@/components/UserDisplayName';
import ColorPicker from '@/components/ColorPicker';
import { CircularAnglePicker } from '@/components/CircularAnglePicker';
import { getClanTier } from '@/lib/clanTypes';
import { handleMarkdownKeyDown, handleMarkdownPaste } from '@/lib/markdownShortcuts';

function hexToRgba(hex: string, alpha: number): string {
  const m = String(hex || '').trim().match(/^#?([0-9a-fA-F]{3,8})$/);
  if (!m) return `rgba(14, 165, 233, ${alpha})`;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length >= 6) {
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(2)})`;
  }
  return `rgba(14, 165, 233, ${alpha})`;
}

export default function ClanSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast, showConfirm } = useToast();
  const { language } = useLanguage();
  const isEn = language === 'en';
  const { resolvedMode } = useTheme();
  const isDark = resolvedMode === 'dark';

  const [clan, setClan] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Tabs: general | theme | requests | bans | advanced
  const initialTab = searchParams.get('tab') || 'general';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // General state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coverUrl, setCoverUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [favoriteLevelId, setFavoriteLevelId] = useState('');
  const [uploadingCover, setUploadingCover] = useState(false);

  // Tag styling state
  const [color, setColor] = useState('#f59e0b');
  const [useTagGradient, setUseTagGradient] = useState(false);
  const [tagGrad1, setTagGrad1] = useState('#f59e0b');
  const [tagGrad2, setTagGrad2] = useState('#ec4899');
  const [tagAngle, setTagAngle] = useState(90);

  // Theme styling state
  const [themeColor, setThemeColor] = useState('#0ea5e9');
  const [useThemeGradient, setUseThemeGradient] = useState(false);
  const [themeGrad1, setThemeGrad1] = useState('#0ea5e9');
  const [themeGrad2, setThemeGrad2] = useState('#8b5cf6');
  const [themeAngle, setThemeAngle] = useState(135);

  // Glow controls
  const [glowEnabled, setGlowEnabled] = useState(true);
  const [glowOpacity, setGlowOpacity] = useState(70);

  // Requests state
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [requestLoadingId, setRequestLoadingId] = useState<string | null>(null);

  // Bans state
  const [bans, setBans] = useState<any[]>([]);
  const [bansLoading, setBansLoading] = useState(false);
  const [banTargetUsername, setBanTargetUsername] = useState('');
  const [banDurationDays, setBanDurationDays] = useState<number | null>(7); // 7 days default
  const [banReason, setBanReason] = useState('');
  const [banSubmitting, setBanSubmitting] = useState(false);
  const [unbanLoadingId, setUnbanLoadingId] = useState<string | null>(null);

  // Transfer ownership state
  const [transferTargetId, setTransferTargetId] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [disbanding, setDisbanding] = useState(false);

  // Member management state
  const [roleUpdatingId, setRoleUpdatingId] = useState<string | null>(null);
  const [kickLoadingId, setKickLoadingId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [resClan, resMe] = await Promise.all([
        fetch(`/api/clans/${slug}`),
        fetch('/api/auth/me'),
      ]);

      const clanData = await resClan.json();
      const meData = await resMe.json();

      if (!resClan.ok || !clanData.success) {
        showToast(clanData.error || (isEn ? 'Clan not found.' : 'Không tìm thấy Clan.'), 'error');
        router.push('/clan');
        return;
      }

      const c = clanData.clan;
      setClan(c);
      const user = meData.user || null;
      setCurrentUser(user);

      if (!user) {
        showToast(isEn ? 'Please log in.' : 'Vui lòng đăng nhập.', 'error');
        router.push(`/clan/${slug}`);
        return;
      }

      const isLeader = c.leader?.id === user.id;
      const myMembership = c.membersGrouped?.mods?.find((m: any) => m.userId === user.id) ||
        (isLeader ? c.membersGrouped?.leader : null);
      const isClanMod = myMembership?.role === 'MODERATOR';
      const isOwnerWeb = user.role === 'ADMIN' && (user.username === 'iNeQaH' || user.isOwner);

      if (!isLeader && !isClanMod && !isOwnerWeb) {
        showToast(
          isEn
            ? 'You do not have permission to access Clan Settings.'
            : 'Bạn không có quyền truy cập Cài đặt Clan.',
          'error'
        );
        router.push(`/clan/${slug}`);
        return;
      }

      if (!isLeader && !isOwnerWeb) {
        setActiveTab('requests');
      }

      // Populate form state
      setName(c.name || '');
      setDescription(c.description || '');
      setCoverUrl(c.coverUrl || '');
      setVideoUrl(c.videoUrl || '');
      setFavoriteLevelId(c.favoriteLevel?.id || c.favoriteLevelId || '');
      setColor(c.color || '#f59e0b');

      if (c.colorGradient) {
        setUseTagGradient(true);
        const hexes = c.colorGradient.match(/#([0-9a-fA-F]{3,8})/g);
        if (hexes?.[0]) setTagGrad1(hexes[0]);
        if (hexes?.[1]) setTagGrad2(hexes[1]);
        const aMatch = c.colorGradient.match(/(\d+)deg/);
        if (aMatch) setTagAngle(parseInt(aMatch[1], 10));
      }

      if (c.themeColor) {
        const hex = c.themeColor.match(/#([0-9a-fA-F]{3,8})/);
        if (hex) setThemeColor(hex[0]);
      }

      if (c.themeGradient) {
        setUseThemeGradient(true);
        const hexes = c.themeGradient.match(/#([0-9a-fA-F]{3,8})/g);
        if (hexes?.[0]) setThemeGrad1(hexes[0]);
        if (hexes?.[1]) setThemeGrad2(hexes[1]);
        const aMatch = c.themeGradient.match(/(\d+)deg/);
        if (aMatch) setThemeAngle(parseInt(aMatch[1], 10));
      }

      const rawGlow = (c.themeGradient || '') + ' ' + (c.themeColor || '');
      const glowMatch = rawGlow.match(/\/\*glow:(\d+):(\d+)\*\//);
      if (glowMatch) {
        setGlowEnabled(glowMatch[1] === '1');
        setGlowOpacity(Math.min(Math.max(parseInt(glowMatch[2], 10) || 70, 10), 100));
      }

      setPendingRequests(c.pendingRequests || []);
    } catch {
      showToast(isEn ? 'Error loading clan settings.' : 'Lỗi khi tải cài đặt Clan.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadBans = async () => {
    setBansLoading(true);
    try {
      const res = await fetch(`/api/clans/${slug}/bans`);
      const data = await res.json();
      if (res.ok && data.success) {
        setBans(data.bans || []);
      }
    } catch (e) {
      console.warn('Lỗi khi tải danh sách chặn:', e);
    } finally {
      setBansLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [slug]);

  useEffect(() => {
    if (activeTab === 'bans') {
      loadBans();
    }
  }, [activeTab, slug]);

  if (loading || !clan) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[color:var(--accent)]" />
        <span className="text-xs ui-dim font-bold">{isEn ? 'Loading settings...' : 'Đang tải cài đặt...'}</span>
      </div>
    );
  }

  const tierInfo = getClanTier(clan.totalSp || 0);
  const isTier2Plus = tierInfo.tier >= 2;
  const isTier3 = tierInfo.tier === 3;

  const isLeader = clan.leader?.id === currentUser?.id;
  const isClanMod = clan.membersGrouped?.mods?.some((m: any) => m.userId === currentUser?.id);
  const isOwnerWeb = currentUser?.role === 'ADMIN' && (currentUser?.username === 'iNeQaH' || currentUser?.isOwner);
  const canEditInfo = isLeader || isOwnerWeb;

  // Handle Upload Banner
  const handleUploadCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/uploads', { method: 'POST', body: formData });
      const data = await res.json();
      const uploadedUrl = data.url || data.urls?.[0];
      if (res.ok && uploadedUrl) {
        setCoverUrl(uploadedUrl);
        showToast(isEn ? 'Cover photo uploaded successfully!' : 'Đã tải ảnh bìa thành công!', 'success');
      } else {
        showToast(data.error || (isEn ? 'Failed to upload photo.' : 'Tải ảnh thất bại.'), 'error');
      }
    } catch {
      showToast(isEn ? 'Error uploading photo.' : 'Lỗi khi tải ảnh.', 'error');
    } finally {
      setUploadingCover(false);
      e.target.value = '';
    }
  };

  // Handle Save Info & Theme
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditInfo) {
      showToast(isEn ? 'Only Clan Leader can edit settings.' : 'Chỉ Leader mới có quyền sửa thông tin.', 'error');
      return;
    }
    setSaving(true);

    try {
      const payload: any = {
        name: name.trim() || undefined,
        description: description.trim() || null,
        coverUrl: coverUrl.trim() || null,
        videoUrl: videoUrl.trim() || null,
        favoriteLevelId: favoriteLevelId.trim() || null,
        color: color || null,
        themeColor: themeColor || null,
      };

      // Chỉ Tier 3 mới có Glow
      const effectiveGlow = isTier3 ? glowEnabled : false;
      const glowSuffix = `/*glow:${effectiveGlow ? 1 : 0}:${glowOpacity}*/`;

      if (isTier2Plus) {
        payload.colorGradient = useTagGradient
          ? `linear-gradient(${tagAngle}deg, ${tagGrad1}, ${tagGrad2})`
          : null;
        payload.themeGradient = useThemeGradient
          ? `linear-gradient(${themeAngle}deg, ${themeGrad1}, ${themeGrad2})${glowSuffix}`
          : null;
      }

      if (payload.themeColor && !useThemeGradient) {
        payload.themeColor = `${payload.themeColor}${glowSuffix}`;
      }

      const res = await fetch(`/api/clans/${slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(isEn ? 'Settings updated successfully!' : 'Cập nhật cài đặt Clan thành công!', 'success');
        setClan(data.clan);
      } else {
        showToast(data.error || (isEn ? 'Failed to save settings.' : 'Lưu cài đặt thất bại.'), 'error');
      }
    } catch {
      showToast(isEn ? 'Connection error while saving.' : 'Lỗi kết nối khi lưu cài đặt.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle Approve / Reject Join Request
  const handleRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    setRequestLoadingId(requestId);
    try {
      const res = await fetch(`/api/clans/${slug}/requests/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(
          action === 'approve'
            ? isEn ? 'Member approved successfully!' : 'Đã duyệt thành viên vào Clan!'
            : isEn ? 'Request rejected.' : 'Đã từ chối đơn gia nhập.',
          'success'
        );
        setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else {
        showToast(data.error || (isEn ? 'Action failed.' : 'Thao tác thất bại.'), 'error');
      }
    } catch {
      showToast(isEn ? 'Connection error.' : 'Lỗi kết nối.', 'error');
    } finally {
      setRequestLoadingId(null);
    }
  };

  // Handle Ban User
  const handleBanUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!banTargetUsername.trim()) {
      showToast(isEn ? 'Please enter a username.' : 'Vui lòng nhập tên người dùng.', 'error');
      return;
    }

    setBanSubmitting(true);
    try {
      const res = await fetch(`/api/clans/${slug}/bans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: banTargetUsername.trim(),
          days: banDurationDays,
          reason: banReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || (isEn ? 'User banned successfully!' : 'Đã chặn người dùng thành công!'), 'success');
        setBanTargetUsername('');
        setBanReason('');
        loadBans();
      } else {
        showToast(data.error || (isEn ? 'Failed to ban user.' : 'Chặn người dùng thất bại.'), 'error');
      }
    } catch {
      showToast(isEn ? 'Connection error.' : 'Lỗi kết nối khi gửi yêu cầu.', 'error');
    } finally {
      setBanSubmitting(false);
    }
  };

  // Handle Unban User
  const handleUnbanUser = async (banId: string, username: string) => {
    showConfirm(
      isEn
        ? `Are you sure you want to unblock ${username}?`
        : `Bạn có chắc chắn muốn bỏ chặn cho ${username}?`,
      async () => {
        setUnbanLoadingId(banId);
        try {
          const res = await fetch(`/api/clans/${slug}/bans/${banId}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(data.message || (isEn ? 'User unblocked.' : 'Đã bỏ chặn người dùng.'), 'success');
            setBans((prev) => prev.filter((b) => b.id !== banId));
          } else {
            showToast(data.error || (isEn ? 'Failed to unblock.' : 'Bỏ chặn thất bại.'), 'error');
          }
        } catch {
          showToast(isEn ? 'Connection error.' : 'Lỗi kết nối.', 'error');
        } finally {
          setUnbanLoadingId(null);
        }
      }
    );
  };

  // Handle Transfer Ownership
  const handleTransfer = async () => {
    if (!transferTargetId) return;
    showConfirm(
      isEn
        ? 'Are you sure you want to transfer Clan Leader role? This action CANNOT be undone!'
        : 'Bạn có chắc chắn muốn chuyển giao quyền Trưởng Clan? Thao tác này KHÔNG THỂ hoàn tác!',
      async () => {
        setTransferring(true);
        try {
          const res = await fetch(`/api/clans/${slug}/transfer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ targetUserId: transferTargetId }),
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(isEn ? 'Clan ownership transferred successfully!' : 'Chuyển giao Trưởng Clan thành công!', 'success');
            router.push(`/clan/${slug}`);
          } else {
            showToast(data.error || (isEn ? 'Transfer failed.' : 'Chuyển giao thất bại.'), 'error');
          }
        } catch {
          showToast(isEn ? 'Connection error.' : 'Lỗi kết nối.', 'error');
        } finally {
          setTransferring(false);
        }
      }
    );
  };

  // Handle Disband Clan
  const handleDisband = async () => {
    showConfirm(
      isEn
        ? `Are you ABSOLUTELY sure you want to permanently disband clan [${clan.tag}] ${clan.name}? All data and SP will be deleted!`
        : `Bạn có THẬT SỰ chắc chắn muốn giải tán vĩnh viễn Clan [${clan.tag}] ${clan.name}? Mọi dữ liệu và đóng góp SP sẽ bị xóa hoàn toàn!`,
      async () => {
        setDisbanding(true);
        try {
          const res = await fetch(`/api/clans/${slug}`, { method: 'DELETE' });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(isEn ? 'Clan disbanded successfully.' : 'Đã giải tán Clan thành công.', 'success');
            router.push('/clan');
          } else {
            showToast(data.error || (isEn ? 'Failed to disband clan.' : 'Giải tán Clan thất bại.'), 'error');
          }
        } catch {
          showToast(isEn ? 'Connection error.' : 'Lỗi kết nối.', 'error');
        } finally {
          setDisbanding(false);
        }
      }
    );
  };

  // Handle Promote / Demote Member Role
  const handleToggleMemberRole = async (memberId: string, currentRole: string, username: string) => {
    if (!isLeader && !isOwnerWeb) {
      showToast(isEn ? 'Only Clan Leader can manage roles.' : 'Chỉ Leader mới có quyền thay đổi vai trò.', 'error');
      return;
    }
    const newRole = currentRole === 'MODERATOR' ? 'MEMBER' : 'MODERATOR';
    const actionText = newRole === 'MODERATOR'
      ? (isEn ? `Promote "${username}" to Clan Moderator?` : `Bổ nhiệm "${username}" làm Quản trị viên (Mod) Clan?`)
      : (isEn ? `Demote "${username}" to regular Member?` : `Gỡ quyền Quản trị viên (Mod) của "${username}" về thành viên thường?`);

    showConfirm(actionText, async () => {
      setRoleUpdatingId(memberId);
      try {
        const res = await fetch(`/api/clans/${slug}/members/${memberId}/role`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: newRole }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          showToast(
            newRole === 'MODERATOR'
              ? (isEn ? `Promoted "${username}" to Moderator!` : `Đã trao quyền Mod cho "${username}"!`)
              : (isEn ? `Demoted "${username}" to Member.` : `Đã gỡ quyền Mod của "${username}".`),
            'success'
          );
          await loadData();
        } else {
          showToast(data.error || (isEn ? 'Action failed.' : 'Thao tác thất bại.'), 'error');
        }
      } catch {
        showToast(isEn ? 'Connection error.' : 'Lỗi kết nối máy chủ.', 'error');
      } finally {
        setRoleUpdatingId(null);
      }
    });
  };

  // Handle Kick Member
  const handleKickMember = async (memberId: string, username: string) => {
    const isMod = clan.membersGrouped?.mods?.some((m: any) => m.id === memberId);
    if (!isLeader && !isOwnerWeb && (!isClanMod || isMod)) {
      showToast(isEn ? 'You do not have permission to kick this member.' : 'Bạn không có quyền trục xuất thành viên này.', 'error');
      return;
    }

    showConfirm(
      isEn ? `Are you sure you want to kick "${username}" from the Clan?` : `Bạn có chắc chắn muốn trục xuất "${username}" khỏi Clan?`,
      async () => {
        setKickLoadingId(memberId);
        try {
          const res = await fetch(`/api/clans/${slug}/members/${memberId}`, {
            method: 'DELETE',
          });
          const data = await res.json();
          if (res.ok && data.success) {
            showToast(data.message || (isEn ? `Kicked "${username}".` : `Đã trục xuất "${username}" khỏi Clan.`), 'success');
            await loadData();
          } else {
            showToast(data.error || (isEn ? 'Failed to kick member.' : 'Trục xuất thất bại.'), 'error');
          }
        } catch {
          showToast(isEn ? 'Connection error.' : 'Lỗi kết nối máy chủ.', 'error');
        } finally {
          setKickLoadingId(null);
        }
      }
    );
  };

  // Preview styling
  const previewBg = useThemeGradient
    ? `linear-gradient(${themeAngle}deg, ${themeGrad1}, ${themeGrad2})`
    : themeColor;

  const previewGlowAlpha = (glowOpacity / 100) * (isDark ? 0.6 : 0.35);
  const previewGlowBlur = Math.round(14 + (glowOpacity / 100) * 16);
  const previewBoxShadow = isTier3 && glowEnabled
    ? useThemeGradient
      ? `0 0 ${previewGlowBlur}px 2px ${hexToRgba(themeGrad1, previewGlowAlpha)}, 0 0 ${Math.round(previewGlowBlur * 0.7)}px ${hexToRgba(themeGrad2, previewGlowAlpha * 0.8)}`
      : `0 0 ${previewGlowBlur}px 2px ${hexToRgba(themeColor, previewGlowAlpha)}`
    : 'none';

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href={`/clan/${clan.slug}`}
            className="p-2 rounded-xl border ui-dim hover:text-white transition-colors cursor-pointer"
            style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
            title={isEn ? 'Back to Clan' : 'Quay lại Clan'}
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black text-amber-400">[{clan.tag}]</span>
              <h1 className="text-lg sm:text-xl font-black ui-title truncate">
                {isEn ? 'Clan Settings' : 'Cài đặt Clan'}: {clan.name}
              </h1>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider border ${
                  isTier3
                    ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                    : isTier2Plus
                    ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {tierInfo.name} ({clan.totalSp} SP)
              </span>
            </div>
            <p className="text-xs ui-dim mt-0.5">
              {isEn ? 'Manage information, appearance, join requests, and moderation.' : 'Quản lý thông tin, giao diện, duyệt đơn gia nhập và kiểm duyệt thành viên.'}
            </p>
          </div>
        </div>

        <Link
          href={`/clan/${clan.slug}`}
          className="px-4 py-2 rounded-xl text-xs font-bold border ui-dim hover:text-white transition-colors cursor-pointer text-center"
          style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
        >
          {isEn ? 'View Clan Page' : 'Xem trang Clan'}
        </Link>
      </div>

      {/* Tabs Navigation Bar */}
      <div className="flex items-center gap-2 border-b pb-2 overflow-x-auto select-none" style={{ borderColor: 'var(--border-subtle)' }}>
        {canEditInfo && (
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'general'
                ? 'bg-[color:var(--accent)] text-[color:var(--accent-fg)] shadow-sm'
                : 'ui-dim hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>{isEn ? 'General' : 'Thông tin chung'}</span>
          </button>
        )}

        {canEditInfo && (
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'theme'
                ? 'bg-[color:var(--accent)] text-[color:var(--accent-fg)] shadow-sm'
                : 'ui-dim hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>{isEn ? 'Decoration' : 'Trang trí'}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('members')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'members'
              ? 'bg-[color:var(--accent)] text-[color:var(--accent-fg)] shadow-sm'
              : 'ui-dim hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>{isEn ? 'Members' : 'Thành viên'}</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-black/10 dark:bg-white/10 text-current">
            {clan.memberCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap relative ${
            activeTab === 'requests'
              ? 'bg-[color:var(--accent)] text-[color:var(--accent-fg)] shadow-sm'
              : 'ui-dim hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>{isEn ? 'Applications' : 'Đơn xin'}</span>
          {pendingRequests.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-black">
              {pendingRequests.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bans')}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'bans'
              ? 'bg-[color:var(--accent)] text-[color:var(--accent-fg)] shadow-sm'
              : 'ui-dim hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
          }`}
        >
          <Ban className="w-4 h-4" />
          <span>{isEn ? 'Blacklist & Bans' : 'Chặn thành viên'}</span>
        </button>

        {canEditInfo && (
          <button
            type="button"
            onClick={() => setActiveTab('advanced')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'advanced'
                ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                : 'ui-dim hover:text-red-400 hover:bg-red-500/5'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{isEn ? 'Danger Zone' : 'Vùng nguy hiểm'}</span>
          </button>
        )}
      </div>

      {/* TAB 1: THÔNG TIN CHUNG */}
      {canEditInfo && activeTab === 'general' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="ui-card p-6 rounded-2xl border space-y-5" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}>
            <h2 className="text-sm font-bold ui-title flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <Settings className="w-4 h-4 text-sky-400" />
              <span>{isEn ? 'Clan Profile Information' : 'Thông tin hồ sơ Clan'}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold ui-title block">
                  {isEn ? 'Clan Name' : 'Tên Clan'}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!canEditInfo}
                  maxLength={40}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs ui-title bg-white dark:bg-black/40 border-slate-200 dark:border-white/10 focus:outline-hidden focus:border-amber-400 transition-colors"
                  placeholder="VD: Geometry Dash Vietnam"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold ui-title block">
                  {isEn ? 'Clan Tag (Read-only)' : 'Tên viết tắt / Tag (Cố định)'}
                </label>
                <div
                  className="w-full px-4 py-2.5 rounded-xl border text-xs font-mono font-bold ui-dim bg-slate-50 dark:bg-black/30 border-slate-200 dark:border-white/10"
                >
                  [{clan.tag}]
                </div>
              </div>
            </div>

            {/* Member Count */}
            <div className="space-y-2">
              <label className="text-xs font-bold ui-title flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5 text-sky-400" />
                  <span>{isEn ? 'Clan Members' : 'Số lượng thành viên'}</span>
                </span>
                <span className="text-xs font-extrabold ui-title">
                  {clan.memberCount ?? (1 + (clan.membersGrouped?.mods?.length || 0) + (clan.membersGrouped?.members?.length || 0))} / {tierInfo.maxMembers} {isEn ? 'members' : 'thành viên'}
                </span>
              </label>
              <div className="w-full px-4 py-2.5 rounded-xl border text-xs font-bold flex items-center justify-between bg-slate-50 dark:bg-black/30 border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-400" />
                  <span className="ui-title">
                    {clan.memberCount ?? (1 + (clan.membersGrouped?.mods?.length || 0) + (clan.membersGrouped?.members?.length || 0))} / {tierInfo.maxMembers} {isEn ? 'members' : 'thành viên'}
                  </span>
                </div>
                <span className="text-[11px] ui-dim font-medium">
                  {tierInfo.name} ({isEn ? `Max ${tierInfo.maxMembers}` : `Tối đa ${tierInfo.maxMembers}`})
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold ui-title flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isEn ? 'Clan Description (Discord Markdown)' : 'Mô tả & Giới thiệu Clan (Hỗ trợ Discord Markdown)'}</span>
                </label>
                <span className="text-[10px] ui-dim font-mono">{description.length}/1000</span>
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => handleMarkdownKeyDown(e, description, setDescription)}
                onPaste={(e) => handleMarkdownPaste(e, description, setDescription)}
                disabled={!canEditInfo}
                maxLength={1000}
                rows={4}
                className="w-full p-3.5 rounded-xl border text-xs ui-title bg-white dark:bg-black/40 border-slate-200 dark:border-white/10 focus:outline-hidden focus:border-amber-400 transition-colors resize-y leading-relaxed font-sans"
                placeholder={isEn ? 'Introduce your Clan, rules, Discord server, etc.' : 'Giới thiệu về Clan, tôn chỉ hoạt động, link Discord, v.v.'}
              />
            </div>

            {/* Banner Cover Upload */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold ui-title flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-sky-400" />
                <span>{isEn ? 'Clan Panoramic Banner' : 'Ảnh bìa toàn cảnh Clan'}</span>
              </label>

              {coverUrl ? (
                <div className="relative h-44 w-full rounded-2xl overflow-hidden border group" style={{ borderColor: 'var(--border-ui)' }}>
                  <img src={coverUrl} alt="Cover preview" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <label className="px-3.5 py-2 rounded-xl text-xs font-bold bg-white text-black cursor-pointer shadow-lg hover:scale-105 transition-transform flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Change Photo' : 'Đổi ảnh khác'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleUploadCover}
                        disabled={uploadingCover || !canEditInfo}
                        className="hidden"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setCoverUrl('')}
                      disabled={!canEditInfo}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 text-white cursor-pointer shadow-lg hover:bg-red-500 transition-colors flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Remove' : 'Gỡ ảnh'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <label className="border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-amber-400 transition-colors space-y-2 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10">
                  <Upload className="w-8 h-8 ui-dim" />
                  <div>
                    <span className="text-xs font-bold ui-title block">{isEn ? 'Upload banner image from computer' : 'Tải ảnh bìa từ máy tính'}</span>
                    <span className="text-[11px] ui-dim">{isEn ? 'Supports PNG, JPG, WebP up to 5MB' : 'Hỗ trợ PNG, JPG, WebP tối đa 5MB'}</span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadCover}
                    disabled={uploadingCover || !canEditInfo}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Media URLs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
              <div className="space-y-2">
                <label className="text-xs font-bold ui-title flex items-center gap-2">
                  <Video className="w-4 h-4 text-red-400" />
                  <span>{isEn ? 'YouTube Trailer URL' : 'Video Trailer YouTube của Clan'}</span>
                </label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  disabled={!canEditInfo}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs ui-title bg-white dark:bg-black/40 border-slate-200 dark:border-white/10 focus:outline-hidden focus:border-red-400 transition-colors"
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold ui-title flex items-center gap-2">
                  <Heart className="w-4 h-4 text-pink-400" />
                  <span>{isEn ? 'Favorite Level GD ID' : 'ID Level yêu thích của Clan'}</span>
                </label>
                <input
                  type="text"
                  value={favoriteLevelId}
                  onChange={(e) => setFavoriteLevelId(e.target.value)}
                  disabled={!canEditInfo}
                  className="w-full px-4 py-2.5 rounded-xl border text-xs ui-title bg-white dark:bg-black/40 border-slate-200 dark:border-white/10 focus:outline-hidden focus:border-pink-400 transition-colors font-mono"
                  placeholder="VD: 128 (Bloodbath)"
                />
              </div>
            </div>

            {canEditInfo && (
              <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[color:var(--accent)] text-[color:var(--accent-fg)] flex items-center gap-2 shadow-md cursor-pointer hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isEn ? 'Save Information' : 'Lưu thông tin'}</span>
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      {/* TAB 2: GIAO DIỆN & THEME (MÀU, GRADIENT, GLOW TIER 3) */}
      {canEditInfo && activeTab === 'theme' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="ui-card p-6 rounded-2xl border space-y-6" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}>
            <h2 className="text-sm font-bold ui-title flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <Palette className="w-4 h-4 text-purple-400" />
              <span>{isEn ? 'Clan Theme & Visual Customization' : 'Tùy biến giao diện & Theme Clan'}</span>
            </h2>

            {/* LIVE PREVIEW BOX */}
            <div className="space-y-2">
              <label className="text-xs font-bold ui-title block">{isEn ? 'Live Theme Preview' : 'Xem trước giao diện (Live Preview)'}</label>
              <div
                className="p-5 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-4"
                style={{
                  background: previewBg,
                  borderColor: isTier3 && glowEnabled ? themeGrad1 || themeColor : 'var(--border-ui)',
                  boxShadow: previewBoxShadow,
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="inline-flex items-center px-3 py-1 rounded-xl border font-mono font-black text-sm shadow-sm backdrop-blur-xs select-none bg-black/40 border-white/20"
                  >
                    <span
                      style={
                        useTagGradient
                          ? {
                              backgroundImage: `linear-gradient(${tagAngle}deg, ${tagGrad1}, ${tagGrad2})`,
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                            }
                          : { color }
                      }
                    >
                      [{clan.tag}]
                    </span>
                  </span>
                  <div>
                    <h3 className="font-bold text-sm text-white drop-shadow-sm">{clan.name}</h3>
                    <p className="text-[11px] text-white/80 font-mono">{tierInfo.name} • {clan.totalSp} SP</p>
                  </div>
                </div>

                <div className="px-3 py-1 rounded-xl bg-black/40 border border-white/20 text-xs font-mono font-bold text-white backdrop-blur-md">
                  Preview Card
                </div>
              </div>
            </div>

            {/* TAG COLOR STYLING */}
            <div className="space-y-3 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                  <span>{isEn ? 'Tag Font Color' : 'Màu chữ Tag viết tắt [{clan.tag}]'}</span>
                </label>
                {isTier2Plus ? (
                  <button
                    type="button"
                    onClick={() => setUseTagGradient(!useTagGradient)}
                    className="text-[11px] font-bold text-sky-400 hover:underline cursor-pointer"
                  >
                    {useTagGradient ? (isEn ? 'Switch to Solid Color' : 'Chuyển sang màu đơn') : (isEn ? 'Switch to 2-Color Gradient' : 'Mở khóa Gradient 2 màu')}
                  </button>
                ) : (
                  <span className="text-[10px] ui-dim flex items-center gap-1">
                    <Lock className="w-3 h-3" /> {isEn ? 'Gradient unlocks at Tier 2' : 'Cần Tier 2 để mở khóa Gradient'}
                  </span>
                )}
              </div>

              {useTagGradient && isTier2Plus ? (
                <div className="p-4 rounded-xl border space-y-4 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[11px] font-bold ui-dim block mb-1.5">{isEn ? 'Color 1' : 'Màu bắt đầu (1)'}</span>
                      <ColorPicker value={tagGrad1} onChange={setTagGrad1} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold ui-dim block mb-1.5">{isEn ? 'Color 2' : 'Màu kết thúc (2)'}</span>
                      <ColorPicker value={tagGrad2} onChange={setTagGrad2} />
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold ui-dim block mb-1.5">{isEn ? 'Gradient Angle' : 'Góc xoay Gradient'}</span>
                    <CircularAnglePicker value={tagAngle} onChange={setTagAngle} />
                  </div>
                </div>
              ) : (
                <ColorPicker value={color} onChange={setColor} />
              )}
            </div>

            {/* CLAN THEME & GRADIENT */}
            <div className="space-y-3 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-sky-400" />
                  <span>{isEn ? 'Clan Backdrop & Accent Theme' : 'Theme màu chủ đạo trang Clan'}</span>
                </label>
                {isTier2Plus ? (
                  <button
                    type="button"
                    onClick={() => setUseThemeGradient(!useThemeGradient)}
                    className="text-[11px] font-bold text-purple-400 hover:underline cursor-pointer"
                  >
                    {useThemeGradient ? (isEn ? 'Switch to Solid Theme' : 'Chuyển sang màu đơn') : (isEn ? 'Switch to Gradient Theme' : 'Mở khóa Gradient Theme')}
                  </button>
                ) : (
                  <span className="text-[10px] ui-dim flex items-center gap-1">
                    <Lock className="w-3 h-3" /> {isEn ? 'Theme gradient unlocks at Tier 2' : 'Cần Tier 2 để mở khóa Theme Gradient'}
                  </span>
                )}
              </div>

              {useThemeGradient && isTier2Plus ? (
                <div className="p-4 rounded-xl border space-y-4 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[11px] font-bold ui-dim block mb-1.5">{isEn ? 'Theme Color 1' : 'Màu Theme (1)'}</span>
                      <ColorPicker value={themeGrad1} onChange={setThemeGrad1} />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold ui-dim block mb-1.5">{isEn ? 'Theme Color 2' : 'Màu Theme (2)'}</span>
                      <ColorPicker value={themeGrad2} onChange={setThemeGrad2} />
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] font-bold ui-dim block mb-1.5">{isEn ? 'Theme Gradient Angle' : 'Góc xoay Theme'}</span>
                    <CircularAnglePicker value={themeAngle} onChange={setThemeAngle} />
                  </div>
                </div>
              ) : (
                <ColorPicker value={themeColor} onChange={setThemeColor} />
              )}
            </div>

            {/* GLOW CONTROLS (TIER 3 ONLY) */}
            <div className="space-y-3 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>{isEn ? 'Clan Border Glow Effect (Tier 3 Exclusive)' : 'Hiệu ứng viền phát sáng Glow Clan (Đặc quyền Cấp 3)'}</span>
                </label>
                {isTier3 ? (
                  <button
                    type="button"
                    onClick={() => setGlowEnabled(!glowEnabled)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                      glowEnabled
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-black/10 text-white/50 border-white/10'
                    }`}
                  >
                    {glowEnabled ? (isEn ? 'Glow: ON' : 'Glow: Bật') : (isEn ? 'Glow: OFF' : 'Glow: Tắt')}
                  </button>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> {isEn ? 'Requires Tier 3' : 'Yêu cầu Cấp 3 (Tier 3)'}
                  </span>
                )}
              </div>

              {isTier3 ? (
                <div className={`p-4 rounded-xl border space-y-3 transition-opacity ${glowEnabled ? 'opacity-100' : 'opacity-50'}`} style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-subtle)' }}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="ui-dim font-bold">{isEn ? 'Glow Intensity / Opacity' : 'Độ sáng / mờ của Glow:'}</span>
                    <span className="font-mono font-black text-purple-400">{glowOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={glowOpacity}
                    onChange={(e) => setGlowOpacity(parseInt(e.target.value, 10))}
                    disabled={!glowEnabled}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                  <p className="text-[11px] ui-dim">
                    {isEn
                      ? 'Adjust brightness and ambient radiance of the clan cards and details page.'
                      : 'Điều chỉnh độ sáng và độ tỏa của hào quang viền trên thẻ clan và trang chi tiết.'}
                  </p>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed text-xs ui-dim space-y-1 bg-black/5 dark:bg-black/10" style={{ borderColor: 'var(--border-ui)' }}>
                  <div className="flex items-center gap-2 font-bold text-amber-500">
                    <Lock className="w-4 h-4" />
                    <span>{isEn ? 'Locked: Clan Tier 3 (20 SP) Required' : 'Đang khóa: Yêu cầu Clan đạt Cấp 3 (Tier 3 - 20 SP)'}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {isEn
                      ? `Your clan currently has ${clan.totalSp}/20 SP. Pledge ${Math.max(0, 20 - clan.totalSp)} more SP coins to reach Tier 3 and unlock clan glow effects!`
                      : `Clan của bạn hiện có ${clan.totalSp}/20 SP. Cần đóng góp thêm ${Math.max(0, 20 - clan.totalSp)} SP coin để lên Cấp 3 và kích hoạt hiệu ứng hào quang phát sáng Glow!`}
                  </p>
                </div>
              )}
            </div>

            {canEditInfo && (
              <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[color:var(--accent)] text-[color:var(--accent-fg)] flex items-center gap-2 shadow-md cursor-pointer hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>{isEn ? 'Save Appearance' : 'Lưu giao diện'}</span>
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      {/* TAB: THÀNH VIÊN & TRAO QUYỀN (MEMBERS & ROLES) */}
      {activeTab === 'members' && (
        <div className="space-y-6">
          <div className="ui-card p-6 rounded-2xl border space-y-4" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <h2 className="text-sm font-bold ui-title flex items-center gap-2 uppercase tracking-wider">
                  <Users className="w-4 h-4 text-purple-400" />
                  <span>{isEn ? 'Clan Members & Role Management' : 'Quản lý Thành viên & Phân quyền'}</span>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-mono">
                    {clan.memberCount} / {tierInfo.maxMembers}
                  </span>
                </h2>
                <p className="text-xs ui-dim mt-1">
                  {isEn
                    ? 'Promote or demote Clan Moderators, view contribution SP, and manage roster.'
                    : 'Trao hoặc gỡ quyền Quản trị viên (Mod), theo dõi điểm SP đóng góp và quản lý thành viên.'}
                </p>
              </div>

              {canEditInfo && (
                <div className="flex items-center gap-2 text-xs ui-dim bg-black/5 dark:bg-white/5 px-3 py-1.5 rounded-xl border border-black/10 dark:border-white/10 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-500" />
                  <span>{isEn ? 'Leader Privilege Active' : 'Quyền Leader: Toàn quyền bổ nhiệm'}</span>
                </div>
              )}
            </div>

            {/* List of Members */}
            <div className="space-y-3">
              {(() => {
                const leader = clan.membersGrouped?.leader;
                const mods: any[] = clan.membersGrouped?.mods || [];
                const regularMembers: any[] = clan.membersGrouped?.members || [];
                const allList = [
                  ...(leader ? [{ ...leader, role: 'LEADER' }] : []),
                  ...mods.map((m) => ({ ...m, role: 'MODERATOR' })),
                  ...regularMembers.map((m) => ({ ...m, role: 'MEMBER' })),
                ];

                if (allList.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs ui-dim">
                      {isEn ? 'No members found.' : 'Không có thành viên nào.'}
                    </div>
                  );
                }

                return allList.map((m) => {
                  const u = m.user || {};
                  const isThisLeader = m.role === 'LEADER' || m.userId === clan.leader?.id;
                  const isThisMod = m.role === 'MODERATOR';
                  const isSelf = m.userId === currentUser?.id;
                  const isUpdatingRole = roleUpdatingId === m.id;
                  const isKicking = kickLoadingId === m.id;

                  // Find SP pledge
                  const pledge = clan.contributions?.find((c: any) => c.userId === m.userId)?.spPledged || 0;

                  return (
                    <div
                      key={m.id}
                      className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                      style={{
                        backgroundColor: isThisLeader
                          ? 'rgba(245, 158, 11, 0.04)'
                          : isThisMod
                          ? 'rgba(168, 85, 247, 0.04)'
                          : 'var(--bg-subtle)',
                        borderColor: isThisLeader
                          ? 'rgba(245, 158, 11, 0.3)'
                          : isThisMod
                          ? 'rgba(168, 85, 247, 0.3)'
                          : 'var(--border-subtle)',
                      }}
                    >
                      {/* Left: Avatar & Info */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <Link
                          href={`/profile/${encodeURIComponent(u.username || '')}`}
                          className="relative w-11 h-11 rounded-full overflow-hidden bg-slate-900 border-2 shrink-0 group hover:opacity-90 transition-opacity"
                          style={{
                            borderColor: isThisLeader ? '#f59e0b' : isThisMod ? '#a855f7' : 'var(--border-ui)',
                          }}
                        >
                          {u.avatarUrl ? (
                            <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs ui-dim">
                              {u.username?.[0]?.toUpperCase()}
                            </div>
                          )}
                        </Link>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Link
                              href={`/profile/${encodeURIComponent(u.username || '')}`}
                              className="font-bold text-sm ui-title hover:underline flex items-center gap-1.5"
                            >
                              <UserDisplayName user={u} showClanTag={false} />
                            </Link>

                            {/* Role Badge */}
                            {isThisLeader ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                <Crown className="w-3 h-3 text-amber-500" />
                                {isEn ? 'Leader' : 'Trưởng Clan'}
                              </span>
                            ) : isThisMod ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
                                <ShieldCheck className="w-3 h-3 text-purple-500" />
                                {isEn ? 'Moderator' : 'Quản trị viên'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-500/10 text-slate-500 dark:text-slate-400 border border-slate-500/20">
                                {isEn ? 'Member' : 'Thành viên'}
                              </span>
                            )}

                            {isSelf && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 border border-sky-500/20">
                                {isEn ? 'You' : 'Bạn'}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] ui-dim flex-wrap font-medium">
                            <span>
                              {isEn ? 'Joined:' : 'Tham gia:'}{' '}
                              {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString(isEn ? 'en-US' : 'vi-VN') : '—'}
                            </span>
                            {pledge > 0 && (
                              <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">
                                • {pledge} SP Coin
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 flex-wrap sm:justify-end">
                        {canEditInfo && !isThisLeader && !isSelf && (
                          <>
                            {isThisMod ? (
                              <button
                                type="button"
                                disabled={isUpdatingRole || isKicking}
                                onClick={() => handleToggleMemberRole(m.id, 'MODERATOR', u.username)}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                                title={isEn ? 'Demote to regular member' : 'Gỡ quyền Quản trị viên của thành viên này'}
                              >
                                {isUpdatingRole ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                                <span>{isEn ? 'Demote Mod' : 'Gỡ Mod'}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isUpdatingRole || isKicking}
                                onClick={() => handleToggleMemberRole(m.id, 'MEMBER', u.username)}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                                title={isEn ? 'Promote to Clan Moderator' : 'Bổ nhiệm thành viên này làm Quản trị viên Clan'}
                              >
                                {isUpdatingRole ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                                <span>{isEn ? 'Promote Mod' : 'Trao Mod'}</span>
                              </button>
                            )}

                            <button
                              type="button"
                              disabled={isUpdatingRole || isKicking}
                              onClick={() => handleKickMember(m.id, u.username)}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                              title={isEn ? 'Kick member from Clan' : 'Trục xuất thành viên khỏi Clan'}
                            >
                              {isKicking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                              <span>{isEn ? 'Kick' : 'Trục xuất'}</span>
                            </button>
                          </>
                        )}

                        {/* Mod kicking regular member */}
                        {!canEditInfo && isClanMod && !isThisLeader && !isThisMod && !isSelf && (
                          <button
                            type="button"
                            disabled={isKicking}
                            onClick={() => handleKickMember(m.id, u.username)}
                            className="px-3.5 py-2 rounded-xl text-xs font-bold border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/10 flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all shadow-xs"
                            title={isEn ? 'Kick member from Clan' : 'Trục xuất thành viên khỏi Clan'}
                          >
                            {isKicking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserX className="w-3.5 h-3.5" />}
                            <span>{isEn ? 'Kick' : 'Trục xuất'}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DUYỆT ĐƠN GIA NHẬP */}
      {activeTab === 'requests' && (
        <div className="ui-card p-6 rounded-2xl border space-y-5" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}>
          <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <div>
              <h2 className="text-sm font-bold ui-title flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-amber-400" />
                <span>{isEn ? 'Member Join Requests' : 'Hàng đợi duyệt đơn gia nhập'}</span>
              </h2>
              <p className="text-xs ui-dim mt-0.5">
                {isEn ? 'Review and approve new member applications.' : 'Xem xét và phê duyệt người chơi xin gia nhập Clan.'}
              </p>
            </div>
            <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              {pendingRequests.length} {isEn ? 'pending' : 'đơn chờ'}
            </span>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-2 ui-dim">
              <UserCheck className="w-10 h-10 opacity-30" />
              <span className="text-xs font-bold">{isEn ? 'No pending requests at the moment.' : 'Hiện không có đơn xin gia nhập nào.'}</span>
              <p className="text-[11px] max-w-sm">
                {isEn ? 'When a player applies to join your clan, their request will appear here and notify Leaders & Mods.' : 'Khi có người gửi đơn xin vào clan, yêu cầu sẽ xuất hiện tại đây và thông báo đến hòm thư của bạn.'}
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
              {pendingRequests.map((req) => (
                <div key={req.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl overflow-hidden border bg-slate-900 shrink-0" style={{ borderColor: 'var(--border-ui)' }}>
                      {req.user?.avatarUrl ? (
                        <img src={req.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-xs ui-dim">
                          {req.user?.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/profile/${req.user?.username}`} className="font-bold text-xs ui-title hover:underline">
                          <UserDisplayName user={req.user} showClanTag={false} />
                        </Link>
                        <span className="font-mono text-[11px] text-amber-400 font-bold">
                          {(req.user?.classicPp || 0).toLocaleString()} Pt
                        </span>
                        <span className="text-[10px] ui-dim flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {new Date(req.createdAt).toLocaleDateString(isEn ? 'en-US' : 'vi-VN')}
                        </span>
                      </div>

                      {req.message ? (
                        <p className="text-xs ui-title leading-relaxed bg-slate-50 dark:bg-black/30 p-2.5 rounded-xl border border-dashed border-slate-200 dark:border-white/10">
                          &ldquo;{req.message}&rdquo;
                        </p>
                      ) : (
                        <p className="text-[11px] ui-dim italic">{isEn ? 'No message included.' : 'Không kèm lời nhắn.'}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleRequestAction(req.id, 'reject')}
                      disabled={requestLoadingId === req.id}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{isEn ? 'Reject' : 'Từ chối'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRequestAction(req.id, 'approve')}
                      disabled={requestLoadingId === req.id}
                      className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-600 text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                    >
                      {requestLoadingId === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Check className="w-3.5 h-3.5" />
                      )}
                      <span>{isEn ? 'Approve' : 'Duyệt'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CHẶN THÀNH VIÊN (BLACKLIST & BANS) */}
      {activeTab === 'bans' && (
        <div className="space-y-6">
          {/* Form Chặn mới */}
          <form onSubmit={handleBanUser} className="ui-card p-6 rounded-2xl border space-y-4" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}>
            <h2 className="text-sm font-bold ui-title flex items-center gap-2 border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <Ban className="w-4 h-4 text-red-400" />
              <span>{isEn ? 'Block User from Clan' : 'Chặn người dùng khỏi Clan'}</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
              <div className="md:col-span-5 space-y-1.5">
                <label className="text-xs font-bold ui-title block">
                  {isEn ? 'Username to block' : 'Tên tài khoản cần chặn'}
                </label>
                <input
                  type="text"
                  value={banTargetUsername}
                  onChange={(e) => setBanTargetUsername(e.target.value)}
                  placeholder="VD: ineqah"
                  className="w-full px-3.5 py-2 rounded-xl border text-xs ui-title bg-white dark:bg-black/40 border-slate-200 dark:border-white/10 focus:outline-hidden focus:border-red-400 transition-colors"
                />
              </div>

              <div className="md:col-span-4 space-y-1.5">
                <label className="text-xs font-bold ui-title block">
                  {isEn ? 'Duration' : 'Thời hạn chặn'}
                </label>
                <select
                  value={banDurationDays === null ? 'perm' : String(banDurationDays)}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBanDurationDays(val === 'perm' ? null : parseInt(val, 10));
                  }}
                  className="w-full px-3.5 py-2 rounded-xl border text-xs ui-title bg-white dark:bg-black/40 border-slate-200 dark:border-white/10 focus:outline-hidden focus:border-red-400 transition-colors cursor-pointer"
                >
                  <option value="1">{isEn ? '1 day' : '1 ngày'}</option>
                  <option value="3">{isEn ? '3 days' : '3 ngày'}</option>
                  <option value="7">{isEn ? '7 days' : '7 ngày'}</option>
                  <option value="30">{isEn ? '30 days' : '30 ngày'}</option>
                  <option value="perm">{isEn ? 'Permanent (Forever)' : 'Vĩnh viễn'}</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <button
                  type="submit"
                  disabled={banSubmitting || !banTargetUsername.trim()}
                  className="w-full py-2 px-4 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {banSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />}
                  <span>{isEn ? 'Confirm Block' : 'Chặn khỏi Clan'}</span>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold ui-title block">
                {isEn ? 'Reason (Optional)' : 'Lý do chặn (Tùy chọn)'}
              </label>
              <input
                type="text"
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                maxLength={200}
                placeholder={isEn ? 'e.g., Harassment, cheating, spamming' : 'VD: Gian lận, thái độ không phù hợp, phá hoại'}
                className="w-full px-3.5 py-2 rounded-xl border text-xs ui-title bg-white dark:bg-black/40 border-slate-200 dark:border-white/10 focus:outline-hidden focus:border-red-400 transition-colors"
              />
            </div>
          </form>

          {/* Danh sách đang bị chặn */}
          <div className="ui-card p-6 rounded-2xl border space-y-4" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}>
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="text-xs font-bold ui-title uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-red-400" />
                <span>{isEn ? 'Currently Blocked Users' : 'Danh sách người dùng đang bị chặn'} ({bans.length})</span>
              </h3>
            </div>

            {bansLoading ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin ui-dim" />
              </div>
            ) : bans.length === 0 ? (
              <div className="py-8 text-center text-xs ui-dim">
                {isEn ? 'No users are currently blocked from this clan.' : 'Không có người dùng nào bị chặn khỏi Clan.'}
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                {bans.map((b) => (
                  <div key={b.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-900 border shrink-0" style={{ borderColor: 'var(--border-ui)' }}>
                        {b.avatarUrl ? (
                          <img src={b.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-xs ui-dim">
                            {b.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs ui-title">{b.username}</span>
                          <span
                            className={`px-2 py-0.2 rounded text-[10px] font-black uppercase ${
                              b.expiresAt ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}
                          >
                            {b.expiresAt
                              ? isEn
                                ? `Until ${new Date(b.expiresAt).toLocaleDateString('en-US')}`
                                : `Đến ${new Date(b.expiresAt).toLocaleDateString('vi-VN')}`
                              : isEn ? 'Permanent' : 'Vĩnh viễn'}
                          </span>
                        </div>
                        {b.reason && <p className="text-[11px] ui-dim truncate mt-0.5">{b.reason}</p>}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleUnbanUser(b.id, b.username)}
                      disabled={unbanLoadingId === b.id}
                      className="px-3 py-1 rounded-lg text-xs font-bold border border-white/10 hover:border-emerald-500 text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer shrink-0"
                    >
                      {unbanLoadingId === b.id ? <Loader2 className="w-3 h-3 animate-spin" /> : isEn ? 'Unblock' : 'Bỏ chặn'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: NÂNG CAO & SỞ HỮU (CHUYỂN GIAO / GIẢI TÁN) */}
      {activeTab === 'advanced' && canEditInfo && (
        <div className="space-y-6">
          {/* Chuyển giao Host */}
          <div className="ui-card p-6 rounded-2xl border space-y-4" style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}>
            <h2 className="text-sm font-bold ui-title flex items-center gap-2 text-amber-400 border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <Crown className="w-4 h-4" />
              <span>{isEn ? 'Transfer Clan Ownership (Leader)' : 'Chuyển giao quyền Trưởng Clan (Leader)'}</span>
            </h2>
            <p className="text-xs ui-dim leading-relaxed">
              {isEn
                ? 'Select an active clan member to promote as the new Clan Leader. You will become a regular member.'
                : 'Chọn một thành viên trong Clan để bàn giao vị trí Trưởng Clan. Sau khi chuyển giao, bạn sẽ trở thành thành viên thường.'}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <select
                value={transferTargetId}
                onChange={(e) => setTransferTargetId(e.target.value)}
                className="w-full sm:w-80 px-3.5 py-2.5 rounded-xl border text-xs ui-title bg-white dark:bg-black/40 border-slate-200 dark:border-white/10 focus:outline-hidden focus:border-amber-400 transition-colors cursor-pointer"
              >
                <option value="">{isEn ? '-- Select clan member --' : '-- Chọn thành viên Clan --'}</option>
                {clan.membersGrouped?.mods?.map((m: any) => (
                  <option key={m.userId} value={m.userId}>
                    [Mod] {m.user.username}
                  </option>
                ))}
                {clan.membersGrouped?.members?.map((m: any) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.username}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleTransfer}
                disabled={!transferTargetId || transferring}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm shrink-0"
              >
                {transferring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crown className="w-3.5 h-3.5" />}
                <span>{isEn ? 'Transfer Ownership' : 'Chuyển giao ngay'}</span>
              </button>
            </div>
          </div>

          {/* Vùng nguy hiểm: Giải tán clan */}
          <div className="ui-card p-6 rounded-2xl border border-red-500/30 space-y-4 bg-red-500/5">
            <h2 className="text-sm font-bold text-red-400 flex items-center gap-2 border-b border-red-500/20 pb-3">
              <AlertTriangle className="w-4 h-4" />
              <span>{isEn ? 'Danger Zone: Disband Clan' : 'Vùng nguy hiểm: Giải tán Clan'}</span>
            </h2>
            <p className="text-xs text-red-300/80 leading-relaxed">
              {isEn
                ? 'Disbanding the clan is an irreversible action. All members will be removed, and all SP contributions will be permanently lost.'
                : 'Giải tán Clan là hành động vĩnh viễn không thể khôi phục. Mọi thành viên sẽ bị trục xuất, điểm SP đóng góp sẽ bị mất và tên/tag Clan sẽ bị xóa khỏi hệ thống.'}
            </p>

            <button
              type="button"
              onClick={handleDisband}
              disabled={disbanding}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2 shadow-md"
            >
              {disbanding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              <span>{isEn ? 'Disband Clan Permanently' : 'Giải tán vĩnh viễn Clan'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
