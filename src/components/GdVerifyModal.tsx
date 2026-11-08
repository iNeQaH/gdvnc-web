'use client';

import React, { useState } from 'react';
import { X, Check, Copy, RefreshCw, Gamepad2, ShieldCheck, AlertCircle, Sparkles, ExternalLink, ArrowRight } from 'lucide-react';
import { useToast } from '@/components/GlobalToast';

interface GdVerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialGdUsername?: string;
  onSuccess?: (result: { gdUsername: string; claimed: number }) => void;
}

export default function GdVerifyModal({
  isOpen,
  onClose,
  initialGdUsername = '',
  onSuccess,
}: GdVerifyModalProps) {
  const { showToast } = useToast();
  const [gdName, setGdName] = useState(initialGdUsername);
  const [token, setToken] = useState('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [generating, setGenerating] = useState(false);
  const [checking, setChecking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleGenerate = async (targetName?: string) => {
    const nameToUse = (targetName ?? gdName).trim();
    if (!nameToUse) {
      setErrorMessage('Vui lòng nhập tên tài khoản Geometry Dash.');
      return;
    }
    setGenerating(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/gd/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', gdUsername: nameToUse }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setToken(data.token);
        setGdName(data.gdUsername);
        setExpiresAt(data.expiresAt);
        setErrorMessage('');
        showToast('Đã tạo mã xác minh mới thành công!', 'success');
      } else {
        setErrorMessage(data.error || 'Lỗi khi tạo mã xác minh.');
      }
    } catch {
      setErrorMessage('Lỗi kết nối máy chủ.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopied(true);
    showToast('Đã sao chép mã vào khay nhớ tạm!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCheck = async () => {
    if (!token) {
      setErrorMessage('Vui lòng tạo mã xác minh trước.');
      return;
    }
    setChecking(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/gd/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'check' }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.verified) {
        showToast(`Xác minh tài khoản GD "${data.gdUsername}" thành công!`, 'success');
        if (onSuccess) {
          onSuccess({ gdUsername: data.gdUsername, claimed: data.claimed || 0 });
        }
        onClose();
      } else {
        setErrorMessage(data.error || 'Chưa tìm thấy mã trong ô Custom. Vui lòng kiểm tra lại trong game.');
      }
    } catch {
      setErrorMessage('Lỗi kết nối khi kiểm tra xác minh.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg rounded-3xl border shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-sky-500/10 text-sky-500 border border-sky-500/20">
              <Gamepad2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-black ui-title flex items-center gap-1.5">
                Xác Minh Tài Khoản Geometry Dash
                <span className="px-2 py-0.2 rounded-md text-[9px] font-black uppercase bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Tự động
                </span>
              </h2>
              <p className="text-[11px] ui-dim">Chỉ cần dán mã vào ô Custom trong game để xác minh ngay lập tức</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Step 1: Input GD username & generate token */}
          <div className="space-y-2">
            <label className="text-xs font-bold ui-dim block">1. Tên tài khoản Geometry Dash của bạn</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={gdName}
                onChange={(e) => setGdName(e.target.value)}
                placeholder="VD: Player123"
                disabled={generating || checking}
                className="flex-1 px-3.5 py-2.5 rounded-xl text-xs font-bold border focus:ring-1 focus:ring-sky-500 outline-none"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              />
              <button
                type="button"
                onClick={() => handleGenerate()}
                disabled={generating || !gdName.trim()}
                className="px-4 py-2.5 bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-xs shrink-0"
              >
                {generating ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>{token ? 'Đổi mã mới' : 'Lấy mã xác minh'}</span>
              </button>
            </div>
          </div>

          {/* Token Box (Hiển thị khi đã sinh mã) */}
          {token && (
            <div className="p-4 rounded-2xl border space-y-3 bg-sky-500/5 border-sky-500/25 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-sky-400 uppercase tracking-wider">Mã xác thực của bạn:</span>
                <span className="text-[10px] ui-dim font-medium">Hiệu lực trong 30 phút</span>
              </div>
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-black/30 border border-sky-500/30">
                <span className="font-mono text-base sm:text-lg font-black tracking-widest text-sky-400 select-all">
                  {token}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-xs shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Đã chép' : 'Sao chép'}</span>
                </button>
              </div>

              {/* Instructions: GD Game Steps */}
              <div className="space-y-2 pt-2 border-t border-sky-500/15">
                <span className="text-xs font-bold ui-title block">2. Thao tác 1 phút trong Geometry Dash:</span>
                <div className="text-[11px] ui-dim space-y-1.5 leading-relaxed font-medium">
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">1</span>
                    <span>Vào game <strong>Geometry Dash</strong> &rarr; mở mục <strong>Profile</strong> cá nhân của bạn.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">2</span>
                    <span>Bấm biểu tượng <strong>Bánh răng (Settings ⚙️)</strong> ở góc trên bên trái khung Profile.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">3</span>
                    <span>Cuộn xuống ô <strong>Custom:</strong> ở dưới cùng, dán mã <strong className="font-mono text-sky-400">{token}</strong> vào đó rồi bấm <strong>Update</strong>.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs flex items-start gap-2 leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-subtle)' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold ui-dim hover:text-white cursor-pointer transition-colors"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={handleCheck}
            disabled={!token || checking}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-2 shadow-md"
          >
            {checking ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Đang kiểm tra từ GD...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Kiểm tra & Xác minh ngay</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
