'use client';

import { useEffect } from 'react';
import { CreditCard, RefreshCw, Phone } from 'lucide-react';

export default function PaymentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Payment Error]', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 text-center shadow-lg">
        <CreditCard size={48} className="text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          결제 처리 중 오류 발생
        </h2>
        <p className="text-sm text-gray-600 mb-2">
          결제가 정상적으로 처리되지 않았습니다.
        </p>
        <p className="text-sm text-gray-600 mb-6">
          카드 승인이 완료된 경우 자동으로 취소되며, 실제 청구되지 않습니다.
        </p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4">오류 코드: {error.digest}</p>
        )}
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors"
          >
            <RefreshCw size={16} />
            다시 시도
          </button>
          <a
            href="/"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors"
          >
            홈으로 돌아가기
          </a>
          <div className="flex items-center justify-center gap-2 text-xs text-gray-500 mt-2">
            <Phone size={12} />
            <span>문제가 지속되면 고객센터로 문의해주세요</span>
          </div>
        </div>
      </div>
    </div>
  );
}
