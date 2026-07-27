'use client';

import { useCallback, useEffect, useState } from 'react';
import { RevisionMeta, RevisionEntityType } from '@/types/revision';
import { listRevisions } from '@/lib/firebase/revisions-admin';

interface RevisionHistoryPanelProps {
  entityType: RevisionEntityType;
  entityId: string;
  onCompare: (revision: RevisionMeta) => void;
  onRestore: (revision: RevisionMeta) => void;
  refreshKey?: number;
}

export default function RevisionHistoryPanel({
  entityType,
  entityId,
  onCompare,
  onRestore,
  refreshKey = 0,
}: RevisionHistoryPanelProps) {
  const [revisions, setRevisions] = useState<RevisionMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const fetchRevisions = useCallback(async () => {
    setLoading(true);
    try {
      const list = await listRevisions<RevisionMeta>(entityType, entityId);
      setRevisions(list);
    } catch (error) {
      console.error('Error fetching revisions:', error);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    if (entityId) fetchRevisions();
  }, [entityId, fetchRevisions, refreshKey]);

  return (
    <div className="bg-white rounded-[1.75rem] border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="font-semibold text-gray-900">{'\u5909\u66f4\u5c65\u6b74'}</span>
          <span className="text-sm text-gray-500">{'\uff08\u76f4\u8fd120\u4ef6\uff09'}</span>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 px-6 py-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : revisions.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">
              {'\u5c65\u6b74\u306f\u307e\u3060\u3042\u308a\u307e\u305b\u3093\u30022\u56de\u76ee\u4ee5\u964d\u306e\u4fdd\u5b58\u6642\u306b\u8a18\u9332\u3055\u308c\u307e\u3059\u3002'}
            </p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {revisions.map((rev) => (
                <li
                  key={rev.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {rev.label || rev.createdAt.toLocaleString('ja-JP')}
                    </div>
                    {rev.createdByEmail && (
                      <div className="text-xs text-gray-500 truncate">{rev.createdByEmail}</div>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => onCompare(rev)}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      {'\u6bd4\u8f03'}
                    </button>
                    <button
                      type="button"
                      onClick={() => onRestore(rev)}
                      className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      {'\u5fa9\u5143'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
