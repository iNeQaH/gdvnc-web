'use client';

import React, { useState } from 'react';
import { Check, Vote, CheckCircle2 } from 'lucide-react';
import { useToast } from './GlobalToast';

export interface PollOption {
  text: string;
  votes: number;
  percentage: number;
}

export interface PollData {
  question: string;
  options: PollOption[];
  allowMultiple?: boolean;
  totalVoters: number;
  myVotes: number[];
}

export function AnnouncementPoll({
  announcementId,
  poll,
  onVoteSuccess,
}: {
  announcementId: string;
  poll: PollData;
  onVoteSuccess?: (updatedPoll: PollData) => void;
}) {
  const { showToast } = useToast();
  const [selectedIndices, setSelectedIndices] = useState<number[]>(poll.myVotes || []);
  const [submitting, setSubmitting] = useState(false);
  const hasVoted = (poll.myVotes || []).length > 0;

  const toggleOption = (idx: number) => {
    if (poll.allowMultiple) {
      setSelectedIndices((prev) =>
        prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
      );
    } else {
      setSelectedIndices([idx]);
    }
  };

  const handleVote = async () => {
    if (selectedIndices.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 phương án!', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/announcements/${announcementId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIndices: selectedIndices }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Bình chọn thành công!', 'success');
        if (onVoteSuccess && data.poll) {
          onVoteSuccess(data.poll);
        }
      } else {
        showToast(data.error || 'Lỗi khi bình chọn.', 'error');
      }
    } catch {
      showToast('Lỗi khi gửi bình chọn.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="p-5 rounded-2xl border space-y-4 my-4"
      style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
    >
      <div className="flex items-center justify-between gap-2 border-b pb-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center gap-2">
          <Vote className="w-4 h-4 text-sky-500" />
          <h4 className="text-xs font-black uppercase tracking-wider ui-title">
            Cuộc bình chọn {poll.allowMultiple ? '(Chọn nhiều)' : '(Chọn 1)'}
          </h4>
        </div>
        <span className="text-[11px] ui-dim font-semibold">
          {poll.totalVoters} người đã bình chọn
        </span>
      </div>

      <div className="text-sm font-bold ui-title">{poll.question}</div>

      <div className="space-y-2">
        {poll.options.map((opt, idx) => {
          const isSelected = selectedIndices.includes(idx);
          const isMyChoice = (poll.myVotes || []).includes(idx);

          return (
            <div
              key={idx}
              onClick={() => toggleOption(idx)}
              className={`relative overflow-hidden rounded-xl border p-3 cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-sky-500 border-sky-500' : 'hover:border-sky-500/50'
              }`}
              style={{
                borderColor: isSelected ? undefined : 'var(--border-ui)',
                backgroundColor: 'var(--bg-card)',
              }}
            >
              {/* Progress bar background */}
              {poll.totalVoters > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-sky-500/15 transition-all duration-500 pointer-events-none"
                  style={{ width: `${opt.percentage}%` }}
                />
              )}

              <div className="relative z-10 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-4 h-4 rounded-${poll.allowMultiple ? 'md' : 'full'} border flex items-center justify-center shrink-0 ${
                      isSelected ? 'bg-sky-500 border-sky-500 text-white' : 'border-zinc-500/40'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>
                  <span className={`font-semibold truncate ${isSelected ? 'ui-title font-bold' : 'ui-title'}`}>
                    {opt.text}
                  </span>
                  {isMyChoice && (
                    <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5 shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Đã chọn
                    </span>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-xs ui-title">{opt.percentage}%</span>
                  <span className="text-[10px] ui-dim ml-1.5">({opt.votes})</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] ui-dim">
          {hasVoted ? 'Bạn có thể thay đổi lựa chọn và bình chọn lại.' : 'Hãy chọn phương án của bạn.'}
        </span>
        <button
          type="button"
          onClick={handleVote}
          disabled={submitting || selectedIndices.length === 0}
          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-600 disabled:opacity-50 text-white cursor-pointer transition-all shadow-sm"
        >
          {submitting ? 'Đang gửi...' : hasVoted ? 'Cập nhật bình chọn' : 'Bình chọn'}
        </button>
      </div>
    </div>
  );
}
