import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onApply: (start: string, end: string) => void;
}

export default function DateRangePicker({ startDate, endDate, onApply }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState(startDate);
  const [tempEnd, setTempEnd] = useState(endDate);
  
  const toLocalISOString = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Convert strings to dates for the calendar math
  const initialDate = useMemo(() => new Date(tempStart || toLocalISOString(new Date())), [tempStart]);
  const [currentMonth, setCurrentMonth] = useState(initialDate.getMonth());
  const [currentYear, setCurrentYear] = useState(initialDate.getFullYear());

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDateLabel = (dateStr: string) => dateStr.split('-').reverse().join('/');

  const handleQuickPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    
    const endStr = toLocalISOString(end);
    const startStr = toLocalISOString(start);
    setTempStart(startStr);
    setTempEnd(endStr);
    
    setCurrentMonth(start.getMonth());
    setCurrentYear(start.getFullYear());
  };

  const getDaysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const handleDayClick = (day: number) => {
    const clickedDate = new Date(currentYear, currentMonth, day);
    const clickedStr = toLocalISOString(clickedDate);
    
    const startObj = new Date(tempStart);
    const endObj = new Date(tempEnd);
    
    // Logic: if both are same or we click before start, reset start
    if (tempStart === tempEnd) {
      if (clickedDate < startObj) {
        setTempStart(clickedStr);
      } else {
        setTempEnd(clickedStr);
      }
    } else {
      // Start fresh
      setTempStart(clickedStr);
      setTempEnd(clickedStr);
    }
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];
    
    const startObj = new Date(tempStart);
    const endObj = new Date(tempEnd);
    startObj.setHours(0,0,0,0);
    endObj.setHours(0,0,0,0);

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const currentDate = new Date(currentYear, currentMonth, d);
      currentDate.setHours(0,0,0,0);
      const isStart = currentDate.getTime() === startObj.getTime();
      const isEnd = currentDate.getTime() === endObj.getTime();
      const inRange = currentDate > startObj && currentDate < endObj;
      
      let dayClass = "w-8 h-8 flex items-center justify-center text-xs rounded transition-colors cursor-pointer ";
      
      if (isStart || isEnd) {
        dayClass += "bg-[var(--accent)] text-white font-bold ring-2 ring-[var(--bg-card)] ring-offset-1 ring-offset-[var(--accent)]";
      } else if (inRange) {
        dayClass += "bg-[var(--bg-subtle)] text-[var(--text-title)] font-medium";
      } else {
        dayClass += "text-[var(--text-dim)] hover:bg-[var(--border-ui)] hover:text-[var(--text-title)]";
      }

      days.push(
        <div key={d} onClick={() => handleDayClick(d)} className={dayClass}>
          {d}
        </div>
      );
    }
    return days;
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  return (
    <div className="relative" ref={popoverRef}>
      <button
        onClick={() => {
          setTempStart(startDate);
          setTempEnd(endDate);
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)] text-[var(--text-title)] border border-[var(--border-ui)] px-3 py-1.5 rounded-lg shadow-sm text-xs font-semibold transition-colors"
      >
        <Calendar className="w-4 h-4 text-[var(--accent)]" />
        <span>{formatDateLabel(startDate)} — {formatDateLabel(endDate)}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--text-dim)]" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-[320px] bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 space-y-4">
          
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-ui)]">
             <span className="font-bold text-sm text-[var(--text-title)]">
                {monthNames[currentMonth]} {currentYear}
             </span>
             <div className="flex gap-2">
                <button onClick={handlePrevMonth} className="p-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-dim)] hover:text-[var(--text-title)]">
                   <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={handleNextMonth} className="p-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-dim)] hover:text-[var(--text-title)]">
                   <ChevronRight className="w-4 h-4" />
                </button>
             </div>
          </div>

          <div className="grid grid-cols-7 gap-y-2 place-items-center">
            {['S','M','T','W','T','F','S'].map((day, i) => (
              <div key={i} className="text-[10px] font-bold text-[var(--text-dim)] uppercase">{day}</div>
            ))}
            {renderCalendarDays()}
          </div>

          <div className="flex gap-1.5 pt-2">
            <button onClick={() => handleQuickPreset(0)} className="flex-1 py-1 text-[11px] font-semibold bg-[var(--bg-subtle)] hover:bg-[var(--border-ui)] rounded transition-colors text-[var(--text-title)]">
              Hôm nay
            </button>
            <button onClick={() => handleQuickPreset(7)} className="flex-1 py-1 text-[11px] font-semibold bg-[var(--bg-subtle)] hover:bg-[var(--border-ui)] rounded transition-colors text-[var(--text-title)]">
              7 ngày
            </button>
            <button onClick={() => handleQuickPreset(30)} className="flex-1 py-1 text-[11px] font-semibold bg-[var(--bg-subtle)] hover:bg-[var(--border-ui)] rounded transition-colors text-[var(--text-title)]">
              30 ngày
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs border-t border-[var(--border-ui)] pt-4">
             <div>
                <label className="block text-[var(--text-dim)] font-medium mb-1">Start</label>
                <input type="date" value={tempStart} onChange={e => setTempStart(e.target.value)} className="w-full bg-transparent text-[var(--text-title)] border border-[var(--border-ui)] px-2 py-1 rounded focus:outline-none focus:border-[var(--accent)]" />
             </div>
             <div>
                <label className="block text-[var(--text-dim)] font-medium mb-1">End</label>
                <input type="date" value={tempEnd} onChange={e => setTempEnd(e.target.value)} className="w-full bg-transparent text-[var(--text-title)] border border-[var(--border-ui)] px-2 py-1 rounded focus:outline-none focus:border-[var(--accent)]" />
             </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => {
                 onApply(tempStart, tempEnd);
                 setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-1 px-4 py-2 text-xs font-bold bg-[var(--bg-subtle)] hover:bg-[var(--border-ui)] text-[var(--text-title)] rounded-md transition-colors"
            >
              <Check className="w-3.5 h-3.5" /> Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
