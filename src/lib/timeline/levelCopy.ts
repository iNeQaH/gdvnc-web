import { clipText } from '@/lib/validate';
import { formatDifficultyLabel } from '@/lib/gdDifficulty';
import { sanitizeChronicleHtml } from '@/lib/timeline/sanitize';

export const LEVEL_COPY_MARK = '<!--gdvn-level-->';

export function isGeneratedLevelCopy(html: string | null | undefined) {
  const t = String(html || '').trim();
  if (!t) return true;
  const plain = t.replace(/<[^>]+>/g, '').trim();
  if (/^ID\s+\d+$/i.test(plain)) return true;
  return t.startsWith(LEVEL_COPY_MARK);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function ymd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function ratingLabel(ratingType: string | null | undefined) {
  const raw = String(ratingType || '').trim().toUpperCase();
  if (!raw || raw === 'NONE') return 'Unrated';
  if (raw === 'RATE') return 'Rate';
  if (raw === 'FEATURE') return 'Feature';
  if (raw === 'EPIC') return 'Epic';
  if (raw === 'LEGENDARY') return 'Legendary';
  if (raw === 'MYTHIC') return 'Mythic';
  return raw;
}

export function levelChronicleShort(name: string, creatorName: string) {
  const n = String(name || '').trim() || 'Unknown';
  const c = String(creatorName || '').trim() || 'Unknown';
  return clipText(`${n} · ${c}`, 400);
}

export function levelChronicleHtml(input: {
  name: string;
  creatorName: string;
  difficulty?: string | null;
  difficultyFace?: number | null;
  ratingType?: string | null;
  mode?: string | null;
  gdLevelId: number;
  description?: string | null;
  ratedAt?: Date | null;
  youtubeId?: string | null;
}) {
  const name = String(input.name || '').trim() || `Level ${input.gdLevelId}`;
  const creator = String(input.creatorName || '').trim() || 'Unknown';
  const diff = formatDifficultyLabel(input.difficultyFace ?? 0, input.difficulty);
  const mode = String(input.mode || '').toUpperCase() === 'PLATFORMER' ? 'Platformer' : 'Classic';
  const desc = String(input.description || '').trim();
  const yt = input.youtubeId && /^[\w-]{11}$/.test(input.youtubeId) ? input.youtubeId : null;
  const watch = yt ? `https://youtu.be/${yt}` : '';

  const lines = [
    LEVEL_COPY_MARK,
    `<p><strong>Tên level:</strong> ${escapeHtml(name)}</p>`,
    `<p><strong>Tác giả:</strong> ${escapeHtml(creator)}</p>`,
    `<p><strong>Độ khó:</strong> ${escapeHtml(diff)}</p>`,
    `<p><strong>Rating:</strong> ${escapeHtml(ratingLabel(input.ratingType))}</p>`,
    `<p><strong>Chế độ:</strong> ${mode}</p>`,
    `<p><strong>ID:</strong> ${input.gdLevelId}</p>`,
  ];
  if (input.ratedAt) {
    lines.push(`<p><strong>Ngày rate:</strong> ${ymd(input.ratedAt)}</p>`);
  }
  if (desc) {
    lines.push(`<p><strong>Mô tả:</strong><br>${escapeHtml(desc).replace(/\n/g, '<br>')}</p>`);
  } else {
    lines.push('<p><strong>Mô tả:</strong> Không có mô tả.</p>');
  }
  if (yt) {
    lines.push(`<p><strong>Video:</strong> <a href="${watch}" target="_blank" rel="noopener noreferrer">${watch}</a></p>`);
    lines.push(
      `<p><iframe width="560" height="315" src="https://www.youtube.com/embed/${yt}" title="YouTube video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></p>`
    );
  }

  return sanitizeChronicleHtml(clipText(lines.join('\n'), 20000));
}
