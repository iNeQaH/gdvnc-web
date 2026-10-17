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
  Camera,
  ExternalLink,
  MapPin,
  Shield,
  Crown,
  Flame,
  AlertTriangle,
  Shuffle,
} from 'lucide-react';
import Link from 'next/link';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import { logoutClient } from '@/lib/sessionClient';
import ImageEditorModal from '@/components/ImageEditorModal';
import SmartCaptcha from '@/components/SmartCaptcha';
import ColorPicker from '@/components/ColorPicker';
import { CircularAnglePicker } from '@/components/CircularAnglePicker';
import { AnimatedTabs } from '@/components/AnimatedTabs';
import { UserDisplayName, SETTINGS_FONT_PRESETS } from '@/components/UserDisplayName';

export default function SettingsPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const { showToast, showConfirm } = useToast();

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'appearance' | 'name_style' | 'security'>('profile');

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
  const [borderGlowMode, setBorderGlowMode] = useState<boolean>(false);
  const [borderGlowColor1, setBorderGlowColor1] = useState<string>('#38bdf8');
  const [borderGlowColor2, setBorderGlowColor2] = useState<string>('#ec4899');
  const [borderGlowAngle, setBorderGlowAngle] = useState<number>(135);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Supporter custom name styles
  const [nameColor, setNameColor] = useState<string>('#ffffff');
  const [nameUseGradient, setNameUseGradient] = useState<boolean>(false);
  const [nameGradColor1, setNameGradColor1] = useState<string>('#38bdf8');
  const [nameGradColor2, setNameGradColor2] = useState<string>('#ec4899');
  const [nameGradAngle, setNameGradAngle] = useState<number>(90);
  const [nameUseGlow, setNameUseGlow] = useState<boolean>(false);
  const [nameGlowMode, setNameGlowMode] = useState<boolean>(false); // false = solid, true = 2-color gradient
  const [nameGlowColor1, setNameGlowColor1] = useState<string>('#38bdf8');
  const [nameGlowColor2, setNameGlowColor2] = useState<string>('#ec4899');
  const [nameGlowAngle, setNameGlowAngle] = useState<number>(135);
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
        const rawGlowColors = Array.isArray(cfg.customBorderGlowColors) && cfg.customBorderGlowColors.length > 0
          ? cfg.customBorderGlowColors
          : (cfg.customBorderGlowColor ? [cfg.customBorderGlowColor] : [hasCustomBorders ? initBorderColors[0] : initColors[0]]);
        const initGlowMode = rawGlowColors.length >= 2;
        const initGlowCol1 = rawGlowColors[0] || '#38bdf8';
        const initGlowCol2 = rawGlowColors[1] || '#ec4899';
        const initGlowAngle = typeof cfg.customBorderGlowAngle === 'number' ? cfg.customBorderGlowAngle : 135;

        setThemeColors(initColors);
        setThemeAngle(initAngle);
        setCustomBorderMode(hasCustomBorders);
        setBorderColors(initBorderColors);
        setBorderAnimation(initBorderAnim);
        setBorderGlowEnabled(initBorderGlowEnabled);
        setBorderGlowMode(initGlowMode);
        setBorderGlowColor(initGlowCol1);
        setBorderGlowColor1(initGlowCol1);
        setBorderGlowColor2(initGlowCol2);
        setBorderGlowAngle(initGlowAngle);

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
          const glowGradMatch = json.user.nameGlow.match(
            /linear-gradient\s*\(\s*(\d+)deg\s*,\s*(#[a-fA-F0-9]{3,8}|[^\s,]+)\s*,\s*(#[a-fA-F0-9]{3,8}|[^\s,]+)\s*\)/i
          );
          if (glowGradMatch) {
            setNameGlowMode(true);
            setNameGlowAngle(parseInt(glowGradMatch[1], 10) || 135);
            setNameGlowColor1(glowGradMatch[2].trim());
            setNameGlowColor2(glowGradMatch[3].trim());
          } else {
            setNameGlowMode(false);
            setNameGlowColor1(json.user.nameGlow);
          }
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
            nameGlow: !nameUseGlow
              ? null
              : nameGlowMode
              ? `linear-gradient(${nameGlowAngle}deg, ${nameGlowColor1}, ${nameGlowColor2})`
              : (nameGlowColor1 || '#38bdf8'),
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
          setNameGlowMode(false);
          setNameGlowColor1('#38bdf8');
          setNameGlowColor2('#ec4899');
          setNameGlowAngle(135);
          setNameFont('default');
        }
        const updatedUser = { ...currentUser, ...payload };
        setCurrentUser(updatedUser);
        setData((prev: any) => ({ ...prev, ...payload }));
        localStorage.setItem('gdvnc_user', JSON.stringify(updatedUser));
        window.dispatchEvent(new Event('gdvnc_user_update'));
        showToast(t('settings.font_saved'), 'success');
      } else {
        showToast(resJson.error || t('settings.font_save_error'), 'error');
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
    newGlowColor?: string,
    newGlowMode?: boolean,
    newGlowColors?: string[],
    newGlowAngle?: number
  ) => {
    const safeColors = newColors.length > 0 ? newColors : ['#0ea5e9'];
    const safeBorderMode = newBorderMode !== undefined ? newBorderMode : customBorderMode;
    const safeBorderColors = newBorderColors && newBorderColors.length > 0 ? newBorderColors : borderColors;
    const safeBorderAnim = newBorderAnim !== undefined ? newBorderAnim : borderAnimation;
    const safeGlowEnabled = newGlowEnabled !== undefined ? newGlowEnabled : borderGlowEnabled;
    const safeGlowMode = newGlowMode !== undefined ? newGlowMode : borderGlowMode;
    const safeGlowColor1 = newGlowColors && newGlowColors[0] ? newGlowColors[0] : (newGlowColor !== undefined ? newGlowColor : borderGlowColor1);
    const safeGlowColor2 = newGlowColors && newGlowColors[1] ? newGlowColors[1] : borderGlowColor2;
    const safeGlowAngle = newGlowAngle !== undefined ? newGlowAngle : borderGlowAngle;
    const safeGlowColors = safeGlowMode ? [safeGlowColor1, safeGlowColor2] : [safeGlowColor1];

    setThemeColors(safeColors);
    setThemeAngle(newAngle);
    setCustomBorderMode(safeBorderMode);
    setBorderColors(safeBorderColors);
    setBorderAnimation(safeBorderAnim);
    setBorderGlowEnabled(safeGlowEnabled);
    setBorderGlowMode(safeGlowMode);
    setBorderGlowColor(safeGlowColor1);
    setBorderGlowColor1(safeGlowColor1);
    setBorderGlowColor2(safeGlowColor2);
    setBorderGlowAngle(safeGlowAngle);

    const newConfig = {
      ...(data?.profileConfig || {}),
      customThemeColor: safeColors[0],
      customThemeColors: safeColors,
      customThemeAngle: newAngle,
      customBorderColors: safeBorderMode ? safeBorderColors : null,
      customBorderAnimation: safeBorderAnim,
      customBorderGlowEnabled: safeGlowEnabled,
      customBorderGlowColor: safeGlowColor1,
      customBorderGlowColors: safeGlowColors,
      customBorderGlowAngle: safeGlowAngle,
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

  const handleRandomThemeColors = () => {
    const PRESETS = [
      ['#0ea5e9', '#8b5cf6'],
      ['#ec4899', '#f59e0b'],
      ['#06b6d4', '#3b82f6'],
      ['#10b981', '#06b6d4'],
      ['#a855f7', '#ec4899'],
      ['#f43f5e', '#fb923c'],
      ['#4ade80', '#3b82f6'],
      ['#00f2fe', '#4facfe'],
      ['#b224ef', '#7579ff'],
      ['#0ea5e9', '#10b981', '#a855f7'],
      ['#f43f5e', '#a855f7', '#06b6d4'],
    ];
    const picked = PRESETS[Math.floor(Math.random() * PRESETS.length)];
    const angles = [0, 45, 90, 135, 180, 270];
    const randAngle = angles[Math.floor(Math.random() * angles.length)];
    updateThemeConfig(picked, randAngle);
  };

  const handleRandomNameColor = () => {
    const RANDOM_SOLO_COLORS = [
      '#38bdf8', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981',
      '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316',
      '#ef4444', '#f43f5e', '#ec4899', '#d946ef', '#a855f7',
      '#8b5cf6', '#6366f1', '#3b82f6', '#facc15', '#4ade80'
    ];
    const RANDOM_GRADIENT_PAIRS = [
      ['#38bdf8', '#8b5cf6'],
      ['#ec4899', '#f59e0b'],
      ['#06b6d4', '#3b82f6'],
      ['#10b981', '#06b6d4'],
      ['#f43f5e', '#fb923c'],
      ['#a855f7', '#ec4899'],
      ['#facc15', '#ef4444'],
      ['#4ade80', '#3b82f6'],
      ['#d946ef', '#8b5cf6'],
      ['#00f2fe', '#4facfe'],
      ['#ff0844', '#ffb199'],
      ['#b224ef', '#7579ff'],
    ];
    if (!nameUseGradient) {
      const random = RANDOM_SOLO_COLORS[Math.floor(Math.random() * RANDOM_SOLO_COLORS.length)];
      setNameColor(random);
    } else {
      const pair = RANDOM_GRADIENT_PAIRS[Math.floor(Math.random() * RANDOM_GRADIENT_PAIRS.length)];
      const angles = [0, 45, 90, 135, 180];
      const randAngle = angles[Math.floor(Math.random() * angles.length)];
      setNameGradColor1(pair[0]);
      setNameGradColor2(pair[1]);
      setNameGradAngle(randAngle);
    }
  };

  const handleRandomGlowColor = () => {
    const RANDOM_SOLO_COLORS = [
      '#38bdf8', '#0ea5e9', '#06b6d4', '#10b981', '#22c55e',
      '#ef4444', '#f43f5e', '#ec4899', '#d946ef', '#a855f7',
      '#8b5cf6', '#6366f1', '#3b82f6', '#facc15', '#4ade80'
    ];
    const RANDOM_GRADIENT_PAIRS = [
      ['#38bdf8', '#8b5cf6'],
      ['#ec4899', '#f59e0b'],
      ['#06b6d4', '#3b82f6'],
      ['#10b981', '#06b6d4'],
      ['#f43f5e', '#fb923c'],
      ['#a855f7', '#ec4899'],
      ['#facc15', '#ef4444'],
      ['#4ade80', '#3b82f6'],
      ['#d946ef', '#8b5cf6'],
      ['#00f2fe', '#4facfe'],
      ['#ff0844', '#ffb199'],
      ['#b224ef', '#7579ff'],
    ];
    if (!nameGlowMode) {
      const random = RANDOM_SOLO_COLORS[Math.floor(Math.random() * RANDOM_SOLO_COLORS.length)];
      setNameGlowColor1(random);
    } else {
      const pair = RANDOM_GRADIENT_PAIRS[Math.floor(Math.random() * RANDOM_GRADIENT_PAIRS.length)];
      const angles = [0, 45, 90, 135, 180, 225, 270, 315];
      const randAngle = angles[Math.floor(Math.random() * angles.length)];
      setNameGlowColor1(pair[0]);
      setNameGlowColor2(pair[1]);
      setNameGlowAngle(randAngle);
    }
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
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2 ui-title">
            <Settings className="w-6 h-6 text-sky-500" />
            {t('settings.title')}
          </h1>
          <p className="text-xs ui-dim mt-1">
            Quản lý hồ sơ cá nhân, giao diện, đặc quyền Supporter và bảo mật tài khoản
          </p>
        </div>
      </div>

      {/* Top Profile Summary Card */}
      <div className="ui-card overflow-hidden shadow-sm">
        {/* Banner Cover with Overlay */}
        <div className="relative w-full h-32 sm:h-40 bg-slate-100 dark:bg-zinc-800">
          {data.coverUrl ? (
            <img src={data.coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <img src="/default-banner.svg" alt="Default Cover" className="w-full h-full object-cover opacity-50" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          
          <button
            type="button"
            onClick={() => setImageModal({ open: true, type: 'cover' })}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer border border-white/20"
            title="Đổi ảnh bìa"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{t('settings.change_banner')}</span>
          </button>
        </div>

        {/* Identity Row */}
        <div className="px-5 pb-5 pt-0">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 sm:-mt-12">
            <div className="flex items-end gap-3.5">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="p-1 rounded-2xl shadow-xl bg-white dark:bg-zinc-900 border" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}>
                  <div
                    className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden shadow-inner cursor-pointer group"
                    onClick={() => setImageModal({ open: true, type: 'avatar' })}
                    title={t('settings.change_avatar')}
                  >
                    {data.avatarUrl ? (
                      <img src={data.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-200 dark:bg-zinc-800">
                        <UserIcon className="w-10 h-10 text-slate-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold backdrop-blur-xs">
                      <Camera className="w-3.5 h-3.5 mb-0.5" />
                      <span>Sửa</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Names & Info */}
              <div className="space-y-1 mb-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <UserDisplayName
                    user={data}
                    fallbackName={currentUser.username}
                    linkClan
                    className="text-lg sm:text-xl font-black ui-title drop-shadow-sm"
                  />
                  {currentUser.role === 'ADMIN' && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-red-500/15 text-red-400 border border-red-500/30 flex items-center gap-1">
                      <Crown className="w-3 h-3" /> Admin
                    </span>
                  )}
                  {currentUser.role === 'MODERATOR' && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <Shield className="w-3 h-3" /> Mod
                    </span>
                  )}
                </div>
                <div className="text-xs ui-dim flex items-center gap-2">
                  <span>@{currentUser.username}</span>
                  <span>·</span>
                  <Link
                    href={`/profile/${currentUser.username}`}
                    className="inline-flex items-center gap-1 text-sky-500 hover:underline font-semibold"
                  >
                    Xem trang cá nhân <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Supporter status badge */}
            <div className="flex items-center gap-2 self-start sm:self-end">
              {isSupporter ? (
                <div className="px-3 py-1.5 rounded-xl text-xs font-bold bg-pink-500/15 text-pink-400 border border-pink-500/30 flex items-center gap-1.5 shadow-xs">
                  <Heart className="w-3.5 h-3.5 fill-pink-500 text-pink-500" />
                  <span>
                    Supporter đến{' '}
                    {new Date(data.supporterUntil || currentUser.supporterUntil).toLocaleDateString(
                      language === 'en' ? 'en-US' : 'vi-VN'
                    )}
                  </span>
                </div>
              ) : (
                <Link
                  href="/support"
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-pink-500/10 hover:bg-pink-500/20 text-pink-500 border border-pink-500/30 flex items-center gap-1.5 transition-colors shadow-xs"
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>Ủng hộ & Nhận Supporter</span>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <AnimatedTabs<'profile' | 'appearance' | 'name_style' | 'security'>
        active={activeTab}
        onChange={setActiveTab}
        themeOverride={data?.profileTheme || undefined}
        options={[
          {
            id: 'profile',
            label: t('settings.identity') || 'Hồ Sơ',
            icon: <UserIcon className="w-4 h-4" />,
          },
          {
            id: 'appearance',
            label: t('settings.tab_appearance') || 'Giao Diện & Theme',
            icon: <Sparkles className="w-4 h-4" />,
          },
          {
            id: 'name_style',
            label: t('settings.tab_font') || 'Font',
            icon: <Type className="w-4 h-4" />,
          },
          {
            id: 'security',
            label: t('settings.tab_security') || 'Bảo Mật & Quà Tặng',
            icon: <ShieldCheck className="w-4 h-4" />,
          },
        ]}
      />

      {/* Tab 1: Profile (Hồ Sơ & Nhận Diện) */}
      {activeTab === 'profile' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="ui-card p-6 space-y-6">
            <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <h2 className="text-sm font-bold flex items-center gap-2 ui-title">
                  <UserIcon className="w-4 h-4 text-sky-500" /> Thông Tin Hồ Sơ & Mạng Xã Hội
                </h2>
                <p className="text-xs ui-dim mt-0.5">
                  Cập nhật các liên kết tài khoản và mô tả ngắn hiển thị công khai trên GDVN
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold ui-dim block mb-1.5">{t('settings.gd_username')}</label>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-sky-500/10 text-sky-500 shrink-0 border border-sky-500/20">
                    <Gamepad2 className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={gdUsername}
                    onChange={(e) => setGdUsername(e.target.value)}
                    placeholder="VD: Player123"
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold border focus:ring-1 focus:ring-sky-500 outline-none"
                    style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold ui-dim block mb-1.5">{t('settings.discord_tag')}</label>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-indigo-500/10 text-indigo-500 shrink-0 border border-indigo-500/20">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={discordTag}
                    onChange={(e) => setDiscordTag(e.target.value)}
                    placeholder="VD: username#0000"
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold border focus:ring-1 focus:ring-sky-500 outline-none"
                    style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold ui-dim block mb-1.5">{t('settings.country')}</label>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/10 text-rose-500 shrink-0 border border-rose-500/20">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    placeholder="VD: Hà Nội, Việt Nam"
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold border focus:ring-1 focus:ring-sky-500 outline-none"
                    style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold ui-dim block mb-1.5">{t('profile.bio') || 'Tiểu sử cá nhân'}</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Viết vài dòng giới thiệu về bản thân bạn..."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl text-xs font-medium border focus:ring-1 focus:ring-sky-500 outline-none resize-y"
                  style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                />
              </div>
            </div>

            <div className="flex items-center justify-end pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <button
                type="button"
                onClick={handleSaveInfo}
                disabled={savingInfo}
                className="px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>{savingInfo ? t('common.saving') : t('settings.save_info')}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Appearance (Giao Diện & Theme) */}
      {activeTab === 'appearance' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {/* Profile Theme Card */}
          <div className="ui-card p-6 space-y-4">
            <div className="border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <h2 className="text-sm font-bold flex items-center gap-2 text-purple-500">
                <Sparkles className="w-4 h-4" /> {t('settings.profile_theme')}
              </h2>
              <p className="text-xs ui-dim mt-0.5">{t('settings.profile_theme_desc')}</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
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
                    className={`flex items-center gap-2.5 p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'ring-2 ring-purple-500 bg-purple-500/10 text-purple-600 dark:text-purple-300 border-purple-500/30 shadow-xs'
                        : 'hover:bg-slate-50 dark:hover:bg-zinc-800/60'
                    }`}
                    style={!isSelected ? { borderColor: 'var(--border-ui)' } : {}}
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full shrink-0 ${th.color}`}
                      style={th.style}
                    />
                    <span className="truncate">{th.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 ml-auto text-purple-500 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Supporter Theme Perks */}
          {canAccessSupporter ? (
            <div className="ui-card p-6 space-y-6 border-pink-500/20">
              <div className="border-b pb-3 flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-2 text-pink-500">
                    <Heart className="w-4 h-4" /> {t('settings.supporter_perks')} — Màu Sắc & Hiệu Ứng
                  </h2>
                  <p className="text-xs ui-dim mt-0.5">
                    Tùy biến dải màu chủ đạo, góc xoay gradient, hiệu ứng phát sáng viền và ảnh nền cho theme Custom
                  </p>
                </div>
                {themeColors.length >= 2 && (
                  <span className="text-[11px] font-mono font-bold px-2.5 py-1 rounded-lg bg-pink-500/10 text-pink-500 border border-pink-500/20">
                    {themeAngle}°
                  </span>
                )}
              </div>

              {/* Theme Colors & Gradient Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                    {t('settings.custom_colors')}
                  </label>
                  <button
                    type="button"
                    onClick={handleRandomThemeColors}
                    className="px-2.5 py-1 text-xs font-bold rounded-lg border border-pink-500/30 bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                    title="Phối màu ngẫu nhiên"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Ngẫu Nhiên</span>
                  </button>
                </div>
                <p className="text-xs ui-dim leading-relaxed">
                  {t('settings.custom_colors_desc')}
                </p>

                {/* Color swatches */}
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
                    className="p-3.5 rounded-2xl border space-y-3 bg-slate-500/5 mt-3 animate-in fade-in duration-200"
                    style={{ borderColor: 'var(--border-subtle)' }}
                  >
                    <CircularAnglePicker
                      value={themeAngle}
                      onChange={(deg) => updateThemeConfig(themeColors, deg)}
                      label={t('settings.gradient_angle')}
                      accentColor="var(--accent, #ec4899)"
                    />

                    <div
                      className="w-full h-5 rounded-lg border shadow-inner transition-all duration-300"
                      style={{
                        borderColor: 'var(--border-ui)',
                        background: `linear-gradient(${themeAngle}deg, ${themeColors.join(', ')})`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Border Customization Section */}
              <div className="pt-4 border-t space-y-4" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                      {t('settings.custom_border_title')}
                    </label>
                    <p className="text-xs ui-dim mt-0.5">{t('settings.custom_border_desc')}</p>
                  </div>
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

                {customBorderMode && (
                  <div className="space-y-3 animate-in fade-in duration-200">
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-500/5" style={{ borderColor: 'var(--border-subtle)' }}>
                    <span className="text-xs font-bold ui-dim">{t('settings.custom_border_anim')}</span>
                    <input
                      type="checkbox"
                      checked={borderAnimation}
                      onChange={(e) => {
                        const nextAnim = e.target.checked;
                        updateThemeConfig(themeColors, themeAngle, customBorderMode, borderColors, nextAnim, borderGlowEnabled, borderGlowColor);
                      }}
                      className="cursor-pointer accent-pink-500"
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border bg-slate-500/5" style={{ borderColor: 'var(--border-subtle)' }}>
                    <span className="text-xs font-bold ui-dim">{t('settings.custom_border_glow')}</span>
                    <input
                      type="checkbox"
                      checked={borderGlowEnabled}
                      onChange={(e) => {
                        const nextGlow = e.target.checked;
                        updateThemeConfig(themeColors, themeAngle, customBorderMode, borderColors, borderAnimation, nextGlow, borderGlowColor);
                      }}
                      className="cursor-pointer accent-pink-500"
                    />
                  </div>
                </div>

                {borderGlowEnabled && (
                  <div className="p-3.5 rounded-xl border bg-slate-500/5 space-y-3 animate-in fade-in duration-200" style={{ borderColor: 'var(--border-subtle)' }}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold ui-dim">{t('settings.custom_border_glow_color')}</span>
                      <div className="flex rounded-lg border p-0.5 bg-black/20 text-xs font-bold" style={{ borderColor: 'var(--border-subtle)' }}>
                        <button
                          type="button"
                          onClick={() => updateThemeConfig(themeColors, themeAngle, customBorderMode, borderColors, borderAnimation, borderGlowEnabled, borderGlowColor1, false, [borderGlowColor1], borderGlowAngle)}
                          className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                            !borderGlowMode ? 'bg-pink-500 text-white' : 'ui-dim hover:text-pink-400'
                          }`}
                        >
                          Đơn sắc
                        </button>
                        <button
                          type="button"
                          onClick={() => updateThemeConfig(themeColors, themeAngle, customBorderMode, borderColors, borderAnimation, borderGlowEnabled, borderGlowColor1, true, [borderGlowColor1, borderGlowColor2], borderGlowAngle)}
                          className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition-all cursor-pointer ${
                            borderGlowMode ? 'bg-pink-500 text-white' : 'ui-dim hover:text-pink-400'
                          }`}
                        >
                          Gradient
                        </button>
                      </div>
                    </div>

                    {!borderGlowMode ? (
                      <div className="flex items-center gap-3">
                        <ColorPicker
                          value={borderGlowColor1}
                          onChange={(nextHex) => {
                            updateThemeConfig(themeColors, themeAngle, customBorderMode, borderColors, borderAnimation, borderGlowEnabled, nextHex, false, [nextHex], borderGlowAngle);
                          }}
                          size={32}
                          round
                          ariaLabel={t('settings.custom_border_glow_color')}
                        />
                        <span className="font-mono text-xs font-bold uppercase">{borderGlowColor1}</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-2.5 p-2 rounded-xl border bg-black/20" style={{ borderColor: 'var(--border-subtle)' }}>
                            <ColorPicker
                              value={borderGlowColor1}
                              onChange={(nextHex) => {
                                updateThemeConfig(themeColors, themeAngle, customBorderMode, borderColors, borderAnimation, borderGlowEnabled, nextHex, true, [nextHex, borderGlowColor2], borderGlowAngle);
                              }}
                              size={28}
                              round
                              ariaLabel="Màu Glow 1"
                            />
                            <div className="min-w-0">
                              <span className="text-[10px] ui-dim block font-bold">Màu 1</span>
                              <span className="font-mono text-[11px] uppercase truncate block">{borderGlowColor1}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 p-2 rounded-xl border bg-black/20" style={{ borderColor: 'var(--border-subtle)' }}>
                            <ColorPicker
                              value={borderGlowColor2}
                              onChange={(nextHex) => {
                                updateThemeConfig(themeColors, themeAngle, customBorderMode, borderColors, borderAnimation, borderGlowEnabled, borderGlowColor1, true, [borderGlowColor1, nextHex], borderGlowAngle);
                              }}
                              size={28}
                              round
                              ariaLabel="Màu Glow 2"
                            />
                            <div className="min-w-0">
                              <span className="text-[10px] ui-dim block font-bold">Màu 2</span>
                              <span className="font-mono text-[11px] uppercase truncate block">{borderGlowColor2}</span>
                            </div>
                          </div>
                        </div>

                        <CircularAnglePicker
                          value={borderGlowAngle}
                          onChange={(deg) => {
                            updateThemeConfig(themeColors, themeAngle, customBorderMode, borderColors, borderAnimation, borderGlowEnabled, borderGlowColor1, true, [borderGlowColor1, borderGlowColor2], deg);
                          }}
                          label="Góc xoay Glow"
                          accentColor="#ec4899"
                        />
                      </div>
                    )}

                    {/* Live Preview Box */}
                    <div
                      className="w-full h-9 rounded-xl border flex items-center justify-between px-3 text-xs font-mono font-bold transition-all"
                      style={{
                        borderColor: 'var(--border-ui)',
                        backgroundColor: 'var(--bg-card)',
                        boxShadow: borderGlowMode
                          ? `${Math.round(Math.sin((borderGlowAngle * Math.PI) / 180) * 8)}px ${Math.round(-Math.cos((borderGlowAngle * Math.PI) / 180) * 8)}px 22px 1px ${borderGlowColor2}66, ${-Math.round(Math.sin((borderGlowAngle * Math.PI) / 180) * 8)}px ${-Math.round(-Math.cos((borderGlowAngle * Math.PI) / 180) * 8)}px 22px 1px ${borderGlowColor1}66, 0 0 16px 2px ${borderGlowColor1}44`
                          : `0 0 16px 2px ${borderGlowColor1}66`,
                      }}
                    >
                      <span className="ui-dim text-[11px]">Xem thử Glow viền</span>
                      <span className="text-[10px] ui-dim font-sans font-normal">
                        {borderGlowMode ? `${borderGlowAngle}° Gradient` : 'Đơn sắc'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Background Image Section */}
              <div className="pt-4 border-t space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold ui-title block">{t('settings.bg_label')}</label>
                    <p className="text-xs ui-dim mt-0.5">{t('settings.bg_desc')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setImageModal({ open: true, type: 'background' })}
                      className="px-3.5 py-1.5 bg-pink-500/10 text-pink-500 rounded-xl text-xs font-bold hover:bg-pink-500/20 flex gap-1.5 items-center cursor-pointer transition-colors border border-pink-500/20"
                    >
                      <ImageIcon className="w-3.5 h-3.5" /> {t('settings.change_bg')}
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
                        className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500/20 flex gap-1 items-center cursor-pointer border border-red-500/20"
                      >
                        <X className="w-3.5 h-3.5" /> {t('settings.remove_bg')}
                      </button>
                    )}
                  </div>
                </div>

                {data.profileConfig?.backgroundUrl && (
                  <div
                    className="flex items-center gap-3 p-2.5 rounded-xl border bg-slate-500/5"
                    style={{ borderColor: 'var(--border-ui)' }}
                  >
                    <div
                      className="w-20 h-12 rounded-lg overflow-hidden border shrink-0"
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
          ) : (
            <div className="ui-card p-6 border-dashed border-pink-500/30 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-500 flex items-center justify-center mx-auto border border-pink-500/20">
                <Heart className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm ui-title">{t('settings.theme_perks_title')}</h3>
              <p className="text-xs ui-dim max-w-md mx-auto leading-relaxed">
                {t('settings.theme_perks_desc')}
              </p>
              <Link
                href="/support"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5" /> {t('settings.theme_perks_btn')}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Font & Name Style */}
      {activeTab === 'name_style' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          {canAccessSupporter ? (
            <div className="ui-card p-6 space-y-6 border-purple-500/20">
              <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-2 text-purple-400">
                    <Type className="w-4 h-4" /> {t('settings.font_title')}
                  </h2>
                  <p className="text-xs ui-dim mt-0.5">
                    {t('settings.font_desc')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSaveNameStyle(true)}
                  disabled={savingNameStyle}
                  className="px-3 py-1.5 text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl border border-red-500/20 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title={t('settings.font_reset')}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> {t('settings.font_reset')}
                </button>
              </div>

              {/* Live Preview Box */}
              <div
                className="p-5 rounded-2xl border flex flex-col items-center justify-center gap-3 bg-slate-900/60 shadow-inner"
                style={{ borderColor: 'var(--border-ui)' }}
              >
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">{t('settings.font_preview')}</span>
                <div className="text-lg font-bold py-2 px-5 rounded-xl bg-black/40 border border-white/10 shadow-sm">
                  <UserDisplayName
                    user={{
                      username: currentUser.username,
                      displayName: currentUser.displayName || currentUser.gdUsername || currentUser.username,
                      nameColor: nameUseGradient ? null : (nameColor || null),
                      nameGradient: nameUseGradient
                        ? `linear-gradient(${nameGradAngle}deg, ${nameGradColor1}, ${nameGradColor2})`
                        : null,
                      nameGlow: !nameUseGlow
                        ? null
                        : nameGlowMode
                        ? `linear-gradient(${nameGlowAngle}deg, ${nameGlowColor1}, ${nameGlowColor2})`
                        : (nameGlowColor1 || '#38bdf8'),
                      nameFont: nameFont,
                      clan: data?.clanMember?.clan || data?.clan || null,
                      clanMember: data?.clanMember || null,
                    }}
                    className="text-lg"
                  />
                </div>
              </div>

              {/* Font Selector */}
              <div className="space-y-3">
                <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                  <Type className="w-4 h-4 text-purple-400" /> {t('settings.font_select')}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {Object.entries(SETTINGS_FONT_PRESETS).map(([key, f]) => {
                    const active = nameFont === key;
                    const scale = f.scale || 1;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setNameFont(key)}
                        className={`p-3 rounded-2xl border text-left text-xs transition-all cursor-pointer flex flex-col justify-between min-h-[78px] overflow-hidden ${
                          active
                            ? 'border-purple-500 bg-purple-500/15 font-bold shadow-xs'
                            : 'ui-subtle hover:border-purple-500/40'
                        }`}
                        style={{ borderColor: active ? undefined : 'var(--border-ui)' }}
                      >
                        <span className="text-[10px] ui-dim font-sans font-bold block">{f.label}</span>
                        <div className="h-9 flex items-center pr-3 overflow-visible">
                          <span
                            className="truncate block"
                            style={{
                              fontFamily: f.family,
                              fontWeight: (f as any).weight || '700',
                              fontSize: `${scale}rem`,
                              lineHeight: 1.2,
                              paddingRight: key === 'neon' || key === 'angels' ? '0.35em' : (key === 'ornate' || key === 'horror' ? '0.15em' : '0.05em'),
                            }}
                          >
                            {currentUser.username}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Color Mode: Solid or Gradient */}
              <div className="pt-3 border-t space-y-4" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold ui-title">{t('settings.font_color_mode')}</label>
                    <button
                      type="button"
                      onClick={handleRandomNameColor}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      title={t('settings.font_random')}
                    >
                      <Shuffle className="w-3.5 h-3.5" />
                      <span>{t('settings.font_random')}</span>
                    </button>
                  </div>
                  <div className="flex rounded-xl border p-0.5 bg-slate-500/5 text-xs font-bold" style={{ borderColor: 'var(--border-ui)' }}>
                    <button
                      type="button"
                      onClick={() => setNameUseGradient(false)}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        !nameUseGradient ? 'bg-purple-500 text-white shadow-xs' : 'ui-dim hover:text-purple-400'
                      }`}
                    >
                      {t('settings.font_solid')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setNameUseGradient(true)}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        nameUseGradient ? 'bg-purple-500 text-white shadow-xs' : 'ui-dim hover:text-purple-400'
                      }`}
                    >
                      {t('settings.font_gradient')}
                    </button>
                  </div>
                </div>

                {!nameUseGradient ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl border bg-slate-500/5" style={{ borderColor: 'var(--border-ui)' }}>
                    <ColorPicker
                      value={nameColor}
                      onChange={setNameColor}
                      size={34}
                      round
                      ariaLabel={t('settings.font_text_color')}
                    />
                    <div className="flex-1">
                      <span className="text-xs font-bold ui-title block">{t('settings.font_text_color')}</span>
                      <span className="font-mono text-xs uppercase ui-dim">{nameColor}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border bg-slate-500/5 space-y-3" style={{ borderColor: 'var(--border-ui)' }}>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2.5 p-2 rounded-xl border bg-slate-500/5" style={{ borderColor: 'var(--border-subtle)' }}>
                        <ColorPicker
                          value={nameGradColor1}
                          onChange={setNameGradColor1}
                          size={30}
                          round
                          ariaLabel={t('settings.font_color_1')}
                        />
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold block ui-dim">{t('settings.font_color_1')}</span>
                          <span className="font-mono text-[11px] uppercase truncate block">{nameGradColor1}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5 p-2 rounded-xl border bg-slate-500/5" style={{ borderColor: 'var(--border-subtle)' }}>
                        <ColorPicker
                          value={nameGradColor2}
                          onChange={setNameGradColor2}
                          size={30}
                          round
                          ariaLabel={t('settings.font_color_2')}
                        />
                        <div className="min-w-0">
                          <span className="text-[11px] font-bold block ui-dim">{t('settings.font_color_2')}</span>
                          <span className="font-mono text-[11px] uppercase truncate block">{nameGradColor2}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-1">
                      <CircularAnglePicker
                        value={nameGradAngle}
                        onChange={setNameGradAngle}
                        label={t('settings.font_angle')}
                        accentColor="#a855f7"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Glow Customization */}
              <div className="pt-3 border-t space-y-3" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold ui-title flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-purple-400" /> {t('settings.font_glow')}
                    </label>
                    {nameUseGlow && (
                      <button
                        type="button"
                        onClick={handleRandomGlowColor}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all flex items-center gap-1.5 cursor-pointer"
                        title="Random Glow"
                      >
                        <Shuffle className="w-3.5 h-3.5" />
                        <span>Random</span>
                      </button>
                    )}
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold ui-dim hover:text-purple-400 transition-colors">
                    <input
                      type="checkbox"
                      checked={nameUseGlow}
                      onChange={(e) => setNameUseGlow(e.target.value === 'true' || e.target.checked)}
                      className="rounded accent-purple-500 cursor-pointer"
                    />
                    <span>{t('settings.font_glow_enable')}</span>
                  </label>
                </div>

                {nameUseGlow && (
                  <div className="p-4 rounded-xl border bg-slate-500/5 space-y-3 animate-in fade-in duration-200" style={{ borderColor: 'var(--border-subtle)' }}>
                    {/* Glow Mode Switcher */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold ui-title">
                        {language === 'vi' ? 'Chế độ Glow' : 'Glow Mode'}
                      </span>
                      <div className="flex rounded-xl border p-0.5 bg-slate-500/5 text-xs font-bold" style={{ borderColor: 'var(--border-ui)' }}>
                        <button
                          type="button"
                          onClick={() => setNameGlowMode(false)}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            !nameGlowMode ? 'bg-purple-500 text-white shadow-xs' : 'ui-dim hover:text-purple-400'
                          }`}
                        >
                          {t('settings.font_solid')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNameGlowMode(true)}
                          className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            nameGlowMode ? 'bg-purple-500 text-white shadow-xs' : 'ui-dim hover:text-purple-400'
                          }`}
                        >
                          {t('settings.font_gradient')}
                        </button>
                      </div>
                    </div>

                    {!nameGlowMode ? (
                      <div className="flex items-center gap-3 p-3 rounded-xl border bg-slate-500/5" style={{ borderColor: 'var(--border-ui)' }}>
                        <ColorPicker
                          value={nameGlowColor1}
                          onChange={setNameGlowColor1}
                          size={32}
                          round
                          ariaLabel={t('settings.font_glow_color')}
                        />
                        <div className="flex-1">
                          <span className="text-xs font-bold ui-title block">{t('settings.font_glow_color')}</span>
                          <span className="font-mono text-xs uppercase ui-dim">{nameGlowColor1}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center gap-2.5 p-2 rounded-xl border bg-slate-500/5" style={{ borderColor: 'var(--border-subtle)' }}>
                            <ColorPicker
                              value={nameGlowColor1}
                              onChange={setNameGlowColor1}
                              size={28}
                              round
                              ariaLabel="Màu Glow 1"
                            />
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold block ui-dim">Màu 1</span>
                              <span className="font-mono text-[11px] uppercase truncate block">{nameGlowColor1}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 p-2 rounded-xl border bg-slate-500/5" style={{ borderColor: 'var(--border-subtle)' }}>
                            <ColorPicker
                              value={nameGlowColor2}
                              onChange={setNameGlowColor2}
                              size={28}
                              round
                              ariaLabel="Màu Glow 2"
                            />
                            <div className="min-w-0">
                              <span className="text-[11px] font-bold block ui-dim">Màu 2</span>
                              <span className="font-mono text-[11px] uppercase truncate block">{nameGlowColor2}</span>
                            </div>
                          </div>
                        </div>

                        <div className="pt-1">
                          <CircularAnglePicker
                            value={nameGlowAngle}
                            onChange={setNameGlowAngle}
                            label={language === 'vi' ? 'Góc xoay Glow' : 'Glow Angle'}
                            accentColor="#a855f7"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="pt-3 border-t flex items-center justify-end" style={{ borderColor: 'var(--border-subtle)' }}>
                <button
                  type="button"
                  onClick={() => handleSaveNameStyle(false)}
                  disabled={savingNameStyle}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{savingNameStyle ? t('settings.font_saving') : t('settings.font_save')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="ui-card p-6 border-dashed border-purple-500/30 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto border border-purple-500/20">
                <Type className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm ui-title">{t('settings.font_perk_title')}</h3>
              <p className="text-xs ui-dim max-w-md mx-auto leading-relaxed">
                {t('settings.font_perk_desc')}
              </p>
              <Link
                href="/support"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <Heart className="w-3.5 h-3.5" /> {t('settings.font_upgrade_btn')}
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Security (Bảo Mật & Quà Tặng) */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-in fade-in-50 duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Sub-column */}
            <div className="space-y-6">
              {/* Redeem Gift Code */}
              <div className="ui-card p-5 space-y-4 border-amber-500/20">
                <div className="border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
                  <h2 className="text-sm font-bold flex items-center gap-2 text-amber-500">
                    <Gift className="w-4 h-4" /> {t('settings.redeem_title')}
                  </h2>
                  <p className="text-xs ui-dim mt-0.5">{t('settings.redeem_desc')}</p>
                </div>
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

              {/* 2FA Card */}
              <div className="ui-card p-5 space-y-4">
                <div className="border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
                  <h2 className="text-sm font-bold flex items-center gap-2 ui-title">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> {t('settings.security')}
                  </h2>
                  <p className="text-xs ui-dim mt-0.5">Xác thực 2 bước tăng cường bảo mật cho tài khoản</p>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
                  <div>
                    <div className="font-bold text-xs ui-title flex items-center gap-2">
                      <span>{t('settings.two_factor')}</span>
                      {data.totpEnabled ? (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                          Đã Bật
                        </span>
                      ) : (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
                          Chưa Bật
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] ui-dim mt-0.5">{t('settings.two_factor_desc')}</div>
                  </div>
                  {data.totpEnabled ? (
                    <button
                      type="button"
                      onClick={handleDisable2FA}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-xs rounded-xl cursor-pointer transition-colors border border-red-500/20"
                    >
                      {t('settings.disable_2fa')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSetup2FA}
                      className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold text-xs rounded-xl cursor-pointer transition-colors border border-emerald-500/20"
                    >
                      {t('settings.enable_2fa')}
                    </button>
                  )}
                </div>

                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors"
                    style={{ borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
                  >
                    <Lock className="w-4 h-4 text-sky-500" /> {t('settings.change_password')}
                  </button>
                </div>
              </div>
            </div>

            {/* Right Sub-column */}
            <div className="space-y-6">
              {/* Support & Logout Card */}
              <div className="ui-card p-5 space-y-3">
                <div className="border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
                  <h2 className="text-sm font-bold flex items-center gap-2 ui-title">
                    <HelpCircle className="w-4 h-4 text-pink-500" /> Liên Kết & Phiên Đăng Nhập
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => router.push('/support')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-xs font-bold cursor-pointer hover:bg-pink-50 dark:hover:bg-pink-950/30 text-pink-500 border-pink-500/20 transition-colors"
                >
                  <Heart className="w-4 h-4" /> {t('settings.support_gdvn')}
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-xs font-bold cursor-pointer hover:bg-red-50 hover:text-red-500 hover:border-red-500/30 dark:hover:bg-red-950/30 text-slate-500 transition-colors"
                  style={{ borderColor: 'var(--border-ui)' }}
                >
                  <LogOut className="w-4 h-4" /> {t('settings.logout')}
                </button>
              </div>

              {/* Danger Zone: Delete Account */}
              <div className="ui-card p-5 space-y-3 border-red-500/25 bg-red-500/5">
                <h2 className="text-sm font-bold flex items-center gap-2 text-red-500 border-b border-red-500/20 pb-2">
                  <Trash2 className="w-4 h-4" /> {t('settings.delete_account')}
                </h2>
                <p className="text-xs ui-dim leading-relaxed">{t('settings.delete_account_warn')}</p>
                <button
                  type="button"
                  onClick={handleDeleteAccount}
                  className="px-4 py-2.5 bg-red-500/15 hover:bg-red-500/25 text-red-500 rounded-xl text-xs font-bold w-full cursor-pointer transition-colors border border-red-500/30"
                >
                  {t('settings.delete_account_btn')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
