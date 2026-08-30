'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastOptions {
  message: string;
  type?: ToastType;
}

interface ConfirmOptions {
  message: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  showConfirm: (message: string, onConfirm: () => void, onCancel?: () => void) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<{ id: number; message: string; type: ToastType } | null>(null);
  const [confirmData, setConfirmData] = useState<ConfirmOptions | null>(null);

  const showToast = (message: string, type: ToastType = 'info') => {
    const id = Date.now();
    setToast({ id, message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 5000);
  };

  const showConfirm = (message: string, onConfirm: () => void, onCancel?: () => void) => {
    setConfirmData({ message, onConfirm, onCancel });
  };

  const handleConfirm = () => {
    if (confirmData?.onConfirm) confirmData.onConfirm();
    setConfirmData(null);
  };

  const handleCancel = () => {
    if (confirmData?.onCancel) confirmData.onCancel();
    setConfirmData(null);
  };

  return (
    <ToastContext.Provider value={{ showToast, showConfirm }}>
      {children}

      {/* Global Toast */}
      {toast && (
        <div 
          className="fixed bottom-5 right-5 z-[999999] animate-in fade-in slide-in-from-bottom-3 duration-200 cursor-pointer"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(toast.message);
            } catch {
              /* ignore */
            }
            setToast(null);
          }}
        >
          <div
            className={`px-4 py-3 rounded-2xl shadow-2xl border text-xs font-bold flex items-center gap-2 ${
              toast.type === 'error'
                ? 'bg-red-500/10 text-red-500 border-red-500/20'
                : toast.type === 'success'
                ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                : 'bg-sky-500/10 text-sky-500 border-sky-500/20'
            }`}
            style={{ backdropFilter: 'blur(12px)', backgroundColor: 'var(--bg-card)' }}
          >
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-500" /> : 
             toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> :
             <Info className="w-4 h-4 text-sky-500" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Global Confirm Modal */}
      {confirmData && (
        <div className="fixed inset-0 z-[100000] bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border shadow-2xl p-6 space-y-4" style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-500/10 text-amber-500 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold ui-title text-base">Xác nhận</h3>
                <p className="text-xs ui-dim leading-relaxed">{confirmData.message}</p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button 
                onClick={handleCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold transition-colors border"
                style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              >
                Hủy
              </button>
              <button 
                onClick={handleConfirm}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors bg-red-500 hover:bg-red-600"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}
