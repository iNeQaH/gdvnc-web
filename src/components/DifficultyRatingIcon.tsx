import { getDifficultyFaceUrl, getRatingIconUrl } from '@/lib/gdDifficulty';

export function DifficultyRatingIcon({
  difficultyFace,
  ratingType,
  className = 'w-6 h-6',
  stacked = false,
}: {
  difficultyFace?: number | null;
  ratingType?: string | null;
  className?: string;
  stacked?: boolean;
}) {
  const face = getDifficultyFaceUrl(difficultyFace ?? 0);
  const rating = getRatingIconUrl(ratingType);

  if (stacked) {
    return (
      <span className="inline-flex flex-col items-center gap-1 shrink-0">
        <img src={face} alt="" className={`object-contain ${className}`} />
        {rating ? <img src={rating} alt="" className={`object-contain ${className}`} /> : null}
      </span>
    );
  }

  return (
    <span className={`relative inline-block shrink-0 ${className}`}>
      {rating ? (
        <img src={rating} alt="" className="absolute inset-0 h-full w-full object-contain" />
      ) : null}
      <img src={face} alt="" className="absolute inset-0 z-[1] h-full w-full object-contain" />
    </span>
  );
}
