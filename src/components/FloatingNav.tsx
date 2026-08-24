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

export default function FloatingNav({ currentPage = 1, totalPages = 1, onPageChange, onJumpToRank, alwaysVisible = false }: FloatingNavProps) {
  const { t } = useLanguage();
  const [inputPage, setInputPage] = useState(currentPage.toString());
  const [isVisible, setIsVisible] = useState(alwaysVisible);
  const atTopRef = useRef(true);

  useEffect(() => {
    setInputPage(currentPage.toString());
  }, [currentPage]);

  useEffect(() => {
    if (alwaysVisible) {
      setIsVisible(true);
      return;
    }
    const handleScroll = () => {
      atTopRef.current = window.scrollY < 100;
      setIsVisible(window.scrollY > 200);
    };
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [alwaysVisible]);

  const handleScrollToggle = () => {
    if (atTopRef.current) {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
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

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 p-1.5 rounded-2xl shadow-xl border backdrop-blur-md"
         style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-ui)' }}>

      {/* Scroll toggle - separate on the left */}
      <button
        onClick={handleScrollToggle}
        className="p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/10"
        title="Kéo lên/xuống"
      >
        <ArrowUp className="w-4 h-4 ui-title" />
      </button>

      <div className="w-px h-6 mx-0.5" style={{ backgroundColor: 'var(--border-ui)' }} />

      {/* First page */}
      <button
        onClick={handleFirst}
        disabled={currentPage <= 1}
        className="p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
        title="Trang đầu"
      >
        <ChevronsLeft className="w-4 h-4 ui-title" />
      </button>

      {/* Prev page */}
      <button
        onClick={handlePrev}
        disabled={currentPage <= 1}
        className="p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
        title={t('common.page_prev')}
      >
        <ChevronLeft className="w-4 h-4 ui-title" />
      </button>

      {/* Page input + total */}
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

      {/* Next page */}
      <button
        onClick={handleNext}
        disabled={currentPage >= totalPages}
        className="p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
        title={t('common.page_next')}
      >
        <ChevronRight className="w-4 h-4 ui-title" />
      </button>

      {/* Last page */}
      <button
        onClick={handleLast}
        disabled={currentPage >= totalPages}
        className="p-2 rounded-xl transition-colors hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none"
        title="Trang cuối"
      >
        <ChevronsRight className="w-4 h-4 ui-title" />
      </button>

    </div>
  );
}
