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
  Plus
} from 'lucide-react';
import BadgeIcon, { IconGlyph } from '@/components/BadgeIcon';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import ColorPicker from '@/components/ColorPicker';
import { BADGE_ICON_NAMES } from '@/lib/badgeIconCatalog';
import { type DictKey } from '@/lib/dictionaries';

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

export default function UsersTab({ currentUser }: { currentUser: any }) {
  const { t } = useLanguage();
  const { showToast, showConfirm } = useToast();
  const router = useRouter();

  // User management state
  const [userQuery, setUserQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'ADMIN' | 'MODERATOR' | 'SUPPORTER' | 'USER'>('ALL');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('asc');
  const [userPage, setUserPage] = useState(1);
  const [userSort, setUserSort] = useState<'createdAt' | 'role' | 'pp'>('createdAt');

  // User deletion state
  const [deleteUserTarget, setDeleteUserTarget] = useState<{ id: string; username: string } | null>(null);
  const [deleteUserReason, setDeleteUserReason] = useState('');
  const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Badges state
  const [badgesList, setBadgesList] = useState<any[]>([]);
  const [loadingBadges, setLoadingBadges] = useState(true);
  const emptyBadgeForm = { imageUrl: '', id: '', name: '', description: '', color: '', glow: false, categoryId: '', sortOrder: '' };
  const [badgeForm, setBadgeForm] = useState(emptyBadgeForm);
  const [isIconModalOpen, setIsIconModalOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState('');
  const [badgeCategories, setBadgeCategories] = useState<any[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [badgeSearch, setBadgeSearch] = useState('');
  const [badgeFilterCategory, setBadgeFilterCategory] = useState('ALL');
  const [badgeSort, setBadgeSort] = useState<'quality' | 'name' | 'category'>('quality');
  const [badgesViewMode, setBadgesViewMode] = useState<'list' | 'grid'>('list');
  const [showBadgeCreate, setShowBadgeCreate] = useState(false);
  const [badgePage, setBadgePage] = useState(1);
  const [isBadgeEditMode, setIsBadgeEditMode] = useState(false);
  const [isBadgeEditModalOpen, setIsBadgeEditModalOpen] = useState(false);
  const [draggedBadgeId, setDraggedBadgeId] = useState<string | null>(null);

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

  const fetchBadges = async () => {
    setLoadingBadges(true);
    try {
      const res = await fetch('/api/admin/badges');
      const data = await res.json();
      if (data.success) setBadgesList(data.badges || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingBadges(false);
    }
  };

  const fetchBadgeCategories = async () => {
    try {
      const res = await fetch('/api/admin/badge-categories');
      const data = await res.json();
      if (data.success) setBadgeCategories(data.categories || []);
    } catch (e) {}
  };

  const handleSaveBadge = async () => {
    setActionLoading('badge');
    try {
      const url = badgeForm.id ? `/api/admin/badges/${badgeForm.id}` : `/api/admin/badges`;
      const method = badgeForm.id ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(badgeForm),
      });
      const data = await res.json();
      if (data.success) {
        showToast(badgeForm.id ? 'Đã cập nhật huy hiệu' : 'Đã tạo huy hiệu', 'success');
        setBadgeForm(emptyBadgeForm);
        setShowBadgeCreate(false);
        fetchBadges();
      } else {
        showToast(data.error || 'Lỗi', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteBadge = async (id: string) => {
    showConfirm('Xóa huy hiệu này?', async () => {
      try {
        const res = await fetch(`/api/admin/badges/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          showToast('Đã xóa huy hiệu', 'success');
          fetchBadges();
        }
      } catch (e) {
        showToast('Lỗi kết nối', 'error');
      }
    });
  };

  const handleMoveBadge = async (id: string, direction: 'up' | 'down') => {
    try {
      const res = await fetch(`/api/admin/badges/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction }),
      });
      const data = await res.json();
      if (data.success && data.badges) setBadgesList(data.badges);
    } catch (e) {
      showToast('Lỗi sắp xếp huy hiệu', 'error');
    }
  };

  const handleDropBadge = (targetId: string) => {
    if (!draggedBadgeId || draggedBadgeId === targetId) return;
    const sourceIndex = badgesList.findIndex(b => b.id === draggedBadgeId);
    const targetIndex = badgesList.findIndex(b => b.id === targetId);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const newBadges = [...badgesList];
    const [movedItem] = newBadges.splice(sourceIndex, 1);
    newBadges.splice(targetIndex, 0, movedItem);
    setBadgesList(newBadges.map((b, i) => ({ ...b, sortOrder: i + 1 })));
    setDraggedBadgeId(null);
  };

  const persistBadgeOrder = async () => {
    try {
      const orderedIds = badgesList.map((b) => b.id);
      await fetch('/api/admin/badges', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });
      fetchBadges();
    } catch (e) {
      console.error(e);
      showToast('Lỗi cập nhật thứ tự', 'error');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch('/api/admin/badge-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setNewCategoryName('');
        fetchBadgeCategories();
        showToast(t('badge.cat_created'), 'success');
      } else {
        showToast(data.error || t('admin.action_fail'), 'error');
      }
    } catch (e) {
      showToast(t('common.server_error'), 'error');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    showConfirm(t('badge.cat_delete_confirm'), async () => {
      try {
        const res = await fetch(`/api/admin/badge-categories/${id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
          fetchBadgeCategories();
          fetchBadges();
        }
      } catch (e) {
        showToast(t('common.server_error'), 'error');
      }
    });
  };

  useEffect(() => {
    fetchUsers(userQuery, roleFilter);
    setUserPage(1);
  }, [roleFilter]);

  useEffect(() => {
    setUserPage(1);
  }, [userQuery, userSort, userSortOrder]);

  useEffect(() => {
    setBadgePage(1);
  }, [badgeSearch, badgeFilterCategory, badgeSort]);

  useEffect(() => {
    fetchBadges();
    fetchBadgeCategories();
  }, []);

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
    } else {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return userSortOrder === 'desc' ? timeB - timeA : timeA - timeB;
    }
  });

  const filteredBadges = badgesList
    .filter((b) => {
      const q = badgeSearch.trim().toLowerCase();
      const nameOk = !q || b.name.toLowerCase().includes(q) || (b.description || '').toLowerCase().includes(q);
      const catOk =
        badgeFilterCategory === 'ALL' ||
        b.categoryId === badgeFilterCategory ||
        (badgeFilterCategory === 'NONE' && !b.categoryId);
      return nameOk && catOk;
    })
    .slice()
    .sort((a, b) => {
      if (badgeSort === 'name') return a.name.localeCompare(b.name);
      if (badgeSort === 'category') {
        return (a.badgeCategory?.name || '').localeCompare(b.badgeCategory?.name || '') || (a.sortOrder || 0) - (b.sortOrder || 0);
      }
      return (a.sortOrder || 0) - (b.sortOrder || 0);
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
                onChange={(e) => setUserSort(e.target.value as any)}
                className="px-2.5 py-1.5 rounded-xl border text-xs font-semibold"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              >
                <option value="createdAt">{t('admin.sort_created')}</option>
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
                    <th className="px-5 py-3">GD</th>
                    <th className="px-5 py-3 text-right">{t('leaderboard.classic')}</th>
                    <th className="px-5 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="ui-zebra">
                  {sortedUsers.slice((userPage - 1) * 10, userPage * 10).map((user) => {
                    const isTargetSuper = user.username === 'iNeQaH';
                    const isSupporter = user.supporterUntil && new Date(user.supporterUntil) > new Date();
                    return (
                      <tr
                        key={user.id}
                        role="link"
                        tabIndex={0}
                        onClick={() => router.push(`/profile/${user.username}`)}
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
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {user.role === 'ADMIN' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase" style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}>
                                <Crown className="w-3 h-3" /> ADMIN
                              </span>
                            )}
                            {user.role === 'MODERATOR' && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                                <Shield className="w-3 h-3" /> MODERATOR
                              </span>
                            )}
                            {user.role === 'USER' && !isTargetSuper && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase" style={{ backgroundColor: 'var(--bg-subtle)', color: 'var(--text-dim)' }}>
                                USER
                              </span>
                            )}
                            {isTargetSuper && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase" style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}>
                                Super Admin
                              </span>
                            )}
                            {isSupporter && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase" style={{ backgroundColor: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
                                <Heart className="w-3 h-3 fill-pink-500" /> Supporter
                              </span>
                            )}
                          </div>
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
                        <td className="px-5 py-3.5 text-right">
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
    </>
  );
}
