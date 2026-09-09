import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Check } from 'lucide-react';

interface DatePickerProps {
  date: string;
  onApply: (date: string) => void;
  labelFormat?: (dateStr: string) => string;
}

export default function DatePicker({ date, onApply, labelFormat }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tempDate, setTempDate] = useState(date);
  
  const toLocalISOString = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const initialDate = useMemo(() => new Date(tempDate || toLocalISOString(new Date())), [tempDate]);
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

  const formatDateLabel = labelFormat || ((dateStr: string) => dateStr.split('-').reverse().join('/'));

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
    setTempDate(clickedStr);
  };

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];
    
    const selObj = new Date(tempDate);
    selObj.setHours(0,0,0,0);

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const currentDate = new Date(currentYear, currentMonth, d);
      currentDate.setHours(0,0,0,0);
      const isSelected = currentDate.getTime() === selObj.getTime();
      
      let dayClass = "w-8 h-8 flex items-center justify-center text-xs rounded transition-colors cursor-pointer ";
      
      if (isSelected) {
        dayClass += "bg-[var(--accent)] text-white font-bold ring-2 ring-[var(--bg-card)] ring-offset-1 ring-offset-[var(--accent)]";
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
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          setTempDate(date);
          setIsOpen(!isOpen);
        }}
        className="flex items-center gap-2 bg-[var(--bg-card)] hover:bg-[var(--bg-subtle)] text-[var(--text-title)] border border-[var(--border-ui)] px-3 py-1.5 rounded-lg shadow-sm text-xs font-semibold transition-colors"
      >
        <Calendar className="w-4 h-4 text-[var(--accent)]" />
        <span>{formatDateLabel(date)}</span>
        <ChevronDown className="w-3.5 h-3.5 text-[var(--text-dim)]" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[300px] bg-[var(--bg-card)] border border-[var(--border-ui)] rounded-xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 space-y-4">
          
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-ui)]">
             <span className="font-bold text-sm text-[var(--text-title)]">
                {monthNames[currentMonth]} {currentYear}
             </span>
             <div className="flex gap-2">
                <button type="button" onClick={handlePrevMonth} className="p-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-dim)] hover:text-[var(--text-title)]">
                   <ChevronLeft className="w-4 h-4" />
                </button>
                <button type="button" onClick={handleNextMonth} className="p-1 rounded hover:bg-[var(--bg-subtle)] text-[var(--text-dim)] hover:text-[var(--text-title)]">
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

          <div className="text-xs border-t border-[var(--border-ui)] pt-4">
             <div>
                <label className="block text-[var(--text-dim)] font-medium mb-1">Pick a Date</label>
                <input type="date" value={tempDate} onChange={e => setTempDate(e.target.value)} className="w-full bg-transparent text-[var(--text-title)] border border-[var(--border-ui)] px-2 py-1 rounded focus:outline-none focus:border-[var(--accent)]" />
             </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={(e) => {
                 e.preventDefault();
                 onApply(tempDate);
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
