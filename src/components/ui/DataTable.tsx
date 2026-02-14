import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './Button';

export interface ColumnDef<T> {
  key: string;
  header: string;
  render: (row: T, index: number) => React.ReactNode;
  sortable?: boolean;
  sortFn?: (a: T, b: T) => number;
  align?: 'left' | 'center' | 'right';
  width?: string;
  className?: string;
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (row: T, index: number) => string;
  pageSize?: number;
  loading?: boolean;
  skeletonRows?: number;
  emptyState?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}

const alignClass = (align?: 'left' | 'center' | 'right') => {
  if (align === 'right') return 'text-right';
  if (align === 'center') return 'text-center';
  return 'text-left';
};

export function DataTable<T>({
  columns,
  data,
  rowKey,
  pageSize = 20,
  loading = false,
  skeletonRows = 5,
  emptyState,
  onRowClick,
  className = '',
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(0);

  // Reset page when data changes
  React.useEffect(() => {
    setCurrentPage(0);
  }, [data.length]);

  const handleSort = (column: ColumnDef<T>) => {
    if (!column.sortable) return;
    if (sortKey === column.key) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(column.key);
      setSortDirection('asc');
    }
    setCurrentPage(0);
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    const column = columns.find(c => c.key === sortKey);
    if (!column?.sortFn) return data;
    const sorted = [...data].sort(column.sortFn);
    return sortDirection === 'desc' ? sorted.reverse() : sorted;
  }, [data, sortKey, sortDirection, columns]);

  const totalPages = pageSize > 0 ? Math.ceil(sortedData.length / pageSize) : 1;
  const paginatedData = pageSize > 0
    ? sortedData.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
    : sortedData;

  return (
    <div className={`border border-gray-700/50 rounded-xl overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-full">
          <thead className="bg-gray-800/80">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable && handleSort(col)}
                  className={`px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap
                    ${alignClass(col.align)} ${col.width || ''} ${col.className || ''}
                    ${col.hideOnMobile ? 'hidden md:table-cell' : ''}
                    ${col.sortable ? 'cursor-pointer hover:text-white select-none transition-colors' : ''}`}
                >
                  <div className={`flex items-center gap-1 ${
                    col.align === 'right' ? 'justify-end' :
                    col.align === 'center' ? 'justify-center' : ''
                  }`}>
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDirection === 'asc'
                        ? <ChevronUp className="w-3 h-3" />
                        : <ChevronDown className="w-3 h-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700/30">
            {loading ? (
              Array.from({ length: skeletonRows }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  {columns.map((col) => (
                    <td key={col.key} className={`px-4 py-3.5 ${col.width || ''} ${col.hideOnMobile ? 'hidden md:table-cell' : ''}`}>
                      <div className="h-4 bg-gray-700/50 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8">
                  {emptyState || (
                    <div className="text-center text-gray-400 text-sm">No data found</div>
                  )}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <motion.tr
                  key={rowKey(row, index)}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(index * 0.02, 0.3) }}
                  onClick={() => onRowClick?.(row)}
                  className={`hover:bg-white/[0.02] transition-colors ${onRowClick ? 'cursor-pointer' : ''}`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3.5 text-sm text-gray-300
                        ${alignClass(col.align)} ${col.width || ''} ${col.className || ''}
                        ${col.hideOnMobile ? 'hidden md:table-cell' : ''}`}
                    >
                      {col.render(row, currentPage * pageSize + index)}
                    </td>
                  ))}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageSize > 0 && totalPages > 1 && !loading && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700/50 bg-gray-800/30">
          <p className="text-sm text-gray-400">
            {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, sortedData.length)} of {sortedData.length}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-gray-300 px-2">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
