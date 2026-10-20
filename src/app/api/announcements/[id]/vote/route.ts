import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireActiveUser } from '@/lib/auth';
import { publicApiError } from '@/lib/apiError';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  let auth;
  try {
    auth = await requireActiveUser();
  } catch (e: any) {
    if (e?.message === 'BANNED') {
      return NextResponse.json({ error: 'Tài khoản của bạn đang bị đình chỉ, không thể tham gia bình chọn.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  try {
    const { optionIndices } = await req.json();
    if (!Array.isArray(optionIndices) || optionIndices.length === 0) {
      return NextResponse.json({ error: 'Vui lòng chọn ít nhất một phương án bình chọn.' }, { status: 400 });
    }

    const ann = await prisma.siteAnnouncement.findUnique({
      where: { id },
      select: { id: true, poll: true },
    });
    if (!ann || !ann.poll) {
      return NextResponse.json({ error: 'Bình chọn không tồn tại.' }, { status: 404 });
    }

    const poll = ann.poll as any;
    const options = Array.isArray(poll.options) ? poll.options : [];
    const validIndices = optionIndices
      .map(Number)
      .filter((idx) => Number.isInteger(idx) && idx >= 0 && idx < options.length);

    if (validIndices.length === 0) {
      return NextResponse.json({ error: 'Phương án bình chọn không hợp lệ.' }, { status: 400 });
    }

    const finalIndices = poll.allowMultiple ? validIndices : [validIndices[0]];
    const votes = (poll.votes && typeof poll.votes === 'object') ? { ...poll.votes } : {};
    votes[auth.userId] = finalIndices;

    const updatedPoll = { ...poll, votes };
    await prisma.siteAnnouncement.update({
      where: { id },
      data: { poll: updatedPoll },
    });

    const totalVoters = Object.keys(votes).length;
    const counts = options.map(() => 0);
    Object.values(votes).forEach((userVoteIndices: any) => {
      if (Array.isArray(userVoteIndices)) {
        userVoteIndices.forEach((idx: number) => {
          if (idx >= 0 && idx < counts.length) {
            counts[idx]++;
          }
        });
      }
    });

    const pollData = {
      question: poll.question || '',
      options: options.map((opt: string, idx: number) => ({
        text: opt,
        votes: counts[idx] || 0,
        percentage: totalVoters > 0 ? Math.round(((counts[idx] || 0) / totalVoters) * 100) : 0,
      })),
      allowMultiple: Boolean(poll.allowMultiple),
      totalVoters,
      myVotes: finalIndices,
    };

    return NextResponse.json({
      success: true,
      poll: pollData,
    });
  } catch (error: any) {
    return publicApiError(error, 'Failed to cast vote.', 500);
  }
}
