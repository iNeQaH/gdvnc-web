'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Star, Moon, Medal, Play, Globe, MessageSquare, Gamepad2, ArrowLeft, Camera, Check, X, Pencil, ShieldCheck, Heart, Trash2, Hammer, User as UserIcon, Shield, Crown, Trophy, Award, Zap, Flame, Diamond, StarHalf, CheckCircle, ChevronDown, RotateCcw, UserCheck, MapPin, Edit, ShieldAlert, RefreshCw, Ban, Unlock, Lock } from 'lucide-react';
import ImageEditorModal from '@/components/ImageEditorModal';
import BadgePickerModal from '@/components/BadgePickerModal';
import BadgeIcon from '@/components/BadgeIcon';
import { useLanguage } from '@/components/LanguageContext';
import { useTheme } from '@/components/ThemeProvider';
import { useToast } from '@/components/GlobalToast';
import { formatCp } from '@/lib/creatorPoints';
import { levelPath } from '@/lib/levelUrl';
import { type DictKey } from '@/lib/dictionaries';
import GdUnverifiedNotice from '@/components/GdUnverifiedNotice';
import { isFullAdminRole, isStaffRole, isSuperAdminUser } from '@/lib/roles';
import { logoutClient } from '@/lib/sessionClient';

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

export default function ProfilePage() {
  const params = useParams();
  const username = params?.username as string;
  const { t, language } = useLanguage();
  const { showConfirm, showToast } = useToast();

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'classic' | 'platformer' | 'creator'>('classic');
  const [recordPage, setRecordPage] = useState(1);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { setOverrideTheme } = useTheme();

  useEffect(() => {
    if (data) {
      if (setOverrideTheme) setOverrideTheme(data.profileTheme || null);
      
      if (typeof window !== 'undefined') {
        const overrideObj: any = {};
        if (data.profileTheme) overrideObj.theme = data.profileTheme;
        if (data.profileConfig?.backgroundUrl) overrideObj.backgroundUrl = data.profileConfig.backgroundUrl;
        if (data.profileConfig?.customThemeColor) overrideObj.customThemeColor = data.profileConfig.customThemeColor;
        
        (window as any).__profileOverride = overrideObj;
        window.dispatchEvent(new Event('gdvnc_user_update'));
      }

      return () => {
        if (setOverrideTheme) setOverrideTheme(null);
        if (typeof window !== 'undefined') {
          delete (window as any).__profileOverride;
          window.dispatchEvent(new Event('gdvnc_user_update'));
        }
      };
    }
  }, [data, setOverrideTheme]);
  const isOwner = !!(currentUser && currentUser.username === username);
  const isStaff = isStaffRole(currentUser?.role);
  const isFullAdmin = isFullAdminRole(currentUser?.role);
  const isAdmin = isFullAdmin;
  const isSuperAdmin = isSuperAdminUser(currentUser);
  const canEditInfo = isOwner || isStaff;

  // Direct editing states
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [verifyingGd, setVerifyingGd] = useState(false);

  // Super Admin Password Reset & Ban States
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);
  const [showBanModal, setShowBanModal] = useState(false);
  const [banReasonInput, setBanReasonInput] = useState('');
  const [banningUser, setBanningUser] = useState(false);

  // Image Editor Modal state
  const [show2faModal, setShow2faModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpInput, setTotpInput] = useState('');
  const [totpError, setTotpError] = useState('');
  const [settingUp2fa, setSettingUp2fa] = useState(false);
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
  const [isEditingHardest, setIsEditingHardest] = useState(false);
  const [hardestInput, setHardestInput] = useState('');
  const [showBadgePicker, setShowBadgePicker] = useState(false);
  const [editingField, setEditingField] = useState<null | 'country' | 'gdUsername' | 'discordTag'>(null);
  const [fieldDraft, setFieldDraft] = useState('');

  // Delete Account States
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteAccountReason, setDeleteAccountReason] = useState('');
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

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

  const fetchProfile = async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      const res = await fetch(`/api/profile/${username}`, { cache: 'no-store' });
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

  const updateProfileField = async (fields: { bio?: string; avatarUrl?: string; coverUrl?: string; country?: string; gdUsername?: string; discordTag?: string; profileConfig?: any }) => {
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
    if (!canEditInfo) return;
    setEditingField(field);
    setFieldDraft(value || '');
  };

  const saveInlineField = async () => {
    if (!editingField) return;
    await updateProfileField({ [editingField]: fieldDraft.trim() });
    setEditingField(null);
  };

  const handleOpenAvatarModal = () => {
    if (!canEditInfo) return;
    setImageModal({ open: true, type: 'avatar' });
  };

  const handleOpenCoverModal = () => {
    if (!canEditInfo) return;
    setImageModal({ open: true, type: 'cover' });
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
    if (!currentUser || !isFullAdmin) return;
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

  const handleToggleBan = async (action: 'ban' | 'unban', reason?: string) => {
    if (!currentUser || !isFullAdmin || !data) return;
    setBanningUser(true);
    try {
      const res = await fetch(`/api/admin/users/${data.id}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, reason }),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        showToast(json.message || 'Cập nhật trạng thái thành công!', 'success');
        setShowBanModal(false);
        setBanReasonInput('');
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

  const hardest = data.hardestClassic;
  const breakdown = data.classicBreakdown;
  const classicRecords = data.classicRecords || breakdown?.items || [];
  const platformerRecords = data.platformerCompletions || [];
  const createdLevels = data.createdLevels || [];
  const pagedClassic = classicRecords.slice((recordPage - 1) * RECORD_PAGE_SIZE, recordPage * RECORD_PAGE_SIZE);
  const pagedPlatformer = platformerRecords.slice((recordPage - 1) * RECORD_PAGE_SIZE, recordPage * RECORD_PAGE_SIZE);
  const pagedCreated = createdLevels.slice((recordPage - 1) * RECORD_PAGE_SIZE, recordPage * RECORD_PAGE_SIZE);
  const ppByRecordId = new Map<string, any>(
    (breakdown?.items || []).map((item: any) => [item.recordId, item])
  );

    return (
    <div className="max-w-[1200px] mx-auto py-8 px-4 space-y-6 relative">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Box 1 (Left Column) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="ui-card p-5 space-y-6">
            <h2 className="text-sm font-bold flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
              <UserIcon className="w-4 h-4" /> Hình ảnh & Nhận diện
            </h2>
            
            <div className="relative mb-6">
              <div 
                className={"w-full h-32 md:h-48 rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800 border " + (canEditInfo ? 'cursor-pointer group' : '')} 
                style={{ borderColor: 'var(--border-ui)' }}
                onClick={canEditInfo ? handleOpenCoverModal : undefined}
                title={canEditInfo ? "Đổi Banner" : undefined}
              >
                {data.coverUrl ? (
                  <img src={data.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <img src="/default-banner.svg" alt="Default Cover" className="w-full h-full object-cover opacity-50" />
                )}
                {canEditInfo && (
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-xs">
                    <Camera className="w-4 h-4" /> Đổi Banner
                  </div>
                )}
              </div>
              <div className="absolute -bottom-8 left-4 p-1 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
                <div 
                  className={"relative w-20 h-20 md:w-24 md:h-24 rounded-xl overflow-hidden bg-slate-200 dark:bg-zinc-700 shadow-sm border " + (canEditInfo ? 'cursor-pointer group' : '')} 
                  style={{ borderColor: 'var(--border-subtle)' }}
                  onClick={canEditInfo ? handleOpenAvatarModal : undefined}
                  title={canEditInfo ? "Đổi Avatar" : undefined}
                >
                  {data.avatarUrl ? <img src={data.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <UserIcon className="w-10 h-10 m-auto mt-5 md:mt-7 text-slate-400" />}
                  {canEditInfo && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold">
                      <Camera className="w-3.5 h-3.5 mb-0.5" /> Sửa
                    </div>
                  )}
                </div>
              </div>

              {/* Name & Badges */}
              <div className="absolute -bottom-7 left-28 md:left-36 flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl md:text-2xl font-black ui-title drop-shadow-md">{data.username}</h1>
                  {data.role === 'ADMIN' && <Crown className="w-5 h-5 text-rose-500 fill-rose-500" title="Admin" />}
                  {data.role === 'STAFF' && <ShieldCheck className="w-5 h-5 text-sky-500 fill-sky-500" title="Staff" />}
                </div>
                {data.badges && data.badges.length > 0 && (
                  <div className="flex items-center gap-1">
                    {data.badges.slice(0, 3).map((ub: any) => (
                      <div key={ub.id} title={ub.badge?.name}>
                        {ub.badge?.iconUrl ? <img src={ub.badge.iconUrl} className="w-5 h-5 object-contain drop-shadow" /> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* BIO */}
            <div className="pt-2 px-2">
              <div className="text-xs font-bold ui-dim mb-1 flex items-center justify-between">
                <span>TIỂU SỬ (BIO)</span>
                {isOwner && !isEditingBio && (
                  <button onClick={() => { setBioInput(data.bio || ''); setIsEditingBio(true); }} className="text-sky-500 hover:opacity-80"><Edit className="w-3.5 h-3.5" /></button>
                )}
              </div>
              {isEditingBio ? (
                <div className="space-y-2">
                  <textarea
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    className="w-full h-24 p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border text-xs"
                    style={{ borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                    placeholder="Viết gì đó về bản thân..."
                  />
                  <div className="flex gap-2">
                    <button onClick={() => updateProfileField({ bio: bioInput }).then(() => setIsEditingBio(false))} className="tsumiki-btn-green px-4 py-1.5 text-xs font-bold text-white rounded-xl">Lưu</button>
                    <button onClick={() => setIsEditingBio(false)} className="px-4 py-1.5 text-xs font-bold border rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all">Huỷ</button>
                  </div>
                </div>
              ) : (
                <div className="text-sm ui-title whitespace-pre-wrap">{data.bio || <span className="ui-dim italic">Chưa có tiểu sử.</span>}</div>
              )}
            </div>

            {/* Socials & Info */}
            <div className="pt-4 px-2 border-t grid grid-cols-1 md:grid-cols-2 gap-4" style={{ borderColor: 'var(--border-subtle)' }}>
               {/* GD Username */}
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-sky-500/10 text-sky-500">
                   <Gamepad2 className="w-4 h-4" />
                 </div>
                 <div>
                   <div className="text-[10px] font-bold uppercase ui-dim">Geometry Dash</div>
                   <div className="text-xs font-semibold ui-title flex items-center gap-1">
                     {data.gdUsername || 'Chưa liên kết'}
                     {data.gdVerified && <CheckCircle className="w-3 h-3 text-green-500" title="Đã xác minh" />}
                   </div>
                 </div>
               </div>
               
               {/* Discord */}
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 text-indigo-500">
                   <MessageSquare className="w-4 h-4" />
                 </div>
                 <div>
                   <div className="text-[10px] font-bold uppercase ui-dim">Discord</div>
                   <div className="text-xs font-semibold ui-title">{data.discordTag || 'Chưa liên kết'}</div>
                 </div>
               </div>

               {/* Location */}
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-rose-500/10 text-rose-500">
                   <MapPin className="w-4 h-4" />
                 </div>
                 <div>
                   <div className="text-[10px] font-bold uppercase ui-dim">Quốc gia / Vị trí</div>
                   <div className="text-xs font-semibold ui-title">{data.country || 'Chưa cập nhật'}</div>
                 </div>
               </div>
            </div>

            {/* Badges List */}
            {data.badges && data.badges.length > 0 && (
              <div className="pt-4 px-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="text-xs font-bold ui-dim mb-3 flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> TẤT CẢ HUY HIỆU</div>
                <div className="flex flex-wrap gap-2">
                  {data.badges.map((ub: any) => (
                    <div key={ub.id} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-sm bg-slate-50 dark:bg-zinc-800/50" style={{ borderColor: 'var(--border-ui)' }}>
                      {ub.badge?.iconUrl && <img src={ub.badge.iconUrl} alt="" className="w-4 h-4 object-contain" />}
                      <span className="text-[11px] font-bold ui-title">{ub.badge?.name || 'Badge'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin Controls */}
            {isStaff && (
              <div className="pt-4 px-2 border-t flex flex-wrap gap-2" style={{ borderColor: 'var(--border-subtle)' }}>
                {canEditInfo && <button onClick={() => setShowManageModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 transition-all border border-amber-500/20"><ShieldAlert className="w-3.5 h-3.5" /> Quản Lý Role & Badge</button>}
                {isSuperAdmin && <button onClick={() => setShowResetPasswordModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 transition-all border border-yellow-500/20"><RefreshCw className="w-3.5 h-3.5" /> Reset Mật Khẩu</button>}
                {isSuperAdmin && !data.isBanned && <button onClick={() => setShowBanModal(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all border border-red-500/20"><Ban className="w-3.5 h-3.5" /> Khoá Tài Khoản</button>}
                {isSuperAdmin && data.isBanned && <button onClick={() => handleToggleBan('unban')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-green-500/10 text-green-500 hover:bg-green-500/20 transition-all border border-green-500/20"><Unlock className="w-3.5 h-3.5" /> Mở Khoá Tài Khoản</button>}
              </div>
            )}
          </div>
        </div>

        {/* Box 2 (Right Column) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="ui-card p-5 space-y-5 h-full flex flex-col">
            <h2 className="text-sm font-bold flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
              <Trophy className="w-4 h-4 text-amber-500" /> Thống Kê & Xếp Hạng
            </h2>
            
            {/* Points & Rank */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border flex flex-col items-center text-center shadow-sm" style={{ borderColor: 'var(--border-ui)' }}>
                <Star className="w-5 h-5 text-amber-500 mb-1" />
                <div className="text-xs font-bold ui-dim uppercase">Classic Points</div>
                <div className="text-xl font-black text-amber-500">{data.classicPp?.toFixed(2) || '0.00'}</div>
                <div className="text-[10px] font-bold ui-dim mt-1">Rank {(data.classicPp || 0) > 0.005 && data.classicRank ? "#" + data.classicRank : '#-'}</div>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border flex flex-col items-center text-center shadow-sm" style={{ borderColor: 'var(--border-ui)' }}>
                <Gamepad2 className="w-5 h-5 text-sky-500 mb-1" />
                <div className="text-xs font-bold ui-dim uppercase">Platformer Points</div>
                <div className="text-xl font-black text-sky-500">{data.platformerPp?.toFixed(2) || '0.00'}</div>
                <div className="text-[10px] font-bold ui-dim mt-1">Rank {(data.platformerPp || 0) > 0.005 && data.platformerRank ? "#" + data.platformerRank : '#-'}</div>
              </div>
              <div className="col-span-2 p-3 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border flex flex-col items-center text-center shadow-sm relative" style={{ borderColor: 'var(--border-ui)' }}>
                <Hammer className="w-5 h-5 text-emerald-500 mb-1" />
                <div className="text-xs font-bold ui-dim uppercase">Creator Points</div>
                
                <div className="text-xl font-black mt-0.5 flex items-center justify-center gap-2 text-emerald-500">
                  {isFullAdmin && isEditingCp ? (
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      value={cpInput}
                      onChange={(e) => setCpInput(e.target.value)}
                      className="w-24 ui-input px-2 py-1 rounded-lg text-sm font-black"
                      autoFocus
                    />
                  ) : (
                    <span>{formatCp(data.creatorPoints)}</span>
                  )}
                </div>
                
                <div className="text-[10px] font-bold ui-dim mt-1">{data.createdLevels?.length || 0} Level đã tạo</div>

                {isFullAdmin && (
                  <div className="flex items-center justify-center gap-1.5 mt-2">
                    <button
                      onClick={handleResetCp}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border hover:opacity-80"
                      style={{ borderColor: 'var(--border-ui)' }}
                    >
                      <RotateCcw className="w-3 h-3" /> Reset
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
                            const res = await fetch('/api/admin/users/' + data.id + '/cp', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ action: 'set', creatorPoints: value, currentAdminUsername: currentUser.username }),
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
                            showToast(t('admin.action_fail'), 'error');
                          }
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold bg-green-500/10 text-green-500 border border-green-500/20 hover:bg-green-500/20"
                      >
                        <Check className="w-3 h-3" /> Lưu
                      </button>
                    ) : (
                      <button
                        onClick={() => { setCpInput(String(data.creatorPoints ?? 0)); setIsEditingCp(true); }}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border hover:opacity-80"
                        style={{ borderColor: 'var(--border-ui)' }}
                      >
                        <Pencil className="w-3 h-3" /> Sửa
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Hardest */}
            <div className="pt-2 flex-1 flex flex-col">
              <div className="text-xs font-bold ui-dim mb-3 flex items-center justify-between">
                <span className="flex items-center gap-1.5"><Crown className="w-3.5 h-3.5 text-rose-500" /> HARDEST LEVEL (Cá Nhân)</span>
                {isOwner && !isEditingHardest && (
                  <button onClick={() => { setHardestInput(data.profileConfig?.hardestEmbed || ''); setIsEditingHardest(true); }} className="text-sky-500 hover:opacity-80"><Edit className="w-3.5 h-3.5" /></button>
                )}
              </div>
              
              {isEditingHardest ? (
                <div className="space-y-2 flex-1">
                  <textarea
                    value={hardestInput}
                    onChange={(e) => setHardestInput(e.target.value)}
                    className="w-full h-32 p-3 rounded-xl bg-slate-50 dark:bg-zinc-900 border text-xs"
                    style={{ borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                    placeholder="Chèn link YouTube/Video iframe hoặc viết gì đó..."
                  />
                  <div className="flex gap-2">
                    <button onClick={async () => {
                      const newConfig = { ...(data.profileConfig || {}), hardestEmbed: hardestInput };
                      await updateProfileField({ profileConfig: newConfig });
                      setIsEditingHardest(false);
                      fetchProfile();
                    }} className="tsumiki-btn-green px-4 py-1.5 text-xs font-bold text-white rounded-xl">Lưu</button>
                    <button onClick={() => setIsEditingHardest(false)} className="px-4 py-1.5 text-xs font-bold border rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all">Huỷ</button>
                  </div>
                </div>
              ) : (
                <div className="w-full flex-1 rounded-2xl overflow-hidden bg-slate-100 dark:bg-zinc-900 border flex items-center justify-center min-h-[180px]" style={{ borderColor: 'var(--border-ui)' }}>
                  {data.profileConfig?.hardestEmbed ? (
                    <div className="w-full h-full flex flex-col text-sm font-medium text-center [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:aspect-video" dangerouslySetInnerHTML={{ __html: data.profileConfig.hardestEmbed }} />
                  ) : (
                    <span className="text-xs font-bold ui-dim p-4 text-center">Chưa có gì ở đây cả</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Box 3 - Tabs */}
      <div className="ui-card p-4 md:p-6 space-y-4 mt-6">
        
{/* Tabs */}
      
      <div className="flex flex-wrap items-center gap-2 mb-4 p-1.5 rounded-3xl border shadow-sm" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}>
        <button
          onClick={() => { setActiveTab('classic'); setRecordPage(1); }}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer rounded-2xl ${activeTab === 'classic' ? (data?.profileTheme === 'lavender' ? 'tsumiki-btn text-white shadow-md' : 'bg-[color:var(--accent)] text-[color:var(--accent-fg)] shadow-md') : 'hover:bg-slate-100 dark:hover:bg-zinc-800'}`}
          style={{ color: activeTab === 'classic' ? undefined : 'var(--text-dim)' }}
        >
          <Star className={`w-4 h-4 ${activeTab === 'classic' ? 'fill-current' : ''}`} />
          Classic ({classicRecords.length})
        </button>
        <button
          onClick={() => { setActiveTab('platformer'); setRecordPage(1); }}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer rounded-2xl ${activeTab === 'platformer' ? (data?.profileTheme === 'lavender' ? 'tsumiki-btn text-white shadow-md' : 'bg-[color:var(--accent)] text-[color:var(--accent-fg)] shadow-md') : 'hover:bg-slate-100 dark:hover:bg-zinc-800'}`}
          style={{ color: activeTab === 'platformer' ? undefined : 'var(--text-dim)' }}
        >
          <Gamepad2 className="w-4 h-4" />
          Platformer ({data.platformerCompletions?.length || 0})
        </button>
        <button
          onClick={() => { setActiveTab('creator'); setRecordPage(1); }}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer rounded-2xl ${activeTab === 'creator' ? (data?.profileTheme === 'lavender' ? 'tsumiki-btn text-white shadow-md' : 'bg-[color:var(--accent)] text-[color:var(--accent-fg)] shadow-md') : 'hover:bg-slate-100 dark:hover:bg-zinc-800'}`}
          style={{ color: activeTab === 'creator' ? undefined : 'var(--text-dim)' }}
        >
          <Hammer className={`w-4 h-4 ${activeTab === 'creator' ? 'fill-current' : ''}`} />
          Tác phẩm ({data.createdLevels?.length || 0})
        </button>
</div>

      {/* Tab Content */}
      {activeTab === 'classic' && (
        <div className="ui-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b text-[11px] font-bold uppercase ui-dim" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                  <th className="px-5 py-3 w-12 text-center">#</th>
                  <th className="px-5 py-3">{t("profile.col_level")}</th>
                  <th className="px-5 py-3 text-center">{t("profile.col_progress")}</th>
                  <th className="px-5 py-3 text-right">Base Points</th>
                  <th className="px-5 py-3 text-center">{t("profile.col_weight")}</th>
                  <th className="px-5 py-3 text-right">{t("profile.col_pp")}</th>
                  <th className="px-5 py-3 text-center w-24">Video</th>
                </tr>
              </thead>
              <tbody className="ui-zebra">
                {classicRecords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center ui-dim italic">
                      {t('profile.no_records')}
                    </td>
                  </tr>
                ) : pagedClassic.map((item: any, idx: number) => {
                  const pp = ppByRecordId.get(item.recordId);
                  return (
                  <tr key={item.recordId || item.id || `breakdown-${idx}`} className="hover:opacity-90">
                    <td className="px-5 py-3.5 text-center font-bold ui-dim">{pp?.rankInProfile ?? (recordPage - 1) * RECORD_PAGE_SIZE + idx + 1}</td>
                    <td className="px-5 py-3.5">
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
                    <td className="px-5 py-3.5 text-center font-semibold ui-title">
                      {item.progress != null ? `${item.progress}%` : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right ui-dim">
                      {item.awardedPp != null && item.progress != null && item.progress < 100
                        ? `${Number(item.awardedPp).toFixed(2)} / ${item.basePp.toFixed(2)}`
                        : item.basePp.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      {pp ? (
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold" style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}>
                          {pp.weightPercent}%
                        </span>
                      ) : (
                        <span className="text-[10px] ui-dim">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right font-black" style={{ color: pp ? 'var(--accent)' : 'var(--text-dim)' }}>
                      {pp ? pp.weightedPp.toFixed(2) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-center">
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
                  <th className="px-5 py-3">{t("profile.col_level")}</th>
                  <th className="px-5 py-3 text-center">{t("profile.col_time")}</th>
                  <th className="px-5 py-3 text-right">Base Points</th>
                  <th className="px-5 py-3 text-center">Video</th>
                </tr>
              </thead>
              <tbody className="ui-zebra">
                {pagedPlatformer.map((rec: any, idx: number) => (
                  <tr key={rec.recordId || rec.id || `plat-${idx}`} className="hover:opacity-90">
                    <td className="px-5 py-3.5">
                      {rec.gdLevelId ? (
                        <Link href={levelPath({ gdLevelId: rec.gdLevelId })} className="font-bold ui-title hover:underline" style={{ color: 'var(--accent)' }}>
                          {rec.name}
                        </Link>
                      ) : (
                        <span className="font-bold ui-title">{rec.name}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono font-bold" style={{ color: 'var(--badge-green-text)' }}>
                      {(rec.timeMs / 1000).toFixed(3)}s
                    </td>
                    <td className="px-5 py-3.5 text-right ui-dim">{rec.basePp.toFixed(2)}</td>
                    <td className="px-5 py-3.5 text-center">
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
          <RecordPager page={recordPage} total={platformerRecords.length} onPage={setRecordPage} t={t} />
        </div>
      )}

      {activeTab === 'creator' && (
        <div className="ui-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b text-[11px] font-bold uppercase ui-dim" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
                  <th className="px-5 py-3">Level Name</th>
                  <th className="px-5 py-3 text-center">Base Points</th>
                  <th className="px-5 py-3 text-center">Rating</th>
                  <th className="px-5 py-3 text-center">Mode</th>
                  {isStaff && <th className="px-5 py-3 text-center w-16"></th>}
                </tr>
              </thead>
              <tbody className="ui-zebra">
                {pagedCreated.map((level: any, idx: number) => (
                  <tr key={level.id || `created-${idx}`} className="hover:opacity-90">
                    <td className="px-5 py-3.5">
                      {level.gdLevelId ? (
                        <Link href={levelPath(level)} className="font-bold ui-title hover:underline" style={{ color: 'var(--accent)' }}>
                          {level.name}
                        </Link>
                      ) : (
                        <span className="font-bold ui-title">{level.name}</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center ui-dim">
                      {level.basePp.toFixed(2)}
                    </td>
                    <td className="px-5 py-3.5 text-center font-bold">
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
                    <td className="px-5 py-3.5 text-center">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-black/5 dark:bg-white/5 ui-dim">
                        {level.mode}
                      </span>
                    </td>
                    {isStaff && (
                      <td className="px-5 py-3.5 text-center">
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
                      Chưa có tác phẩm nào
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
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm sm:text-base ui-title text-red-500 flex items-center gap-2">
                <Flame className="w-5 h-5" />
                Đình chỉ tài khoản: {data.username}
              </h3>
              <button type="button" onClick={() => setShowBanModal(false)} className="p-1 rounded-xl border ui-dim cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-500 leading-relaxed font-semibold">
              Tài khoản bị đình chỉ sẽ không thể đăng nhập hoặc thao tác trên hệ thống. Phiên làm việc hiện tại của người dùng sẽ bị hủy ngay lập tức.
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

            <div className="flex items-center justify-end gap-2 pt-2">
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
                onClick={() => handleToggleBan('ban', banReasonInput)}
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


