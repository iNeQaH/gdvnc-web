'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, Mail, LogOut, Trash2, HelpCircle, Lock, Gamepad2, MessageSquare, Globe, User as UserIcon, Settings, Image as ImageIcon, X, Heart } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { useToast } from '@/components/GlobalToast';
import { logoutClient } from '@/lib/sessionClient';
import ImageEditorModal from '@/components/ImageEditorModal';

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
  const [savingInfo, setSavingInfo] = useState(false);

  // Image Modal
  const [imageModal, setImageModal] = useState<{ open: boolean; type: 'avatar' | 'cover' }>({ open: false, type: 'avatar' });

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
      if (res.ok) {
        setData(json.user);
        setGdUsername(json.user.gdUsername || '');
        setDiscordTag(json.user.discordTag || '');
        setCountry(json.user.country || '');
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveInfo = async () => {
    setSavingInfo(true);
    try {
      const res = await fetch(`/api/profile/${currentUser.username}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gdUsername, discordTag, country })
      });
      if (res.ok) showToast('Cập nhật thông tin thành công!', 'success');
      else showToast('Có lỗi xảy ra', 'error');
    } catch (e) {
      showToast('Có lỗi xảy ra', 'error');
    }
    setSavingInfo(false);
  };

  const handleLogout = async () => {
    await logoutClient();
    window.location.href = '/';
  };

  const handleDeleteAccount = () => {
    showConfirm('Các thao tác xoá tài khoản không thể hoàn tác. Bạn có chắc chắn?', async () => {
      try {
        const res = await fetch(`/api/profile/${currentUser.username}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: 'User requested deletion via Settings' })
        });
        if (res.ok) {
          showToast('Đã xóa tài khoản', 'success');
          handleLogout();
        } else {
          showToast('Không thể xóa', 'error');
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
      if (!res.ok) { setTotpError(json.error || 'Lỗi'); return; }
      setQrCode(json.qrDataUrl);
      setTotpSecret(json.secret);
      setShow2faModal(true);
    } catch (e) { setTotpError('Server error'); } 
    finally { setSettingUp2fa(false); }
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
      if (!res.ok) { setTotpError('Mã không hợp lệ'); return; }
      setShow2faModal(false);
      showToast('2FA đã được bật!', 'success');
      setData({ ...data, totpEnabled: true });
    } catch (e) {} 
    finally { setSettingUp2fa(false); }
  };

  const handleDisable2FA = async () => {
    showConfirm('Bạn có chắc chắn muốn TẮT bảo mật 2 bước không? Tài khoản sẽ kém an toàn hơn.', async () => {
      try {
        const res = await fetch('/api/auth/2fa', { method: 'DELETE' });
        if (res.ok) {
          showToast('Đã tắt 2FA', 'success');
          setData({ ...data, totpEnabled: false });
        } else showToast('Có lỗi xảy ra', 'error');
      } catch (e) {}
    });
  };

  // Password Reset Handlers
  const handleSendOtp = async () => {
    if (!currentUser?.email) {
       showToast('Tài khoản chưa có email xác minh!', 'error');
       return;
    }
    try {
      // NOTE: sending 'bypass' or standard to API. If captcha is required, this API may fail. 
      // But we will send it anyway.
      const res = await fetch('/api/auth/send-reset-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, locale: language, website: '' }) 
      });
      const resJson = await res.json();
      if (res.ok && resJson.success) {
        setPwCooldown(60);
        showToast('Đã gửi mã OTP tới email!', 'success');
      } else {
        showToast(resJson.error || 'Lỗi gửi OTP, có thể thiếu Captcha', 'error');
      }
    } catch (e) {}
  };

  const handleChangePassword = async () => {
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser.email, otp: pwOtp, password: pwNew, locale: language })
      });
      if (res.ok) {
        showToast('Đổi mật khẩu thành công!', 'success');
        setShowPasswordModal(false);
      } else {
        showToast('Sai mã OTP hoặc lỗi', 'error');
      }
    } catch (e) {}
  };

  if (loading) return <div className="p-8 text-center text-sm ui-dim">Đang tải...</div>;
  if (!data) return null;

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <h1 className="text-2xl font-black flex items-center gap-2">
        <Settings className="w-6 h-6 text-sky-500" />
        Cài Đặt Cá Nhân
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          <div className="ui-card p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
              <UserIcon className="w-4 h-4" /> Hình ảnh & Nhận diện
            </h2>
            <div className="relative mb-8">
              <div className="w-full h-24 md:h-32 rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800 border" style={{ borderColor: 'var(--border-ui)' }}>
                {data.coverUrl && <img src={data.coverUrl} alt="Cover" className="w-full h-full object-cover" />}
              </div>
              <div className="absolute -bottom-5 left-4 p-1 rounded-2xl" style={{ backgroundColor: 'var(--bg-card)' }}>
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden bg-slate-200 dark:bg-zinc-700 shadow-sm border" style={{ borderColor: 'var(--border-subtle)' }}>
                  {data.avatarUrl ? <img src={data.avatarUrl} alt="Avatar" className="w-full h-full object-cover" /> : <UserIcon className="w-8 h-8 m-auto mt-3 md:mt-4 text-slate-400" />}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button onClick={() => setImageModal({ open: true, type: 'avatar' })} className="px-4 py-2 bg-sky-500/10 text-sky-500 rounded-xl text-xs font-bold hover:bg-sky-500/20 flex gap-2 items-center cursor-pointer transition-colors border border-sky-500/20">
                <ImageIcon className="w-4 h-4"/> Đổi Avatar
              </button>
              <button onClick={() => setImageModal({ open: true, type: 'cover' })} className="px-4 py-2 bg-sky-500/10 text-sky-500 rounded-xl text-xs font-bold hover:bg-sky-500/20 flex gap-2 items-center cursor-pointer transition-colors border border-sky-500/20">
                <ImageIcon className="w-4 h-4"/> Đổi Banner
              </button>
            </div>
            
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-[11px] font-bold ui-dim">Geometry Dash Username</label>
                <div className="flex items-center gap-2 mt-1">
                  <Gamepad2 className="w-4 h-4 ui-dim" />
                  <input type="text" value={gdUsername} onChange={e => setGdUsername(e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg text-sm border focus:ring-1 focus:ring-sky-500" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }} />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold ui-dim">Discord Username</label>
                <div className="flex items-center gap-2 mt-1">
                  <MessageSquare className="w-4 h-4 ui-dim" />
                  <input type="text" value={discordTag} onChange={e => setDiscordTag(e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg text-sm border focus:ring-1 focus:ring-sky-500" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }} />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-bold ui-dim">Quốc gia / Vị trí</label>
                <div className="flex items-center gap-2 mt-1">
                  <Globe className="w-4 h-4 ui-dim" />
                  <input type="text" value={country} onChange={e => setCountry(e.target.value)} className="flex-1 px-3 py-1.5 rounded-lg text-sm border focus:ring-1 focus:ring-sky-500" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }} />
                </div>
              </div>
              <button onClick={handleSaveInfo} disabled={savingInfo} className="w-full mt-2 py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50">Lưu Thông Tin</button>
            </div>
          </div>

          <div className="ui-card p-5 space-y-4 border-red-500/20 bg-red-500/5">
            <h2 className="text-sm font-bold flex items-center gap-2 text-red-500 border-b border-red-500/20 pb-2">
              <Trash2 className="w-4 h-4" /> Xóa Tài Khoản
            </h2>
            <p className="text-xs ui-dim">Hành động này không thể hoàn tác. Toàn bộ dữ liệu của bạn sẽ bị xóa khỏi hệ thống.</p>
            <button onClick={handleDeleteAccount} className="px-4 py-2 bg-red-500/20 text-red-500 rounded-xl text-xs font-bold hover:bg-red-500/30 w-full cursor-pointer transition-colors border border-red-500/20">Yêu Cầu Xóa Tài Khoản</button>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="ui-card p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
              <ShieldCheck className="w-4 h-4" /> Bảo Mật & 2FA
            </h2>
            
            <div className="flex items-center justify-between p-3 rounded-xl border bg-emerald-500/5 border-emerald-500/20">
              <div>
                <div className="font-bold text-sm">Xác thực 2 bước (2FA)</div>
                <div className="text-xs ui-dim mt-0.5">Bảo vệ tài khoản bằng ứng dụng Authenticator</div>
              </div>
              {data.totpEnabled ? (
                <button onClick={handleDisable2FA} className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold text-xs rounded-lg cursor-pointer transition-colors border border-red-500/20">Tắt 2FA</button>
              ) : (
                <button onClick={handleSetup2FA} className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-bold text-xs rounded-lg cursor-pointer transition-colors border border-emerald-500/20">Bật 2FA</button>
              )}
            </div>

            <div className="pt-2">
              <button onClick={() => setShowPasswordModal(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-xs font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors" style={{ borderColor: 'var(--border-ui)' }}>
                <Lock className="w-4 h-4"/> Đổi Mật Khẩu
              </button>
            </div>
          </div>

          <div className="ui-card p-5 space-y-4">
            <h2 className="text-sm font-bold flex items-center gap-2 border-b pb-2" style={{ borderColor: 'var(--border-subtle)' }}>
              <HelpCircle className="w-4 h-4" /> Khác
            </h2>
            
            <button onClick={() => router.push('/support')} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-xs font-bold cursor-pointer hover:bg-pink-50 dark:hover:bg-pink-950/30 text-pink-500 border-pink-500/20 transition-colors">
              <Heart className="w-4 h-4"/> Ủng Hộ GDVN (Donate)
            </button>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border rounded-xl text-xs font-bold cursor-pointer hover:bg-red-50 hover:text-red-500 hover:border-red-500/30 dark:hover:bg-red-950/30 text-slate-500 transition-colors" style={{ borderColor: 'var(--border-ui)' }}>
              <LogOut className="w-4 h-4"/> Đăng Xuất
            </button>
          </div>
        </div>
      </div>

      <ImageEditorModal
        isOpen={imageModal.open}
        type={imageModal.type}
        currentImage={imageModal.type === 'avatar' ? data.avatarUrl : data.coverUrl}
        onClose={() => setImageModal({ open: false, type: 'avatar' })}
        onSave={async (url: string) => {
          const nextData = { ...data };
          if (imageModal.type === 'avatar') nextData.avatarUrl = url;
          else nextData.coverUrl = url;
          setData(nextData);
          setImageModal({ open: false, type: 'avatar' });
          try {
            await fetch(`/api/profile/${currentUser.username}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(imageModal.type === 'avatar' ? { avatarUrl: url } : { coverUrl: url })
            });
            showToast('Cập nhật hình ảnh thành công', 'success');
          } catch (e) {}
        }}
      />

      {show2faModal && (
        <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={() => setShow2faModal(false)}>
          <div className="bg-card w-full max-w-sm rounded-3xl p-5 md:p-6 shadow-2xl relative border" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-emerald-500"><ShieldCheck className="w-5 h-5" /> Bật 2FA</h3>
              <button onClick={() => setShow2faModal(false)} className="p-1 rounded-xl border ui-dim cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              {qrCode ? (
                <div className="bg-white p-3 rounded-2xl mx-auto w-fit border-2 border-emerald-500/20 shadow-xl shadow-emerald-500/10">
                  <img src={qrCode} alt="2FA QR Code" className="w-40 h-40" />
                </div>
              ) : <div className="w-40 h-40 mx-auto bg-gray-100 dark:bg-zinc-800 rounded-2xl animate-pulse"></div>}
              <div className="text-center">
                <p className="text-[10px] uppercase font-bold ui-dim mb-1">Mã bí mật (Secret Key)</p>
                <code className="px-3 py-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-xs font-mono font-bold tracking-widest text-emerald-600 select-all border">{totpSecret || '...'}</code>
              </div>
              <div className="pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <input type="text" maxLength={6} value={totpInput} onChange={e => setTotpInput(e.target.value)} placeholder="Nhập 6 số..." className="w-full px-3 py-2.5 rounded-xl text-xs font-mono tracking-widest text-center border focus:outline-none focus:ring-1 focus:ring-emerald-500" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }} />
              </div>
              {totpError && <p className="text-[11px] text-rose-500 font-bold text-center bg-rose-500/10 py-1.5 rounded-lg">{totpError}</p>}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={() => setShow2faModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold ui-subtle border border-transparent cursor-pointer hover:border-zinc-500/30">Đóng</button>
              <button type="button" onClick={handleVerify2FA} disabled={settingUp2fa || totpInput.length < 6} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-500 hover:bg-emerald-600 cursor-pointer disabled:opacity-50 transition-colors">Xác thực</button>
            </div>
          </div>
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 z-[999999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-card w-full max-w-sm rounded-3xl p-5 md:p-6 shadow-2xl relative border" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold flex items-center gap-2 text-sky-500"><Lock className="w-5 h-5" /> Đổi Mật Khẩu</h3>
              <button onClick={() => setShowPasswordModal(false)} className="p-1 rounded-xl border ui-dim cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-3">
              <p className="text-[11px] ui-dim">Nhấn nút bên dưới để nhận mã OTP gửi về email <span className="font-bold">{currentUser?.email}</span> của bạn.</p>
              <div className="flex gap-2 pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                <button onClick={handleSendOtp} disabled={pwCooldown > 0} className="w-full py-2 bg-sky-500 hover:bg-sky-600 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-50">
                  {pwCooldown > 0 ? `Đợi ${pwCooldown}s để gửi lại` : 'Gửi mã xác nhận OTP'}
                </button>
              </div>
              <div className="pt-1">
                <label className="text-[10px] font-bold uppercase ui-dim">Mã OTP</label>
                <input type="text" maxLength={6} value={pwOtp} onChange={e => setPwOtp(e.target.value)} placeholder="Nhập 6 số..." className="w-full px-3 py-2 rounded-lg text-sm border font-mono tracking-widest focus:ring-1 focus:ring-sky-500 mt-1" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }} />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase ui-dim">Mật khẩu mới</label>
                <input type="password" value={pwNew} onChange={e => setPwNew(e.target.value)} placeholder="••••••••" className="w-full px-3 py-2 rounded-lg text-sm border focus:ring-1 focus:ring-sky-500 mt-1" style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button type="button" onClick={() => setShowPasswordModal(false)} className="px-4 py-2 rounded-xl text-xs font-bold ui-subtle border cursor-pointer hover:border-zinc-500/30">Đóng</button>
              <button type="button" onClick={handleChangePassword} disabled={pwOtp.length < 6 || pwNew.length < 6} className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-sky-500 hover:bg-sky-600 cursor-pointer disabled:opacity-50 transition-colors">Đổi MK</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
