export default function BrandMark({
  size = 36,
  className = '',
}: {
  size?: number;
  className?: string;
}) {
  return (
    <img
      src="/gdvn-logo.png"
      alt="GDVN"
      width={size}
      height={size}
      className={`rounded-xl object-cover shrink-0 ${className}`.trim()}
    />
  );
}
