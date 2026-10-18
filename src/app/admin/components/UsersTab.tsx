'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck, Trash2, 
  X, 
  RefreshCw, 
  Search, 
  UserCheck,
  Crown,
  Heart,
  Shield,
  LayoutGrid,
  List,
  FolderPlus,
  Plus,
  Minus,
  MoreVertical,
  ExternalLink,
  Ban,
  Unlock,
  Check,
  RotateCcw,
  Medal,
  ShieldAlert,
  User as UserIcon,
} from 'lucide-react';
import BadgeIcon, { IconGlyph } from '@/components/BadgeIcon';
import BadgePickerModal from '@/components/BadgePickerModal';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import ColorPicker from '@/components/ColorPicker';
import { BADGE_ICON_NAMES } from '@/lib/badgeIconCatalog';
import { type DictKey } from '@/lib/dictionaries';
import { isSuperAdminUser } from '@/lib/roles';
import { calculateUserSp } from '@/lib/clanTypes';

const allIconNames = BADGE_ICON_NAMES;

function AdminListPager({
  page,
  total,
  onPage,
  t,
  pageSize = 10,
}: {
  page: number;
  total: number;
  onPage: (p: number) => void;
  t: (key: DictKey, vars?: Record<string, string | number>) => string;
  pageSize?: number;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-1">
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

function formatRelativeTime(dateStr?: string | Date | null, isEn?: boolean): string {
  if (!dateStr) return isEn ? 'Never' : 'Chưa có';
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  if (isNaN(diff)) return '—';
  if (diff < 60_000) return isEn ? 'Just now' : 'Vừa xong';
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return isEn ? `${mins}m ago` : `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return isEn ? `${hours}h ago` : `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return isEn ? `${days}d ago` : `${days} ngày trước`;
  return d.toLocaleDateString(isEn ? 'en-US' : 'vi-VN');
}

export default function UsersTab({ currentUser }: { currentUser: any }) {
  const { t, language } = useLanguage();
  const { showToast, showConfirm } = useToast();
  const router = useRouter();
  const locale = language === 'en' ? 'en-US' : 'vi-VN';

  // User management state
  const [userQuery, setUserQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'MODERATOR' | 'SUPPORTER' | 'USER'>('ALL');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('asc');
  const [userPage, setUserPage] = useState(1);
  const [userSort, setUserSort] = useState<'createdAt' | 'role' | 'pp' | 'lastActive'>('createdAt');

  const [deleteUserTarget, setDeleteUserTarget] = useState<{ id: string; username: string } | null>(null);
  const [deleteUserReason, setDeleteUserReason] = useState('');
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  
  // Supporter state
  const [supporterTarget, setSupporterTarget] = useState<{ id: string; username: string } | null>(null);
  const [supporterMonths, setSupporterMonths] = useState('1');
  const [isSupporterModalOpen, setIsSupporterModalOpen] = useState(false);
  const [givingSupporter, setGivingSupporter] = useState(false);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Role privileges
  const isSuperAdmin = Boolean(currentUser && isSuperAdminUser(currentUser));
  const isFullAdmin = currentUser?.role === 'ADMIN' || isSuperAdmin;
  const isStaff = isFullAdmin || currentUser?.role === 'MODERATOR';

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    user: any | null;
  }>({ visible: false, x: 0, y: 0, user: null });

  // Manage Role & Badges Modal state
  const [manageRoleTarget, setManageRoleTarget] = useState<any | null>(null);
  const [selectedRole, setSelectedRole] = useState<'USER' | 'MODERATOR' | 'ADMIN'>('USER');
  const [supporterMode, setSupporterMode] = useState<'keep' | 'modify'>('keep');
  const [supporterMonthsInput, setSupporterMonthsInput] = useState<number>(0);
  const [badgesList, setBadgesList] = useState<any[]>([]);
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<string[]>([]);
  const [showBadgePicker, setShowBadgePicker] = useState(false);
  const [savingRoleChanges, setSavingRoleChanges] = useState(false);

  // Reset Password Modal state
  const [resetPasswordTarget, setResetPasswordTarget] = useState<any | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  // Ban / Unban Modal state
  const [banTarget, setBanTarget] = useState<any | null>(null);
  const [banReason, setBanReason] = useState('');
  const [banningUser, setBanningUser] = useState(false);

  useEffect(() => {
    const handleCloseMenu = () => {
      setContextMenu((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    };
    window.addEventListener('click', handleCloseMenu);
    return () => {
      window.removeEventListener('click', handleCloseMenu);
    };
  }, []);

  const handleOpenContextMenu = (e: React.MouseEvent, user: any) => {
    e.preventDefault();
    e.stopPropagation();
    const menuWidth = 230;
    const menuHeight = 300;
    const x = Math.min(e.clientX, window.innerWidth - menuWidth - 10);
    const y = Math.min(e.clientY, window.innerHeight - menuHeight - 10);
    setContextMenu({ visible: true, x: Math.max(10, x), y: Math.max(10, y), user });
  };

  const handleOpenManageRole = async (user: any) => {
    setManageRoleTarget(user);
    setSelectedRole(user.role === 'ADMIN' ? 'ADMIN' : (user.role === 'MODERATOR' ? 'MODERATOR' : 'USER'));
    const remaining = calculateUserSp(user);
    setSupporterMonthsInput(remaining);
    setSupporterMode('keep');
    setSavingRoleChanges(false);

    if (badgesList.length === 0) {
      try {
        const res = await fetch('/api/admin/badges');
        const json = await res.json();
        if (json.success && Array.isArray(json.badges)) {
          setBadgesList(json.badges);
        }
      } catch (err) {}
    }

    try {
      const res = await fetch(`/api/profile/${user.username}`);
      const json = await res.json();
      if (json.success && json.user?.badges) {
        setSelectedBadgeIds(json.user.badges.map((b: any) => b.id));
      } else {
        setSelectedBadgeIds([]);
      }
    } catch {
      setSelectedBadgeIds([]);
    }
  };

  const handleSaveManageRole = async () => {
    if (!manageRoleTarget) return;
    setSavingRoleChanges(true);
    try {
      const roleChanged = selectedRole !== manageRoleTarget.role;
      if (roleChanged || supporterMode === 'modify') {
        const payload: any = {};
        if (roleChanged) payload.newRole = selectedRole;
        if (supporterMode === 'modify') payload.setSupporterMonths = supporterMonthsInput;
        const resRole = await fetch(`/api/admin/users/${manageRoleTarget.id}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const jsonRole = await resRole.json();
        if (!resRole.ok || !jsonRole.success) {
          showToast(jsonRole.error || 'Cập nhật quyền thất bại', 'error');
          setSavingRoleChanges(false);
          return;
        }
      }

      const resBadges = await fetch(`/api/admin/users/${manageRoleTarget.id}/badges`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ badgeIds: selectedBadgeIds }),
      });
      const jsonBadges = await resBadges.json();
      if (!resBadges.ok || !jsonBadges.success) {
        showToast(jsonBadges.error || 'Cập nhật huy hiệu thất bại', 'error');
        setSavingRoleChanges(false);
        return;
      }

      showToast(`Đã cập nhật role và huy hiệu cho ${manageRoleTarget.username}`, 'success');
      setManageRoleTarget(null);
      fetchUsers(userQuery);
    } catch {
      showToast('Có lỗi xảy ra khi lưu', 'error');
    } finally {
      setSavingRoleChanges(false);
    }
  };

  const handleConfirmResetPassword = async () => {
    if (!resetPasswordTarget) return;
    if (newPasswordInput.trim().length < 6) {
      showToast('Mật khẩu mới phải có tối thiểu 6 ký tự.', 'error');
      return;
    }
    setResettingPassword(true);
    try {
      const res = await fetch(`/api/admin/users/${resetPasswordTarget.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPasswordInput.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'Đổi mật khẩu thất bại.', 'error');
        return;
      }
      showToast(`Đã reset mật khẩu cho ${resetPasswordTarget.username}`, 'success');
      setResetPasswordTarget(null);
      setNewPasswordInput('');
    } catch {
      showToast('Lỗi hệ thống khi reset mật khẩu.', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleConfirmBanToggle = async () => {
    if (!banTarget) return;
    const action = banTarget.isBanned ? 'unban' : 'ban';
    if (action === 'ban' && !banReason.trim()) {
      showToast('Vui lòng nhập lý do khoá tài khoản.', 'error');
      return;
    }
    setBanningUser(true);
    try {
      const res = await fetch(`/api/admin/users/${banTarget.id}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason: banReason.trim() }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        showToast(json.error || 'Thao tác thất bại.', 'error');
        return;
      }
      showToast(action === 'ban' ? `Đã khoá tài khoản ${banTarget.username}` : `Đã mở khoá tài khoản ${banTarget.username}`, 'success');
      setBanTarget(null);
      setBanReason('');
      fetchUsers(userQuery);
    } catch {
      showToast('Lỗi hệ thống khi khoá/mở tài khoản.', 'error');
    } finally {
      setBanningUser(false);
    }
  };

  const fetchUsers = async (q: string, role = roleFilter) => {
    setLoadingUsers(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set('query', q.trim());
      if (role && role !== 'ALL') params.set('role', role);
      const qs = params.toString();
      const res = await fetch(`/api/admin/users${qs ? '?' + qs : ''}`);
      const data = await res.json();
      if (data.success) {
        setUsersList(data.users || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const verifyUser = async (userId: string, username: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || t('admin.verify_fail'), 'error');
        return;
      }
      showToast(t('admin.verify_ok', { name: username, n: data.claimed || 0 }), 'success');
      fetchUsers(userQuery);
    } catch {
      showToast(t('admin.verify_fail'), 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmGiveSupporter = async () => {
    if (!supporterTarget) return;
    const months = parseInt(supporterMonths);
    if (isNaN(months) || months < -1) {
      showToast('Số tháng không hợp lệ.', 'error');
      return;
    }
    setGivingSupporter(true);
    try {
      const res = await fetch(`/api/admin/users/${supporterTarget.id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grantSupporterMonths: months }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Cấp Supporter thất bại', 'error');
        return;
      }
      showToast(`Đã cấp/sửa Supporter cho ${supporterTarget.username}`, 'success');
      setIsSupporterModalOpen(false);
      setSupporterTarget(null);
      setSupporterMonths('1');
      fetchUsers(userQuery);
    } catch (err) {
      showToast('Lỗi hệ thống', 'error');
    } finally {
      setGivingSupporter(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserTarget) return;
    if (!deleteUserReason.trim() || deleteUserReason.trim().length < 3) {
      showToast('Vui lòng nhập lý do xoá (tối thiểu 3 ký tự).', 'error');
      return;
    }
    setDeletingUser(true);
    try {
      const res = await fetch(`/api/admin/users/${deleteUserTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: deleteUserReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast(data.error || 'Xoá người dùng thất bại', 'error');
        return;
      }
      showToast(`Đã xoá tài khoản ${deleteUserTarget.username}`, 'success');
      setIsDeleteUserModalOpen(false);
      setDeleteUserTarget(null);
      setDeleteUserReason('');
      fetchUsers(userQuery);
    } catch (err) {
      console.error(err);
      showToast('Lỗi khi xoá tài khoản', 'error');
    } finally {
      setDeletingUser(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    // Stub per request
  };

  useEffect(() => {
    fetchUsers(userQuery, roleFilter);
    setUserPage(1);
  }, [roleFilter]);

  useEffect(() => {
    setUserPage(1);
  }, [userQuery, userSort, userSortOrder]);

  const filteredUsers = usersList.filter((u) => {
    if (roleFilter === 'ALL') return true;
    if (roleFilter === 'SUPPORTER') {
      return u.supporterUntil && new Date(u.supporterUntil) > new Date();
    }
    return u.role === roleFilter;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (userSort === 'role') {
      const roleWeight = { ADMIN: 3, MODERATOR: 2, USER: 1 };
      const weightA = roleWeight[a.role as keyof typeof roleWeight] || 0;
      const weightB = roleWeight[b.role as keyof typeof roleWeight] || 0;
      return userSortOrder === 'desc' ? weightB - weightA : weightA - weightB;
    } else if (userSort === 'pp') {
      return userSortOrder === 'desc' ? b.classicPp - a.classicPp : a.classicPp - b.classicPp;
    } else if (userSort === 'lastActive') {
      const timeA = new Date(a.lastActiveAt || a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.lastActiveAt || b.updatedAt || b.createdAt).getTime();
      return userSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    } else {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return userSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    }
  });

  return (
    <>
      <div className="space-y-4">
        {/* Filter & Search Bar */}
        <div className="space-y-3 p-4 rounded-2xl border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 ui-dim absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('admin.search_user')}
                value={userQuery}
                onChange={(e) => {
                  setUserQuery(e.target.value);
                  fetchUsers(e.target.value);
                }}
                className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-subtle)',
                  borderColor: 'var(--border-ui)',
                  color: 'var(--text-title)',
                }}
              />
            </div>

            {/* Sorting Bar */}
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="ui-dim font-semibold">{t('admin.sort')}</span>
              <select
                value={userSort}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setUserSort(val);
                  if (val === 'lastActive' || val === 'pp') setUserSortOrder('desc');
                }}
                className="px-2.5 py-1.5 rounded-xl border text-xs font-semibold"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              >
                <option value="createdAt">{t('admin.sort_created')}</option>
                <option value="lastActive">{language === 'en' ? 'Last Active' : 'Lần cuối hoạt động'}</option>
                <option value="role">{t('admin.sort_role')}</option>
                <option value="pp">Classic Points</option>
              </select>
              <button
                onClick={() => setUserSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'))}
                className="px-3 py-1.5 rounded-xl border text-xs font-bold transition-all"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              >
                {userSortOrder === 'asc' ? t('admin.sort_asc') : t('admin.sort_desc')}
              </button>
            </div>
          </div>

          {/* Quick Role Filter Badges */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="text-[11px] font-bold uppercase ui-dim mr-1">{t('admin.filter_role')}</span>
            {[
              { id: 'ALL', label: t('admin.filter_all') },
              { id: 'ADMIN', label: 'Admin' },
              { id: 'MODERATOR', label: 'Moderator' },
              { id: 'SUPPORTER', label: 'Supporter' },
              { id: 'USER', label: t('admin.filter_user') },
            ].map((rf) => (
              <button
                key={rf.id}
                type="button"
                onClick={() => setRoleFilter(rf.id as typeof roleFilter)}
                className="px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer border"
                style={{
                  backgroundColor: roleFilter === rf.id ? 'var(--accent)' : 'var(--bg-subtle)',
                  color: roleFilter === rf.id ? 'var(--accent-fg)' : 'var(--text-dim)',
                  borderColor: roleFilter === rf.id ? 'var(--accent)' : 'var(--border-ui)',
                }}
              >
                {rf.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ui-card overflow-hidden">
          {loadingUsers ? (
            <div className="p-8 text-center ui-dim text-xs">{t('admin.loading_users')}</div>
          ) : sortedUsers.length === 0 ? (
            <div className="p-8 text-center ui-dim text-xs">{t('admin.no_users')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="border-b text-[11px] font-bold uppercase ui-dim" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                    <th className="px-5 py-3">{t('leaderboard.player')}</th>
                    <th className="px-5 py-3">{t('admin.sort_role')}</th>
                    <th className="px-5 py-3">{language === 'en' ? 'Last Active' : 'Hoạt động'}</th>
                    <th className="px-5 py-3">GD</th>
                    <th className="px-5 py-3 text-right">{t('leaderboard.classic')}</th>
                    <th className="px-5 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="ui-zebra">
                  {sortedUsers.slice((userPage - 1) * 10, userPage * 10).map((user) => {
                    const isTargetSuper = Boolean((user as any).isSuperAdmin || isSuperAdminUser(user));
                    const isSupporter = user.supporterUntil && new Date(user.supporterUntil) > new Date();
                    return (
                      <tr
                        key={user.id}
                        role="link"
                        tabIndex={0}
                        onClick={() => router.push(`/profile/${user.username}`)}
                        onContextMenu={(e) => handleOpenContextMenu(e, user)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            router.push(`/profile/${user.username}`);
                          }
                        }}
                        className="transition-colors hover:opacity-90 cursor-pointer"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-xl object-cover shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs text-[color:var(--accent-fg)] shrink-0" style={{ backgroundColor: 'var(--accent)' }}>
                                {user.username[0]}
                              </div>
                            )}
                            <span className="font-bold ui-title truncate">{user.username}</span>
                            {user.isBanned && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase bg-red-500/15 text-red-500 border border-red-500/20 shrink-0">
                                <Ban className="w-2.5 h-2.5" /> Banned
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isTargetSuper ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase" style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}>
                                <Crown className="w-3 h-3 text-rose-500 fill-rose-500" /> Owner
                              </span>
                            ) : user.role === 'ADMIN' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase" style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}>
                                <Shield className="w-3 h-3" /> ADMIN
                              </span>
                            ) : user.role === 'MODERATOR' ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                                <ShieldCheck className="w-3 h-3" /> MODERATOR
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-dim)' }}>
                                USER
                              </span>
                            )}
                            {isSupporter && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase" style={{ backgroundColor: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
                                <Heart className="w-3 h-3 fill-pink-500" /> Supporter
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 whitespace-nowrap">
                          <span
                            className="text-xs ui-dim font-medium"
                            title={user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString(locale) : undefined}
                          >
                            {formatRelativeTime(user.lastActiveAt, language === 'en')}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex flex-col gap-1">
                            {user.gdUsername ? (
                              <span className="text-[11px] ui-dim truncate max-w-[160px]">{user.gdUsername}</span>
                            ) : (
                              <span className="text-[11px] ui-dim">—</span>
                            )}
                            {user.gdVerified ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase text-emerald-600 bg-emerald-500/10 w-fit">
                                <ShieldCheck className="w-3 h-3" /> {t('admin.verified')}
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  verifyUser(user.id, user.username);
                                }}
                                disabled={actionLoading === user.id}
                                className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold border cursor-pointer disabled:opacity-50 w-fit"
                                style={{ borderColor: 'var(--accent)', color: 'var(--accent)' }}
                              >
                                <UserCheck className="w-3 h-3" /> {t('admin.verify_gd')}
                              </button>
                            )}
                            {isTargetSuper && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-amber-500/10 text-amber-500 w-fit">
                                <Crown className="w-3 h-3" /> Protected
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-black" style={{ color: 'var(--accent)' }}>
                          {user.classicPp.toFixed(1)}
                          <span className="text-[10px] font-normal ui-dim ml-1">Pts</span>
                        </td>
                        <td className="px-5 py-3.5 text-right flex justify-end gap-1 items-center">
                          {currentUser?.role === 'ADMIN' && (
                            <button
                              type="button"
                              title="Phân quyền Supporter"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setSupporterTarget({ id: user.id, username: user.username });
                                setSupporterMonths('1');
                                setIsSupporterModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-pink-500 hover:bg-pink-500/10 border border-transparent hover:border-pink-500/20 transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <Heart className="w-4 h-4" />
                            </button>
                          )}
                          {!isTargetSuper && currentUser?.role === 'ADMIN' && user.id !== currentUser?.id && (
                            <button
                              type="button"
                              title="Xoá tài khoản"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDeleteUserTarget({ id: user.id, username: user.username });
                                setDeleteUserReason('');
                                setIsDeleteUserModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            title="Tuỳ chọn quản lý (hoặc bấm chuột phải)"
                            onClick={(e) => handleOpenContextMenu(e, user)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/50 dark:hover:bg-zinc-800 transition-all cursor-pointer inline-flex items-center"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <AdminListPager page={userPage} total={sortedUsers.length} onPage={setUserPage} t={t} />
      </div>

      {isDeleteUserModalOpen && deleteUserTarget && (
        <div
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => {
            if (!deletingUser) {
              setIsDeleteUserModalOpen(false);
              setDeleteUserTarget(null);
            }
          }}
        >
          <div
            className="ui-card p-6 w-full max-w-md space-y-4 shadow-2xl rounded-2xl border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2 text-red-500 font-black text-base">
                <Trash2 className="w-5 h-5" />
                <span>Xoá tài khoản người dùng</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!deletingUser) {
                    setIsDeleteUserModalOpen(false);
                    setDeleteUserTarget(null);
                  }
                }}
                className="ui-dim hover:opacity-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="ui-title font-medium">
                Bạn đang chuẩn bị xoá tài khoản <strong className="text-red-500">{deleteUserTarget.username}</strong>. Thao tác này sẽ xoá toàn bộ kỷ lục, tác phẩm và thông tin của người dùng khỏi hệ thống!
              </p>

              <div>
                <label className="block text-[11px] font-bold uppercase ui-dim mb-1">
                  Lý do xoá tài khoản <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={deleteUserReason}
                  onChange={(e) => setDeleteUserReason(e.target.value)}
                  placeholder="Nhập lý do xoá tài khoản (ví dụ: Vi phạm quy định, Spammer, theo yêu cầu...)"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                type="button"
                disabled={deletingUser}
                onClick={() => {
                  setIsDeleteUserModalOpen(false);
                  setDeleteUserTarget(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold ui-dim border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor: 'var(--border-ui)' }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={deletingUser || !deleteUserReason.trim()}
                onClick={confirmDeleteUser}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {deletingUser ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Đang xoá...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Xác nhận xoá
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSupporterModalOpen && supporterTarget && (
        <div
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => {
            if (!givingSupporter) {
              setIsSupporterModalOpen(false);
              setSupporterTarget(null);
            }
          }}
        >
          <div
            className="ui-card p-6 w-full max-w-sm space-y-4 shadow-2xl rounded-2xl border"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-2 text-pink-500 font-black text-base">
                <Heart className="w-5 h-5" />
                <span>Cấp quyền Supporter</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!givingSupporter) {
                    setIsSupporterModalOpen(false);
                    setSupporterTarget(null);
                  }
                }}
                className="ui-dim hover:opacity-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="ui-title font-medium">
                Cấp Supporter cho <strong className="text-pink-500">{supporterTarget.username}</strong>
              </p>

              <div>
                <label className="block text-[11px] font-bold uppercase ui-dim mb-1">Số tháng</label>
                <select
                  value={supporterMonths}
                  onChange={(e) => setSupporterMonths(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border text-xs focus:outline-none focus:ring-2 focus:ring-pink-500"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                >
                  <option value="1">1 tháng</option>
                  <option value="3">3 tháng</option>
                  <option value="6">6 tháng</option>
                  <option value="12">1 năm</option>
                  <option value="1200">Trọn đời (100 năm)</option>
                  <option value="-1">Hủy Supporter ngay lập tức</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                type="button"
                disabled={givingSupporter}
                onClick={() => {
                  setIsSupporterModalOpen(false);
                  setSupporterTarget(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold ui-dim border cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                style={{ borderColor: 'var(--border-ui)' }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={givingSupporter}
                onClick={confirmGiveSupporter}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-pink-500 hover:bg-pink-600 transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {givingSupporter ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang xử lý
                  </>
                ) : (
                  <>
                    <Heart className="w-3.5 h-3.5" /> Xác nhận
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Right-click / Action Context Menu */}
      {contextMenu.visible && contextMenu.user && (
        <div
          className="fixed z-[999999] rounded-2xl border shadow-2xl p-1.5 min-w-[210px] space-y-1 animate-in fade-in zoom-in-95"
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-ui)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b mb-1 flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
            <span className="text-[11px] font-bold ui-title truncate max-w-[140px]">
              {contextMenu.user.username}
            </span>
            {contextMenu.user.isBanned && (
              <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-red-500/15 text-red-500">
                Banned
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              const u = contextMenu.user.username;
              setContextMenu((prev) => ({ ...prev, visible: false }));
              router.push(`/profile/${u}`);
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold ui-title hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors text-left cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 ui-dim" /> Xem trang cá nhân
          </button>

          {isStaff && (
            <button
              type="button"
              onClick={() => {
                const u = contextMenu.user;
                setContextMenu((prev) => ({ ...prev, visible: false }));
                handleOpenManageRole(u);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-500 hover:bg-amber-500/10 transition-colors text-left cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5" /> Quản lý Role & Huy hiệu
            </button>
          )}

          {isFullAdmin && (
            <button
              type="button"
              onClick={() => {
                const u = contextMenu.user;
                setContextMenu((prev) => ({ ...prev, visible: false }));
                setSupporterTarget({ id: u.id, username: u.username });
                setSupporterMonths('1');
                setIsSupporterModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-pink-500 hover:bg-pink-500/10 transition-colors text-left cursor-pointer"
            >
              <Heart className="w-3.5 h-3.5" /> Cấp quyền Supporter
            </button>
          )}

          {!contextMenu.user.gdVerified && (
            <button
              type="button"
              onClick={() => {
                const u = contextMenu.user;
                setContextMenu((prev) => ({ ...prev, visible: false }));
                verifyUser(u.id, u.username);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-500 hover:bg-emerald-500/10 transition-colors text-left cursor-pointer"
            >
              <UserCheck className="w-3.5 h-3.5" /> Xác minh GD
            </button>
          )}

          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                const u = contextMenu.user;
                setContextMenu((prev) => ({ ...prev, visible: false }));
                setResetPasswordTarget(u);
                setNewPasswordInput('');
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-yellow-500 hover:bg-yellow-500/10 transition-colors text-left cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset mật khẩu
            </button>
          )}

          {isFullAdmin && !isSuperAdminUser(contextMenu.user) && contextMenu.user.id !== currentUser?.id && (
            <button
              type="button"
              onClick={() => {
                const u = contextMenu.user;
                setContextMenu((prev) => ({ ...prev, visible: false }));
                setBanTarget(u);
                setBanReason('');
              }}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors text-left cursor-pointer ${
                contextMenu.user.isBanned
                  ? 'text-green-500 hover:bg-green-500/10'
                  : 'text-orange-500 hover:bg-orange-500/10'
              }`}
            >
              {contextMenu.user.isBanned ? (
                <>
                  <Unlock className="w-3.5 h-3.5" /> Mở khoá tài khoản
                </>
              ) : (
                <>
                  <Ban className="w-3.5 h-3.5" /> Khoá tài khoản
                </>
              )}
            </button>
          )}

          {isFullAdmin && !isSuperAdminUser(contextMenu.user) && contextMenu.user.id !== currentUser?.id && (
            <button
              type="button"
              onClick={() => {
                const u = contextMenu.user;
                setContextMenu((prev) => ({ ...prev, visible: false }));
                setDeleteUserTarget({ id: u.id, username: u.username });
                setDeleteUserReason('');
                setIsDeleteUserModalOpen(true);
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-500 hover:bg-red-500/10 transition-colors text-left cursor-pointer border-t pt-1.5"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Xoá tài khoản
            </button>
          )}
        </div>
      )}

      {/* Manage Role & Badges Modal */}
      {manageRoleTarget && (
        <div
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => {
            if (!savingRoleChanges) setManageRoleTarget(null);
          }}
        >
          <div
            className="w-full max-w-lg rounded-3xl border shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                {manageRoleTarget.avatarUrl ? (
                  <img src={manageRoleTarget.avatarUrl} alt="" className="w-11 h-11 rounded-2xl object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm text-[color:var(--accent-fg)]" style={{ backgroundColor: 'var(--accent)' }}>
                    {manageRoleTarget.username[0]}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-1.5">
                    <h2 className="font-extrabold text-base ui-title">
                      {manageRoleTarget.username}
                    </h2>
                    {manageRoleTarget.supporterUntil && new Date(manageRoleTarget.supporterUntil) > new Date() && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase" style={{ backgroundColor: 'var(--badge-green-bg)', color: 'var(--badge-green-text)' }}>
                        Supporter
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] ui-dim flex items-center gap-2">
                    <span>Role hiện tại: <strong>{manageRoleTarget.role}</strong></span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setManageRoleTarget(null)}
                className="p-1.5 rounded-xl border hover:opacity-80 transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section 1: Role Selection (For Full Admin) */}
            {isFullAdmin && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider ui-dim flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-500" />
                  Phân vai trò (Role)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'USER', label: 'User', desc: 'Thành viên thường' },
                    { id: 'MODERATOR', label: 'Moderator', desc: 'Kiểm duyệt viên' },
                    { id: 'ADMIN', label: 'Admin', desc: 'Quản trị viên' },
                  ].map((r) => {
                    const isSelected = selectedRole === r.id;
                    const canSelectAdmin = isSuperAdmin || manageRoleTarget.role === 'ADMIN';
                    const isDisabled = r.id === 'ADMIN' && !canSelectAdmin;

                    return (
                      <button
                        key={r.id}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => setSelectedRole(r.id as any)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:opacity-90'
                        } ${isSelected ? 'ring-2' : ''}`}
                        style={{
                          backgroundColor: isSelected ? 'var(--accent)' : 'var(--bg-subtle)',
                          borderColor: isSelected ? 'var(--accent)' : 'var(--border-ui)',
                          color: isSelected ? '#fff' : 'var(--text-title)',
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs ${isSelected ? 'font-black' : 'font-bold'}`}>{r.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <div className={`text-[10px] ${isSelected ? 'opacity-90' : 'ui-dim'}`}>{r.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 2: Supporter Duration */}
            {isFullAdmin && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider ui-dim flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-pink-500" />
                    Thời hạn Supporter
                  </span>
                  {supporterMode === 'modify' && (
                    <span className="text-[10px] font-bold text-amber-500">Đang chỉnh sửa</span>
                  )}
                </label>

                {manageRoleTarget.supporterUntil && new Date(manageRoleTarget.supporterUntil) > new Date() ? (
                  <div className="p-2.5 rounded-xl border text-[11px] flex items-center justify-between" style={{ backgroundColor: 'var(--badge-green-bg)', color: 'var(--badge-green-text)', borderColor: 'var(--badge-green-text)' }}>
                    <span>Hạn Supporter hiện tại:</span>
                    <strong>{new Date(manageRoleTarget.supporterUntil).toLocaleDateString()}</strong>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl border text-[11px] ui-dim" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                    Chưa có hạn Supporter (0 tháng)
                  </div>
                )}

                {/* Manual Input with +/- controls */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={supporterMonthsInput <= 0}
                      onClick={() => {
                        setSupporterMode('modify');
                        setSupporterMonthsInput((prev) => Math.max(0, prev - 1));
                      }}
                      className="w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-base cursor-pointer hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-title)' }}
                      title="Trừ 1 tháng (tới 0)"
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <div className="relative flex-1">
                      <input
                        type="number"
                        min={0}
                        max={120}
                        value={supporterMonthsInput}
                        onChange={(e) => {
                          setSupporterMode('modify');
                          const val = parseInt(e.target.value, 10);
                          setSupporterMonthsInput(isNaN(val) || val < 0 ? 0 : val);
                        }}
                        placeholder="0"
                        className="w-full text-center py-2 px-3 rounded-xl border text-sm font-black focus:outline-none focus:ring-2 focus:ring-pink-500/50"
                        style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ui-dim pointer-events-none">
                        tháng
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSupporterMode('modify');
                        setSupporterMonthsInput((prev) => prev + 1);
                      }}
                      className="w-10 h-10 rounded-xl border flex items-center justify-center font-bold text-base cursor-pointer hover:bg-white/10 transition-all"
                      style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-title)' }}
                      title="Cộng 1 tháng"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Status Preview */}
                  <div className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border flex items-center justify-between" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-subtle)' }}>
                    <span className="ui-dim">Trạng thái áp dụng:</span>
                    {supporterMode === 'keep' ? (
                      <span className="ui-title">Giữ nguyên hạn hiện tại</span>
                    ) : supporterMonthsInput === 0 ? (
                      <span className="text-red-500 font-bold">Gỡ bỏ đặc quyền Supporter (0 tháng)</span>
                    ) : (
                      <span className="text-pink-500 font-bold">
                        {supporterMonthsInput} tháng từ hôm nay (~{new Date(Date.now() + supporterMonthsInput * 30 * 24 * 60 * 60 * 1000).toLocaleDateString()})
                      </span>
                    )}
                  </div>

                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const remaining = calculateUserSp(manageRoleTarget);
                        setSupporterMonthsInput(remaining);
                        setSupporterMode('keep');
                      }}
                      className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        supporterMode === 'keep' ? 'ring-2 ring-pink-500 bg-pink-500/15 text-pink-500' : 'hover:opacity-80'
                      }`}
                      style={{ borderColor: supporterMode === 'keep' ? 'var(--accent)' : 'var(--border-ui)', backgroundColor: supporterMode === 'keep' ? undefined : 'var(--bg-subtle)', color: supporterMode === 'keep' ? undefined : 'var(--text-title)' }}
                    >
                      Giữ nguyên
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSupporterMode('modify');
                        setSupporterMonthsInput(0);
                      }}
                      className={`py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer text-red-500 ${
                        supporterMode === 'modify' && supporterMonthsInput === 0 ? 'ring-2 ring-red-500 bg-red-500/15' : 'hover:opacity-80'
                      }`}
                      style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-subtle)' }}
                    >
                      0 (Gỡ bỏ)
                    </button>

                    {[
                      { val: 1, label: '+1 tháng' },
                      { val: 3, label: '+3 tháng' },
                      { val: 6, label: '+6 tháng' },
                      { val: 12, label: '+1 năm' },
                    ].map((item) => (
                      <button
                        key={item.val}
                        type="button"
                        onClick={() => {
                          const remaining = calculateUserSp(manageRoleTarget);
                          const base = supporterMode === 'keep' ? remaining : supporterMonthsInput;
                          setSupporterMode('modify');
                          setSupporterMonthsInput(base + item.val);
                        }}
                        className="py-1.5 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer hover:opacity-80"
                        style={{
                          backgroundColor: 'var(--bg-subtle)',
                          borderColor: 'var(--border-ui)',
                          color: 'var(--text-title)',
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Section 3: Badges */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider ui-dim flex items-center gap-1.5">
                <Medal className="w-3.5 h-3.5 text-amber-500" />
                Huy hiệu người dùng ({selectedBadgeIds.length})
              </label>
              <button
                type="button"
                onClick={() => setShowBadgePicker(true)}
                className="w-full p-3 rounded-2xl border text-left hover:opacity-90 cursor-pointer transition-colors"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
              >
                <div className="text-xs font-bold ui-title">Chọn huy hiệu được cấp</div>
                <div className="text-[11px] ui-dim mt-0.5">
                  {selectedBadgeIds.length === 0
                    ? 'Chưa chọn huy hiệu nào. Bấm để mở danh sách.'
                    : `Đã chọn ${selectedBadgeIds.length} huy hiệu`}
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
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t flex items-center justify-end gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                type="button"
                onClick={() => setManageRoleTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                disabled={savingRoleChanges}
                onClick={handleSaveManageRole}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                {savingRoleChanges ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang lưu...
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" /> Lưu thay đổi
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {resetPasswordTarget && (
        <div
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => {
            if (!resettingPassword) setResetPasswordTarget(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className="font-extrabold text-sm sm:text-base ui-title text-amber-500 flex items-center gap-2">
                <RotateCcw className="w-5 h-5" />
                Reset mật khẩu: {resetPasswordTarget.username}
              </h3>
              <button
                type="button"
                onClick={() => setResetPasswordTarget(null)}
                className="p-1 rounded-xl border ui-dim cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 leading-relaxed font-semibold">
              Với quyền Owner, bạn có thể thiết lập trực tiếp mật khẩu mới cho tài khoản này. Sau khi đổi, phiên đăng nhập hiện tại của người dùng sẽ bị thu hồi.
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

            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                type="button"
                disabled={resettingPassword}
                onClick={() => setResetPasswordTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold ui-dim border cursor-pointer"
                style={{ borderColor: 'var(--border-ui)' }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={resettingPassword || newPasswordInput.trim().length < 6}
                onClick={handleConfirmResetPassword}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
              >
                {resettingPassword ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang cập nhật...
                  </>
                ) : (
                  'Xác nhận đổi mật khẩu'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ban / Unban Modal */}
      {banTarget && (
        <div
          className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => {
            if (!banningUser) setBanTarget(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl border shadow-2xl p-6 space-y-4"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <h3 className={`font-extrabold text-sm sm:text-base flex items-center gap-2 ${banTarget.isBanned ? 'text-green-500' : 'text-red-500'}`}>
                {banTarget.isBanned ? <Unlock className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                {banTarget.isBanned ? `Mở khoá tài khoản: ${banTarget.username}` : `Khoá tài khoản: ${banTarget.username}`}
              </h3>
              <button
                type="button"
                onClick={() => setBanTarget(null)}
                className="p-1 rounded-xl border ui-dim cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs ui-dim leading-relaxed">
              {banTarget.isBanned
                ? `Bạn có chắc chắn muốn mở khoá tài khoản cho ${banTarget.username}? Người dùng sẽ có thể đăng nhập và gửi kỷ lục trở lại bình thường.`
                : `Khi bị khoá, người dùng ${banTarget.username} sẽ bị đăng xuất ngay lập tức và không thể truy cập các tính năng của tài khoản.`}
            </p>

            {!banTarget.isBanned && (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold ui-title">Lý do khoá tài khoản:</label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Nhập lý do khoá tài khoản..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                  autoFocus
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                type="button"
                disabled={banningUser}
                onClick={() => setBanTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold ui-dim border cursor-pointer"
                style={{ borderColor: 'var(--border-ui)' }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={banningUser || (!banTarget.isBanned && !banReason.trim())}
                onClick={handleConfirmBanToggle}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1.5 ${
                  banTarget.isBanned ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {banningUser ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Đang xử lý...
                  </>
                ) : banTarget.isBanned ? (
                  'Xác nhận mở khoá'
                ) : (
                  'Xác nhận khoá tài khoản'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Badge Picker Modal */}
      {showBadgePicker && (
        <BadgePickerModal
          isOpen
          onClose={() => setShowBadgePicker(false)}
          badges={badgesList}
          selectedIds={selectedBadgeIds}
          onConfirm={(ids) => {
            setSelectedBadgeIds(ids);
            setShowBadgePicker(false);
          }}
        />
      )}
    </>
  );
}

