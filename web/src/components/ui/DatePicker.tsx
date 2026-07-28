'use client';

import * as React from 'react';
import { format, addMonths, subMonths, getYear, getMonth, eachMonthOfInterval, startOfYear, endOfYear, isSameDay, isToday, isBefore, isAfter } from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface DatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  label?: string;
}

export function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  label,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState(new Date());
  const [selectMode, setSelectMode] = React.useState<'month' | 'year'>('month');
  const containerRef = React.useRef<HTMLDivElement>(null);

  const years = React.useMemo(() => {
    const start = startOfYear(subMonths(new Date(), 12 * 20));
    const end = endOfYear(addMonths(new Date(), 12 * 10));
    return [...new Set(eachMonthOfInterval({ start, end }).map(d => getYear(d)))];
  }, []);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectMode('month');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (date: Date | undefined) => {
    if (onChange) {
      onChange(date);
    }
    if (date) {
      setIsOpen(false);
      setSelectMode('month');
    }
  };

  const handleMonthChange = (direction: 'prev' | 'next') => {
    setViewDate(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const handleYearSelect = (year: number) => {
    setViewDate(new Date(year, getMonth(viewDate), 1));
    setSelectMode('month');
  };

  // Generate calendar days
  const calendarDays = React.useMemo(() => {
    const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    const startDay = monthStart.getDay();
    const days: (Date | null)[] = [];

    // Add empty days for padding
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Add days of month
    for (let i = 1; i <= monthEnd.getDate(); i++) {
      days.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), i));
    }

    return days;
  }, [viewDate]);

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="block text-sm font-semibold text-navy-dark mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3.5 rounded-xl border-2 transition-all duration-200 outline-none text-left flex items-center justify-between ${
          isOpen
            ? 'border-ppia-red bg-white dark:bg-slate-800 shadow-lg ring-2 ring-ppia-red/20'
            : 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 hover:border-gray-400 hover:bg-white'
        }`}
      >
        <span className={value ? 'text-navy-dark' : 'text-gray-400 dark:text-slate-500'}>
          {value ? format(value, 'MMMM d, yyyy') : placeholder}
        </span>
        <CalendarIcon className="text-gray-400 dark:text-slate-500" size={20} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-navy to-navy-dark">
              <button
                type="button"
                onClick={() => handleMonthChange('prev')}
                className="p-2 hover:bg-white dark:bg-slate-800/10 rounded-lg transition-colors text-white"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectMode('month')}
                  className="text-white font-semibold hover:opacity-80 transition-opacity px-2 py-1 rounded hover:bg-white dark:bg-slate-800/10"
                >
                  {format(viewDate, 'MMMM')}
                </button>
                <span className="text-white/50">|</span>
                <button
                  type="button"
                  onClick={() => setSelectMode('year')}
                  className="text-white font-semibold hover:opacity-80 transition-opacity px-2 py-1 rounded hover:bg-white dark:bg-slate-800/10"
                >
                  {format(viewDate, 'yyyy')}
                </button>
              </div>

              <button
                type="button"
                onClick={() => handleMonthChange('next')}
                className="p-2 hover:bg-white dark:bg-slate-800/10 rounded-lg transition-colors text-white"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Year Picker */}
            {selectMode === 'year' && (
              <div className="p-3 border-b border-gray-100 max-h-56 overflow-y-auto">
                <div className="grid grid-cols-4 gap-1">
                  {years.map(year => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => handleYearSelect(year)}
                      className={`py-2 px-2 rounded-lg text-sm font-medium transition-all ${
                        year === getYear(viewDate)
                          ? 'bg-ppia-red text-white'
                          : 'text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:bg-slate-800'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Calendar Grid */}
            <div className="p-4">
              {/* Week days header */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {weekDays.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-gray-400 dark:text-slate-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days */}
              <div className="grid grid-cols-7 gap-1">
                {calendarDays.map((day, index) => {
                  if (!day) {
                    return <div key={`empty-${index}`} className="h-10" />;
                  }

                  const isSelected = value && isSameDay(day, value);
                  const isTodayDate = isToday(day);

                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => handleSelect(day)}
                      className={`h-10 w-10 rounded-xl text-sm font-medium transition-all flex items-center justify-center
                        ${isSelected
                          ? 'bg-ppia-red text-white'
                          : isTodayDate
                            ? 'bg-amber-100 text-amber-700 border-2 border-amber-400'
                            : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:bg-slate-800'
                        }
                      `}
                    >
                      {day.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleSelect(undefined)}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-slate-300 transition-colors font-medium"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => {
                  handleSelect(new Date());
                  setIsOpen(false);
                }}
                className="text-sm text-ppia-red font-semibold hover:underline"
              >
                Today
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Date Range Picker
interface DateRangePickerProps {
  value?: { from?: Date; to?: Date };
  onChange?: (range: { from?: Date; to?: Date } | undefined) => void;
  placeholder?: string;
  label?: string;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Select date range',
  label,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [viewDate, setViewDate] = React.useState(new Date());
  const [hoverDate, setHoverDate] = React.useState<Date | null>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (date: Date) => {
    let newRange: { from?: Date; to?: Date };

    if (!value?.from || (value?.from && value?.to)) {
      // Start new range
      newRange = { from: date, to: undefined };
    } else if (isBefore(date, value.from)) {
      // Selected date is before start - new range
      newRange = { from: date, to: undefined };
    } else {
      // Complete the range
      newRange = { from: value.from, to: date };
    }

    if (onChange) {
      onChange(newRange);
    }
  };

  const isInRange = (day: Date): boolean => {
    if (!value?.from) return false;

    const start = value.from;
    const end = value?.to || hoverDate;

    if (!end) return false;

    return isAfter(day, start) && isBefore(day, end);
  };

  const calendarDays = React.useMemo(() => {
    const monthStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const monthEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);
    const startDay = monthStart.getDay();
    const days: (Date | null)[] = [];

    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    for (let i = 1; i <= monthEnd.getDate(); i++) {
      days.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), i));
    }

    return days;
  }, [viewDate]);

  const formatRange = () => {
    if (!value?.from) return placeholder;
    if (!value?.to) return format(value.from, 'MMM d, yyyy');
    return `${format(value.from, 'MMM d')} - ${format(value.to, 'MMM d, yyyy')}`;
  };

  const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="block text-sm font-semibold text-navy-dark mb-2">
          {label}
        </label>
      )}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3.5 rounded-xl border-2 transition-all duration-200 outline-none text-left flex items-center justify-between ${
          isOpen
            ? 'border-ppia-red bg-white dark:bg-slate-800 shadow-lg ring-2 ring-ppia-red/20'
            : 'border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900/50 hover:border-gray-400 hover:bg-white'
        }`}
      >
        <span className={value?.from ? 'text-navy-dark' : 'text-gray-400 dark:text-slate-500'}>
          {formatRange()}
        </span>
        <CalendarIcon className="text-gray-400 dark:text-slate-500" size={20} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 p-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <button
                type="button"
                onClick={() => setViewDate(subMonths(viewDate, 1))}
                className="p-2 hover:bg-gray-100 dark:bg-slate-800 rounded-lg transition-colors"
              >
                <ChevronLeft size={20} className="text-gray-600 dark:text-slate-400" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewDate(new Date())}
                  className="font-semibold text-navy-dark px-2 py-1 rounded hover:bg-gray-100 dark:bg-slate-800"
                >
                  {format(viewDate, 'MMMM yyyy')}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setViewDate(addMonths(viewDate, 1))}
                className="p-2 hover:bg-gray-100 dark:bg-slate-800 rounded-lg transition-colors"
              >
                <ChevronRight size={20} className="text-gray-600 dark:text-slate-400" />
              </button>
            </div>

            {/* Week days */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map(day => (
                <div key={day} className="text-center text-xs font-medium text-gray-400 dark:text-slate-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Days */}
            <div
              className="grid grid-cols-7 gap-1"
              onMouseLeave={() => setHoverDate(null)}
            >
              {calendarDays.map((day, index) => {
                if (!day) {
                  return <div key={`empty-${index}`} className="h-10" />;
                }

                const isSelected = (value?.from && isSameDay(day, value.from)) || (value?.to && isSameDay(day, value.to));
                const inRange = isInRange(day);
                const isTodayDate = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => handleSelect(day)}
                    onMouseEnter={() => value?.from && !value?.to && setHoverDate(day)}
                    className={`h-10 w-10 rounded-xl text-sm font-medium transition-all flex items-center justify-center
                      ${isSelected
                        ? 'bg-ppia-red text-white'
                        : inRange
                          ? 'bg-ppia-red/10 text-ppia-red'
                          : isTodayDate
                            ? 'bg-amber-100 text-amber-700 border-2 border-amber-400'
                            : 'text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:bg-slate-800'
                      }
                    `}
                  >
                    {day.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
