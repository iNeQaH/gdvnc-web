'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { MapPin, Check, X, ChevronDown } from 'lucide-react';
import { LOCATION_OPTIONS, validateLocation } from '@/lib/location';

interface LocationPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function LocationPicker({ value, onChange, disabled }: LocationPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LOCATION_OPTIONS;
    return LOCATION_OPTIONS.filter((opt) => opt.toLowerCase().includes(q));
  }, [query]);

  const validation = useMemo(() => {
    return validateLocation(query);
  }, [query]);

  const handleSelect = (option: string) => {
    setQuery(option);
    onChange(option);
    setIsOpen(false);
  };

  const handleClear = () => {
    setQuery('');
    onChange('');
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setQuery(nextVal);
    onChange(nextVal);
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-rose-500/10 text-rose-500 shrink-0 border border-rose-500/20">
          <MapPin className="w-4 h-4" />
        </div>
        <div className="relative flex-1">
          <input
            type="text"
            disabled={disabled}
            value={query}
            onChange={handleInputChange}
            onFocus={() => setIsOpen(true)}
            placeholder="Chọn hoặc nhập: Tỉnh/Thành phố, Quốc gia..."
            className="w-full pl-3 pr-16 py-2 rounded-xl text-xs font-semibold border focus:ring-1 focus:ring-sky-500 outline-none transition-colors"
            style={{
              backgroundColor: 'var(--bg-subtle)',
              borderColor: query && !validation.ok ? '#ef4444' : 'var(--border-ui)',
              color: 'var(--text-title)',
            }}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {query && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Xóa vị trí"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              disabled={disabled}
              onClick={() => setIsOpen((prev) => !prev)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {query && !validation.ok && (
        <p className="mt-1.5 ml-11 text-[11px] font-medium text-rose-500">
          {validation.error}
        </p>
      )}

      {isOpen && !disabled && (
        <div
          className="absolute z-50 left-11 right-0 mt-1 max-h-60 overflow-y-auto rounded-xl border shadow-xl backdrop-blur-md text-xs py-1 scrollbar-thin"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-ui)',
          }}
        >
          {filteredOptions.length === 0 ? (
            <div className="px-3 py-2 text-slate-400 text-center italic">
              Không tìm thấy tỉnh/thành phố phù hợp
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.toLowerCase() === query.trim().toLowerCase();
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleSelect(opt)}
                  className={`w-full text-left px-3 py-2 flex items-center justify-between transition-colors hover:bg-sky-500/10 ${
                    isSelected ? 'font-bold text-sky-500 bg-sky-500/10' : 'text-slate-700 dark:text-slate-200'
                  }`}
                >
                  <span>{opt}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
