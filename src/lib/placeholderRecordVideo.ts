export function isPlaceholderRecordVideo(url?: string | null) {
  if (!url) return false;
  let decoded = url;
  try {
    decoded = decodeURIComponent(url.replace(/\+/g, ' '));
  } catch {
    decoded = url;
  }
  const n = decoded.toLowerCase();
  return (
    n.includes('submitted via death count') ||
    n.includes('watch?v=legacy') ||
    /\/levels\/submitted/i.test(n)
  );
}

export function placeholderVideoWhere() {
  return {
    OR: [
      { videoUrl: { contains: 'Submitted via Death Count', mode: 'insensitive' as const } },
      { videoUrl: { contains: 'Submitted%20via%20Death%20Count', mode: 'insensitive' as const } },
      { videoUrl: { contains: 'watch?v=legacy', mode: 'insensitive' as const } },
      { videoUrl: { contains: '/levels/Submitted', mode: 'insensitive' as const } },
    ],
  };
}
