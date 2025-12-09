'use client';

import { useState } from 'react';
import { DomainConfig, DnsRecord } from '@/types/media-tenant';

interface DomainSetupPanelProps {
  serviceId: string;
  currentDomain?: string;
  domainConfig?: DomainConfig;
  onSetupComplete?: () => void;
}

export default function DomainSetupPanel({
  serviceId,
  currentDomain,
  domainConfig,
  onSetupComplete,
}: DomainSetupPanelProps) {
  const [domain, setDomain] = useState(currentDomain || '');
  const [enableEmail, setEnableEmail] = useState(domainConfig?.emailEnabled || false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localDomainConfig, setLocalDomainConfig] = useState<DomainConfig | undefined>(domainConfig);

  // ドメインのセットアップ
  const handleSetup = async () => {
    if (!domain.trim()) {
      setError('ドメインを入力してください');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/domain/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId,
          domain: domain.trim().toLowerCase(),
          enableEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'セットアップに失敗しました');
      }

      setLocalDomainConfig(data.domainConfig);
      onSetupComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // DNS検証
  const handleVerify = async () => {
    setVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/domain/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '検証に失敗しました');
      }

      // 検証結果でローカルステートを更新
      setLocalDomainConfig(prev => prev ? {
        ...prev,
        status: data.status,
        vercelVerified: data.webVerified,
        emailVerified: data.emailVerified,
        dnsRecords: data.dnsRecords,
        lastCheckedAt: new Date(),
      } : undefined);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setVerifying(false);
    }
  };

  // ドメイン削除
  const handleRemove = async () => {
    if (!confirm('カスタムドメインを削除しますか？この操作は元に戻せません。')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/admin/domain/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '削除に失敗しました');
      }

      setDomain('');
      setLocalDomainConfig(undefined);
      onSetupComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  // クリップボードにコピー
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('コピーしました');
    } catch {
      // フォールバック
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      alert('コピーしました');
    }
  };

  // ステータスバッジ
  const getStatusBadge = (status: DomainConfig['status']) => {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      verifying: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      error: 'bg-red-100 text-red-800',
    };
    const labels: Record<string, string> = {
      pending: 'DNS設定待ち',
      verifying: '検証中',
      active: '有効',
      error: 'エラー',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  // DNSレコードの検証状態アイコン
  const getVerificationIcon = (verified: boolean) => {
    if (verified) {
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    );
  };

  // ドメインが設定済みの場合
  if (localDomainConfig) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">カスタムドメイン設定</h3>
          {getStatusBadge(localDomainConfig.status)}
        </div>

        {/* 現在のドメイン */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">設定中のドメイン</p>
              <p className="text-lg font-medium text-gray-900">{currentDomain || domain}</p>
              <p className="text-xs text-gray-500 mt-1">
                タイプ: {localDomainConfig.type === 'root' ? 'ルートドメイン' : 'サブドメイン'}
              </p>
            </div>
            <button
              onClick={handleRemove}
              disabled={loading}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              削除
            </button>
          </div>
        </div>

        {/* DNS設定案内 */}
        <div className="mb-6">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            DNSレコード設定
          </h4>
          
          <p className="text-sm text-gray-600 mb-4">
            ドメインレジストラ（お名前.com、ムームードメイン等）の管理画面で以下のDNSレコードを設定してください。
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-gray-700 font-medium">状態</th>
                  <th className="text-left py-2 px-3 text-gray-700 font-medium">タイプ</th>
                  <th className="text-left py-2 px-3 text-gray-700 font-medium">ホスト</th>
                  <th className="text-left py-2 px-3 text-gray-700 font-medium">値</th>
                  <th className="text-left py-2 px-3 text-gray-700 font-medium">用途</th>
                  <th className="py-2 px-3"></th>
                </tr>
              </thead>
              <tbody>
                {localDomainConfig.dnsRecords.map((record, index) => {
                  // @はルートドメインを表すが、実際のDNS設定では空欄で良い場合が多い
                  const displayHost = record.host === '@' ? '' : record.host;
                  return (
                    <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-3">
                        {getVerificationIcon(record.verified)}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded text-xs text-gray-900">
                          {record.type}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={displayHost}
                            readOnly
                            className="font-mono text-gray-900 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm w-32"
                            placeholder="（空欄）"
                          />
                          <button
                            onClick={() => copyToClipboard(displayHost)}
                            className="text-blue-600 hover:text-blue-700"
                            title="ホストをコピー"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={record.value}
                            readOnly
                            className="font-mono text-gray-900 bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm w-48 truncate"
                            title={record.value}
                          />
                          <button
                            onClick={() => copyToClipboard(record.value)}
                            className="text-blue-600 hover:text-blue-700"
                            title="値をコピー"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-xs px-2 py-1 rounded ${
                          record.purpose === 'web' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {record.purpose === 'web' ? 'Web' : 'メール'}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 設定手順 */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">📝 設定手順</h4>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>ドメインレジストラの管理画面にログイン</li>
            <li>DNS設定（DNSレコード管理）画面を開く</li>
            <li>上記のレコードを1つずつ追加</li>
            <li>設定完了後、下の「検証する」ボタンをクリック</li>
          </ol>
          <p className="text-xs text-blue-600 mt-2">
            ※ DNS設定の反映には数分〜数時間かかる場合があります
          </p>
        </div>

        {/* 検証ボタン */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {localDomainConfig.lastCheckedAt && (
              <span>
                最終確認: {new Date(localDomainConfig.lastCheckedAt).toLocaleString('ja-JP')}
              </span>
            )}
          </div>
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {verifying ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                検証中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                DNS設定を検証
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  // ドメイン未設定の場合
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">カスタムドメイン設定</h3>
      
      <p className="text-sm text-gray-600 mb-6">
        独自ドメインを設定すると、そのドメインでサイトにアクセスできるようになります。
      </p>

      <div className="space-y-4">
        {/* ドメイン入力 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            ドメイン
          </label>
          <input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com または blog.example.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
          />
          <p className="text-xs text-gray-500 mt-1">
            ルートドメイン（example.com）またはサブドメイン（blog.example.com）を入力
          </p>
        </div>

        {/* メール機能 */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="enableEmail"
            checked={enableEmail}
            onChange={(e) => setEnableEmail(e.target.checked)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="enableEmail" className="text-sm text-gray-700">
            メール送信機能を有効にする（問い合わせフォーム等）
          </label>
        </div>

        {enableEmail && (
          <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
            <p className="font-medium">⚠️ メール機能を有効にすると：</p>
            <ul className="list-disc list-inside mt-1 text-xs">
              <li>追加のDNSレコード設定が必要になります</li>
              <li>SPF、DKIMの設定が必要です</li>
            </ul>
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* セットアップボタン */}
        <button
          onClick={handleSetup}
          disabled={loading || !domain.trim()}
          className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              設定中...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              ドメインを設定
            </>
          )}
        </button>
      </div>
    </div>
  );
}

