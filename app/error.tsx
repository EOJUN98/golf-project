'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[App Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-lg">
        <AlertTriangle size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          문제가 발생했습니다
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          일시적인 오류가 발생했습니다. 다시 시도해주세요.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4">오류 코드: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors"
          >
            <RefreshCw size={16} />
            다시 시도
          </button>
          <a
            href="/"
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            <Home size={16} />
            홈으로
          </a>
        </div>
      </div>
    </div>
  );
}
