'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="vi">
      <body className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-2xl font-semibold">Đã xảy ra lỗi</h1>
        <p className="text-sm opacity-80">Vui lòng thử lại. {error.digest ? `(${error.digest})` : ''}</p>
        <button type="button" className="text-sm underline" onClick={() => reset()}>
          Thử lại
        </button>
      </body>
    </html>
  );
}
