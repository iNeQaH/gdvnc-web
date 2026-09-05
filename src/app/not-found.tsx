export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 px-6 text-center">
      <h1 className="text-2xl font-semibold">404</h1>
      <p className="text-sm opacity-80">Trang này không tồn tại.</p>
      <a href="/" className="text-sm underline">
        Về trang chủ
      </a>
    </div>
  );
}
