'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTheme } from './ThemeProvider';

export interface TabOption<T extends string> {
  id: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
}

interface AnimatedTabsProps<T extends string> {
  options: TabOption<T>[];
  active: T;
  onChange: (id: T) => void;
  className?: string;
  tabClassName?: string;
  themeOverride?: string;
}

export function AnimatedTabs<T extends string>({
  options,
  active,
  onChange,
  className = '',
  tabClassName = '',
  themeOverride,
}: AnimatedTabsProps<T>) {
  const { theme } = useTheme();
  const isLavender = (themeOverride || theme) === 'lavender';
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement | null>(null);

  const measureTab = () => {
    if (!containerRef.current || !activeTabRef.current) return;
    const targetLeft = activeTabRef.current.offsetLeft;
    const targetTop = activeTabRef.current.offsetTop;
    const tabWidth = activeTabRef.current.offsetWidth;
    const tabHeight = activeTabRef.current.offsetHeight;
    if (tabWidth > 0) {
      setIndicatorStyle({ left: targetLeft, top: targetTop, width: tabWidth, height: tabHeight });
    }
  };

  // Update indicator position with stretch-and-slide animation
  useEffect(() => {
    if (!containerRef.current || !activeTabRef.current) return;

    const targetLeft = activeTabRef.current.offsetLeft;
    const targetTop = activeTabRef.current.offsetTop;
    const tabWidth = activeTabRef.current.offsetWidth;
    const tabHeight = activeTabRef.current.offsetHeight;

    if (tabWidth === 0) return;

    // If first measurement
    if (indicatorStyle.width === 0) {
      setIndicatorStyle({ left: targetLeft, top: targetTop, width: tabWidth, height: tabHeight });
      return;
    }

    const currentLeft = indicatorStyle.left;
    const distance = Math.abs(targetLeft - currentLeft);

    setIsAnimating(true);

    if (targetLeft > currentLeft) {
      setIndicatorStyle(prev => ({ ...prev, top: targetTop, height: tabHeight, width: tabWidth + distance }));
    } else {
      setIndicatorStyle({ left: targetLeft, top: targetTop, height: tabHeight, width: tabWidth + distance });
    }

    const timer1 = setTimeout(() => {
      setIndicatorStyle({ left: targetLeft, top: targetTop, height: tabHeight, width: tabWidth });
      const timer2 = setTimeout(() => setIsAnimating(false), 200);
      return () => clearTimeout(timer2);
    }, 70);

    return () => clearTimeout(timer1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, isLavender, options]);

  // Initial and resize listener
  useEffect(() => {
    const handleResize = () => measureTab();
    const t = setTimeout(measureTab, 50);
    window.addEventListener('resize', handleResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', handleResize);
    };
  }, [isLavender, options]);

  if (!isLavender) {
    // Standard look for other themes
    return (
      <div 
        ref={containerRef}
        className={`relative flex flex-wrap sm:flex-nowrap items-center gap-1 p-1 rounded-xl sm:rounded-2xl border max-w-full ${className}`} 
        style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}
      >
        {indicatorStyle.width > 0 && (
          <div 
            className="absolute rounded-xl transition-all duration-200 ease-out pointer-events-none"
            style={{ 
              left: `${indicatorStyle.left}px`, 
              top: `${indicatorStyle.top}px`,
              width: `${indicatorStyle.width}px`,
              height: `${indicatorStyle.height}px`,
              backgroundColor: 'var(--bg-card)',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
            }}
          />
        )}
        {options.map((opt) => {
          const isActive = active === opt.id;
          return (
            <button
              key={opt.id}
              ref={isActive ? activeTabRef : null}
              onClick={() => onChange(opt.id)}
              className={`relative z-[1] flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg sm:rounded-xl text-xs font-bold transition-colors cursor-pointer flex-1 ${tabClassName}`}
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-dim)',
              }}
            >
              {opt.icon}
              {opt.label}
            </button>
          );
        })}
      </div>
    );
  }

  // Tsumiki / Lavender Look
  return (
    <div 
      ref={containerRef}
      className={`relative flex flex-wrap sm:flex-nowrap gap-1 sm:gap-2 p-1.5 sm:p-2.5 bg-white rounded-2xl sm:rounded-[32px] shadow-[0_8px_24px_rgba(0,0,0,0.1)] max-w-full ${className}`}
      style={{ backgroundColor: 'var(--bg-card)' }}
    >
      <div 
        className={`absolute rounded-[20px] z-[1] transition-all duration-250 ease-[cubic-bezier(0.19,1,0.22,1)] tsumiki-indicator ${isAnimating ? "is-moving" : ""}`}
        style={{ 
          left: `${indicatorStyle.left}px`, 
          top: `${indicatorStyle.top}px`,
          width: `${indicatorStyle.width}px`,
          height: `${indicatorStyle.height}px`,
          backgroundColor: 'transparent',
          opacity: indicatorStyle.width > 0 ? 1 : 0
        }}
      >
        <span className="tsumiki-front" />
      </div>

      {options.map((opt) => {
        const isActive = active === opt.id;
        return (
          <button
            key={opt.id}
            ref={isActive ? activeTabRef : null}
            onClick={() => !isAnimating && onChange(opt.id)}
            className={`relative flex-1 flex items-center justify-center gap-1 px-2.5 py-2 sm:px-4 sm:py-3 min-w-fit sm:min-w-[70px] min-h-[38px] sm:min-h-[46px] h-full leading-tight text-center rounded-xl sm:rounded-[20px] font-bold text-xs sm:text-sm z-[2] transition-all duration-250 ease-[cubic-bezier(0.19,1,0.22,1)] cursor-pointer select-none ${isActive ? "-translate-y-[5px] sm:-translate-y-[7px] text-white" : "text-gray-400 hover:text-gray-600"} ${tabClassName}`}
            style={!isActive ? { color: 'var(--text-dim)' } : {}}
          >
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}





