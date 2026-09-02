import TimelineApp from '@/components/timeline/TimelineApp';

export default async function TimelineEventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <TimelineApp initialEventId={id} />;
}
