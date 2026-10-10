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
}

export function AnimatedTabs<T extends string>({
  options,
  active,
  onChange,
  className = '',
  tabClassName = '',
}: AnimatedTabsProps<T>) {
  const { theme } = useTheme();
  const isLavender = theme === 'lavender';
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement | null>(null);

  // Update indicator position
  useEffect(() => {
    if (!isLavender || !containerRef.current || !activeTabRef.current) return;

    const targetLeft = activeTabRef.current.offsetLeft;
    const targetTop = activeTabRef.current.offsetTop;
    const tabWidth = activeTabRef.current.offsetWidth;
    const tabHeight = activeTabRef.current.offsetHeight;
    
    const currentLeft = indicatorStyle.width === 0 ? targetLeft : indicatorStyle.left;
    const distance = Math.abs(targetLeft - currentLeft);

    setIsAnimating(true);

    if (targetLeft > currentLeft) {
      setIndicatorStyle(prev => ({ ...prev, top: targetTop, height: tabHeight, width: tabWidth + distance }));
    } else {
      setIndicatorStyle({ left: targetLeft, top: targetTop, height: tabHeight, width: tabWidth + distance });
    }

    const timer1 = setTimeout(() => {
      setIndicatorStyle({ left: targetLeft, top: targetTop, height: tabHeight, width: tabWidth });
      const timer2 = setTimeout(() => setIsAnimating(false), 180);
      return () => clearTimeout(timer2);
    }, 80);

    return () => clearTimeout(timer1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, isLavender]);

  // Initial load position
  useEffect(() => {
    if (isLavender && activeTabRef.current && indicatorStyle.width === 0) {
      setIndicatorStyle({
        left: activeTabRef.current.offsetLeft,
        top: activeTabRef.current.offsetTop,
        width: activeTabRef.current.offsetWidth,
        height: activeTabRef.current.offsetHeight,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLavender]);

  if (!isLavender) {
    // Standard look for other themes
    return (
      <div className={`flex items-center gap-1.5 p-1 rounded-2xl border ${className}`} style={{ backgroundColor: 'var(--bg-subtle)', borderColor: 'var(--border-ui)' }}>
        {options.map((opt) => {
          const isActive = active === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => onChange(opt.id)}
              className={`flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex-1 ${tabClassName}`}
              style={{
                backgroundColor: isActive ? 'var(--bg-card)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-dim)',
                boxShadow: isActive ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
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
      className={`relative flex gap-2 p-3 bg-white rounded-[32px] shadow-[0_8px_24px_rgba(0,0,0,0.1)] ${className}`}
      style={{ backgroundColor: 'var(--bg-card)' }}
    >
      <div 
        className={`absolute rounded-[20px] z-[1] transition-all duration-250 ease-[cubic-bezier(0.19,1,0.22,1)] tsumiki-indicator ${isAnimating ? "is-moving" : ""}`}
        style={{ 
          left: `${indicatorStyle.left}px`, 
          top: `${indicatorStyle.top}px`,
          width: `${indicatorStyle.width}px`,
          height: `${indicatorStyle.height}px`,
          backgroundColor: 'transparent'
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
            className={`relative flex-1 flex items-center justify-center gap-1.5 px-4 py-3 min-w-[80px] min-h-[48px] h-full leading-tight text-center rounded-[20px] font-bold text-sm z-[2] transition-all duration-250 ease-[cubic-bezier(0.19,1,0.22,1)] cursor-pointer select-none ${isActive ? "-translate-y-[7px] text-white" : "text-gray-400 hover:text-gray-600"} ${tabClassName}`}
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





