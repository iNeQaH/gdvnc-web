'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUp, ArrowDown } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

interface FloatingNavProps {
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onJumpToRank?: (rank: number) => void;
  alwaysVisible?: boolean;
}

export default function FloatingNav({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  onJumpToRank,
  alwaysVisible = false,
}: FloatingNavProps) {
  const { t } = useLanguage();
  const [inputPage, setInputPage] = useState(currentPage.toString());
  const [isVisible, setIsVisible] = useState(true);
  const [atTop, setAtTop] = useState(true);
  const [pageLong, setPageLong] = useState(false);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInputPage(currentPage.toString());
  }, [currentPage]);

  useEffect(() => {
    const measure = () => {
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      setPageLong(maxScroll > 80);
      setAtTop(window.scrollY < 8 || maxScroll === 0 || window.scrollY / maxScroll < 0.5);
    };

    const bumpVisible = () => {
      if (alwaysVisible) {
        setIsVisible(true);
        return;
      }
      setIsVisible(true);
      if (idleTimer.current) clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setIsVisible(false), 3000);
    };

    const handleScroll = () => {
      measure();
      bumpVisible();
    };

    measure();
    bumpVisible();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', measure);
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [alwaysVisible]);

  const handleScrollToggle = () => {
    if (atTop) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentPage > 1 && onPageChange) onPageChange(currentPage - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNext = () => {
    if (currentPage < totalPages && onPageChange) onPageChange(currentPage + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleFirst = () => {
    if (onPageChange) onPageChange(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLast = () => {
    if (onPageChange) onPageChange(totalPages);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleInputSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const val = inputPage.trim();
      if (val.startsWith('#') || val.toLowerCase().startsWith('rank')) {
        const rank = parseInt(val.replace(/[^0-9]/g, ''));
        if (!isNaN(rank) && onJumpToRank) {
          onJumpToRank(rank);
          return;
        }
      }
      const p = parseInt(val);
      if (!isNaN(p) && p >= 1 && p <= totalPages && onPageChange) {
        onPageChange(p);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setInputPage(currentPage.toString());
      }
    }
  };

  const showPager = totalPages > 1;
  const showFirstPrev = showPager && currentPage > 1;
  const showNextLast = showPager && currentPage < totalPages;
  if (!pageLong && !showPager) return null;

  return (
    <div
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1.5 rounded-2xl shadow-xl border backdrop-blur-md transition-opacity duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}
      onMouseEnter={() => {
        if (idleTimer.current) clearTimeout(idleTimer.current);
        setIsVisible(true);
      }}
      onMouseLeave={() => {
        if (alwaysVisible) return;
        if (idleTimer.current) clearTimeout(idleTimer.current);
        idleTimer.current = setTimeout(() => setIsVisible(false), 3000);
      }}
    >
      <button
        onClick={handleScrollToggle}
        className="p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/10"
        title="Kéo lên/xuống"
      >
        {atTop ? <ArrowDown className="w-4 h-4 ui-title" /> : <ArrowUp className="w-4 h-4 ui-title" />}
      </button>

      {showPager && (
        <>
          <div className="w-px h-6 mx-0.5" style={{ backgroundColor: 'var(--border-ui)' }} />

          {showFirstPrev && (
            <>
              <button
                onClick={handleFirst}
                className="p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                title="Trang đầu"
              >
                <ChevronsLeft className="w-4 h-4 ui-title" />
              </button>
              <button
                onClick={handlePrev}
                className="p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                title={t('common.page_prev')}
              >
                <ChevronLeft className="w-4 h-4 ui-title" />
              </button>
            </>
          )}

          <div className="flex items-center gap-1 px-1">
            <input
              type="text"
              value={inputPage}
              onChange={(e) => setInputPage(e.target.value)}
              onKeyDown={handleInputSubmit}
              className="w-10 h-7 text-center rounded-lg text-xs font-bold border focus:outline-none"
              style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)', color: 'var(--text-title)' }}
              title={t('common.page_goto')}
            />
            <span className="text-xs font-bold ui-dim whitespace-nowrap">/ {totalPages}</span>
          </div>

          {showNextLast && (
            <>
              <button
                onClick={handleNext}
                className="p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                title={t('common.page_next')}
              >
                <ChevronRight className="w-4 h-4 ui-title" />
              </button>
              <button
                onClick={handleLast}
                className="p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                title="Trang cuối"
              >
                <ChevronsRight className="w-4 h-4 ui-title" />
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
