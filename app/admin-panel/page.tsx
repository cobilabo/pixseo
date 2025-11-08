'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';

interface Stats {
  articlesCount: number;
  categoriesCount: number;
  tagsCount: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<Stats>({
    articlesCount: 0,
    categoriesCount: 0,
    tagsCount: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch stats');
        }
        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="bg-white rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">記事数</h3>
              <p className="text-3xl font-bold text-blue-600">
                {loading ? '...' : stats.articlesCount}
              </p>
            </div>
            <div className="bg-green-50 p-6 rounded-lg">
              <h3 className="text-sm font-medium text-green-900 mb-2">カテゴリー数</h3>
              <p className="text-3xl font-bold text-green-600">
                {loading ? '...' : stats.categoriesCount}
              </p>
            </div>
            <div className="bg-purple-50 p-6 rounded-lg">
              <h3 className="text-sm font-medium text-purple-900 mb-2">タグ数</h3>
              <p className="text-3xl font-bold text-purple-600">
                {loading ? '...' : stats.tagsCount}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">クイックアクション</h3>
              <div className="flex flex-wrap gap-4">
                <Link
                  href="/articles/new"
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                >
                  <span className="mr-2">📝</span>
                  新規記事を作成
                </Link>
                <Link
                  href="/categories/new"
                  className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                >
                  <span className="mr-2">📁</span>
                  カテゴリーを追加
                </Link>
                <Link
                  href="/tags/new"
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center"
                >
                  <span className="mr-2">🏷️</span>
                  タグを追加
                </Link>
              </div>
            </div>
          </div>
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
