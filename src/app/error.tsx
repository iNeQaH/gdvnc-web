'use client';

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-md mx-auto py-16 text-center space-y-3">
      <h1 className="text-lg font-extrabold ui-title">Không tải được trang</h1>
      <p className="text-xs ui-dim">Thử tải lại. Nếu vẫn lỗi, quay về trang chủ.</p>
      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => reset()}
          className="px-3 py-2 rounded-xl text-xs font-bold border cursor-pointer"
          style={{ borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
        >
          Tải lại
        </button>
        <a
          href="/"
          className="px-3 py-2 rounded-xl text-xs font-bold cursor-pointer"
          style={{ backgroundColor: 'var(--accent)', color: 'var(--accent-fg)' }}
        >
          Trang chủ
        </a>
      </div>
    </div>
  );
}
