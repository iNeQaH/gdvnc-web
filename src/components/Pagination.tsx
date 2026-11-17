'use client';

import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowRight,
  Hash,
} from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onJumpToRank?: (rank: number) => void;
  scrollToTopOnChange?: boolean;
  scrollTargetId?: string;
  showRankJump?: boolean;
  className?: string;
}

function getPaginationItems(current: number, total: number): (number | '...')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: (number | '...')[] = [];
  items.push(1);

  const left = Math.max(2, current - 1);
  const right = Math.min(total - 1, current + 1);

  const showLeftEllipsis = left > 2;
  const showRightEllipsis = right < total - 1;

  if (!showLeftEllipsis && showRightEllipsis) {
    // Current near beginning: 1, 2, 3, 4, ..., total
    const leftRange = [2, 3, 4].filter((p) => p < total);
    items.push(...leftRange);
    items.push('...');
    items.push(total);
  } else if (showLeftEllipsis && !showRightEllipsis) {
    // Current near end: 1, ..., total-3, total-2, total-1, total
    items.push('...');
    const rightRange = [total - 3, total - 2, total - 1].filter((p) => p > 1);
    items.push(...rightRange);
    items.push(total);
  } else {
    // Current in middle: 1, ..., current-1, current, current+1, ..., total
    items.push('...');
    items.push(current - 1, current, current + 1);
    items.push('...');
    items.push(total);
  }

  return items;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  onJumpToRank,
  scrollToTopOnChange = true,
  scrollTargetId,
  showRankJump = false,
  className = '',
}: PaginationProps) {
  const { t } = useLanguage();
  const [pageInput, setPageInput] = useState('');
  const [rankInput, setRankInput] = useState('');

  useEffect(() => {
    setPageInput('');
  }, [currentPage]);

  if (totalPages <= 1) return null;

  const handlePageSelect = (page: number) => {
    if (page < 1 || page > totalPages || page === currentPage) return;
    onPageChange(page);
    if (scrollToTopOnChange) {
      if (scrollTargetId) {
        const el = document.getElementById(scrollTargetId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = pageInput.trim();
    if (!val) return;

    if ((val.startsWith('#') || val.toLowerCase().startsWith('rank')) && onJumpToRank) {
      const rank = parseInt(val.replace(/[^0-9]/g, ''));
      if (!isNaN(rank)) {
        onJumpToRank(rank);
        setPageInput('');
        return;
      }
    }

    const p = parseInt(val, 10);
    if (!isNaN(p) && p >= 1 && p <= totalPages) {
      handlePageSelect(p);
      setPageInput('');
    }
  };

  const handleRankInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onJumpToRank) return;
    const r = parseInt(rankInput.replace(/[^0-9]/g, ''), 10);
    if (!isNaN(r) && r > 0) {
      onJumpToRank(r);
      setRankInput('');
    }
  };

  const paginationItems = getPaginationItems(currentPage, totalPages);

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2.5 py-2 px-1 text-xs select-none ${className}`}
    >
      {/* Group 1: Navigation Arrows & Page Numbers */}
      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
        {/* First Page Button (<<) */}
        <button
          type="button"
          onClick={() => handlePageSelect(1)}
          disabled={currentPage <= 1}
          className="p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/10"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-ui)',
            color: 'var(--text-title)',
          }}
          title="Trang đầu"
        >
          <ChevronsLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Previous Page Button (<) */}
        <button
          type="button"
          onClick={() => handlePageSelect(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/10"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-ui)',
            color: 'var(--text-title)',
          }}
          title={t('common.page_prev') || 'Trang trước'}
        >
          <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Page Number Buttons & Ellipsis */}
        <div className="flex items-center gap-1">
          {paginationItems.map((item, idx) => {
            if (item === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1.5 py-1 text-xs font-bold ui-dim"
                >
                  ...
                </span>
              );
            }

            const pageNum = item as number;
            const isCurrent = pageNum === currentPage;

            return (
              <button
                key={`page-${pageNum}`}
                type="button"
                onClick={() => handlePageSelect(pageNum)}
                className={`min-w-[28px] sm:min-w-[32px] h-7 sm:h-8 px-1.5 sm:px-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  isCurrent
                    ? 'shadow-md scale-105'
                    : 'border hover:bg-black/5 dark:hover:bg-white/10 ui-dim hover:text-foreground'
                }`}
                style={
                  isCurrent
                    ? {
                        backgroundColor: 'var(--accent)',
                        color: 'var(--accent-fg)',
                        borderColor: 'transparent',
                      }
                    : {
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--border-ui)',
                      }
                }
                title={`Trang ${pageNum}`}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Page Button (>) */}
        <button
          type="button"
          onClick={() => handlePageSelect(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/10"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-ui)',
            color: 'var(--text-title)',
          }}
          title={t('common.page_next') || 'Trang sau'}
        >
          <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>

        {/* Last Page Button (>>) */}
        <button
          type="button"
          onClick={() => handlePageSelect(totalPages)}
          disabled={currentPage >= totalPages}
          className="p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/10"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-ui)',
            color: 'var(--text-title)',
          }}
          title="Trang cuối"
        >
          <ChevronsRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      </div>

      {/* Group 2: Jump To Page (and optional Jump To Rank) */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Page Jump Form */}
        <form
          onSubmit={handlePageInputSubmit}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-ui)',
          }}
        >
          <span className="text-[11px] font-bold ui-dim whitespace-nowrap">
            {t('common.page_goto') || 'Trang'}:
          </span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={pageInput}
            onChange={(e) => setPageInput(e.target.value)}
            placeholder={currentPage.toString()}
            className="w-12 h-6 text-center text-xs font-bold rounded-md border focus:outline-none focus:ring-1 focus:ring-sky-500"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: 'var(--border-ui)',
              color: 'var(--text-title)',
            }}
          />
          <span className="text-[11px] font-bold ui-dim whitespace-nowrap">
            / {totalPages}
          </span>
          <button
            type="submit"
            className="p-1 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
            style={{ color: 'var(--accent)' }}
            title="Đến trang"
          >
            <ArrowRight className="w-3 h-3" />
          </button>
        </form>

        {/* Rank Jump Form (if provided) */}
        {showRankJump && onJumpToRank && (
          <form
            onSubmit={handleRankInputSubmit}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl border"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-ui)',
            }}
          >
            <Hash className="w-3 h-3 ui-dim" />
            <span className="text-[11px] font-bold ui-dim whitespace-nowrap">
              Hạng:
            </span>
            <input
              type="text"
              value={rankInput}
              onChange={(e) => setRankInput(e.target.value)}
              placeholder="#1..."
              className="w-14 h-6 text-center text-xs font-bold rounded-md border focus:outline-none focus:ring-1 focus:ring-sky-500"
              style={{
                backgroundColor: 'var(--bg-subtle)',
                borderColor: 'var(--border-ui)',
                color: 'var(--text-title)',
              }}
            />
            <button
              type="submit"
              className="p-1 rounded-md transition-colors hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              style={{ color: 'var(--accent)' }}
              title="Đến hạng"
            >
              <ArrowRight className="w-3 h-3" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
