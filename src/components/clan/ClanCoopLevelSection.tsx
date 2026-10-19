'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Pin,
  Trophy,
  Plus,
  Check,
  X,
  ExternalLink,
  Video,
  Search,
  Loader2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Trash2,
  ShieldCheck,
  Send,
  Layers,
} from 'lucide-react';
import { UserDisplayName } from '@/components/UserDisplayName';
import { useToast } from '@/components/GlobalToast';

interface ClanCoopLevelSectionProps {
  clan: any;
  myMembership: any;
  isLeader: boolean;
  canManageClan: boolean; // Leader or Moderator or SuperAdmin
  isEn?: boolean;
  isDark?: boolean;
  onRefresh: () => Promise<void> | void;
}

export default function ClanCoopLevelSection({
  clan,
  myMembership,
  isLeader,
  canManageClan,
  isEn = false,
  isDark = true,
  onRefresh,
}: ClanCoopLevelSectionProps) {
  const { showToast } = useToast();

  const completedLevels: any[] = clan.completedLevels || [];
  const pinnedLevel: any = clan.pinnedLevel || null;
  const approvedLevels: any[] = clan.approvedLevels || [];
  const pendingLevels: any[] = clan.pendingLevels || [];

  const [victoryIdx, setVictoryIdx] = useState(0);

  // Submit Run Modal state
  const [showRunModal, setShowRunModal] = useState(false);
  const [startPercent, setStartPercent] = useState<string>('0');
  const [endPercent, setEndPercent] = useState<string>('100');
  const [runVideoUrl, setRunVideoUrl] = useState<string>('');
  const [runNote, setRunNote] = useState<string>('');
  const [submittingRun, setSubmittingRun] = useState(false);

  // Level Manager / Propose / Pin Modal state
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [gdLevelIdInput, setGdLevelIdInput] = useState('');
  const [levelNameInput, setLevelNameInput] = useState('');
  const [creatorInput, setCreatorInput] = useState('');
  const [difficultyInput, setDifficultyInput] = useState('Extreme Demon');
  const [pinNowInput, setPinNowInput] = useState(true);
  const [fetchingGd, setFetchingGd] = useState(false);
  const [submittingLevel, setSubmittingLevel] = useState(false);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  const isMember = Boolean(myMembership) || canManageClan;

  const handleLookupGdLevel = async () => {
    const id = gdLevelIdInput.trim();
    if (!/^\d{1,12}$/.test(id)) {
      showToast('Vui lòng nhập GD Level ID hợp lệ (chỉ gồm số).', 'error');
      return;
    }
    setFetchingGd(true);
    try {
      const res = await fetch(`/api/gd/level/${id}`);
      const data = await res.json();
      if (res.ok && data?.level) {
        setLevelNameInput(data.level.name || '');
        setCreatorInput(data.level.creatorName || 'Unknown');
        setDifficultyInput(data.level.difficulty || 'Extreme Demon');
        showToast(`Đã tìm thấy level: ${data.level.name}`, 'success');
      } else {
        showToast('Không lấy được tự động từ GD Server, bạn có thể tự nhập tên level bên dưới.', 'error');
      }
    } catch {
      showToast('Không thể kết nối tới GD Server, vui lòng nhập tên level thủ công.', 'error');
    } finally {
      setFetchingGd(false);
    }
  };

  const handleCreateOrProposeLevel = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = gdLevelIdInput.trim();
    if (!/^\d{1,12}$/.test(id)) {
      showToast('Vui lòng nhập GD Level ID hợp lệ.', 'error');
      return;
    }
    setSubmittingLevel(true);
    try {
      const res = await fetch(`/api/clans/${clan.slug}/levels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gdLevelId: id,
          name: levelNameInput.trim(),
          creator: creatorInput.trim(),
          difficulty: difficultyInput.trim(),
          pinNow: isLeader ? pinNowInput : false,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Đã lưu level!', 'success');
        setGdLevelIdInput('');
        setLevelNameInput('');
        setCreatorInput('');
        if (isLeader && pinNowInput) {
          setShowLevelModal(false);
        }
        await onRefresh();
      } else {
        showToast(data.error || 'Không thể lưu level.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSubmittingLevel(false);
    }
  };

  const handleSubmitRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinnedLevel) return;
    const s = parseInt(startPercent, 10);
    const end = parseInt(endPercent, 10);
    if (!Number.isFinite(s) || !Number.isFinite(end) || s < 0 || end > 100 || s >= end) {
      showToast('Đoạn % phải hợp lệ (0 <= Bắt đầu < Kết thúc <= 100).', 'error');
      return;
    }
    if (!runVideoUrl.trim()) {
      showToast('Vui lòng nhập link video minh chứng (HTTPS).', 'error');
      return;
    }
    setSubmittingRun(true);
    try {
      const res = await fetch(`/api/clans/${clan.slug}/levels/${pinnedLevel.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startPercent: s,
          endPercent: end,
          videoUrl: runVideoUrl.trim(),
          note: runNote.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Đã nộp đoạn %!', 'success');
        setShowRunModal(false);
        setRunVideoUrl('');
        setRunNote('');
        await onRefresh();
      } else {
        showToast(data.error || 'Không thể nộp tiến độ.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setSubmittingRun(false);
    }
  };

  const handleLevelAction = async (
    levelId: string,
    payload: { action: string; runId?: string }
  ) => {
    const key = `${levelId}:${payload.action}:${payload.runId || ''}`;
    setBusyActionId(key);
    try {
      const res = await fetch(`/api/clans/${clan.slug}/levels/${levelId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Đã cập nhật!', 'success');
        await onRefresh();
      } else {
        showToast(data.error || 'Thao tác thất bại.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleDeleteRun = async (levelId: string, runId: string) => {
    const key = `delrun:${runId}`;
    setBusyActionId(key);
    try {
      const res = await fetch(`/api/clans/${clan.slug}/levels/${levelId}?runId=${runId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Đã xoá đoạn chạy.', 'success');
        await onRefresh();
      } else {
        showToast(data.error || 'Không thể xoá.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleDeleteLevel = async (levelId: string) => {
    const key = `dellvl:${levelId}`;
    setBusyActionId(key);
    try {
      const res = await fetch(`/api/clans/${clan.slug}/levels/${levelId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Đã xoá level khỏi Clan.', 'success');
        await onRefresh();
      } else {
        showToast(data.error || 'Không thể xoá level.', 'error');
      }
    } catch {
      showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
      setBusyActionId(null);
    }
  };

  const currentVictory =
    completedLevels.length > 0
      ? completedLevels[victoryIdx % completedLevels.length] || completedLevels[0]
      : null;

  const showCoopCard = Boolean(pinnedLevel) || isMember || approvedLevels.length > 0;

  if (!currentVictory && !showCoopCard) {
    return null;
  }

  return (
    <div className="space-y-5">
      {/* 1. HIGH-POSITION VICTORY BOX: "Clan {tag.clan} đánh bại {level.name}!" */}
      {currentVictory && (
        <div
          className="ui-card relative overflow-hidden rounded-3xl border-2 p-5 sm:p-6 shadow-2xl transition-all"
          style={{
            borderColor: clan.color || 'var(--accent)',
            background: isDark
              ? `linear-gradient(135deg, rgba(245, 158, 11, 0.16) 0%, rgba(15, 23, 42, 0.92) 55%, rgba(16, 185, 129, 0.14) 100%)`
              : `linear-gradient(135deg, rgba(254, 243, 199, 0.85) 0%, rgba(255, 255, 255, 0.96) 60%, rgba(209, 250, 229, 0.85) 100%)`,
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4 min-w-0">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-amber-500/20 border-2 border-amber-400/50 flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(245,158,11,0.35)]">
                <Trophy className="w-6 h-6 sm:w-7 sm:h-7 text-amber-400 drop-shadow" />
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/40 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Chiến tích Co-op 100%</span>
                  </span>
                  <span className="text-[11px] font-mono font-bold ui-dim">
                    ID: {currentVictory.gdLevelId} • {currentVictory.difficulty}
                  </span>
                </div>

                <h2 className="text-base sm:text-xl md:text-2xl font-black tracking-tight ui-title break-words">
                  Clan{' '}
                  <span
                    className="font-mono"
                    style={
                      clan.colorGradient
                        ? {
                            backgroundImage: clan.colorGradient,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                          }
                        : { color: clan.color || 'var(--accent)' }
                    }
                  >
                    [{clan.tag}]
                  </span>{' '}
                  đánh bại{' '}
                  <span className="text-amber-500 dark:text-amber-300 underline decoration-amber-500/40 underline-offset-4">
                    {currentVictory.name}
                  </span>
                  !
                </h2>

                {currentVictory.contributors?.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-[11px] font-bold ui-dim">Người chơi hợp sức:</span>
                    {currentVictory.contributors.map((c: any) => (
                      <Link
                        key={c.id}
                        href={`/profile/${c.username}`}
                        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl text-xs font-bold border bg-black/20 hover:bg-black/30 transition-colors"
                        style={{ borderColor: 'var(--border-subtle)' }}
                      >
                        <UserDisplayName user={c} showClanTag={false} />
                        <span className="text-[10px] font-mono text-emerald-400">
                          ({c.bestSegment})
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {completedLevels.length > 1 && (
              <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                <button
                  type="button"
                  onClick={() =>
                    setVictoryIdx(
                      (prev) => (prev - 1 + completedLevels.length) % completedLevels.length
                    )
                  }
                  className="p-2 rounded-xl border ui-subtle hover:opacity-80 cursor-pointer"
                  style={{ borderColor: 'var(--border-ui)' }}
                  title="Level trước"
                >
                  <ChevronLeft className="w-4 h-4 ui-title" />
                </button>
                <span className="text-xs font-mono font-bold px-2 ui-dim">
                  {(victoryIdx % completedLevels.length) + 1}/{completedLevels.length}
                </span>
                <button
                  type="button"
                  onClick={() => setVictoryIdx((prev) => (prev + 1) % completedLevels.length)}
                  className="p-2 rounded-xl border ui-subtle hover:opacity-80 cursor-pointer"
                  style={{ borderColor: 'var(--border-ui)' }}
                  title="Level tiếp"
                >
                  <ChevronRight className="w-4 h-4 ui-title" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. PINNED CLAN LEVEL CO-OP & APPROVAL CARD */}
      {showCoopCard && (
        <div
          className="ui-card rounded-3xl border overflow-hidden shadow-xl"
          style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
        >
          {/* Card Header */}
          <div
            className="px-5 py-3.5 border-b flex items-center justify-between gap-3 flex-wrap"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 12%, var(--bg-card))',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <Pin className="w-4 h-4 text-sky-400 rotate-45" />
              <h2 className="text-sm font-black uppercase tracking-wider ui-title">
                {isEn ? 'Pinned Clan Co-op Level' : 'Level Ghim Của Clan (Co-op)'}
              </h2>
              {pinnedLevel?.isCompleted && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  100% Hoàn thành
                </span>
              )}
            </div>

            {isMember && (
              <div className="flex items-center gap-2 flex-wrap">
                {pinnedLevel && (
                  <button
                    type="button"
                    onClick={() => setShowRunModal(true)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] flex items-center gap-1.5 cursor-pointer shadow-sm transition-transform active:scale-95"
                    style={{ backgroundColor: 'var(--accent)' }}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Nộp đoạn %</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowLevelModal(true)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer hover:border-sky-400/50 transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--text-title)',
                  }}
                >
                  <Layers className="w-3.5 h-3.5 text-sky-400" />
                  <span>
                    {isLeader
                      ? 'Chọn / Ghim Level'
                      : canManageClan
                      ? 'Duyệt / Thêm Level Clan'
                      : 'Đề xuất Level Clan'}
                  </span>
                  {canManageClan && pendingLevels.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-black">
                      {pendingLevels.length}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Card Body */}
          <div className="p-5 space-y-5">
            {pinnedLevel ? (
              <>
                {/* Level Info & Coverage Bar */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-lg sm:text-xl font-black ui-title">
                          {pinnedLevel.name}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-mono font-bold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                          ID: {pinnedLevel.gdLevelId}
                        </span>
                        <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                          {pinnedLevel.difficulty}
                        </span>
                      </div>
                      <p className="text-xs ui-dim mt-0.5">
                        Creator: <strong className="ui-title">{pinnedLevel.creator}</strong>
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <span className="text-[11px] font-bold uppercase tracking-wider ui-dim block">
                        Tổng tiến độ ghép đoạn
                      </span>
                      <span className="font-mono text-xl font-black text-emerald-400">
                        {pinnedLevel.coveragePercent}%{' '}
                        <span className="text-xs ui-dim font-normal">/ 100%</span>
                      </span>
                    </div>
                  </div>

                  {/* Segmented 0-100% Visual Coverage Bar */}
                  <div className="space-y-1.5">
                    <div
                      className="relative w-full h-5 rounded-xl overflow-hidden border bg-black/50"
                      style={{ borderColor: 'var(--border-ui)' }}
                    >
                      {(pinnedLevel.mergedIntervals || []).map(
                        (seg: { start: number; end: number }, idx: number) => (
                          <div
                            key={idx}
                            className="absolute top-0 bottom-0 bg-gradient-to-r from-sky-500 via-emerald-400 to-amber-400 transition-all duration-500"
                            style={{
                              left: `${seg.start}%`,
                              width: `${Math.max(0, seg.end - seg.start)}%`,
                            }}
                            title={`${seg.start}% – ${seg.end}%`}
                          />
                        )
                      )}
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono ui-dim">
                      <span>0%</span>
                      <span>25%</span>
                      <span>50%</span>
                      <span>75%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>

                {/* Approved Runs List */}
                <div className="space-y-2">
                  <div className="text-xs font-bold ui-title flex items-center justify-between">
                    <span>
                      Các đoạn % đã được duyệt ({pinnedLevel.approvedRuns?.length || 0})
                    </span>
                  </div>

                  {pinnedLevel.approvedRuns?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {pinnedLevel.approvedRuns.map((run: any) => (
                        <div
                          key={run.id}
                          className="p-3 rounded-2xl border flex items-center justify-between gap-2"
                          style={{
                            backgroundColor: 'var(--bg-subtle)',
                            borderColor: 'var(--border-subtle)',
                          }}
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                {run.startPercent}–{run.endPercent}%
                              </span>
                              <Link
                                href={`/profile/${run.user?.username}`}
                                className="text-xs font-bold ui-title truncate hover:underline"
                              >
                                <UserDisplayName user={run.user} showClanTag={false} />
                              </Link>
                            </div>
                            {run.note && (
                              <p className="text-[11px] ui-dim truncate mt-1">{run.note}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <a
                              href={run.videoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 rounded-lg border ui-dim hover:text-sky-400 transition-colors"
                              style={{ borderColor: 'var(--border-ui)' }}
                              title="Xem video minh chứng"
                            >
                              <Video className="w-3.5 h-3.5" />
                            </a>
                            {canManageClan && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRun(pinnedLevel.id, run.id)}
                                disabled={busyActionId === `delrun:${run.id}`}
                                className="p-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 cursor-pointer"
                                title="Xoá đoạn này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="p-4 rounded-2xl border text-center text-xs ui-dim"
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      Chưa có đoạn % nào được duyệt. Hãy bấm &ldquo;Nộp đoạn %&rdquo; để đóng góp tiến độ đầu tiên cho Clan!
                    </div>
                  )}
                </div>

                {/* Pending Runs Queue (Leader / Mod view or Submitter's own pending runs) */}
                {pinnedLevel.pendingRuns?.length > 0 && (
                  <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span>
                        {canManageClan
                          ? `Đoạn % đang chờ Leader / Mod duyệt (${pinnedLevel.pendingRuns.length})`
                          : `Đoạn % bạn đã nộp đang chờ duyệt (${pinnedLevel.pendingRuns.length})`}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {pinnedLevel.pendingRuns.map((run: any) => (
                        <div
                          key={run.id}
                          className="p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                          style={{
                            backgroundColor: 'var(--bg-card)',
                            borderColor: 'var(--border-ui)',
                          }}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded-lg text-xs font-mono font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                {run.startPercent}–{run.endPercent}%
                              </span>
                              <Link
                                href={`/profile/${run.user?.username}`}
                                className="text-xs font-bold ui-title hover:underline"
                              >
                                <UserDisplayName user={run.user} showClanTag={false} />
                              </Link>
                              <a
                                href={run.videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-bold text-sky-400 hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>Xem Video Proof</span>
                              </a>
                            </div>
                            {run.note && <p className="text-[11px] ui-dim">{run.note}</p>}
                          </div>

                          {canManageClan && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  handleLevelAction(pinnedLevel.id, {
                                    action: 'approve_run',
                                    runId: run.id,
                                  })
                                }
                                disabled={
                                  busyActionId === `${pinnedLevel.id}:approve_run:${run.id}`
                                }
                                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Duyệt</span>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  handleLevelAction(pinnedLevel.id, {
                                    action: 'reject_run',
                                    runId: run.id,
                                  })
                                }
                                disabled={
                                  busyActionId === `${pinnedLevel.id}:reject_run:${run.id}`
                                }
                                className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Từ chối</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-6 text-center space-y-2">
                <Pin className="w-8 h-8 ui-dim opacity-40 mx-auto" />
                <div className="text-sm font-bold ui-title">
                  Clan chưa ghim level Co-op nào
                </div>
                <p className="text-xs ui-dim max-w-md mx-auto">
                  {isLeader
                    ? 'Hãy bấm "Chọn / Ghim Level" để chọn một level cho toàn bộ thành viên trong Clan cùng hợp sức chinh phục (0–100%)!'
                    : 'Thành viên có thể đề xuất level cho Clan để Leader chọn ghim và cùng nhau chinh phục.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: SUBMIT RUN SEGMENT */}
      {showRunModal && pinnedLevel && (
        <div
          className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowRunModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl border p-6 space-y-4 shadow-2xl"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between border-b pb-3"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <h3 className="text-base font-extrabold ui-title">
                  Nộp đoạn % — {pinnedLevel.name}
                </h3>
                <p className="text-xs ui-dim">
                  Leader hoặc Moderator của Clan sẽ duyệt để cộng vào thanh tiến độ chung.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRunModal(false)}
                className="p-1.5 rounded-xl border ui-dim cursor-pointer"
                style={{ borderColor: 'var(--border-ui)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitRun} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold ui-dim block mb-1">
                    Từ % (Bắt đầu)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={99}
                    value={startPercent}
                    onChange={(e) => setStartPercent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm font-mono font-bold border outline-none"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border-ui)',
                      color: 'var(--text-title)',
                    }}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold ui-dim block mb-1">
                    Đến % (Kết thúc)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={endPercent}
                    onChange={(e) => setEndPercent(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-sm font-mono font-bold border outline-none"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      borderColor: 'var(--border-ui)',
                      color: 'var(--text-title)',
                    }}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold ui-dim block mb-1">
                  Link Video Proof (YouTube / HTTPS)
                </label>
                <input
                  type="url"
                  value={runVideoUrl}
                  onChange={(e) => setRunVideoUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-3 py-2 rounded-xl text-xs font-medium border outline-none"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--text-title)',
                  }}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold ui-dim block mb-1">
                  Ghi chú (tuỳ chọn)
                </label>
                <input
                  type="text"
                  value={runNote}
                  onChange={(e) => setRunNote(e.target.value)}
                  placeholder="VD: 240fps, đoạn wave cuối..."
                  className="w-full px-3 py-2 rounded-xl text-xs font-medium border outline-none"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--text-title)',
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRunModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold border ui-dim cursor-pointer"
                  style={{ borderColor: 'var(--border-ui)' }}
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  disabled={submittingRun}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {submittingRun && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Gửi duyệt</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CLAN LEVEL MANAGER (PROPOSE / APPROVE / PIN LEVEL) */}
      {showLevelModal && (
        <div
          className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setShowLevelModal(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-3xl border p-6 space-y-5 shadow-2xl"
            style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between border-b pb-3"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div>
                <h3 className="text-base font-extrabold ui-title">
                  {isLeader
                    ? 'Quản lý & Chọn Level Ghim cho Clan'
                    : canManageClan
                    ? 'Duyệt & Thêm Level cho Clan'
                    : 'Đề xuất Level cho Clan'}
                </h3>
                <p className="text-xs ui-dim">
                  Nhập bất kỳ GD Level ID nào. Leader và Mod duyệt level cho riêng Clan, Leader chọn level ghim.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLevelModal(false)}
                className="p-1.5 rounded-xl border ui-dim cursor-pointer"
                style={{ borderColor: 'var(--border-ui)' }}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form to Add / Propose Level */}
            <form
              onSubmit={handleCreateOrProposeLevel}
              className="p-4 rounded-2xl border space-y-3"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-subtle)',
              }}
            >
              <div className="text-xs font-bold ui-title flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-sky-400" />
                <span>
                  {canManageClan ? 'Thêm Level mới vào Clan' : 'Đề xuất Level mới cho Clan'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-5 flex gap-1.5">
                  <input
                    type="text"
                    value={gdLevelIdInput}
                    onChange={(e) => setGdLevelIdInput(e.target.value)}
                    placeholder="GD Level ID (VD: 10565740)"
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl text-xs font-mono font-bold border outline-none"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-ui)',
                      color: 'var(--text-title)',
                    }}
                    required
                  />
                  <button
                    type="button"
                    onClick={handleLookupGdLevel}
                    disabled={fetchingGd}
                    className="px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer flex items-center gap-1 shrink-0 hover:border-sky-400/50"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-ui)',
                      color: 'var(--text-title)',
                    }}
                    title="Tra cứu tự động từ GD Server"
                  >
                    {fetchingGd ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5 text-sky-400" />
                    )}
                    <span>Tìm</span>
                  </button>
                </div>

                <div className="sm:col-span-4">
                  <input
                    type="text"
                    value={levelNameInput}
                    onChange={(e) => setLevelNameInput(e.target.value)}
                    placeholder="Tên Level (tự động hoặc tự nhập)"
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold border outline-none"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-ui)',
                      color: 'var(--text-title)',
                    }}
                  />
                </div>

                <div className="sm:col-span-3">
                  <input
                    type="text"
                    value={creatorInput}
                    onChange={(e) => setCreatorInput(e.target.value)}
                    placeholder="Creator"
                    className="w-full px-3 py-2 rounded-xl text-xs font-semibold border outline-none"
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      borderColor: 'var(--border-ui)',
                      color: 'var(--text-title)',
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
                {isLeader ? (
                  <label className="flex items-center gap-2 text-xs font-bold ui-title cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pinNowInput}
                      onChange={(e) => setPinNowInput(e.target.checked)}
                      className="rounded"
                    />
                    <span>Ghim level này ngay sau khi thêm</span>
                  </label>
                ) : (
                  <span className="text-[11px] ui-dim">
                    {canManageClan
                      ? 'Level sẽ được duyệt ngay vào danh sách Clan.'
                      : 'Level đề xuất sẽ chờ Leader hoặc Mod của Clan duyệt.'}
                  </span>
                )}

                <button
                  type="submit"
                  disabled={submittingLevel}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-[color:var(--accent-fg)] cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  style={{ backgroundColor: 'var(--accent)' }}
                >
                  {submittingLevel && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>
                    {isLeader && pinNowInput
                      ? 'Thêm & Ghim ngay'
                      : canManageClan
                      ? 'Thêm vào Clan'
                      : 'Gửi đề xuất'}
                  </span>
                </button>
              </div>
            </form>

            {/* Pending Proposed Levels Queue (for Leader / Mod) */}
            {canManageClan && pendingLevels.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
                  Level đề xuất chờ duyệt ({pendingLevels.length})
                </h4>
                <div className="space-y-2">
                  {pendingLevels.map((lvl: any) => (
                    <div
                      key={lvl.id}
                      className="p-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between gap-3 flex-wrap"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm ui-title">{lvl.name}</span>
                          <span className="text-xs font-mono ui-dim">ID: {lvl.gdLevelId}</span>
                          <span className="text-xs ui-dim">• bởi {lvl.creator}</span>
                        </div>
                        {lvl.proposedBy && (
                          <div className="text-[11px] ui-dim">
                            Đề xuất bởi:{' '}
                            <UserDisplayName user={lvl.proposedBy} showClanTag={false} />
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleLevelAction(lvl.id, { action: 'approve_level' })
                          }
                          disabled={busyActionId === `${lvl.id}:approve_level:`}
                          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Duyệt</span>
                        </button>
                        {isLeader && (
                          <button
                            type="button"
                            onClick={() => handleLevelAction(lvl.id, { action: 'pin' })}
                            disabled={busyActionId === `${lvl.id}:pin:`}
                            className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Pin className="w-3.5 h-3.5" />
                            <span>Duyệt & Ghim</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() =>
                            handleLevelAction(lvl.id, { action: 'reject_level' })
                          }
                          disabled={busyActionId === `${lvl.id}:reject_level:`}
                          className="px-3 py-1.5 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-400 border border-red-500/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Từ chối</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approved Clan Levels List (Leader can Pin/Unpin) */}
            <div className="space-y-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider ui-dim">
                Danh sách Level của Clan ({approvedLevels.length})
              </h4>
              {approvedLevels.length > 0 ? (
                <div className="space-y-2">
                  {approvedLevels.map((lvl: any) => (
                    <div
                      key={lvl.id}
                      className="p-3 rounded-2xl border flex items-center justify-between gap-3 flex-wrap"
                      style={{
                        backgroundColor: 'var(--bg-subtle)',
                        borderColor: lvl.isPinned ? 'var(--accent)' : 'var(--border-subtle)',
                      }}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm ui-title">{lvl.name}</span>
                          <span className="text-xs font-mono ui-dim">ID: {lvl.gdLevelId}</span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400">
                            {lvl.coveragePercent}%
                          </span>
                          {lvl.isPinned && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-sky-500/20 text-sky-400 border border-sky-500/30">
                              Đang ghim
                            </span>
                          )}
                          {lvl.isCompleted && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Đã đánh bại
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] ui-dim">
                          Creator: {lvl.creator} • {lvl.difficulty}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {isLeader && (
                          lvl.isPinned ? (
                            <button
                              type="button"
                              onClick={() => handleLevelAction(lvl.id, { action: 'unpin' })}
                              disabled={busyActionId === `${lvl.id}:unpin:`}
                              className="px-3 py-1.5 rounded-xl border text-xs font-bold ui-dim hover:opacity-100 cursor-pointer"
                              style={{ borderColor: 'var(--border-ui)' }}
                            >
                              Bỏ ghim
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleLevelAction(lvl.id, { action: 'pin' })}
                              disabled={busyActionId === `${lvl.id}:pin:`}
                              className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Pin className="w-3.5 h-3.5" />
                              <span>Chọn Ghim</span>
                            </button>
                          )
                        )}
                        {canManageClan && (
                          <button
                            type="button"
                            onClick={() => handleDeleteLevel(lvl.id)}
                            disabled={busyActionId === `dellvl:${lvl.id}`}
                            className="p-1.5 rounded-xl border border-red-500/30 text-red-400 hover:bg-red-500/10 cursor-pointer"
                            title="Xoá level khỏi Clan"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-2xl border text-center text-xs ui-dim" style={{ borderColor: 'var(--border-subtle)' }}>
                  Chưa có level nào trong danh sách Clan.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
