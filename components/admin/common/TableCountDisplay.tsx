'use client';

interface TableCountDisplayProps {
  totalCount: number;
  currentPage: number;
  itemsPerPage: number;
}

export default function TableCountDisplay({ totalCount, currentPage, itemsPerPage }: TableCountDisplayProps) {
  const startIndex = (currentPage - 1) * itemsPerPage + 1;
  const endIndex = Math.min(currentPage * itemsPerPage, totalCount);

  return (
    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
      <span className="text-sm text-gray-600">
        全{totalCount}件中 {startIndex}〜{endIndex}件を表示
      </span>
    </div>
  );
}
