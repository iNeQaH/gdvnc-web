import { getDifficultyFaceUrl, getRatingIconUrl } from '@/lib/gdDifficulty';

export function DifficultyRatingIcon({
  difficultyFace,
  ratingType,
  className = 'w-6 h-6',
}: {
  difficultyFace?: number | null;
  ratingType?: string | null;
  className?: string;
}) {
  const face = getDifficultyFaceUrl(difficultyFace ?? 0);
  const rating = getRatingIconUrl(ratingType);

  return (
    <span className={`relative inline-block shrink-0 ${className}`}>
      {rating ? (
        <img src={rating} alt="" className="absolute inset-0 h-full w-full object-contain" />
      ) : null}
      <img src={face} alt="" className="absolute inset-0 z-[1] h-full w-full object-contain" />
    </span>
  );
}
