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
      <span className="inline-flex flex-col items-center gap-2 shrink-0">
        <span className={`relative block overflow-hidden ${className}`}>
          <img src={face} alt="" className="absolute inset-0 size-full object-contain" />
        </span>
        {rating ? (
          <span className={`relative block overflow-hidden ${className}`}>
            <img
              src={rating}
              alt=""
              className="absolute inset-0 size-full object-contain origin-center"
              style={{ transform: 'scale(1.72)' }}
            />
          </span>
        ) : null}
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
