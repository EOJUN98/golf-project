"use client";

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, Home } from 'lucide-react';

function PaymentFailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const errorCode = searchParams.get('code');
  const errorMessage = searchParams.get('message');

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-10 h-10 text-red-600" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">결제에 실패했습니다</h1>

        <p className="text-gray-600 mb-6">
          결제 과정에서 문제가 발생했습니다.
        </p>

        {(errorCode || errorMessage) && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
            {errorCode && (
              <div className="mb-2">
                <span className="text-xs font-bold text-red-800">오류 코드:</span>
                <span className="text-sm text-red-700 ml-2">{errorCode}</span>
              </div>
            )}
            {errorMessage && (
              <div>
                <span className="text-xs font-bold text-red-800">오류 메시지:</span>
                <p className="text-sm text-red-700 mt-1">{errorMessage}</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
          >
            <Home size={20} />
            홈으로 돌아가기
          </button>

          <button
            onClick={() => router.back()}
            className="w-full bg-gray-200 text-gray-800 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors"
          >
            다시 시도하기
          </button>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500">
            문제가 계속되면 고객센터(1234-5678)로 문의해주세요.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    }>
      <PaymentFailContent />
    </Suspense>
  );
}
