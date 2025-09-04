import React, { useState } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

const Pagination = ({
  currentPage,
  totalItems,
  itemsPerPage,
  onPageChange,
  onItemsPerPageChange,
  itemsPerPageOptions = [5, 10, 25, 50, 100],
  maxVisiblePages = 5,
  showGoto = false,
}) => {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const effectiveTotalPages = totalPages || 1;

  // Clamp helper to keep pages within valid bounds
  const clampPage = (p) => {
    if (totalPages === 0) return 1; // nothing to paginate, keep at 1 for UI
    return Math.min(Math.max(p, 1), totalPages);
  };

  // Compute display indices safely for zero results
  const startIndex = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endIndex = totalItems === 0 ? 0 : Math.min(currentPage * itemsPerPage, totalItems);

  // Local state for goto
  const [gotoVal, setGotoVal] = useState('');
  const handleGoto = () => {
    const num = Number(gotoVal);
    if (!Number.isNaN(num) && num >= 1 && num <= effectiveTotalPages) {
      onPageChange(clampPage(num));
      setGotoVal('');
    }
  };

  // Generate array of page numbers to display
  const getPageNumbers = () => {
    // No page buttons when there are no results
    if (totalItems === 0) return []

    const pages = []
    const windowSize = Math.max(1, (maxVisiblePages | 0))

    let startPage = Math.max(1, currentPage - Math.floor(windowSize / 2))
    let endPage = startPage + windowSize - 1

    if (endPage > effectiveTotalPages) {
      endPage = effectiveTotalPages
      startPage = Math.max(1, endPage - windowSize + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }

    return pages
  };

  const pages = getPageNumbers();

  // Hide pagination entirely when there's only one (or zero) page
  if (effectiveTotalPages <= 1) return null;

  return (
    <div className="border-t border-gray-200 bg-white px-3 py-2.5 sm:px-6 sm:py-3">
      {/* Mobile (xs) - compact */}
      <div className="flex flex-col gap-3 sm:hidden">
        {onItemsPerPageChange && (
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-700">Rows per page</label>
            <select
              className="ml-2 border border-gray-300 rounded-md px-2 py-1 text-xs"
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            >
              {itemsPerPageOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center justify-between">
          <button
            onClick={() => onPageChange(clampPage(currentPage - 1))}
            disabled={currentPage <= 1 || effectiveTotalPages <= 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Previous"
          >
            <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-700">Page {currentPage} of {effectiveTotalPages}</span>
          </div>

          <button
            onClick={() => onPageChange(clampPage(currentPage + 1))}
            disabled={currentPage >= effectiveTotalPages || effectiveTotalPages <= 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Next"
          >
            <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {showGoto && effectiveTotalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <label htmlFor="goto-sm" className="text-xs text-gray-600">Go to</label>
            <input
              id="goto-sm"
              type="number"
              min={1}
              max={effectiveTotalPages}
              value={gotoVal}
              onChange={(e) => setGotoVal(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleGoto(); }}
              className="w-20 rounded-md border border-gray-300 p-1 text-xs text-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
            />
            <button
              onClick={handleGoto}
              className="inline-flex items-center rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Go
            </button>
          </div>
        )}
      </div>

      {/* Desktop (sm and up) - full */}
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{startIndex}</span> to{' '}
            <span className="font-medium">{endIndex}</span>{' '}
            of <span className="font-medium">{totalItems}</span> results
          </p>
          {onItemsPerPageChange && (
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">Rows per page</label>
              <select
                className="border border-gray-300 rounded-md px-2 py-1 text-sm"
                value={itemsPerPage}
                onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              >
                {itemsPerPageOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>
          )}
          {showGoto && effectiveTotalPages > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="goto" className="text-sm text-gray-600">Go to</label>
              <input
                id="goto"
                type="number"
                min={1}
                max={effectiveTotalPages}
                value={gotoVal}
                onChange={(e) => setGotoVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleGoto(); }}
                className="w-24 rounded-md border border-gray-300 py-1.5 pl-2 pr-2 text-sm text-gray-900 shadow-sm focus:ring-2 focus:ring-indigo-600 focus:outline-none"
              />
              <button
                onClick={handleGoto}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Go
              </button>
            </div>
          )}
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm z-0" aria-label="Pagination">
            {effectiveTotalPages > 1 && (
              <button
                onClick={() => onPageChange(clampPage(currentPage - 1))}
                disabled={currentPage <= 1 || effectiveTotalPages <= 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Previous"
              >
                <ChevronLeftIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
            {pages.map((page) => (
              <button
                key={page}
                onClick={() => onPageChange(clampPage(page))}
                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                  currentPage === page
                    ? 'z-10 bg-indigo-600 text-white focus-visible:outline focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                    : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:outline-offset-0'
                }`}
                aria-current={currentPage === page ? 'page' : undefined}
              >
                {page}
              </button>
            ))}
            {effectiveTotalPages > 1 && (
              <button
                onClick={() => onPageChange(clampPage(currentPage + 1))}
                disabled={currentPage >= effectiveTotalPages || effectiveTotalPages <= 1}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Next"
              >
                <ChevronRightIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            )}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Pagination;
