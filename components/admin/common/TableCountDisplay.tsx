'use client';

interface TableCountDisplayProps {
  totalCount: number;
  currentPage: number;
  itemsPerPage: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

export default function TableCountDisplay({ totalCount, currentPage, itemsPerPage, totalPages, onPageChange }: TableCountDisplayProps) {
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalCount);
  const showPagination = totalPages && totalPages > 1 && onPageChange;

  return (
    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
      <span className="text-sm text-gray-600">
        全{totalCount}件中 {startIndex}〜{endIndex}件を表示
      </span>
      {showPagination && (
        <div className="flex items-center gap-1">
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            className="px-2 py-1 text-xs rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            «
          </button>
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 text-xs rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1)
            .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 2)
            .map((page, index, array) => {
              const showEllipsis = index > 0 && page - array[index - 1] > 1;
              return (
                <span key={page} className="flex items-center">
                  {showEllipsis && <span className="px-1 text-gray-400 text-xs">…</span>}
                  <button
                    onClick={() => onPageChange(page)}
                    className={`px-2 py-1 text-xs rounded border ${
                      currentPage === page
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                </span>
              );
            })}
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className="px-2 py-1 text-xs rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ›
          </button>
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="px-2 py-1 text-xs rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}
