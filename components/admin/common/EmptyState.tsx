'use client';

interface EmptyStateProps {
  hasSearch: boolean;
  entityName: string;
}

export default function EmptyState({ hasSearch, entityName }: EmptyStateProps) {
  return (
    <div className="p-8 text-center text-gray-500">
      {hasSearch ? '検索結果がありません' : `${entityName}がまだありません`}
    </div>
  );
}
