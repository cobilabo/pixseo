'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/firebase/auth';
import Image from 'next/image';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      router.push('/');
    } catch (err) {
      console.error('Login error:', err);
      setError('ログインに失敗しました。メールアドレスとパスワードを確認してください。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        {/* 白背景の正円コンテナ + 共通シャドウ */}
        <div className="bg-white rounded-[50%] w-[28rem] h-[28rem] flex items-center justify-center p-12 shadow-custom mx-auto">
          <div className="w-full max-w-xs space-y-8">
            {/* ロゴ */}
            <div className="flex justify-center mb-8">
              <div className="relative w-40 h-40">
                <Image
                  src="/logo_tate_b.svg"
                  alt="PIXSEO Logo"
                  fill
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* タイトル */}
            <div className="text-center space-y-2">
              <h2 className="text-lg font-bold text-gray-900 tracking-wide">
                ADMIN LOGIN
              </h2>
              <p className="text-xs text-gray-600 leading-relaxed">
                SEO 対応、爆速スワイプ型オウンドメディア
              </p>
            </div>

            {/* フォーム */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* メールアドレスフィールド */}
              <div>
                <label htmlFor="email-address" className="sr-only">
                  メールアドレス
                </label>
                <input
                  id="email-address"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-[1.75rem] focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent sm:text-sm"
                  placeholder="メールアドレス"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* パスワードフィールド */}
              <div>
                <label htmlFor="password" className="sr-only">
                  パスワード
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-400 text-gray-900 rounded-[1.75rem] focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent sm:text-sm"
                  placeholder="パスワード"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              {/* エラーメッセージ */}
              {error && (
                <div className="rounded-[1.75rem] bg-red-50 p-4">
                  <p className="text-sm text-red-800 text-center">{error}</p>
                </div>
              )}

              {/* ログインボタン */}
              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-4 px-4 border border-transparent text-base font-semibold rounded-[1.75rem] text-white bg-[#2563eb] hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {loading ? 'ログイン中...' : 'ログイン'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

