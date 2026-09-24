'use client';

import React, { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Flame,
  Gamepad2,
  Plus,
  ArrowDownRight,
  ArrowUpDown,
  Trash2,
  Sparkles,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

export type ChangeLogEntry = {
  id: string;
  list: 'DEMON' | 'PEMON';
  eventType: 'LEVEL_ADDED' | 'LEVEL_REMOVED' | 'LEVEL_MOVED' | 'LEVEL_DROPPED' | 'RATING_UPDATED';
  gdLevelId: number;
  levelName: string;
  oldPlacement?: number | null;
  newPlacement?: number | null;
  aboveLevelName?: string | null;
  belowLevelName?: string | null;
  pushedOutLevelName?: string | null;
  causedByLevelName?: string | null;
  causedByPlacement?: number | null;
  oldRating?: string | null;
  newRating?: string | null;
  details?: string | null;
  createdAt: string;
};

export default function ChangeLogTab() {
  const { t } = useLanguage();
  const [activeSubTab, setActiveSubTab] = useState<'DEMON' | 'PEMON'>('DEMON');
  const [logs, setLogs] = useState<ChangeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);

  const fetchLogs = async (targetList: 'DEMON' | 'PEMON', targetPage: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/changelog?list=${targetList}&page=${targetPage}&limit=25`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
        setTotalLogs(data.total || 0);
      } else {
        setLogs([]);
      }
    } catch (e) {
      console.error('Error fetching changelog:', e);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(activeSubTab, page);
  }, [activeSubTab, page]);

  const handleSubTabChange = (list: 'DEMON' | 'PEMON') => {
    if (list === activeSubTab) return;
    setActiveSubTab(list);
    setPage(1);
  };

  // Group logs by Date (DD/MM/YYYY)
  const groupedLogs = useMemo(() => {
    const groups: { [dateStr: string]: ChangeLogEntry[] } = {};
    for (const log of logs) {
      const d = new Date(log.createdAt);
      const dateStr = d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
      if (!groups[dateStr]) groups[dateStr] = [];
      groups[dateStr].push(log);
    }
    return groups;
  }, [logs]);

  const formatDateLabel = (dateStr: string) => {
    const today = new Date().toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    if (dateStr === today) return 'Hôm nay';
    if (dateStr === yesterday) return 'Hôm qua';
    return dateStr;
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      {/* Sub-tab Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Toggle Demon / Pemon */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl border w-fit"
          style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
        >
          <button
            type="button"
            onClick={() => handleSubTabChange('DEMON')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: activeSubTab === 'DEMON' ? 'var(--bg-card)' : 'transparent',
              color: activeSubTab === 'DEMON' ? 'var(--accent)' : 'var(--text-dim)',
              boxShadow: activeSubTab === 'DEMON' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <Flame className="w-3.5 h-3.5" />
            Demon List
          </button>
          <button
            type="button"
            onClick={() => handleSubTabChange('PEMON')}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer"
            style={{
              backgroundColor: activeSubTab === 'PEMON' ? 'var(--bg-card)' : 'transparent',
              color: activeSubTab === 'PEMON' ? 'var(--accent)' : 'var(--text-dim)',
              boxShadow: activeSubTab === 'PEMON' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            Pemon List
          </button>
        </div>

        {/* Counter & Refresh */}
        <div className="flex items-center gap-3 text-xs ui-dim">
          <span>
            Tổng cộng: <strong className="ui-title">{totalLogs}</strong> sự kiện
          </span>
          <button
            type="button"
            onClick={() => fetchLogs(activeSubTab, page)}
            className="p-1.5 rounded-lg border transition-all hover:opacity-80 cursor-pointer"
            style={{ borderColor: 'var(--border-ui)', backgroundColor: 'var(--bg-card)' }}
            title="Làm mới nhật ký"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto" style={{ color: 'var(--accent)' }} />
          <p className="text-xs ui-dim">Đang tải nhật ký thay đổi...</p>
        </div>
      ) : Object.keys(groupedLogs).length === 0 ? (
        <div
          className="p-12 rounded-2xl border text-center space-y-2"
          style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
        >
          <Clock className="w-8 h-8 mx-auto ui-dim" />
          <p className="text-sm font-bold ui-title">Chưa có thay đổi nào được ghi nhận</p>
          <p className="text-xs ui-dim max-w-sm mx-auto">
            Các thay đổi về xếp hạng, thêm màn chơi, vị trí top 150 và rating sẽ tự động được lưu lại tại đây.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedLogs).map(([dateStr, items]) => (
            <div key={dateStr} className="space-y-3">
              {/* Date Header Badge */}
              <div className="flex items-center gap-2">
                <span
                  className="px-3 py-1 rounded-full text-[11px] font-extrabold tracking-wide uppercase border shadow-2xs"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    borderColor: 'var(--border-ui)',
                    color: 'var(--accent)',
                  }}
                >
                  📅 {formatDateLabel(dateStr)} ({dateStr})
                </span>
                <div className="h-px flex-1" style={{ backgroundColor: 'var(--border-ui)' }} />
              </div>

              {/* Items Card List */}
              <div
                className="rounded-2xl border divide-y overflow-hidden shadow-xs"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderColor: 'var(--border-ui)',
                }}
              >
                {items.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
                  >
                    <div className="flex items-start sm:items-center gap-3">
                      {/* Event Icon Badge */}
                      <div className="shrink-0 mt-0.5 sm:mt-0">
                        {log.eventType === 'LEVEL_ADDED' && (
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
                            style={{ backgroundColor: '#22c55e18', color: '#16a34a' }}
                            title="Thêm Level Mới"
                          >
                            <Plus className="w-4 h-4" />
                          </div>
                        )}
                        {log.eventType === 'LEVEL_REMOVED' && (
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
                            style={{ backgroundColor: '#ef444418', color: '#ef4444' }}
                            title="Đẩy khỏi Top 150"
                          >
                            <ArrowDownRight className="w-4 h-4" />
                          </div>
                        )}
                        {log.eventType === 'LEVEL_MOVED' && (
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
                            style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}
                            title="Thay đổi vị trí"
                          >
                            <ArrowUpDown className="w-4 h-4" />
                          </div>
                        )}
                        {log.eventType === 'LEVEL_DROPPED' && (
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
                            style={{ backgroundColor: '#ef444418', color: '#ef4444' }}
                            title="Gỡ khỏi danh sách"
                          >
                            <Trash2 className="w-4 h-4" />
                          </div>
                        )}
                        {log.eventType === 'RATING_UPDATED' && (
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs"
                            style={{ backgroundColor: '#f59e0b18', color: '#d97706' }}
                            title="Cập nhật rating"
                          >
                            <Sparkles className="w-4 h-4" />
                          </div>
                        )}
                      </div>

                      {/* Content details */}
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Level Name Link */}
                          <Link
                            href={`/levels/${log.gdLevelId}`}
                            className="font-bold text-sm hover:underline flex items-center gap-1 ui-title"
                          >
                            {log.levelName}
                            <ExternalLink className="w-3 h-3 ui-dim inline" />
                          </Link>

                          {/* Primary Event Badge */}
                          {log.eventType === 'LEVEL_ADDED' && log.newPlacement && (
                            <span
                              className="px-2 py-0.5 rounded-md text-[11px] font-extrabold tracking-tight"
                              style={{ backgroundColor: 'var(--accent-bg)', color: 'var(--accent-text)' }}
                            >
                              Top #{log.newPlacement}
                            </span>
                          )}

                          {log.eventType === 'LEVEL_MOVED' && log.oldPlacement && log.newPlacement && (
                            <span
                              className="px-2 py-0.5 rounded-md text-[11px] font-extrabold tracking-tight flex items-center gap-1"
                              style={{
                                backgroundColor:
                                  log.newPlacement < log.oldPlacement ? '#22c55e15' : '#ef444415',
                                color: log.newPlacement < log.oldPlacement ? '#16a34a' : '#ef4444',
                              }}
                            >
                              #{log.oldPlacement} → #{log.newPlacement}{' '}
                              {log.newPlacement < log.oldPlacement
                                ? `(▲ ${log.oldPlacement - log.newPlacement})`
                                : `(▼ ${log.newPlacement - log.oldPlacement})`}
                            </span>
                          )}

                          {log.eventType === 'LEVEL_REMOVED' && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold tracking-tight bg-red-500/10 text-red-600 dark:text-red-400">
                              Rớt khỏi Top 150
                            </span>
                          )}

                          {log.eventType === 'LEVEL_DROPPED' && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold tracking-tight bg-red-500/10 text-red-600 dark:text-red-400">
                              Đã gỡ khỏi list
                            </span>
                          )}

                          {log.eventType === 'RATING_UPDATED' && (
                            <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold tracking-tight bg-amber-500/10 text-amber-600 dark:text-amber-400">
                              Rating: {log.oldRating || 'None'} → {log.newRating || 'None'}
                            </span>
                          )}
                        </div>

                        {/* Description / Secondary text */}
                        <div className="text-xs ui-dim flex flex-wrap items-center gap-x-2 gap-y-1">
                          {log.eventType === 'LEVEL_ADDED' && (
                            <>
                              {log.newPlacement === 1 ? (
                                log.belowLevelName && (
                                  <span>
                                    Đứng trên <strong className="ui-title">{log.belowLevelName}</strong> (#2)
                                  </span>
                                )
                              ) : log.newPlacement === 150 ? (
                                log.aboveLevelName && (
                                  <span>
                                    Đứng dưới <strong className="ui-title">{log.aboveLevelName}</strong> (#149)
                                  </span>
                                )
                              ) : (
                                <>
                                  {log.aboveLevelName && (
                                    <span>
                                      Đứng dưới <strong className="ui-title">{log.aboveLevelName}</strong> (#{log.newPlacement! - 1})
                                    </span>
                                  )}
                                  {log.aboveLevelName && log.belowLevelName && <span>•</span>}
                                  {log.belowLevelName && (
                                    <span>
                                      Đứng trên <strong className="ui-title">{log.belowLevelName}</strong> (#{log.newPlacement! + 1})
                                    </span>
                                  )}
                                </>
                              )}

                              {/* Pushed out level notice */}
                              {log.pushedOutLevelName && (
                                <span className="inline-flex items-center gap-1 font-semibold text-rose-500">
                                  <span>•</span>
                                  <ShieldAlert className="w-3 h-3 inline" />
                                  Đẩy <strong className="underline">{log.pushedOutLevelName}</strong> khỏi top 150
                                </span>
                              )}
                            </>
                          )}

                          {log.eventType === 'LEVEL_REMOVED' && (
                            <span>
                              {log.causedByLevelName ? (
                                <>
                                  Bị đẩy ra khỏi top 150 bởi level mới{' '}
                                  <strong className="ui-title">{log.causedByLevelName}</strong>{' '}
                                  (vào #{log.causedByPlacement})
                                </>
                              ) : (
                                'Bị đẩy khỏi top 150 do thay đổi thứ hạng.'
                              )}
                            </span>
                          )}

                          {log.eventType === 'LEVEL_MOVED' && (
                            <span>
                              Đổi thứ hạng trên bảng xếp hạng {activeSubTab === 'DEMON' ? 'Demon List' : 'Pemon List'}.
                            </span>
                          )}

                          {log.eventType === 'LEVEL_DROPPED' && (
                            <span>
                              Màn chơi không còn thuộc danh sách xếp hạng.
                            </span>
                          )}

                          {log.eventType === 'RATING_UPDATED' && (
                            <span>
                              Thay đổi cấp độ đánh giá màn chơi.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Timestamp */}
                    <div className="shrink-0 text-[11px] font-mono ui-dim sm:text-right pl-10 sm:pl-0">
                      {formatTime(log.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
              >
                <ChevronLeft className="w-4 h-4" />
                Trước
              </button>

              <span className="text-xs font-bold ui-dim px-2">
                Trang {page} / {totalPages}
              </span>

              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all disabled:opacity-30 cursor-pointer disabled:cursor-not-allowed"
                style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
              >
                Sau
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
