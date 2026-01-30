import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';

interface MonthYearPickerProps {
  value: string; // Format: 'YYYY-MM'
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const MonthYearPicker: React.FC<MonthYearPickerProps> = ({
  value,
  onChange,
  label,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    const [year] = value.split('-').map(Number);
    return year || new Date().getFullYear();
  });
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse current value
  const [selectedYear, selectedMonth] = value.split('-').map(Number);

  // Calculate dropdown position when opened
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.left + window.scrollX
      });
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Update viewYear when value changes externally
  useEffect(() => {
    const [year] = value.split('-').map(Number);
    if (year && year !== viewYear) {
      setViewYear(year);
    }
  }, [value]);

  const handleMonthSelect = (monthIndex: number) => {
    const month = String(monthIndex + 1).padStart(2, '0');
    onChange(`${viewYear}-${month}`);
    setIsOpen(false);
  };

  const handleYearChange = (delta: number) => {
    setViewYear(prev => prev + delta);
  };

  const formatDisplayValue = () => {
    if (!selectedYear || !selectedMonth) return 'Select month';
    return `${FULL_MONTHS[selectedMonth - 1]} ${selectedYear}`;
  };

  const isCurrentMonth = (monthIndex: number) => {
    return viewYear === selectedYear && monthIndex + 1 === selectedMonth;
  };

  const isFutureMonth = (monthIndex: number) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    if (viewYear > currentYear) return true;
    if (viewYear === currentYear && monthIndex > currentMonth) return true;
    return false;
  };

  const dropdown = isOpen ? createPortal(
    <div
      ref={dropdownRef}
      className="fixed w-72 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
      style={{
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        zIndex: 99999
      }}
    >
      {/* Year Navigation */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/80 border-b border-gray-700">
        <button
          type="button"
          onClick={() => handleYearChange(-1)}
          className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-300" />
        </button>
        <span className="text-lg font-semibold text-white">{viewYear}</span>
        <button
          type="button"
          onClick={() => handleYearChange(1)}
          disabled={viewYear >= new Date().getFullYear()}
          className="p-1.5 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-5 h-5 text-gray-300" />
        </button>
      </div>

      {/* Month Grid */}
      <div className="p-3">
        <div className="grid grid-cols-3 gap-2">
          {MONTHS.map((month, index) => {
            const isSelected = isCurrentMonth(index);
            const isFuture = isFutureMonth(index);

            return (
              <button
                key={month}
                type="button"
                onClick={() => !isFuture && handleMonthSelect(index)}
                disabled={isFuture}
                className={`
                  px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                  ${isSelected
                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                    : isFuture
                      ? 'text-gray-600 cursor-not-allowed'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }
                `}
              >
                {month}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-3 pb-3 flex gap-2">
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            onChange(`${now.getFullYear()}-${month}`);
            setIsOpen(false);
          }}
          className="flex-1 px-3 py-2 text-xs font-medium text-primary-400 hover:bg-primary-400/10 rounded-lg transition-colors"
        >
          This Month
        </button>
        <button
          type="button"
          onClick={() => {
            const now = new Date();
            now.setMonth(now.getMonth() - 1);
            const month = String(now.getMonth() + 1).padStart(2, '0');
            onChange(`${now.getFullYear()}-${month}`);
            setIsOpen(false);
          }}
          className="flex-1 px-3 py-2 text-xs font-medium text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
        >
          Last Month
        </button>
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-xs text-gray-400 mb-1.5 font-medium">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-gray-800/60 border border-gray-600/50 rounded-lg text-white text-sm hover:border-gray-500/70 focus:border-primary-400/70 focus:ring-2 focus:ring-primary-400/20 transition-all duration-200"
      >
        <span className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          {formatDisplayValue()}
        </span>
        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} />
      </button>

      {dropdown}
    </div>
  );
};
