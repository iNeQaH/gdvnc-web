'use client';

import React, { useEffect } from 'react';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin Panel Error:', error);
  }, [error]);

  return (
    <div className="ui-card p-8 text-center space-y-4 max-w-md mx-auto my-10">
      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 flex items-center justify-center mx-auto text-red-600">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-bold ui-title">Lỗi trong Bảng Quản Trị</h2>
        <p className="text-xs ui-dim leading-relaxed">
          Đã xảy ra sự cố khi tải dữ liệu trang Admin. Chi tiết lỗi đã được ghi nhận trong console.
        </p>
      </div>
      <button
        onClick={() => reset()}
        className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-all inline-flex items-center gap-1.5 cursor-pointer"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Thử lại
      </button>
    </div>
  );
}
