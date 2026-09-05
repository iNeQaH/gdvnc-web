import prisma from '@/services/prisma';
import { getSiteBaseUrl, toAbsoluteUrl } from '@/services/profileEmbed';
import { toChronicleEvent } from '@/services/timeline/serialize';
import { chronicleShareText, eventSharePath } from '@/services/timeline/share';
import { formatDate } from '@/services/timeline/time';

export async function getTimelineShareMeta(id: string) {
  const row = await prisma.timelineEvent.findUnique({ where: { id } });
  if (!row) return null;

  const event = toChronicleEvent(row);
  const base = getSiteBaseUrl();
  const date = formatDate(event.start, { locale: 'vi' });
  const description =
    chronicleShareText(event) || `THE CHRONICLES · ${date}`;
  const image = toAbsoluteUrl(event.image);

  return {
    id: event.id,
    title: `${event.title} | THE CHRONICLES`,
    description,
    date,
    image,
    url: `${base}${eventSharePath(event.id)}`,
    ogImage: image || `${base}/api/og/timeline/${encodeURIComponent(event.id)}`,
  };
}
