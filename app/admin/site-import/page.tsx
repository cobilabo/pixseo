'use client';

import { useState } from 'react';
import AuthGuard from '@/components/admin/AuthGuard';
import AdminLayout from '@/components/admin/AdminLayout';
import { useMediaTenant } from '@/contexts/MediaTenantContext';
import { useToast } from '@/contexts/ToastContext';
import { LayoutMode } from '@/types/page';

interface CrawlPageSummary {
  url: string;
  title: string;
  metaDescription: string;
  imageCount: number;
  htmlLength: number;
}

interface AnalyzedCommonBlock {
  name: string;
  html: string;
  css: string;
  position: string;
}

interface AnalyzedPage {
  url: string;
  title: string;
  slug: string;
  metaDescription: string;
  contentHtml: string;
  images: string[];
}

interface AnalysisData {
  commonBlocks: AnalyzedCommonBlock[];
  pages: AnalyzedPage[];
  sharedCss: string;
}

interface ImportResultData {
  createdCustomBlocks: { id: string; name: string }[];
  createdPages: { id: string; title: string; slug: string }[];
  uploadedImages: number;
  errors: string[];
}

type Step = 'input' | 'crawling' | 'crawled' | 'analyzing' | 'preview' | 'importing' | 'done';

export default function SiteImportPage() {
  const { currentTenant } = useMediaTenant();
  const { showError } = useToast();

  const [step, setStep] = useState<Step>('input');
  const [url, setUrl] = useState('');
  const [maxPages, setMaxPages] = useState(50);
  const [excludePathsText, setExcludePathsText] = useState('');
  const [crawlSummary, setCrawlSummary] = useState<CrawlPageSummary[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [importResult, setImportResult] = useState<ImportResultData | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('blank');
  const [isPublished, setIsPublished] = useState(false);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');

  const getExcludePaths = (): string[] => {
    return excludePathsText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
  };

  const handleCrawl = async () => {
    if (!url) {
      showError('URLを入力してください');
      return;
    }

    setStep('crawling');
    setError('');

    try {
      const response = await fetch('/api/admin/site-import/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, maxPages, excludePaths: getExcludePaths() }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setCrawlSummary(data.data.pages);
      setStep('crawled');
    } catch (err: any) {
      setError(err.message || 'クロールに失敗しました');
      setStep('input');
    }
  };

  const handleAnalyze = async () => {
    setStep('analyzing');
    setError('');

    try {
      const response = await fetch('/api/admin/site-import/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, maxPages, excludePaths: getExcludePaths() }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setAnalysis(data.data);
      setStep('preview');
    } catch (err: any) {
      setError(err.message || 'AI解析に失敗しました');
      setStep('crawled');
    }
  };

  const handleExecute = async () => {
    if (!analysis || !currentTenant) return;

    setStep('importing');
    setError('');

    try {
      const response = await fetch('/api/admin/site-import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis,
          options: {
            mediaId: currentTenant.id,
            layoutMode,
            isPublished,
            customCss: analysis.sharedCss || '',
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      setImportResult(data.data);
      setStep('done');
    } catch (err: any) {
      setError(err.message || 'インポートに失敗しました');
      setStep('preview');
    }
  };

  const updatePageSlug = (index: number, slug: string) => {
    if (!analysis) return;
    const updated = { ...analysis };
    updated.pages = [...updated.pages];
    updated.pages[index] = { ...updated.pages[index], slug };
    setAnalysis(updated);
  };

  const updatePageTitle = (index: number, title: string) => {
    if (!analysis) return;
    const updated = { ...analysis };
    updated.pages = [...updated.pages];
    updated.pages[index] = { ...updated.pages[index], title };
    setAnalysis(updated);
  };

  const toggleBlockExpand = (index: number) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const removePageFromImport = (index: number) => {
    if (!analysis) return;
    const updated = { ...analysis };
    updated.pages = updated.pages.filter((_, i) => i !== index);
    setAnalysis(updated);
  };

  const stepLabels: Record<Step, string> = {
    input: 'URL入力',
    crawling: 'クロール中',
    crawled: 'クロール完了',
    analyzing: 'AI解析中',
    preview: 'プレビュー',
    importing: 'インポート中',
    done: '完了',
  };

  const stepOrder: Step[] = ['input', 'crawled', 'preview', 'done'];
  const currentStepIndex = stepOrder.indexOf(
    step === 'crawling' ? 'input' :
    step === 'analyzing' ? 'crawled' :
    step === 'importing' ? 'preview' :
    step
  );

  return (
    <AuthGuard>
      <AdminLayout>
        <div className="px-4 pb-32 animate-fadeIn">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">サイトインポート</h1>
          </div>

          {/* Step indicator */}
          <div className="bg-white rounded-[1.75rem] p-6 mb-6">
            <div className="flex items-center justify-between">
              {stepOrder.map((s, i) => (
                <div key={s} className="flex items-center">
                  <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                    ${i <= currentStepIndex ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}
                  `}>
                    {i + 1}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${i <= currentStepIndex ? 'text-blue-600' : 'text-gray-400'}`}>
                    {stepLabels[s]}
                  </span>
                  {i < stepOrder.length - 1 && (
                    <div className={`w-12 h-0.5 mx-3 ${i < currentStepIndex ? 'bg-blue-600' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 mb-6">
              <p className="font-medium">エラー</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          )}

          {/* Step 1: URL Input */}
          {(step === 'input' || step === 'crawling') && (
            <div className="bg-white rounded-[1.75rem] p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">インポート元のURLを入力</h2>
              <p className="text-sm text-gray-500 mb-6">
                インポートしたいサイトのURLを入力してください。サイト内のページを自動でクロールし、HTMLを取得します。
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">サイトURL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={step === 'crawling'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">最大ページ数</label>
                  <input
                    type="number"
                    value={maxPages}
                    onChange={(e) => setMaxPages(Number(e.target.value))}
                    min={1}
                    max={100}
                    className="w-32 px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={step === 'crawling'}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    除外パス（1行に1パス）
                  </label>
                  <textarea
                    value={excludePathsText}
                    onChange={(e) => setExcludePathsText(e.target.value)}
                    placeholder={"/blog\n/news\n/tag/\n/category/"}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    disabled={step === 'crawling'}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    指定したパスを含むURLはクロール対象外になります。wp-admin、wp-login等は自動で除外されます。
                  </p>
                </div>

                <button
                  onClick={handleCrawl}
                  disabled={step === 'crawling' || !url}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {step === 'crawling' ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      クロール中...
                    </span>
                  ) : 'クロール開始'}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Crawl Results */}
          {(step === 'crawled' || step === 'analyzing') && (
            <div className="bg-white rounded-[1.75rem] p-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">クロール結果</h2>
              <p className="text-sm text-gray-500 mb-6">
                {crawlSummary.length}ページを検出しました。AI解析を実行して共通要素を検出します。
              </p>

              <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">URL</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">タイトル</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">画像数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {crawlSummary.map((page, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-600 max-w-xs truncate">{page.url}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{page.title || '(タイトルなし)'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{page.imageCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('input'); setCrawlSummary([]); }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                  disabled={step === 'analyzing'}
                >
                  やり直す
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={step === 'analyzing'}
                  className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {step === 'analyzing' ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      AI解析中...（クロール＋解析で数十秒〜数分かかります）
                    </span>
                  ) : 'AI解析を実行'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {(step === 'preview' || step === 'importing') && analysis && (
            <div className="space-y-6">
              {/* Common Blocks */}
              <div className="bg-white rounded-[1.75rem] p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  検出された共通ブロック ({analysis.commonBlocks.length}件)
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  以下の共通要素がカスタムブロックとして登録されます。
                </p>

                <div className="space-y-3">
                  {analysis.commonBlocks.map((block, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => toggleBlockExpand(i)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700">{block.position}</span>
                          <span className="font-medium text-gray-900">{block.name}</span>
                        </div>
                        <svg className={`w-5 h-5 text-gray-400 transition-transform ${expandedBlocks.has(i) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {expandedBlocks.has(i) && (
                        <div className="p-4 bg-gray-900 max-h-64 overflow-auto">
                          <pre className="text-xs text-green-400 whitespace-pre-wrap break-all font-mono">{block.html.substring(0, 3000)}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pages */}
              <div className="bg-white rounded-[1.75rem] p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">
                  インポートするページ ({analysis.pages.length}件)
                </h2>
                <p className="text-sm text-gray-500 mb-4">
                  タイトルとスラッグは編集可能です。不要なページは削除できます。
                </p>

                <div className="space-y-3">
                  {analysis.pages.map((page, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-4">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-500 mb-1">タイトル</label>
                              <input
                                type="text"
                                value={page.title}
                                onChange={(e) => updatePageTitle(i, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                            <div className="w-48">
                              <label className="block text-xs font-medium text-gray-500 mb-1">スラッグ</label>
                              <input
                                type="text"
                                value={page.slug}
                                onChange={(e) => updatePageSlug(i, e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 truncate">元URL: {page.url}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removePageFromImport(i)}
                          className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="このページを除外"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Import Options */}
              <div className="bg-white rounded-[1.75rem] p-8">
                <h2 className="text-lg font-bold text-gray-900 mb-4">インポート設定</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">レイアウトモード</label>
                    <select
                      value={layoutMode}
                      onChange={(e) => setLayoutMode(e.target.value as LayoutMode)}
                      className="px-4 py-3 border border-gray-300 rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="blank">完全白紙（ヘッダー/フッターなし）</option>
                      <option value="default">通常（システムヘッダー/フッター付き）</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isPublished"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300"
                    />
                    <label htmlFor="isPublished" className="text-sm font-medium text-gray-700">
                      インポート後すぐに公開する
                    </label>
                  </div>

                  {analysis.sharedCss && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        共通CSS（各ページの customCss に設定されます）
                      </label>
                      <div className="bg-gray-900 rounded-xl p-4 max-h-32 overflow-auto">
                        <pre className="text-xs text-green-400 whitespace-pre-wrap font-mono">
                          {analysis.sharedCss.substring(0, 2000)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('crawled'); setAnalysis(null); }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                  disabled={step === 'importing'}
                >
                  戻る
                </button>
                <button
                  onClick={handleExecute}
                  disabled={step === 'importing' || analysis.pages.length === 0}
                  className="px-8 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 font-medium"
                >
                  {step === 'importing' ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      インポート中...（画像アップロード含め数分かかります）
                    </span>
                  ) : `${analysis.pages.length}ページをインポート実行`}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 'done' && importResult && (
            <div className="bg-white rounded-[1.75rem] p-8">
              <div className="text-center mb-8">
                <div className="text-5xl mb-4">&#10003;</div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">インポート完了</h2>
                <p className="text-gray-500">サイトのインポートが正常に完了しました。</p>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="bg-blue-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{importResult.createdCustomBlocks.length}</div>
                  <div className="text-sm text-blue-700">カスタムブロック</div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{importResult.createdPages.length}</div>
                  <div className="text-sm text-green-700">ページ</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-purple-600">{importResult.uploadedImages}</div>
                  <div className="text-sm text-purple-700">画像</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
                  <p className="font-medium text-yellow-800 mb-2">一部警告があります ({importResult.errors.length}件)</p>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {importResult.errors.slice(0, 10).map((err, i) => (
                      <li key={i}>- {err}</li>
                    ))}
                    {importResult.errors.length > 10 && (
                      <li>...他 {importResult.errors.length - 10}件</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Created pages list */}
              <div className="mb-6">
                <h3 className="font-medium text-gray-900 mb-3">作成されたページ</h3>
                <div className="space-y-2">
                  {importResult.createdPages.map((page) => (
                    <div key={page.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                      <div>
                        <span className="font-medium text-gray-900">{page.title}</span>
                        <span className="ml-2 text-sm text-gray-400">/{page.slug}</span>
                      </div>
                      <a
                        href={`/admin/pages/${page.id}/edit`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        編集
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setStep('input');
                    setUrl('');
                    setCrawlSummary([]);
                    setAnalysis(null);
                    setImportResult(null);
                    setError('');
                  }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                >
                  新しいインポート
                </button>
                <a
                  href="/admin/pages"
                  className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  ページ管理へ
                </a>
                <a
                  href="/admin/custom-blocks"
                  className="px-6 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                >
                  カスタムブロック管理へ
                </a>
              </div>
            </div>
          )}
        </div>
      </AdminLayout>
    </AuthGuard>
  );
}
