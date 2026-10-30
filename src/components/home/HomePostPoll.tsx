'use client';

import React, { useState } from 'react';
import { Check, Vote, CheckCircle2, Loader2 } from 'lucide-react';
import { useToast } from '@/components/GlobalToast';

export function HomePostPoll({
  postId,
  poll,
  onVoted,
}: {
  postId: string;
  poll: any;
  onVoted?: (updatedPoll: any) => void;
}) {
  const { showToast } = useToast();
  const [currentPoll, setCurrentPoll] = useState<any>(poll);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (!currentPoll || !Array.isArray(currentPoll.options)) return null;

  const totalVoters = currentPoll.totalVoters || 0;

  const handleVote = async () => {
    if (selectedIdx === null) {
      showToast('Vui lòng chọn một phương án.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/home-posts/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIndices: [selectedIdx] }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Lỗi khi bình chọn.', 'error');
        return;
      }
      showToast('Bình chọn thành công!', 'success');
      if (data.poll) {
        setCurrentPoll(data.poll);
        onVoted?.(data.poll);
      }
    } catch {
      showToast('Đã xảy ra lỗi mạng.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl border space-y-3 bg-slate-500/5" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold ui-title flex items-center gap-2">
          <Vote className="w-4 h-4 text-purple-400" />
          <span>{currentPoll.question || 'Khảo sát cộng đồng'}</span>
        </div>
        <span className="text-[10px] ui-dim font-mono">
          {totalVoters} {totalVoters === 1 ? 'lượt bình chọn' : 'lượt bình chọn'}
        </span>
      </div>

      <div className="space-y-2">
        {currentPoll.options.map((opt: any, idx: number) => {
          const optText = typeof opt === 'string' ? opt : opt.text;
          const votes = typeof opt === 'object' ? opt.votes || 0 : 0;
          const percentage = typeof opt === 'object' ? opt.percentage || 0 : 0;
          const isSelected = selectedIdx === idx;

          return (
            <div
              key={idx}
              onClick={() => setSelectedIdx(idx)}
              className={`relative overflow-hidden p-3 rounded-xl border transition-all cursor-pointer select-none ${
                isSelected
                  ? 'border-purple-500/60 bg-purple-500/10'
                  : 'hover:bg-slate-500/10'
              }`}
              style={{
                borderColor: isSelected ? undefined : 'var(--border-subtle)',
              }}
            >
              {/* Progress bar background */}
              {totalVoters > 0 && (
                <div
                  className="absolute inset-y-0 left-0 bg-purple-500/15 pointer-events-none transition-all duration-500"
                  style={{ width: `${percentage}%` }}
                />
              )}

              <div className="relative flex items-center justify-between z-10 text-xs">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                      isSelected
                        ? 'border-purple-500 bg-purple-500 text-white'
                        : 'border-muted-foreground/40'
                    }`}
                  >
                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                  </div>
                  <span className="font-semibold text-foreground">{optText}</span>
                </div>

                {totalVoters > 0 && (
                  <span className="font-mono text-[11px] text-muted-foreground">
                    {percentage}% ({votes})
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-1 flex justify-end">
        <button
          onClick={handleVote}
          disabled={submitting || selectedIdx === null}
          className="px-4 py-1.5 rounded-xl text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          {submitting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Đang gửi...
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Gửi biểu quyết
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default HomePostPoll;
