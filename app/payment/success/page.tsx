"use client";

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('결제를 확인하고 있습니다...');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

  useEffect(() => {
    async function confirmPayment() {
      try {
        // Extract query params
        const paymentKey = searchParams.get('paymentKey');
        const orderId = searchParams.get('orderId');
        const amount = searchParams.get('amount');

        if (!paymentKey || !orderId || !amount) {
          setStatus('error');
          setMessage('결제 정보가 올바르지 않습니다.');
          setErrorDetails('Missing payment parameters');
          return;
        }

        // Extract metadata from orderId (format: ORD-{timestamp}-{userId}-{teeTimeId})
        const orderParts = orderId.split('-');
        if (orderParts.length < 4) {
          setStatus('error');
          setMessage('주문 정보가 올바르지 않습니다.');
          setErrorDetails('Invalid orderId format');
          return;
        }

        const userId = parseInt(orderParts[2]);
        const teeTimeId = parseInt(orderParts[3]);

        // Get additional metadata from sessionStorage if available
        const storedMetadata = sessionStorage.getItem('paymentMetadata');
        let metadata = { userId, teeTimeId, finalPrice: parseInt(amount), discountBreakdown: null };

        if (storedMetadata) {
          try {
            const parsed = JSON.parse(storedMetadata);
            metadata = { ...metadata, ...parsed };
            sessionStorage.removeItem('paymentMetadata'); // Clean up
          } catch (e) {
            console.warn('Failed to parse stored metadata:', e);
          }
        }

        // Call backend to confirm payment
        const response = await fetch('/api/payments/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: parseInt(amount),
            metadata,
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          setStatus('error');
          setMessage(result.error || '결제 확인에 실패했습니다.');
          setErrorDetails(result.details || result.warning || null);
          return;
        }

        // Success!
        setStatus('success');
        setMessage('결제가 완료되었습니다!');

        // Redirect to reservations page after 2 seconds
        setTimeout(() => {
          router.push('/reservations');
        }, 2000);
      } catch (error) {
        console.error('Payment confirmation error:', error);
        setStatus('error');
        setMessage('결제 확인 중 오류가 발생했습니다.');
        setErrorDetails(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    confirmPayment();
  }, [searchParams, router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        {status === 'processing' && (
          <>
            <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">{message}</h1>
            <p className="text-gray-600 text-sm">잠시만 기다려주세요...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{message}</h1>
            <p className="text-gray-600 mb-6">예약 내역 페이지로 이동합니다.</p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/reservations')}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-colors"
              >
                예약 내역 보기
              </button>
              <button
                onClick={() => router.push('/')}
                className="flex-1 bg-gray-200 text-gray-800 py-3 rounded-xl font-bold hover:bg-gray-300 transition-colors"
              >
                홈으로
              </button>
            </div>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{message}</h1>
            {errorDetails && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-700 text-sm">{errorDetails}</p>
              </div>
            )}
            <p className="text-gray-600 mb-6">
              문제가 지속되면 고객센터로 문의해주세요.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/')}
                className="flex-1 bg-gray-900 text-white py-3 rounded-xl font-bold hover:bg-gray-800 transition-colors"
              >
                홈으로 돌아가기
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
