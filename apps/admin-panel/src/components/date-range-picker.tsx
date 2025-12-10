'use client';

import { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, X } from 'lucide-react';

interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  placeholder?: string;
}

const presetRanges = [
  { label: 'Today', getValue: () => {
    const today = new Date().toISOString().split('T')[0];
    return { startDate: today, endDate: today };
  }},
  { label: 'Yesterday', getValue: () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    return { startDate: yesterday, endDate: yesterday };
  }},
  { label: 'Last 7 days', getValue: () => {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    return { startDate: start, endDate: end };
  }},
  { label: 'Last 30 days', getValue: () => {
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    return { startDate: start, endDate: end };
  }},
  { label: 'This month', getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const end = new Date().toISOString().split('T')[0];
    return { startDate: start, endDate: end };
  }},
  { label: 'Last month', getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
    const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
    return { startDate: start, endDate: end };
  }},
];

export function DateRangePicker({ value, onChange, placeholder = 'Select date range' }: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [localStartDate, setLocalStartDate] = useState(value.startDate || '');
  const [localEndDate, setLocalEndDate] = useState(value.endDate || '');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLocalStartDate(value.startDate || '');
    setLocalEndDate(value.endDate || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleApply = () => {
    onChange({
      startDate: localStartDate || null,
      endDate: localEndDate || null,
    });
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange({ startDate: null, endDate: null });
    setLocalStartDate('');
    setLocalEndDate('');
    setIsOpen(false);
  };

  const handlePresetClick = (preset: typeof presetRanges[0]) => {
    const range = preset.getValue();
    setLocalStartDate(range.startDate);
    setLocalEndDate(range.endDate);
    onChange(range);
    setIsOpen(false);
  };

  const formatDisplayValue = () => {
    if (!value.startDate && !value.endDate) return placeholder;
    if (value.startDate === value.endDate) {
      return new Date(value.startDate!).toLocaleDateString();
    }
    const start = value.startDate ? new Date(value.startDate).toLocaleDateString() : '';
    const end = value.endDate ? new Date(value.endDate).toLocaleDateString() : '';
    return `${start} - ${end}`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <span className={value.startDate ? '' : 'text-muted-foreground'}>
          {formatDisplayValue()}
        </span>
        {value.startDate ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
            className="ml-1 rounded-full p-0.5 hover:bg-muted-foreground/20"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 rounded-md border bg-background shadow-lg">
          <div className="flex">
            {/* Presets */}
            <div className="border-r p-2 min-w-[140px]">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase">Quick Select</p>
              {presetRanges.map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => handlePresetClick(preset)}
                  className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Range */}
            <div className="p-4 min-w-[240px]">
              <p className="mb-3 text-xs font-medium text-muted-foreground uppercase">Custom Range</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    value={localStartDate}
                    onChange={(e) => setLocalStartDate(e.target.value)}
                    className="w-full rounded-md border px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    value={localEndDate}
                    onChange={(e) => setLocalEndDate(e.target.value)}
                    min={localStartDate}
                    className="w-full rounded-md border px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleClear}
                    className="flex-1 rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
                  >
                    Clear
                  </button>
                  <button
                    onClick={handleApply}
                    className="flex-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
