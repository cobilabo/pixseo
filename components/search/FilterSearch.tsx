'use client';

import { useState, useEffect } from 'react';
import { getCategories } from '@/lib/firebase/categories';
import { getTags } from '@/lib/firebase/tags';
import { Category, Tag } from '@/types/article';

interface FilterSearchProps {
  filters: {
    categoryId: string;
    tagId: string;
    keyword: string;
  };
  onChange: (filters: { categoryId: string; tagId: string; keyword: string }) => void;
}

export default function FilterSearch({ filters, onChange }: FilterSearchProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [cats, tgs] = await Promise.all([
          getCategories(),
          getTags(),
        ]);
        setCategories(cats);
        setTags(tgs);
      } catch (error) {
        console.error('Error loading filters:', error);
      } finally {
        setLoading(false);
      }
    };
    loadFilters();
  }, []);

  const handleCategoryChange = (categoryId: string) => {
    onChange({
      ...filters,
      categoryId,
    });
  };

  const handleTagChange = (tagId: string) => {
    onChange({
      ...filters,
      tagId,
    });
  };

  const clearFilters = () => {
    onChange({
      categoryId: '',
      tagId: '',
      keyword: '',
    });
  };

  if (loading) {
    return <div className="bg-white rounded-lg shadow-md p-6">読み込み中...</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">絞り込み検索</h2>
        {(filters.categoryId || filters.tagId) && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            クリア
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* カテゴリー */}
        <div>
          <label htmlFor="filter-category" className="block text-sm font-medium text-gray-700 mb-2">
            カテゴリー
          </label>
          <select
            id="filter-category"
            value={filters.categoryId}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="カテゴリーで絞り込み"
          >
            <option value="">すべて</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* タグ */}
        <div>
          <label htmlFor="filter-tag" className="block text-sm font-medium text-gray-700 mb-2">
            タグ
          </label>
          <select
            id="filter-tag"
            value={filters.tagId}
            onChange={(e) => handleTagChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="タグで絞り込み"
          >
            <option value="">すべて</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}



