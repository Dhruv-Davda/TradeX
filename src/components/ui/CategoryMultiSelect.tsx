import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

interface CategoryMultiSelectProps {
  categories: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const CategoryMultiSelect: React.FC<CategoryMultiSelectProps> = ({
  categories,
  selected,
  onChange,
  placeholder = 'All Categories',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      });
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isOpen, updatePosition]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const toggleCategory = (category: string) => {
    if (selected.includes(category)) {
      onChange(selected.filter(c => c !== category));
    } else {
      onChange([...selected, category]);
    }
  };

  const selectAll = () => onChange([]);
  const clearAll = () => onChange([...categories]);

  const displayText = selected.length === 0
    ? placeholder
    : selected.length === 1
      ? selected[0]
      : `${selected.length} categories`;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-4 py-2.5 bg-secondary-800/50 border border-secondary-600/50 rounded-xl text-sm text-gray-300 hover:border-secondary-500 transition-colors ${className}`}
      >
        <span className="truncate">{displayText}</span>
        <ChevronDown className={`w-4 h-4 ml-2 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && createPortal(
        <div
          className="fixed z-[99999] bg-gray-800 border border-gray-700 rounded-xl shadow-2xl py-1 max-h-64 overflow-y-auto"
          style={{ top: position.top, left: position.left, width: Math.max(position.width, 200) }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700/50">
            <button
              onClick={selectAll}
              className="text-xs text-primary-400 hover:text-primary-300 font-medium"
            >
              All
            </button>
            <button
              onClick={clearAll}
              className="text-xs text-gray-400 hover:text-gray-300 font-medium"
            >
              Clear
            </button>
          </div>
          {categories.map((category) => {
            const isSelected = selected.length === 0 || !selected.includes(category);
            // When selected is empty = ALL are active. When selected has items = those are the ACTIVE ones
            // Inverting: selected array means "show only these". Empty = show all.
            const isActive = selected.length === 0 ? true : selected.includes(category);
            return (
              <button
                key={category}
                onClick={() => toggleCategory(category)}
                className={`flex items-center w-full px-3 py-2 text-sm hover:bg-gray-700/50 transition-colors ${
                  isActive ? 'text-white' : 'text-gray-500'
                }`}
              >
                <div className={`w-4 h-4 rounded border mr-2.5 flex items-center justify-center shrink-0 ${
                  isActive
                    ? 'bg-primary-500 border-primary-500'
                    : 'border-gray-600'
                }`}>
                  {isActive && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="truncate">{category}</span>
              </button>
            );
          })}
        </div>,
        document.body
      )}
    </>
  );
};
