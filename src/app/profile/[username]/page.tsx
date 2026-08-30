'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Star, Moon, Medal, Play, Globe, MessageSquare, Gamepad2, ArrowLeft, Camera, Check, X, Pencil, ShieldCheck, Heart, Trash2, Hammer, User as UserIcon, Shield, Crown, Trophy, Award, Zap, Flame, Diamond, StarHalf, CheckCircle, ChevronDown, RotateCcw, UserCheck } from 'lucide-react';
import * as AllLucideIcons from 'lucide-react';
import { CUSTOM_ICONS } from '@/components/CustomIcons';
import ImageEditorModal from '@/components/ImageEditorModal';
import BadgePickerModal from '@/components/BadgePickerModal';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import { formatCp } from '@/lib/creatorPoints';
import { levelPath } from '@/lib/levelUrl';
import GdUnverifiedNotice from '@/components/GdUnverifiedNotice';

const IconRender = ({ icon, className }: { icon: string, className?: string }) => {
  const Comp = (CUSTOM_ICONS as any)[icon] || (AllLucideIcons as any)[icon] || AllLucideIcons.Star;
  return <Comp className={className} />;
};

export default function ProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const { t, language } = useLanguage();
  const { showConfirm, showToast } = useToast();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'classic' | 'platformer' | 'creator'>('classic');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const isOwner = !!(currentUser && currentUser.username === username);
  const isStaff = currentUser?.role === 'ADMIN' || currentUser?.role === 'MODERATOR';
  const isFullAdmin = currentUser?.role === 'ADMIN';
  const isAdmin = isFullAdmin;

  // Direct editing states
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [verifyingGd, setVerifyingGd] = useState(false);

  // Image Editor Modal state
  const [imageModal, setImageModal] = useState<{
    open: boolean;
    type: 'avatar' | 'cover';
  }>({
    open: false,
    type: 'avatar',
  });

  // Admin Management States
  const [showManageModal, setShowManageModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'USER' | 'MODERATOR' | 'ADMIN'>('USER');
  const [supporterMonthsToAdd, setSupporterMonthsToAdd] = useState<string>('0');
  const [savingAdminChanges, setSavingAdminChanges] = useState(false);
  const [badgesList, setBadgesList] = useState<any[]>([]);
  const [selectedBadgeIds, setSelectedBadgeIds] = useState<string[]>([]);
  const [cpInput, setCpInput] = useState('');
  const [isEditingCp, setIsEditingCp] = useState(false);
  const [showBadgePicker, setShowBadgePicker] = useState(false);
  const [editingField, setEditingField] = useState<null | 'country' | 'gdUsername' | 'discordTag'>(null);
  const [fieldDraft, setFieldDraft] = useState('');

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

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/profile/${username}`);
      const json = await res.json();
      if (json.success) {
        setData(json.user);
        setBioInput(json.user.bio || '');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateProfileField = async (fields: { bio?: string; avatarUrl?: string; coverUrl?: string; country?: string; gdUsername?: string; discordTag?: string }) => {
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
        setIsEditingBio(false);
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
    if (!isOwner) return;
    setEditingField(field);
    setFieldDraft(value || '');
  };

  const saveInlineField = async () => {
    if (!editingField) return;
    await updateProfileField({ [editingField]: fieldDraft.trim() });
    setEditingField(null);
  };

  const handleOpenAvatarModal = () => {
    if (!isOwner) return;
    setImageModal({ open: true, type: 'avatar' });
  };

  const handleOpenCoverModal = () => {
    if (!isOwner) return;
    setImageModal({ open: true, type: 'cover' });
  };

  const handleSaveBio = () => {
    updateProfileField({ bio: bioInput.trim() });
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
          fetchProfile(); // Refresh profile data
        } else {
          showToast('Lỗi: ' + resData.error, 'error');
        }
      } catch (e) {
        showToast('Lỗi kết nối khi xóa kỷ lục.', 'error');
      }
    });
  };

  const handleOpenManageModal = async () => {
    if (!currentUser || !isStaff) return;
    setSelectedRole(data.role);
    setSupporterMonthsToAdd('0');
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
      if (isFullAdmin && (selectedRole !== data.role || supporterMonthsToAdd !== '0')) {
        const months = parseInt(supporterMonthsToAdd);
        const res = await fetch(`/api/admin/users/${data.id}/role`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newRole: selectedRole !== data.role ? selectedRole : undefined,
            grantSupporterMonths: months !== 0 ? (months > 0 ? months : -999) : undefined,
            currentAdminUsername: currentUser.username,
          }),
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

  const handleRequestDeleteAccount = () => {
    if (!currentUser || !isOwner || !data) return;
    showConfirm('Gửi yêu cầu xoá tài khoản? Admin sẽ xem xét và xử lý yêu cầu này.', async () => {
      try {
        const res = await fetch('/api/helps', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: `Yêu cầu xoá tài khoản: ${data.username}`,
            content: `Người dùng ${data.username} (ID: ${data.id}) yêu cầu xoá tài khoản của mình.`,
          }),
        });
        const resData = await res.json();
        if (res.ok && resData.success) {
          showToast('Đã gửi yêu cầu xoá tài khoản. Admin sẽ xử lý sớm.', 'success');
        } else {
          showToast(resData.error || 'Không gửi được yêu cầu xoá tài khoản.', 'error');
        }
      } catch (e) {
        showToast(t('common.server_error'), 'error');
      }
    });
  };

  const handleForceDeleteAccount = () => {
    if (!currentUser || !isFullAdmin || !data) return;
    showConfirm(`Xoá vĩnh viễn tài khoản "${data.username}"? Hành động này không thể hoàn tác.`, async () => {
      try {
        const res = await fetch(`/api/admin/users/${data.id}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ currentAdminUsername: currentUser.username }),
        });
        const resData = await res.json();
        if (res.ok && resData.success) {
          showToast('Đã xoá tài khoản.', 'success');
          if (currentUser.id === data.id) {
            localStorage.removeItem('gdvnc_user');
            window.dispatchEvent(new Event('gdvnc_user_update'));
          }
          window.location.href = '/';
        } else {
          showToast(resData.error || t('admin.action_fail'), 'error');
        }
      } catch (e) {
        showToast(t('common.server_error'), 'error');
      }
    });
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

  const hardest = data.hardestClassic;
  const breakdown = data.classicBreakdown;
  const classicRecords = data.classicRecords || breakdown?.items || [];
  const ppByRecordId = new Map<string, any>(
    (breakdown?.items || []).map((item: any) => [item.recordId, item])
  );

  return (
    <div className="space-y-6">
      {isOwner && data.gdUsername && !data.gdVerified && <GdUnverifiedNotice />}
      {/* Image Editor Modal Dialog */}
      <ImageEditorModal
        isOpen={imageModal.open}
        type={imageModal.type}
        currentImage={imageModal.type === 'avatar' ? data.avatarUrl : data.coverUrl}
        onClose={() => setImageModal({ ...imageModal, open: false })}
        onSave={async (dataUrl: string) => {
          if (imageModal.type === 'avatar') {
            await updateProfileField({ avatarUrl: dataUrl });
          } else {
            await updateProfileField({ coverUrl: dataUrl });
          }
        }}
      />

      {/* Back button */}
      <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-semibold ui-dim hover:opacity-100">
        <ArrowLeft className="w-3.5 h-3.5" /> {t("profile.back")}
      </Link>

      {/* User Header Profile Card */}
      <div className="ui-card overflow-hidden space-y-0">
        {/* Clickable Cover */}
        <div 
          onClick={isOwner ? handleOpenCoverModal : undefined}
          className={`h-36 sm:h-52 w-full bg-cover bg-center relative group ${isOwner ? 'cursor-pointer' : ''}`}
          style={{ 
            backgroundColor: 'var(--bg-subtle)',
            backgroundImage: data.coverUrl ? `url(${data.coverUrl})` : 'none'
          }}
          title={isOwner ? t("profile.cover_hint") : undefined}
        >
          {isOwner && (
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-xs">
              <Camera className="w-4 h-4" /> {t("profile.cover_overlay")}
            </div>
          )}
        </div>

        <div className="p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-14 sm:-mt-18 relative z-10">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              {/* Clickable Avatar */}
              <div 
                onClick={isOwner ? handleOpenAvatarModal : undefined}
                className={`relative group rounded-2xl ${isOwner ? 'cursor-pointer' : ''}`}
                title={isOwner ? t("profile.avatar_hint") : undefined}
              >
                {data.avatarUrl ? (
                  <img 
                    src={data.avatarUrl} 
                    alt="Avatar" 
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover shadow-lg border-4" 
                    style={{ borderColor: 'var(--bg-card)' }}
                  />
                ) : (
                  <div 
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}
                  >
                    {data.username[0]}
                  </div>
                )}
                
                {isOwner && (
                  <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold p-1 text-center backdrop-blur-xs">
                    <Camera className="w-4 h-4 mb-0.5" /> {t("profile.change_avatar_short")}
                  </div>
                )}
              </div>
              
              <div className="space-y-1.5 mb-1 p-3 rounded-2xl backdrop-blur-md shadow-sm border" style={{ backgroundColor: 'var(--bg-subtle)', opacity: 0.95, borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-black ui-title drop-shadow-sm">
                    {data.username}
                  </h1>
                  {data.role === 'ADMIN' && (
                    <span title="Admin" className="w-6 h-6 flex items-center justify-center rounded-full shadow-sm" style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}>
                      <Crown className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {data.role === 'MODERATOR' && (
                    <span title="Moderator" className="w-6 h-6 flex items-center justify-center rounded-full shadow-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                      <Shield className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {data.supporterUntil && new Date(data.supporterUntil) > new Date() && (
                    <span title="Supporter" className="w-6 h-6 flex items-center justify-center rounded-full shadow-sm" style={{ backgroundColor: 'rgba(236, 72, 153, 0.15)', color: '#ec4899' }}>
                      <Heart className="w-3.5 h-3.5 fill-pink-500" />
                    </span>
                  )}
                  {data.badges?.slice(0, 2).map((b: any) => (
                    <span key={b.id} title={b.name + (b.description ? `: ${b.description}` : '')} className="w-6 h-6 flex items-center justify-center rounded-full shadow-sm" style={{ backgroundColor: b.color || 'var(--accent)', color: '#fff', boxShadow: b.glowColor ? `0 0 8px ${b.color}` : 'none' }}>
                      <IconRender icon={b.icon || 'Star'} className="w-3.5 h-3.5" />
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-medium ui-dim">
                  {editingField === 'country' ? (
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" />
                      <input
                        autoFocus
                        value={fieldDraft}
                        onChange={(e) => setFieldDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveInlineField();
                          if (e.key === 'Escape') setEditingField(null);
                        }}
                        onBlur={saveInlineField}
                        className="px-1.5 py-0.5 rounded-md text-[11px] font-medium border w-28"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                      />
                    </span>
                  ) : (
                    <span
                      className={`flex items-center gap-1 ${isOwner ? 'cursor-pointer hover:opacity-80' : ''}`}
                      onClick={() => startInlineEdit('country', data.country || t('common.vietnam'))}
                      title={isOwner ? t('profile.click_edit') : undefined}
                    >
                      <Globe className="w-3 h-3" /> {data.country || t("common.vietnam")}
                      {isOwner && <Pencil className="w-2.5 h-2.5 opacity-50" />}
                    </span>
                  )}
                  {editingField === 'gdUsername' ? (
                    <span className="flex items-center gap-1">
                      <Gamepad2 className="w-3 h-3" />
                      <input
                        autoFocus
                        value={fieldDraft}
                        onChange={(e) => setFieldDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveInlineField();
                          if (e.key === 'Escape') setEditingField(null);
                        }}
                        onBlur={saveInlineField}
                        className="px-1.5 py-0.5 rounded-md text-[11px] font-medium border w-28"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                      />
                    </span>
                  ) : (
                    (data.gdUsername || isOwner) && (
                      <span
                        className={`flex items-center gap-1 ${isOwner ? 'cursor-pointer hover:opacity-80' : ''}`}
                        onClick={() => {
                          if (isOwner) startInlineEdit('gdUsername', data.gdUsername);
                        }}
                        title={isOwner ? t('profile.click_edit') : undefined}
                      >
                        <Gamepad2 className="w-3 h-3" /> {data.gdUsername || t('profile.add_gd')}
                        {data.gdVerified ? (
                          <span className="inline-flex items-center gap-0.5 text-emerald-500" title={t('profile.gd_verified')}>
                            <ShieldCheck className="w-3 h-3" />
                          </span>
                        ) : data.gdUsername ? (
                          <span className="text-[9px] font-bold uppercase ui-dim">{t('profile.gd_unverified')}</span>
                        ) : null}
                        {isOwner && <Pencil className="w-2.5 h-2.5 opacity-50" />}
                      </span>
                    )
                  )}
                  {editingField === 'discordTag' ? (
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      <input
                        autoFocus
                        onChange={(e) => setFieldDraft(e.target.value)}
                        value={fieldDraft}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveInlineField();
                          if (e.key === 'Escape') setEditingField(null);
                        }}
                        onBlur={saveInlineField}
                        className="px-1.5 py-0.5 rounded-md text-[11px] font-medium border w-32"
                        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                      />
                    </span>
                  ) : (
                    (data.discordTag || isOwner) && (
                      <span
                        className={`flex items-center gap-1 ${isOwner ? 'cursor-pointer hover:opacity-80' : ''}`}
                        onClick={() => startInlineEdit('discordTag', data.discordTag)}
                        title={isOwner ? t('profile.click_edit') : undefined}
                      >
                        <MessageSquare className="w-3 h-3" /> {data.discordTag || t('profile.add_discord')}
                        {isOwner && <Pencil className="w-2.5 h-2.5 opacity-50" />}
                      </span>
                    )
                  )}
                  {isStaff && (
                    <span className="flex items-center gap-1"><Medal className="w-3 h-3" /> UID: {data.id.substring(0, 8)}</span>
                  )}
                </div>
                
                
                {isStaff && (
                  <div className="pt-2 flex flex-wrap gap-2">
                    {data.gdUsername && !data.gdVerified && (
                      <button
                        type="button"
                        disabled={verifyingGd}
                        onClick={async () => {
                          setVerifyingGd(true);
                          try {
                            const res = await fetch(`/api/admin/users/${data.id}/verify`, { method: 'POST' });
                            const resData = await res.json();
                            if (!res.ok || !resData.success) {
                              showToast(resData.error || t('admin.verify_fail'), 'error');
                              return;
                            }
                            showToast(t('admin.verify_ok', { name: data.gdUsername, n: resData.claimed || 0 }), 'success');
                            setData({ ...data, gdVerified: true });
                            fetchProfile();
                          } catch {
                            showToast(t('admin.verify_fail'), 'error');
                          } finally {
                            setVerifyingGd(false);
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border shadow-sm hover:opacity-90 transition-opacity disabled:opacity-50"
                        style={{ borderColor: 'var(--border-ui)', color: 'var(--accent)' }}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        {t('admin.verify_gd')}
                      </button>
                    )}
                    <button 
                      onClick={handleOpenManageModal}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm hover:opacity-90 transition-opacity"
                      style={{ backgroundColor: 'var(--badge-red-bg)', color: 'var(--badge-red-text)' }}
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      {isFullAdmin ? 'Quản Lý Role & Badge' : 'Gán huy hiệu'}
                    </button>
                  </div>
                )}

              </div>
            </div>

            {/* National Rank */}
            <div className="flex items-center gap-2 mb-1">
              <div className="ui-subtle p-2.5 rounded-xl text-center min-w-24">
                <div className="text-[9px] font-bold uppercase ui-dim flex items-center justify-center gap-1">
                  <Star className="w-2.5 h-2.5 text-amber-500 fill-amber-500" /> {t("profile.rank_classic")}
                </div>
                <div className="text-base font-black ui-title mt-0.5">#{data.classicRank}</div>
              </div>
              <div className="ui-subtle p-2.5 rounded-xl text-center min-w-24">
                <div className="text-[9px] font-bold uppercase ui-dim flex items-center justify-center gap-1">
                  <Moon className="w-2.5 h-2.5 text-sky-500 fill-sky-500 -rotate-12" /> {t("profile.rank_plat")}
                </div>
                <div className="text-base font-black ui-title mt-0.5">#{data.platformerRank}</div>
              </div>
            </div>
          </div>

          {/* Interactive Description / Bio */}
          <div className="pt-1">
            {isEditingBio ? (
              <div className="space-y-2 p-3.5 rounded-2xl border" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                <div className="text-xs font-bold ui-title">{t("profile.edit_bio")}</div>
                <textarea
                  value={bioInput}
                  onChange={(e) => setBioInput(e.target.value)}
                  placeholder={t("profile.bio_input")}
                  className="w-full p-2.5 rounded-xl text-xs border focus:outline-none resize-none"
                  style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                  rows={3}
                  maxLength={1000}
                  autoFocus
                />
                <div className="text-[9px] ui-dim text-right pr-2">
                  {bioInput.length} / 1000
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={() => {
                      setIsEditingBio(false);
                      setBioInput(data.bio || '');
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border"
                    style={{ borderColor: 'var(--border-ui)', color: 'var(--text-dim)' }}
                  >{t("profile.cancel")}</button>
                  <button
                    disabled={saving}
                    onClick={handleSaveBio}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {saving ? t("common.saving") : t("profile.save")}
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={isOwner ? () => setIsEditingBio(true) : undefined}
                className={`p-3 rounded-xl ui-subtle text-xs leading-relaxed group transition-colors ${
                  isOwner ? 'cursor-pointer hover:border border border-transparent' : ''
                }`}
                style={{ borderColor: isOwner ? 'var(--border-ui)' : 'transparent' }}
                title={isOwner ? t("profile.edit_bio_hint") : undefined}
              >
                {data.bio ? (
                  <div className="flex items-start justify-between gap-2">
                    <p className="ui-body whitespace-pre-wrap flex-1">{data.bio}</p>
                    {isOwner && (
                      <Pencil className="w-3.5 h-3.5 ui-dim opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                    )}
                  </div>
                ) : isOwner ? (
                  <div className="ui-dim italic flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5" /> {t("profile.no_bio_owner")}
                  </div>
                ) : (
                  <div className="ui-dim italic">{t("profile.no_bio")}</div>
                )}
              </div>
            )}
            
            {/* Full Badges List */}
            {data.badges && data.badges.length > 0 && (
              <div className="pt-2">
                <div className="text-[10px] font-bold uppercase ui-dim mb-2 flex items-center gap-1.5">
                  <Medal className="w-3.5 h-3.5" /> Huy hiệu
                </div>
                <div className="flex flex-wrap gap-2">
                  {data.badges.map((b: any) => (
                    <div 
                      key={b.id} 
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border ui-subtle"
                      title={b.description || ''}
                    >
                      <div 
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-sm" 
                        style={{ backgroundColor: b.color || 'var(--accent)', color: '#fff', boxShadow: b.glowColor ? `0 0 6px ${b.color}` : 'none' }}
                      >
                        <IconRender icon={b.icon || 'Star'} className="w-3 h-3" />
                      </div>
                      <span className="text-[10px] font-bold">{b.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
            <div className="ui-subtle p-3 rounded-xl">
              <div className="text-[10px] font-bold uppercase ui-dim flex items-center gap-1">
                <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {t("profile.classic_pp")}
              </div>
              <div className="text-xl font-black mt-0.5" style={{ color: 'var(--accent)' }}>
                {data.classicPp.toFixed(2)}
              </div>
              <div className="text-[10px] ui-dim">{t("profile.demons_passed", { n: classicRecords.length })}</div>
            </div>

            <div className="ui-subtle p-3 rounded-xl">
              <div className="text-[10px] font-bold uppercase ui-dim flex items-center gap-1">
                <Moon className="w-3 h-3 text-sky-500 fill-sky-500 -rotate-12" /> {t("profile.plat_pp")}
              </div>
              <div className="text-xl font-black mt-0.5" style={{ color: 'var(--accent)' }}>
                {data.platformerPp.toFixed(2)}
              </div>
              <div className="text-[10px] ui-dim">{t("profile.speedruns_done", { n: data.platformerCompletions?.length || 0 })}</div>
            </div>

            <div className="ui-subtle p-3 rounded-xl">
              <div className="text-[10px] font-bold uppercase ui-dim flex items-center gap-1">
                <Medal className="w-3 h-3" /> {t("profile.creator_pp")}
              </div>
              <div className="text-xl font-black mt-0.5 flex items-center gap-2" style={{ color: 'var(--accent)' }}>
                {isFullAdmin && isEditingCp ? (
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={cpInput}
                    onChange={(e) => setCpInput(e.target.value)}
                    className="w-24 ui-input px-2 py-1 rounded-lg text-sm font-black"
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <>
                    {formatCp(data.creatorPoints)} <span className="text-xs font-normal ui-dim">CP</span>
                  </>
                )}
              </div>
              <div className="text-[10px] ui-dim">{t("profile.levels_created", { n: data.createdLevels?.length || 0 })}</div>
              {isFullAdmin && (
                <div className="flex items-center gap-1.5 mt-2">
                  <button
                    onClick={handleResetCp}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border hover:opacity-80"
                    style={{ borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                  >
                    <RotateCcw className="w-3 h-3" /> {t('profile.reset_cp')}
                  </button>
                  {isEditingCp ? (
                    <button
                      onClick={async () => {
                        try {
                          const value = Number(cpInput);
                          if (!Number.isFinite(value) || value < 0) {
                            showToast('Creator Points không hợp lệ.', 'error');
                            return;
                          }
                          const res = await fetch(`/api/admin/users/${data.id}/cp`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              action: 'set',
                              creatorPoints: value,
                              currentAdminUsername: currentUser.username,
                            }),
                          });
                          const resData = await res.json();
                          if (res.ok && resData.success) {
                            showToast(t('profile.cp_saved'), 'success');
                            setIsEditingCp(false);
                            fetchProfile();
                          } else {
                            showToast(resData.error || t('admin.action_fail'), 'error');
                          }
                        } catch (e) {
                          showToast(t('common.server_error'), 'error');
                        }
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50" style={{ backgroundColor: "var(--accent)" }}
                    >
                      <Check className="w-3 h-3" /> {t('common.save')}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setCpInput(String(data.creatorPoints ?? 0));
                        setIsEditingCp(true);
                      }}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border hover:opacity-80"
                      style={{ borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                    >
                      <Pencil className="w-3 h-3" /> {t('profile.edit_cp')}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hardest Demon Card */}
      {hardest && (
        <div className="ui-card p-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
              #{hardest.placement}
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase ui-dim">{t("profile.hardest_label")}</div>
              <h3 className="font-bold text-sm ui-title mt-0.5">{hardest.levelName}</h3>
              <div className="text-[11px] ui-dim">
                Base Points: <span className="font-semibold ui-title">{hardest.basePp.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <a
            href={hardest.videoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors"
            style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
          >
            <Play className="w-3 h-3" /> {t("profile.watch_video")}
          </a>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b pb-px" style={{ borderColor: 'var(--border-ui)' }}>
        <button
          onClick={() => setActiveTab('classic')}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer"
          style={{
            borderColor: activeTab === 'classic' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'classic' ? 'var(--accent)' : 'var(--text-dim)',
          }}
        >
          <Star className="w-3.5 h-3.5 fill-current" />
          Classic ({classicRecords.length})
        </button>
        <button
          onClick={() => setActiveTab('platformer')}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer"
          style={{
            borderColor: activeTab === 'platformer' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'platformer' ? 'var(--accent)' : 'var(--text-dim)',
          }}
        >
          <Moon className="w-3.5 h-3.5 fill-current -rotate-12" />
          Platformer ({data.platformerCompletions?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('creator')}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all cursor-pointer"
          style={{
            borderColor: activeTab === 'creator' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'creator' ? 'var(--accent)' : 'var(--text-dim)',
          }}
        >
          <Hammer className="w-3.5 h-3.5 fill-current" />
          Tác phẩm ({data.createdLevels?.length || 0})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'classic' && (
        <div className="ui-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b text-[10px] font-bold uppercase ui-dim" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                  <th className="px-4 py-2.5 w-10 text-center">#</th>
                  <th className="px-4 py-2.5">{t("profile.col_level")}</th>
                  <th className="px-4 py-2.5 text-center">{t("profile.col_progress")}</th>
                  <th className="px-4 py-2.5 text-right">Base Points</th>
                  <th className="px-4 py-2.5 text-center">{t("profile.col_weight")}</th>
                  <th className="px-4 py-2.5 text-right">{t("profile.col_pp")}</th>
                  <th className="px-4 py-2.5 text-center w-20">Video</th>
                </tr>
              </thead>
              <tbody className="ui-zebra">
                {classicRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center ui-dim italic">
                      {t('profile.no_records')}
                    </td>
                  </tr>
                ) : classicRecords.map((item: any, idx: number) => {
                  const pp = ppByRecordId.get(item.recordId);
                  return (
                  <tr key={item.recordId || item.id || `breakdown-${idx}`} className="hover:opacity-90">
                    <td className="px-4 py-2.5 text-center font-bold ui-dim">{pp?.rankInProfile ?? idx + 1}</td>
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
                    <td className="px-4 py-2.5 text-right font-black" style={{ color: pp ? 'var(--accent)' : 'var(--text-dim)' }}>
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
        </div>
      )}

      {activeTab === 'platformer' && (
        <div className="ui-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b text-[10px] font-bold uppercase ui-dim" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                  <th className="px-4 py-2.5">{t("profile.col_level")}</th>
                  <th className="px-4 py-2.5 text-center">{t("profile.col_time")}</th>
                  <th className="px-4 py-2.5 text-right">Base Points</th>
                  <th className="px-4 py-2.5 text-center">Video</th>
                </tr>
              </thead>
              <tbody className="ui-zebra">
                {data.platformerCompletions?.map((rec: any, idx: number) => (
                  <tr key={rec.recordId || rec.id || `plat-${idx}`} className="hover:opacity-90">
                    <td className="px-4 py-2.5">
                      {rec.gdLevelId ? (
                        <Link href={levelPath({ gdLevelId: rec.gdLevelId })} className="font-bold ui-title hover:underline" style={{ color: 'var(--accent)' }}>
                          {rec.name}
                        </Link>
                      ) : (
                        <span className="font-bold ui-title">{rec.name}</span>
                      )}
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
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'creator' && (
        <div className="ui-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b text-[10px] font-bold uppercase ui-dim" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                  <th className="px-4 py-2.5">Level Name</th>
                  <th className="px-4 py-2.5 text-center">Base Points</th>
                  <th className="px-4 py-2.5 text-center">Rating</th>
                  <th className="px-4 py-2.5 text-center">Mode</th>
                </tr>
              </thead>
              <tbody className="ui-zebra">
                {data.createdLevels?.map((level: any, idx: number) => (
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
                  </tr>
                ))}
                {(!data.createdLevels || data.createdLevels.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-xs ui-dim">
                      Chưa có tác phẩm nào
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(isOwner || isAdmin) && (
        <div className="ui-card p-4 space-y-3">
          <div className="text-[10px] font-bold uppercase ui-dim tracking-wider">Vùng nguy hiểm</div>
          <p className="text-xs ui-dim">
            {isOwner && !isAdmin
              ? 'Gửi yêu cầu để admin xem xét và xoá tài khoản của bạn.'
              : 'Các thao tác xoá tài khoản không thể hoàn tác.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {isOwner && (
              <button
                onClick={handleRequestDeleteAccount}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:opacity-90 transition-opacity bg-orange-500/10 text-orange-500 border border-orange-500/20"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Yêu cầu xoá tài khoản
              </button>
            )}
            {isAdmin && (
              <button
                onClick={handleForceDeleteAccount}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm hover:opacity-90 transition-opacity bg-red-600 border border-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xoá tài khoản
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

            {/* Section 2: Supporter Duration */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider ui-dim flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-pink-500" />
                {t('admin.section_supporter')}
              </label>

              {data.supporterUntil && new Date(data.supporterUntil) > new Date() ? (
                <div className="p-2.5 rounded-xl border text-[11px] flex items-center justify-between" style={{ backgroundColor: 'var(--badge-green-bg)', color: 'var(--badge-green-text)', borderColor: 'var(--badge-green-text)' }}>
                  <span>{t('admin.supporter_until')}</span>
                  <strong>{new Date(data.supporterUntil).toLocaleDateString(language === 'en' ? 'en-US' : 'vi-VN')}</strong>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl border text-[11px] ui-dim" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                  {t('admin.no_supporter')}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 pt-1">
                {[
                  { val: '0', label: t('admin.keep') },
                  { val: '1', label: t('admin.plus_1m') },
                  { val: '3', label: t('admin.plus_3m') },
                  { val: '6', label: t('admin.plus_6m') },
                  { val: '12', label: t('admin.plus_1y') },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => setSupporterMonthsToAdd(item.val)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                      supporterMonthsToAdd === item.val ? 'ring-2' : 'hover:opacity-80'
                    }`}
                    style={{
                      backgroundColor: supporterMonthsToAdd === item.val ? 'var(--accent)' : 'var(--bg-subtle)',
                      borderColor: supporterMonthsToAdd === item.val ? 'var(--accent)' : 'var(--border-ui)',
                      color: supporterMonthsToAdd === item.val ? '#fff' : 'var(--text-title)',
                    }}
                  >
                    {item.label}
                  </button>
                ))}
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
                      <span
                        key={b.id}
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        title={b.name}
                        style={{ backgroundColor: b.color || 'var(--accent)', color: '#fff', boxShadow: b.glowColor ? `0 0 6px ${b.color}` : 'none' }}
                      >
                        <IconRender icon={b.icon || 'Star'} className="w-3 h-3" />
                      </span>
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
    </div>
  );
}

