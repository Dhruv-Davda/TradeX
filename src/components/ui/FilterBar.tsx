import React from 'react';
import { Search, X } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card } from './Card';
import { Input } from './Input';
import { Select } from './Select';
import { Button } from './Button';

interface FilterChip {
  value: string;
  label: string;
  active: boolean;
}

interface FilterBarProps {
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  chips?: {
    label?: string;
    items: FilterChip[];
    onToggle: (value: string) => void;
  };
  selects?: Array<{
    value: string;
    onChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    label?: string;
  }>;
  extra?: React.ReactNode;
  onClearAll?: () => void;
  hasActiveFilters?: boolean;
  className?: string;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  search,
  chips,
  selects,
  extra,
  onClearAll,
  hasActiveFilters = false,
  className = '',
}) => {
  return (
    <Card className={`p-4 ${className}`}>
      <div className="flex flex-col gap-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-end">
          {search && (
            <div className="flex-1 min-w-[200px]">
              <Input
                placeholder={search.placeholder || 'Search...'}
                icon={<Search className="w-4 h-4" />}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
              />
            </div>
          )}
          {selects?.map((select, index) => (
            <div key={index} className="min-w-[150px]">
              {select.label && (
                <label className="block text-xs text-gray-400 mb-1">{select.label}</label>
              )}
              <Select
                options={select.options.map(o => ({ value: o.value, label: o.label }))}
                value={select.value}
                onChange={(e) => select.onChange(e.target.value)}
              />
            </div>
          ))}
          {extra}
          {onClearAll && hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              className="shrink-0 self-center"
            >
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>

        {chips && chips.items.length > 0 && (
          <div className="flex items-center flex-wrap gap-2">
            {chips.label && (
              <span className="text-xs text-gray-400 font-medium mr-1">{chips.label}</span>
            )}
            {chips.items.map((chip) => (
              <motion.button
                key={chip.value}
                whileTap={{ scale: 0.95 }}
                onClick={() => chips.onToggle(chip.value)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 ${
                  chip.active
                    ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                    : 'bg-secondary-800/50 text-secondary-400 border-secondary-600/50 hover:border-secondary-500'
                }`}
              >
                {chip.label}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};
