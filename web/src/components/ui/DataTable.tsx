'use client';

import { useState, useMemo } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';
import { Pagination } from './pagination';

interface Column<T> {
  key: string;
  header: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyField: keyof T;
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  emptyMessage?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  keyField,
  searchPlaceholder = 'Search...',
  searchKeys,
  emptyMessage = 'No data found',
  emptyAction
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter(item => {
      if (searchKeys) {
        return searchKeys.some(key => {
          const value = item[key];
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(query);
        });
      }
      // Search all keys
      return Object.values(item).some(val => {
        if (val === null || val === undefined) return false;
        return String(val).toLowerCase().includes(query);
      });
    });
  }, [data, searchQuery, searchKeys]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortKey) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const comparison = aVal < bVal ? -1 : 1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortKey, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(start, start + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedData.length / itemsPerPage);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:border-[#E8231A] focus:ring-2 focus:ring-[#E8231A]/10 outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => handleSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-slate-400"
            >
              <X size={16} />
            </button>
          )}
        </div>
        <div className="flex gap-2">
          <span className="text-sm text-gray-500 dark:text-slate-400 py-2.5">
            {sortedData.length} {sortedData.length === 1 ? 'item' : 'items'}
          </span>
        </div>
      </div>

      {/* Table */}
      {paginatedData.length === 0 ? (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
            <Search size={32} className="text-gray-300" />
          </div>
          <p className="text-gray-500 dark:text-slate-400 text-lg font-medium">{emptyMessage}</p>
          {searchQuery && (
            <p className="text-gray-400 dark:text-slate-500 text-sm mt-1">Try adjusting your search</p>
          )}
          {emptyAction && (
            <button
              onClick={emptyAction.onClick}
              className="mt-4 px-5 py-2.5 bg-[#E8231A] text-white rounded-xl font-medium hover:bg-[#c91e16] transition-colors"
            >
              {emptyAction.label}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-slate-900/50 border-b border-gray-100">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-6 py-4 text-left text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider ${
                        col.sortable ? 'cursor-pointer hover:bg-gray-100 dark:bg-slate-800 select-none' : ''
                      }`}
                      style={{ width: col.width }}
                      onClick={() => col.sortable && handleSort(col.key)}
                    >
                      <div className="flex items-center gap-2">
                        {col.header}
                        {col.sortable && sortKey === col.key && (
                          <ChevronDown
                            size={14}
                            className={`text-[#E8231A] transition-transform ${
                              sortDirection === 'desc' ? 'rotate-180' : ''
                            }`}
                          />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {paginatedData.map((item) => (
                  <tr key={String(item[keyField])} className="hover:bg-gray-50 dark:bg-slate-900/50 transition-colors">
                    {columns.map((col) => (
                      <td key={col.key} className="px-6 py-4 text-sm text-gray-700 dark:text-slate-300">
                        {col.render
                          ? col.render(item)
                          : item[col.key] !== undefined
                          ? String(item[col.key])
                          : '-'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={sortedData.length}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        showItemsPerPage
        onItemsPerPageChange={(limit) => {
          setItemsPerPage(limit);
          setCurrentPage(1);
        }}
      />
    </div>
  );
}
