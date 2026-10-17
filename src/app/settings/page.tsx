'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Check,
  Sparkles,
  LogOut,
  Trash2,
  HelpCircle,
  Lock,
  Gamepad2,
  MessageSquare,
  Globe,
  User as UserIcon,
  Settings,
  Image as ImageIcon,
  X,
  Heart,
  Gift,
  Ticket,
  Plus,
  Palette,
  Type,
  RotateCcw,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import { logoutClient } from '@/lib/sessionClient';
import ImageEditorModal from '@/components/ImageEditorModal';
import SmartCaptcha from '@/components/SmartCaptcha';
import ColorPicker from '@/components/ColorPicker';
import { UserDisplayName, FONT_PRESETS } from '@/components/UserDisplayName';

export default function SettingsPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { showToast, showConfirm } = useToast();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // States
  const [gdUsername, setGdUsername] = useState('');
  const [discordTag, setDiscordTag] = useState('');
  const [country, setCountry] = useState('');
  const [bio, setBio] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  // Supporter custom theme colors, angle & border customization
  const [themeColors, setThemeColors] = useState<string[]>(['#0ea5e9']);
  const [themeAngle, setThemeAngle] = useState<number>(135);
  const [customBorderMode, setCustomBorderMode] = useState<boolean>(false);
  const [borderColors, setBorderColors] = useState<string[]>(['#38bdf8']);
  const [borderAnimation, setBorderAnimation] = useState<boolean>(true);
  const [borderGlowEnabled, setBorderGlowEnabled] = useState<boolean>(true);
  const [borderGlowColor, setBorderGlowColor] = useState<string>('#38bdf8');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Supporter custom name styles
  const [nameColor, setNameColor] = useState<string>('#ffffff');
  const [nameUseGradient, setNameUseGradient] = useState<boolean>(false);
  const [nameGradColor1, setNameGradColor1] = useState<string>('#38bdf8');
  const [nameGradColor2, setNameGradColor2] = useState<string>('#ec4899');
  const [nameGradAngle, setNameGradAngle] = useState<number>(90);
  const [nameUseGlow, setNameUseGlow] = useState<boolean>(false);
  const [nameGlowColor, setNameGlowColor] = useState<string>('#38bdf8');
  const [nameFont, setNameFont] = useState<string>('default');
  const [savingNameStyle, setSavingNameStyle] = useState<boolean>(false);

  // Image Modal
  const [imageModal, setImageModal] = useState<{ open: boolean; type: 'avatar' | 'cover' | 'background' }>({
    open: false,
    type: 'avatar',
  });

  // 2FA Setup
  const [show2faModal, setShow2faModal] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpInput, setTotpInput] = useState('');
  const [totpError, setTotpError] = useState('');
  const [settingUp2fa, setSettingUp2fa] = useState(false);

  // Password reset
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwOtp, setPwOtp] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwCooldown, setPwCooldown] = useState(0);
  const [captchaToken, setCaptchaToken] = useState('');
  const [redeemCode, setRedeemCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    if (pwCooldown > 0) {
      const timer = setTimeout(() => setPwCooldown(pwCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [pwCooldown]);

  const loadData = async () => {
    const raw = localStorage.getItem('gdvnc_user');
    if (!raw) {
      router.push('/login');
      return;
    }
    const user = JSON.parse(raw);
    setCurrentUser(user);

    try {
      const res = await fetch(`/api/profile/${user.username}`);
      const json = await res.json();
      if (res.ok && json.user) {
        setData(json.user);
        setGdUsername(json.user.gdUsername || '');
        setDiscordTag(json.user.discordTag || '');
        setCountry(json.user.country || '');
        setBio(json.user.bio || '');

        const cfg = json.user.profileConfig || {};
        const initColors =
          cfg.customThemeColors && Array.isArray(cfg.customThemeColors) && cfg.customThemeColors.length > 0
            ? cfg.customThemeColors
            : [cfg.customThemeColor || '#0ea5e9'];
        const initAngle = typeof cfg.customThemeAngle === 'number' ? cfg.customThemeAngle : 135;
        const hasCustomBorders = Array.isArray(cfg.customBorderColors) && cfg.customBorderColors.length > 0;
        const initBorderColors = hasCustomBorders ? cfg.customBorderColors : ['#38bdf8'];
        const initBorderAnim = cfg.customBorderAnimation !== undefined ? Boolean(cfg.customBorderAnimation) : true;
        const initBorderGlowEnabled = cfg.customBorderGlowEnabled !== undefined ? Boolean(cfg.customBorderGlowEnabled) : true;
        const initBorderGlowColor = cfg.customBorderGlowColor || (hasCustomBorders ? initBorderColors[0] : initColors[0]);

        setThemeColors(initColors);
        setThemeAngle(initAngle);
        setCustomBorderMode(hasCustomBorders);
        setBorderColors(initBorderColors);
        setBorderAnimation(initBorderAnim);
        setBorderGlowEnabled(initBorderGlowEnabled);
        setBorderGlowColor(initBorderGlowColor);

        // Load supporter name styles
        if (json.user.nameFont) setNameFont(json.user.nameFont);
        if (json.user.nameColor) setNameColor(json.user.nameColor);
        if (json.user.nameGradient) {
          setNameUseGradient(true);
          const gradMatch = json.user.nameGradient.match(
            /linear-gradient\s*\(\s*(\d+)deg\s*,\s*(#[a-fA-F0-9]{3,8}|[a-zA-Z0-9(),\s]+)\s*,\s*(#[a-fA-F0-9]{3,8}|[a-zA-Z0-9(),\s]+)\s*\)/i
          );
          if (gradMatch) {
            setNameGradAngle(parseInt(gradMatch[1], 10) || 90);
            setNameGradColor1(gradMatch[2].trim());
            setNameGradColor2(gradMatch[3].trim());
          }
        }
        if (json.user.nameGlow) {
          setNameUseGlow(true);
          setNameGlowColor(json.user.nameGlow);
        }
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveNameStyle = async (reset = false) => {
    setSavingNameStyle(true);
    try {
      const payload = reset
        ? {
            nameColor: null,
            nameGradient: null,
            nameGlow: null,
            nameFont: null,
          }
        : {
            nameColor: nameUseGradient ? null : (nameColor || null),
            nameGradient: nameUseGradient
              ? `linear-gradient(${nameGradAngle}deg, ${nameGradColor1}, ${nameGradColor2})`
              : null,
            nameGlow: nameUseGlow ? (nameGlowColor || '#38bdf8') : null,
            nameFont: nameFont === 'default' ? null : nameFont,
          };

      const res = await fetch(`/api/profile/${currentUser.username}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resJson = await res.json();
      if (res.ok && resJson.success) {
        if (reset) {
          setNameColor('#ffffff');
          setNameUseGradient(false);
          setNameGradColor1('#38bdf8');
          setNameGradColor2('#ec4899');
          setNameGradAngle(90);
          setNameUseGlow(false);
          setNameGlowColor('#38bdf8');
          setNameFont('default');
        }
        const updatedUser = { ...currentUser, ...payload };
        setCurrentUser(updatedUser);
        setData((prev: any) => ({ ...prev, ...payload }));
        localStorage.setItem('gdvnc_user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('gdvnc_user_update'));
        showToast('Đã lưu phong cách tên thành công!', 'success');
      } else {
        showToast(resJson.error || 'Không thể lưu phong cách tên', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ', 'error');
    } finally {
      setSavingNameStyle(false);
    }
  };

  const updateThemeConfig = (
    newColors: string[],
    newAngle: number,
    newBorderMode?: boolean,
    newBorderColors?: string[],
    newBorderAnim?: boolean,
    newGlowEnabled?: boolean,
    newGlowColor?: string
  ) => {
    const safeColors = newColors.length > 0 ? newColors : ['#0ea5e9'];
    const safeBorderMode = newBorderMode !== undefined ? newBorderMode : customBorderMode;
    const safeBorderColors = newBorderColors && newBorderColors.length > 0 ? newBorderColors : borderColors;
    const safeBorderAnim = newBorderAnim !== undefined ? newBorderAnim : borderAnimation;
    const safeGlowEnabled = newGlowEnabled !== undefined ? newGlowEnabled : borderGlowEnabled;
    const safeGlowColor = newGlowColor !== undefined ? newGlowColor : borderGlowColor;

    setThemeColors(safeColors);
    setThemeAngle(newAngle);
    setCustomBorderMode(safeBorderMode);
    setBorderColors(safeBorderColors);
    setBorderAnimation(safeBorderAnim);
    setBorderGlowEnabled(safeGlowEnabled);
    setBorderGlowColor(safeGlowColor);

    const newConfig = {
      ...(data?.profileConfig || {}),
      customThemeColor: safeColors[0],
      customThemeColors: safeColors,
      customThemeAngle: newAngle,
      customBorderColors: safeBorderMode ? safeBorderColors : null,
      customBorderAnimation: safeBorderAnim,
      customBorderGlowEnabled: safeGlowEnabled,
      customBorderGlowColor: safeGlowColor,
    };

    setData((prev: any) => ({ ...prev, profileConfig: newConfig }));

    const updatedUser = { ...currentUser, profileConfig: newConfig };
    setCurrentUser(updatedUser);
    localStorage.setItem('gdvnc_user', JSON.stringify(updatedUser));
    window.dispatchEvent(new Event('gdvnc_user_update'));

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await fetch(`/api/profile/${currentUser.username}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileConfig: newConfig }),
        });
      } catch (err) {
        console.error('Failed to save profile config', err);
      }
    }, 400);
  };

  const handleSaveInfo = async () => {
    setSavingInfo(true);
    try {
      const res = await fetch(`/api/profile/${currentUser.username}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gdUsername, discordTag, country, bio }),
      });
      if (res.ok) showToast(t('settings.save_info_success'), 'success');
      else showToast(t('settings.save_info_error'), 'error');
    } catch (e) {
      showToast(t('settings.save_info_error'), 'error');
    }
    setSavingInfo(false);
  };

  const handleLogout = async () => {
    await logoutClient();
    window.location.href = '/';
  };

  const handleDeleteAccount = () => {
    showConfirm(t('settings.delete_confirm'), async () => {
      try {
        const res = await fetch(`/api/profile/${currentUser.username}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'User requested deletion via Settings' }),
        });
        if (res.ok) {
          showToast(t('settings.account_deleted'), 'success');
          handleLogout();
        } else {
          showToast(t('settings.delete_failed'), 'error');
        }
      } catch (e) {}
    });
  };

  // 2FA Handlers
  const handleSetup2FA = async () => {
    setSettingUp2fa(true);
    setTotpError('');
    try {
      const res = await fetch('/api/auth/2fa');
      const json = await res.json();
      if (!res.ok) {
        setTotpError(json.error || 'Lỗi');
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
        body: JSON.stringify({ token: totpInput }),
      });
      if (!res.ok) {
        setTotpError(t('settings.2fa_invalid'));
        return;
      }
      setShow2faModal(false);
      showToast(t('settings.2fa_success'), 'success');
      setData({ ...data, totpEnabled: true });
    } catch (e) {} finally {
      setSettingUp2fa(false);
    }
  };

  const handleDisable2FA = async () => {
    showConfirm(t('settings.disable_2fa_confirm'), async () => {
      try {
        const res = await fetch('/api/auth/2fa', { method: 'DELETE' });
        if (res.ok) {
          showToast(t('settings.disable_2fa_success'), 'success');
          setData({ ...data, totpEnabled: false });
        } else showToast('Có lỗi xảy ra', 'error');
      } catch (e) {}
    });
  };

  // Password Reset Handlers
  const handleSendOtp = async () => {
    if (!currentUser?.email) {
      showToast(t('settings.pwd_no_email'), 'error');
      return;
    }
    if (!captchaToken) {
      showToast(t('settings.pwd_captcha_req'), 'error');
      return;
    }
    try {
      const res = await fetch('/api/auth/send-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, locale: language, captchaToken }),
      });
      const resJson = await res.json();
      if (res.ok && resJson.success) {
        setPwCooldown(60);
        showToast(t('settings.pwd_otp_sent'), 'success');
      } else {
        showToast(resJson.error || t('settings.pwd_error'), 'error');
      }
    } catch (e) {}
  };

  const handleChangePassword = async () => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, otp: pwOtp, password: pwNew, locale: language }),
      });
      if (res.ok) {
        showToast(t('settings.pwd_success'), 'success');
        setShowPasswordModal(false);
      } else {
        showToast(t('settings.pwd_error'), 'error');
      }
    } catch (e) {}
  };

  const handleRedeem = async () => {
    const code = redeemCode.trim();
    if (!code) {
      showToast(t('settings.redeem_empty'), 'error');
      return;
    }
    setRedeeming(true);
    try {
      const res = await fetch('/api/redeem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const resJson = await res.json();
      if (res.ok && resJson.success) {
        const successMsg =
          resJson.message ||
          t('settings.redeem_success').replace('{months}', String(resJson.months || 1));
        showToast(successMsg, 'success');
        setRedeemCode('');
        if (resJson.user) {
          setData((prev: any) => ({ ...prev, supporterUntil: resJson.user.supporterUntil }));
          setCurrentUser(resJson.user);
          localStorage.setItem('gdvnc_user', JSON.stringify(resJson.user));
          window.dispatchEvent(new Event('gdvnc_user_update'));
        }
      } else {
        showToast(resJson.error || t('settings.redeem_error'), 'error');
      }
    } catch {
      showToast(t('settings.redeem_server_error'), 'error');
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-sm ui-dim">{t('common.loading')}</div>;
  if (!data) return null;

  const isSupporter = Boolean(
    (currentUser?.supporterUntil && new Date(currentUser.supporterUntil) > new Date()) ||
    (data?.supporterUntil && new Date(data.supporterUntil) > new Date())
  );
  const isSuperAdmin = Boolean(
    currentUser?.role === 'ADMIN' ||
    (currentUser?.username && currentUser.username.toLowerCase() === 'ineqah')
  );
  const canAccessSupporter = isSupporter || isSuperAdmin;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-black flex items-center gap-2">
        <Settings className="w-6 h-6 text-sky-500" />
        {t('settings.title')}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="ui-card p-5 space-y-4">
            <h2
              className="text-sm font-bold flex items-center gap-2 border-b pb-2"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <UserIcon className="w-4 h-4" /> {t('settings.identity')}
            </h2>
            <div className="relative mb-8">
              <div
                className="w-full h-24 md:h-32 rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800 border"
                style={{ borderColor: 'var(--border-ui)' }}
              >
                {data.coverUrl && <img src={data.coverUrl} alt="Cover" className="w-full h-full object-cover" />}
              </div>
              <div className="absolute -bottom-5 left-4 p-1 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
                <div
                  className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden bg-slate-200 dark:bg-zinc-700 shadow-sm border"
                  style={{ borderColor: 'var(--border-subtle)' }}
                >
                  {data.avatarUrl ? (
                    <img src={data.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-8 h-8 m-auto mt-3 md:mt-4 text-slate-400" />
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setImageModal({ open: true, type: 'avatar' })}
                className="px-4 py-2 bg-sky-500/10 text-sky-500 rounded-xl text-xs font-bold hover:bg-sky-500/20 flex gap-2 items-center cursor-pointer transition-colors border border-sky-500/20"
              >
                <ImageIcon className="w-4 h-4" /> {t('settings.change_avatar')}
              </button>
              <button
                type="button"
                onClick={() => setImageModal({ open: true, type: 'cover' })}
                className="px-4 py-2 bg-sky-500/10 text-sky-500 rounded-xl text-xs font-bold hover:bg-sky-500/20 flex gap-2 items-center cursor-pointer transition-colors border border-sky-500/20"
              >
                <ImageIcon className="w-4 h-4" /> {t('settings.change_banner')}
              </button>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <label className="text-[11px] font-bold ui-dim">{t('settings.gd_username')}</label>
                <div className="flex items-center gap-2 mt-1">
                  <Gamepad2 className="w-4 h-4 ui-dim" />
                  <input
                    type="text"
                    value={gdUsername}
                    onChange={(e) => setGdUsername(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg text-sm border focus:ring-1 focus:ring-sky-500"
                    style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold ui-dim">{t('settings.discord_tag')}</label>
                <div className="flex items-center gap-2 mt-1">
                  <MessageSquare className="w-4 h-4 ui-dim" />
                  <input
                    type="text"
                    value={discordTag}
                    onChange={(e) => setDiscordTag(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg text-sm border focus:ring-1 focus:ring-sky-500"
                    style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold ui-dim">{t('settings.country')}</label>
                <div className="flex items-center gap-2 mt-1">
                  <Globe className="w-4 h-4 ui-dim" />
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg text-sm border focus:ring-1 focus:ring-sky-500"
                    style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
                  />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold ui-dim">{t('profile.bio') || 'Tiểu sử'}</label>
                <div className="mt-1">
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Viết gì đó về bản thân..."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-sky-500 resize-y"
                    style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleSaveInfo}
                disabled={savingInfo}
                className="w-full mt-2 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
              >
                {t('settings.save_info')}
              </button>
            </div>
          </div>

          <div className="ui-card p-5 space-y-4 border-red-500/20 bg-red-500/5">
            <h2 className="text-sm font-bold flex items-center gap-2 text-red-500 border-b border-red-500/20 pb-2">
              <Trash2 className="w-4 h-4" /> {t('settings.delete_account')}
            </h2>
            <p className="text-xs ui-dim">{t('settings.delete_account_warn')}</p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              className="px-4 py-2 bg-red-500/20 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500/30 w-full cursor-pointer transition-colors border border-red-500/20 tsumiki-btn-red"
            >
              {t('settings.delete_account_btn')}
            </button>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Profile Theme Selection */}
          <div className="ui-card p-5 space-y-4" style={{ backgroundColor: 'var(--bg-card)' }}>
            <h2
              className="text-sm font-bold flex items-center gap-2 border-b pb-2 text-purple-500"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <Sparkles className="w-4 h-4" /> {t('settings.profile_theme')}
            </h2>
            <p className="text-xs ui-dim">{t('settings.profile_theme_desc')}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1">
              {[
                { id: 'sky', label: t('theme.sky') || 'Sky', color: 'bg-sky-500' },
                { id: 'sakura', label: t('theme.sakura') || 'Sakura', color: 'bg-pink-400' },
                { id: 'mono', label: 'Mono', color: 'bg-zinc-500' },
                { id: 'mint', label: t('theme.mint') || 'Mint (RGB)', color: 'bg-emerald-400' },
                {
                  id: 'custom',
                  label: t('theme.custom') || 'Custom',
                  color: themeColors.length > 1 ? '' : 'bg-gradient-to-r from-pink-500 to-sky-500',
                  style:
                    themeColors.length > 1
                      ? { background: `linear-gradient(${themeAngle}deg, ${themeColors.join(', ')})` }
                      : undefined,
                },
                { id: 'lavender', label: 'iNeQaH', color: 'bg-purple-500' },
              ].map((th) => {
                const isSelected = (data.profileTheme || 'sky') === th.id;
                return (
                  <button
                    key={th.id}
                    type="button"
                    onClick={async () => {
                      setData({ ...data, profileTheme: th.id });
                      await fetch('/api/profile/' + currentUser.username, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ profileTheme: th.id }),
                      });
                      const updatedUser = { ...currentUser, profileTheme: th.id };
                      setCurrentUser(updatedUser);
                      localStorage.setItem('gdvnc_user', JSON.stringify(updatedUser));
                      showToast(t('settings.profile_theme_saved'), 'success');
                      window.dispatchEvent(new Event('gdvnc_user_update'));
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30'
                        : 'hover:bg-slate-50 dark:hover:bg-zinc-800'
                    }`}
                    style={!isSelected ? { borderColor: 'var(--border-ui)' } : {}}
                  >
                    <span
                      className={`w-3 h-3 rounded-full shrink-0 ${th.color}`}
                      style={th.style}
                    />
                    <span className="truncate">{th.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-auto text-purple-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Redeem Code */}
          <div className="ui-card p-5 space-y-4 border-amber-500/20" style={{ backgroundColor: 'var(--bg-card)' }}>
            <h2
              className="text-sm font-bold flex items-center gap-2 border-b pb-2 text-amber-500"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <Gift className="w-4 h-4" /> {t('settings.redeem_title')}
            </h2>
            <p className="text-xs ui-dim">{t('settings.redeem_desc')}</p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Ticket className="w-4 h-4 ui-dim absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={redeemCode}
                  onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRedeem();
                  }}
                  placeholder={t('settings.redeem_placeholder')}
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-xs font-mono font-bold tracking-wider border focus:ring-1 focus:ring-amber-500 outline-none uppercase"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--text-title)',
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleRedeem}
                disabled={redeeming || !redeemCode.trim()}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50 shrink-0 flex items-center gap-1.5 shadow-xs"
              >
                <Gift className="w-3.5 h-3.5" />
                {redeeming ? t('settings.redeem_checking') : t('settings.redeem_btn')}
              </button>
            </div>
          </div>

          {/* Supporter Perks & Theme Color Box */}
          {canAccessSupporter && (
            <div className="ui-card p-5 space-y-5 border-pink-500/20" style={{ backgroundColor: 'var(--bg-card)' }}>
              <h2
                className="text-sm font-bold flex items-center gap-2 border-b pb-2 text-pink-500"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <Heart className="w-4 h-4" /> {t('settings.supporter_perks')}
              </h2>

              {/* Theme Colors & Gradient Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                    {t('settings.custom_colors')}
                  </label>
                  {themeColors.length >= 2 && (
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-pink-500/10 text-pink-500 border border-pink-500/20">
                      {themeAngle}°
                    </span>
                  )}
                </div>

                <p className="text-xs ui-dim leading-relaxed">
                  {t('settings.custom_colors_desc')}
                </p>

                {/* Color swatches with custom ColorPicker */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  {themeColors.map((col, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-1.5 pr-2.5 rounded-2xl border bg-slate-500/5 transition-all shadow-xs"
                      style={{ borderColor: 'var(--border-ui)' }}
                    >
                      <ColorPicker
                        value={col}
                        onChange={(nextHex) => {
                          const next = [...themeColors];
                          next[idx] = nextHex;
                          updateThemeConfig(next, themeAngle);
                        }}
                        size={32}
                        round
                        ariaLabel={`${t('settings.color')} ${idx + 1}`}
                      />
                      <span className="font-mono text-xs font-bold uppercase">{col}</span>
                      {themeColors.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = themeColors.filter((_, i) => i !== idx);
                            updateThemeConfig(next, themeAngle);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                          title={t('settings.remove_color')}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  ))}

                  {themeColors.length < 5 && (
                    <button
                      type="button"
                      onClick={() => {
                        const PRESET_ADD = ['#ec4899', '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b'];
                        const nextColor = PRESET_ADD[themeColors.length] || '#ec4899';
                        const next = [...themeColors, nextColor];
                        updateThemeConfig(next, themeAngle);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed text-xs font-bold ui-dim hover:text-pink-500 hover:border-pink-500/40 transition-colors cursor-pointer"
                      style={{ borderColor: 'var(--border-ui)' }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      {t('settings.add_color')}
                    </button>
                  )}
                </div>

                {/* Gradient Direction & Preview when >= 2 colors */}
                {themeColors.length >= 2 && (
                  <div
                    className="p-3.5 rounded-2xl border space-y-2.5 bg-slate-500/5 mt-3 animate-in fade-in duration-200"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="ui-dim">{t('settings.gradient_angle')}</span>
                      <div className="flex items-center gap-1 text-[11px]">
                        {[0, 45, 90, 135, 180, 270].map((deg) => (
                          <button
                            key={deg}
                            type="button"
                            onClick={() => updateThemeConfig(themeColors, deg)}
                            className={`px-1.5 py-0.5 rounded-md font-mono cursor-pointer transition-colors ${
                              themeAngle === deg
                                ? 'bg-pink-500 text-white font-bold'
                                : 'ui-subtle hover:text-pink-500'
                            }`}
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>

                    <input
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      value={themeAngle}
                      onChange={(e) => updateThemeConfig(themeColors, parseInt(e.target.value, 10) || 0)}
                      className="w-full accent-pink-500 cursor-pointer"
                    />

                    {/* Live gradient preview bar */}
                    <div
                      className="w-full h-5 rounded-lg border shadow-inner transition-all duration-300"
                      style={{
                        borderColor: 'var(--border-ui)',
                        background: `linear-gradient(${themeAngle}deg, ${themeColors.join(', ')})`,
                      }}
                    />
                  </div>
                )}

                {/* Border Customization Section */}
                <div className="pt-3 border-t space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                      {t('settings.custom_border_title')}
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-bold ui-dim hover:text-pink-500 transition-colors">
                      <input
                        type="checkbox"
                        checked={customBorderMode}
                        onChange={(e) => {
                          const nextMode = e.target.checked;
                          updateThemeConfig(themeColors, themeAngle, nextMode, borderColors, borderAnimation);
                        }}
                        className="rounded accent-pink-500 cursor-pointer"
                      />
                      <span>{t('settings.custom_border_toggle')}</span>
                    </label>
                  </div>

                  <p className="text-xs ui-dim leading-relaxed">
                    {t('settings.custom_border_desc')}
                  </p>

                  {customBorderMode && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      {/* Border Color Swatches */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        {borderColors.map((col, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-1.5 pr-2.5 rounded-2xl border bg-slate-500/5 transition-all shadow-xs"
                            style={{ borderColor: 'var(--border-ui)' }}
                          >
                            <ColorPicker
                              value={col}
                              onChange={(nextHex) => {
                                const next = [...borderColors];
                                next[idx] = nextHex;
                                updateThemeConfig(themeColors, themeAngle, customBorderMode, next, borderAnimation);
                              }}
                              size={32}
                              round
                              ariaLabel={`${t('settings.border_color')} ${idx + 1}`}
                            />
                            <span className="font-mono text-xs font-bold uppercase">{col}</span>
                            {borderColors.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  const next = borderColors.filter((_, i) => i !== idx);
                                  updateThemeConfig(themeColors, themeAngle, customBorderMode, next, borderAnimation);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                title={t('settings.remove_color')}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ))}

                        {borderColors.length < 4 && (
                          <button
                            type="button"
                            onClick={() => {
                              const PRESET_BORDER = ['#38bdf8', '#ec4899', '#a855f7', '#10b981'];
                              const nextColor = PRESET_BORDER[borderColors.length] || '#ec4899';
                              const next = [...borderColors, nextColor];
                              updateThemeConfig(themeColors, themeAngle, customBorderMode, next, borderAnimation);
                            }}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed text-xs font-bold ui-dim hover:text-pink-500 hover:border-pink-500/40 transition-colors cursor-pointer"
                            style={{ borderColor: 'var(--border-ui)' }}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            {t('settings.add_border_color')}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Border Animation Toggle */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl border bg-slate-500/5" style={{ borderColor: 'var(--border-subtle)' }}>
                    <span className="text-xs font-bold ui-dim">{t('settings.custom_border_anim')}</span>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={borderAnimation}
                        onChange={(e) => {
                          const nextAnim = e.target.checked;
                          updateThemeConfig(themeColors, themeAngle, customBorderMode, borderColors, nextAnim, borderGlowEnabled, borderGlowColor);
                        }}
                        className="cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Border Glow Toggle */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl border bg-slate-500/5" style={{ borderColor: 'var(--border-subtle)' }}>
                    <span className="text-xs font-bold ui-dim">{t('settings.custom_border_glow')}</span>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={borderGlowEnabled}
                        onChange={(e) => {
                          const nextGlow = e.target.checked;
                          updateThemeConfig(themeColors, themeAngle, customBorderMode, borderColors, borderAnimation, nextGlow, borderGlowColor);
                        }}
                        className="cursor-pointer"
                      />
                    </label>
                  </div>

                  {/* Glow Color Picker (when glow enabled) */}
                  {borderGlowEnabled && (
                    <div className="p-3 rounded-xl border bg-slate-500/5 space-y-2 animate-in fade-in duration-200" style={{ borderColor: 'var(--border-subtle)' }}>
                      <div className="text-xs font-bold ui-dim flex items-center justify-between">
                        <span>{t('settings.custom_border_glow_color')}</span>
                        <span className="font-mono text-[11px] font-bold uppercase">{borderGlowColor}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <ColorPicker
                          value={borderGlowColor}
                          onChange={(nextHex) => {
                            updateThemeConfig(themeColors, themeAngle, customBorderMode, borderColors, borderAnimation, borderGlowEnabled, nextHex);
                          }}
                          size={32}
                          round
                          ariaLabel={t('settings.custom_border_glow_color')}
                        />
                        <div
                          className="flex-1 h-8 rounded-xl border flex items-center px-3 text-xs font-mono font-bold transition-all"
                          style={{
                            borderColor: 'var(--border-ui)',
                            backgroundColor: 'var(--bg-card)',
                            boxShadow: `0 0 16px 2px ${borderGlowColor}55`,
                          }}
                        >
                          <span className="ui-dim text-[11px]">Preview Glow</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Background image section relocated inside this box */}
              <div className="pt-3 border-t space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setImageModal({ open: true, type: 'background' })}
                    className="px-4 py-2 bg-pink-500/10 text-pink-500 rounded-xl text-xs font-bold hover:bg-pink-500/20 flex gap-2 items-center cursor-pointer transition-colors border border-pink-500/20"
                  >
                    <ImageIcon className="w-4 h-4" /> {t('settings.change_bg')}
                  </button>

                  {data.profileConfig?.backgroundUrl && (
                    <button
                      type="button"
                      onClick={async () => {
                        const newConfig = { ...(data.profileConfig || {}), backgroundUrl: null };
                        setData({ ...data, profileConfig: newConfig });
                        await fetch('/api/profile/' + currentUser.username, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ profileConfig: newConfig }),
                        });
                        const updatedUser = { ...currentUser, profileConfig: newConfig };
                        setCurrentUser(updatedUser);
                        localStorage.setItem('gdvnc_user', JSON.stringify(updatedUser));
                        window.dispatchEvent(new Event('gdvnc_user_update'));
                        showToast(t('settings.bg_removed'), 'success');
                      }}
                      className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500/20 flex gap-1 items-center cursor-pointer border border-red-500/20"
                    >
                      <X className="w-3.5 h-3.5" /> {t('settings.remove_bg')}
                    </button>
                  )}
                </div>

                {data.profileConfig?.backgroundUrl && (
                  <div
                    className="flex items-center gap-3 p-2 rounded-xl border bg-slate-500/5"
                    style={{ borderColor: 'var(--border-ui)' }}
                  >
                    <div
                      className="w-16 h-10 rounded-lg overflow-hidden border shrink-0"
                      style={{ borderColor: 'var(--border-subtle)' }}
                    >
                      <img
                        src={data.profileConfig.backgroundUrl}
                        alt="Background preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <span className="text-xs ui-dim truncate font-mono">{t('settings.current_bg')}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Supporter Name Styling Box */}
          {canAccessSupporter && (
            <div className="ui-card p-5 space-y-5 border-purple-500/20" style={{ backgroundColor: 'var(--bg-card)' }}>
              <div className="flex items-center justify-between border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
                <h2 className="text-sm font-bold flex items-center gap-2 text-purple-400">
                  <Palette className="w-4 h-4" /> Tùy biến phong cách Tên (Supporter)
                </h2>
                <button
                  type="button"
                  onClick={() => handleSaveNameStyle(true)}
                  disabled={savingNameStyle}
                  className="px-2.5 py-1 text-[11px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-red-500/20 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Đặt lại về mặc định"
                >
                  <RotateCcw className="w-3 h-3" /> Đặt lại
                </button>
              </div>

              {/* Live Preview Box */}
              <div
                className="p-4 rounded-xl border flex flex-col items-center justify-center gap-2.5 bg-slate-900/60 shadow-inner"
                style={{ borderColor: 'var(--border-ui)' }}
              >
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Xem trước hiển thị</span>
                <div className="text-base font-bold py-1 px-3 rounded-lg bg-black/30 border border-white/5">
                  <UserDisplayName
                    user={{
                      username: currentUser.username,
                      displayName: currentUser.displayName || currentUser.gdUsername || currentUser.username,
                      nameColor: nameUseGradient ? null : (nameColor || null),
                      nameGradient: nameUseGradient
                        ? `linear-gradient(${nameGradAngle}deg, ${nameGradColor1}, ${nameGradColor2})`
                        : null,
                      nameGlow: nameUseGlow ? (nameGlowColor || '#38bdf8') : null,
                      nameFont: nameFont,
                      clan: data?.clanMember?.clan || data?.clan || null,
                      clanMember: data?.clanMember || null,
                    }}
                    className="text-base"
                  />
                </div>
              </div>

              {/* Font Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                  <Type className="w-3.5 h-3.5 text-purple-400" /> Phông chữ hiển thị
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(FONT_PRESETS).map(([key, f]) => {
                    const active = nameFont === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setNameFont(key)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer flex flex-col gap-1 ${
                          active
                            ? 'border-purple-500 bg-purple-500/15 font-bold shadow-xs'
                            : 'ui-subtle hover:border-purple-500/40'
                        }`}
                        style={{ borderColor: active ? undefined : 'var(--border-ui)' }}
                      >
                        <span className="text-[10px] ui-dim font-sans">{f.label}</span>
                        <span className="truncate text-sm" style={{ fontFamily: f.family }}>
                          {currentUser.username}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Mode: Solid or Gradient */}
              <div className="pt-2 border-t space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold ui-title">Chế độ màu tên</label>
                  <div className="flex rounded-lg border p-0.5 bg-slate-500/5 text-xs font-bold" style={{ borderColor: 'var(--border-ui)' }}>
                    <button
                      type="button"
                      onClick={() => setNameUseGradient(false)}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        !nameUseGradient ? 'bg-purple-500 text-white shadow-xs' : 'ui-dim hover:text-purple-400'
                      }`}
                    >
                      Đơn sắc
                    </button>
                    <button
                      type="button"
                      onClick={() => setNameUseGradient(true)}
                      className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                        nameUseGradient ? 'bg-purple-500 text-white shadow-xs' : 'ui-dim hover:text-purple-400'
                      }`}
                    >
                      Gradient
                    </button>
                  </div>
                </div>

                {!nameUseGradient ? (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl border bg-slate-500/5" style={{ borderColor: 'var(--border-ui)' }}>
                    <ColorPicker
                      value={nameColor}
                      onChange={setNameColor}
                      size={32}
                      round
                      ariaLabel="Màu chữ"
                    />
                    <div className="flex-1">
                      <span className="text-xs font-bold ui-title block">Màu chữ</span>
                      <span className="font-mono text-xs uppercase ui-dim">{nameColor}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-xl border bg-slate-500/5 space-y-3" style={{ borderColor: 'var(--border-ui)' }}>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2.5 p-2 rounded-lg border bg-slate-500/5" style={{ borderColor: 'var(--border-subtle)' }}>
                        <ColorPicker
                          value={nameGradColor1}
                          onChange={setNameGradColor1}
                          size={28}
                          round
                          ariaLabel="Màu 1"
                        />
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold block ui-dim">Màu 1</span>
                          <span className="font-mono text-[11px] uppercase truncate block">{nameGradColor1}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 p-2 rounded-lg border bg-slate-500/5" style={{ borderColor: 'var(--border-subtle)' }}>
                        <ColorPicker
                          value={nameGradColor2}
                          onChange={setNameGradColor2}
                          size={28}
                          round
                          ariaLabel="Màu 2"
                        />
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold block ui-dim">Màu 2</span>
                          <span className="font-mono text-[11px] uppercase truncate block">{nameGradColor2}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs font-bold pt-1">
                      <span className="ui-dim">Góc nghiêng Gradient</span>
                      <div className="flex items-center gap-1 text-[11px]">
                        {[0, 45, 90, 135, 180].map((deg) => (
                          <button
                            key={deg}
                            type="button"
                            onClick={() => setNameGradAngle(deg)}
                            className={`px-1.5 py-0.5 rounded-md font-mono cursor-pointer transition-colors ${
                              nameGradAngle === deg ? 'bg-purple-500 text-white font-bold' : 'ui-subtle hover:text-purple-400'
                            }`}
                          >
                            {deg}°
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Glow Customization */}
              <div className="pt-2 border-t space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Hiệu ứng phát sáng (Glow)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold ui-dim hover:text-purple-400 transition-colors">
                    <input
                      type="checkbox"
                      checked={nameUseGlow}
                      onChange={(e) => setNameUseGlow(e.target.checked)}
                      className="rounded accent-purple-500 cursor-pointer"
                    />
                    <span>Bật phát sáng</span>
                  </label>
                </div>

                {nameUseGlow && (
                  <div className="p-3 rounded-xl border bg-slate-500/5 space-y-2 animate-in fade-in duration-200" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="flex items-center gap-3">
                      <ColorPicker
                        value={nameGlowColor}
                        onChange={setNameGlowColor}
                        size={32}
                        round
                        ariaLabel="Màu viền phát sáng"
                      />
                      <div className="flex-1">
                        <span className="text-xs font-bold ui-title block">Màu Glow</span>
                        <span className="font-mono text-xs uppercase ui-dim">{nameGlowColor}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => handleSaveNameStyle(false)}
                  disabled={savingNameStyle}
                  className="w-full py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" /> {savingNameStyle ? 'Đang lưu...' : 'Lưu phong cách tên'}
                </button>
              </div>
            </div>
          )}

          {/* Security & 2FA */}
          <div className="ui-card p-5 space-y-4">
            <h2
              className="text-sm font-bold flex items-center gap-2 border-b pb-2"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <ShieldCheck className="w-4 h-4" /> {t('settings.security')}
            </h2>

            <div className="flex items-center justify-between p-3 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
              <div>
                <div className="font-bold text-sm">{t('settings.two_factor')}</div>
                <div className="text-xs ui-dim mt-0.5">{t('settings.two_factor_desc')}</div>
              </div>
              {data.totpEnabled ? (
                <button
                  type="button"
                  onClick={handleDisable2FA}
                  className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-xs rounded-lg cursor-pointer transition-colors border border-red-500/20 tsumiki-btn-red"
                >
                  {t('settings.disable_2fa')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSetup2FA}
                  className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold text-xs rounded-lg cursor-pointer transition-colors border border-emerald-500/20 tsumiki-btn-green"
                >
                  {t('settings.enable_2fa')}
                </button>
              )}
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowPasswordModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors tsumiki-btn"
                style={{ borderColor: 'var(--border-ui)' }}
              >
                <Lock className="w-4 h-4" /> {t('settings.change_password')}
              </button>
            </div>
          </div>

          {/* Other */}
          <div className="ui-card p-5 space-y-4">
            <h2
              className="text-sm font-bold flex items-center gap-2 border-b pb-2"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <HelpCircle className="w-4 h-4" /> {t('settings.other')}
            </h2>

            <button
              type="button"
              onClick={() => router.push('/support')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-xs font-bold cursor-pointer hover:bg-pink-50 dark:hover:bg-pink-950/30 text-pink-500 border-pink-500/20 transition-colors tsumiki-btn-pink"
            >
              <Heart className="w-4 h-4" /> {t('settings.support_gdvn')}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-xs font-bold cursor-pointer hover:bg-red-50 hover:text-red-500 hover:border-red-500/30 dark:hover:bg-red-950/30 text-slate-500 transition-colors tsumiki-btn"
              style={{ borderColor: 'var(--border-ui)' }}
            >
              <LogOut className="w-4 h-4" /> {t('settings.logout')}
            </button>
          </div>
        </div>
      </div>

      <ImageEditorModal
        isOpen={imageModal.open}
        type={imageModal.type}
        currentImage={
          imageModal.type === 'avatar'
            ? data.avatarUrl
            : imageModal.type === 'background'
            ? data.profileConfig?.backgroundUrl
            : data.coverUrl
        }
        onClose={() => setImageModal({ open: false, type: 'avatar' })}
        onSave={async (url: string) => {
          const nextData = { ...data };
          if (imageModal.type === 'avatar') nextData.avatarUrl = url;
          else if (imageModal.type === 'background') {
            nextData.profileConfig = { ...nextData.profileConfig, backgroundUrl: url };
          } else nextData.coverUrl = url;

          setData(nextData);
          setImageModal({ open: false, type: 'avatar' });
          try {
            await fetch(`/api/profile/${currentUser.username}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(
                imageModal.type === 'avatar'
                  ? { avatarUrl: url }
                  : imageModal.type === 'background'
                  ? { profileConfig: nextData.profileConfig }
                  : { coverUrl: url }
              ),
            });
            showToast(t('settings.update_images_success'), 'success');
            if (imageModal.type === 'background') {
              const updatedUser = { ...currentUser, profileConfig: nextData.profileConfig };
              setCurrentUser(updatedUser);
              localStorage.setItem('gdvnc_user', JSON.stringify(updatedUser));
              window.dispatchEvent(new Event('gdvnc_user_update'));
            }
          } catch (e) {}
        }}
      />

      {show2faModal && (
        <div
          className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShow2faModal(false)}
        >
          <div
            className="bg-card w-full max-w-sm rounded-3xl p-5 md:p-6 shadow-2xl relative border"
            style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-emerald-500">
                <ShieldCheck className="w-5 h-5" /> {t('settings.2fa_title')}
              </h3>
              <button
                type="button"
                onClick={() => setShow2faModal(false)}
                className="p-1 rounded-xl border ui-dim cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              {qrCode ? (
                <div className="bg-white p-3 rounded-2xl mx-auto w-fit border-2 border-emerald-500/20 shadow-xl shadow-emerald-500/10">
                  <img src={qrCode} alt="2FA QR Code" className="w-40 h-40" />
                </div>
              ) : (
                <div className="w-40 h-40 mx-auto bg-gray-100 dark:bg-zinc-800 rounded-2xl animate-pulse"></div>
              )}
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold ui-dim mb-1">{t('settings.2fa_secret')}</p>
                <code className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-mono font-bold tracking-widest text-emerald-600 select-all border">
                  {totpSecret || '...'}
                </code>
              </div>
              <div className="pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <input
                  type="text"
                  maxLength={6}
                  value={totpInput}
                  onChange={(e) => setTotpInput(e.target.value)}
                  placeholder={t('settings.2fa_input_placeholder')}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-mono tracking-widest text-center border focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
                />
              </div>
              {totpError && (
                <p className="text-[11px] text-rose-500 font-bold text-center bg-rose-500/10 py-1.5 rounded-lg">
                  {totpError}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShow2faModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold ui-subtle border border-transparent cursor-pointer hover:border-zinc-500/30"
              >
                {t('settings.2fa_close')}
              </button>
              <button
                type="button"
                onClick={handleVerify2FA}
                disabled={settingUp2fa || totpInput.length < 6}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {t('settings.2fa_verify_btn')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div
          className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            className="bg-card w-full max-w-sm rounded-3xl p-5 md:p-6 shadow-2xl relative border"
            style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-sky-500">
                <Lock className="w-5 h-5" /> {t('settings.pwd_title')}
              </h3>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="p-1 rounded-xl border ui-dim cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-[11px] ui-dim mb-2">
                {t('settings.pwd_desc')}{' '}
                <span className="font-bold">{currentUser?.email}</span>.
              </p>
              <div className="mb-2">
                <SmartCaptcha onVerify={(token) => setCaptchaToken(token)} />
              </div>
              <div className="flex gap-2 pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={pwCooldown > 0}
                  className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50"
                >
                  {pwCooldown > 0
                    ? t('settings.pwd_otp_wait').replace('{s}', String(pwCooldown))
                    : t('settings.pwd_send_otp')}
                </button>
              </div>
              <div className="pt-1">
                <label className="text-[10px] font-bold uppercase ui-dim">{t('settings.pwd_otp_label')}</label>
                <input
                  type="text"
                  maxLength={6}
                  value={pwOtp}
                  onChange={(e) => setPwOtp(e.target.value)}
                  placeholder="Nhập 6 số..."
                  className="w-full px-3 py-2 rounded-lg text-sm border font-mono tracking-widest focus:ring-1 focus:ring-sky-500 mt-1"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase ui-dim">{t('settings.pwd_new_label')}</label>
                <input
                  type="password"
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-sky-500 mt-1"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold ui-subtle border cursor-pointer hover:border-zinc-500/30"
              >
                {t('settings.2fa_close')}
              </button>
              <button
                type="button"
                onClick={handleChangePassword}
                disabled={pwOtp.length < 6 || pwNew.length < 6}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 cursor-pointer disabled:opacity-50 transition-colors"
              >
                {t('settings.pwd_btn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
