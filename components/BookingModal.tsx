"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { loadPaymentWidget, ANONYMOUS } from '@tosspayments/payment-widget-sdk';
// 🔥 핵심: 공통 타입을 가져옵니다.
import { TeeTimeWithPricing } from '@/utils/supabase/queries';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  teeTime: TeeTimeWithPricing; // 👈 여기가 핵심! 타입을 통일했습니다.
  userId?: number;
  userSegment?: string;
  onSuccess?: () => void;
}

export default function BookingModal({
  isOpen,
  onClose,
  teeTime,
  userId = 1,
  userSegment = 'SMART',
  onSuccess,
}: BookingModalProps) {
  const paymentWidgetRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 가격 계산 (finalPrice가 없으면 price 사용)
  const finalPrice = teeTime.finalPrice || (teeTime as any).price || 0;
  const basePrice = teeTime.basePrice || (teeTime as any).price || 0;

  // 날짜 변환 (Supabase는 ISO 문자열로 줌)
  const teeDate = new Date(teeTime.tee_off); 
  const timeString = teeDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  useEffect(() => {
    if (!isOpen) {
      paymentWidgetRef.current = null;
      setIsReady(false);
      setError(null);
      return;
    }

    const initWidget = async () => {
      try {
        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
        if (!clientKey) {
          throw new Error('Toss Client Key가 설정되지 않았습니다.');
        }

        const customerKey = userId ? `USER-${userId}` : ANONYMOUS;
        const widget = await loadPaymentWidget(clientKey, customerKey);

        // 결제 위젯 렌더링
        await widget.renderPaymentMethods(
          '#payment-widget',
          { value: finalPrice },
          { variantKey: 'DEFAULT' }
        );

        // 이용약관 렌더링 (선택 사항이지만 있으면 좋음)
        await widget.renderAgreement('#agreement', { variantKey: 'AGREEMENT' });

        paymentWidgetRef.current = widget;
        setIsReady(true);
      } catch (err) {
        console.error('Widget initialization failed:', err);
        setError(
          err instanceof Error
            ? err.message
            : '결제 위젯을 불러오는데 실패했습니다.'
        );
      }
    };

    initWidget();
  }, [isOpen, userId, finalPrice]);

  const handlePayment = async () => {
    if (!paymentWidgetRef.current || !isReady) {
      setError('결제 위젯이 준비되지 않았습니다.');
      return;
    }

    try {
      const orderId = `ORD-${Date.now()}-${userId}-${teeTime.id}`;

      // 결제 요청
      await paymentWidgetRef.current.requestPayment({
        orderId,
        orderName: `${teeDate.getMonth()+1}월 ${teeDate.getDate()}일 ${timeString} 티타임`,
        customerName: userId ? `회원 ${userId}` : '비회원 고객',
        successUrl: `${window.location.origin}/api/payments/confirm?tee_time_id=${teeTime.id}&user_id=${userId}`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
      
      if (onSuccess) onSuccess();

    } catch (err) {
      console.error('Payment request failed:', err);
      // 사용자가 취소한 경우는 에러로 처리하지 않음
      if ((err as any).code === 'USER_CANCEL') return;
      
      setError(
        err instanceof Error ? err.message : '결제 요청에 실패했습니다.'
      );
    }
  };

  if (!isOpen) return null;

  const discountAmount = basePrice - finalPrice;
  const discountPercent = basePrice > 0 ? Math.round((discountAmount / basePrice) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom-10 duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">결제하기</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-100"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6">
          {/* Booking Summary */}
          <div className="bg-gray-50 rounded-xl p-5 mb-6 border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-sm font-bold text-blue-600 mb-1">
                  {teeDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
                </div>
                <div className="text-2xl font-black text-gray-900 tracking-tight">
                  {timeString}
                </div>
              </div>
              <div className="bg-white px-3 py-1 rounded-lg border border-gray-200 text-xs font-bold text-gray-500">
                Club 72
              </div>
            </div>

            {/* Pricing Breakdown */}
            <div className="space-y-2 pt-4 border-t border-gray-200">
              <div className="flex justify-between text-sm text-gray-500">
                <span>정상가</span>
                <span className="line-through">{basePrice.toLocaleString()}원</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-red-600 font-bold">
                  <span>할인 ({discountPercent}%)</span>
                  <span>-{discountAmount.toLocaleString()}원</span>
                </div>
              )}
              <div className="flex justify-between items-end pt-2">
                <span className="font-bold text-gray-900">최종 결제 금액</span>
                <span className="text-xl font-black text-blue-600">
                  {finalPrice.toLocaleString()}원
                </span>
              </div>
            </div>
            
            {/* Reasons Chips */}
            {teeTime.reasons && teeTime.reasons.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {teeTime.reasons.map((reason, idx) => (
                  <span key={idx} className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                    {reason}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-red-800 font-bold text-sm mb-1">오류 발생</p>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {!isReady && !error && (
            <div className="flex flex-col items-center justify-center py-12 mb-4">
              <Loader2 className="animate-spin text-blue-600 mb-3" size={32} />
              <p className="text-sm text-gray-500">안전한 결제 환경을 불러오는 중...</p>
            </div>
          )}

          {/* Toss Payment Widget Area */}
          <div id="payment-widget" className="w-full" />
          <div id="agreement" className="w-full" />

          {/* Payment Button */}
          <button
            onClick={handlePayment}
            disabled={!isReady || !!error}
            className={`w-full py-4 mt-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
              !isReady || error
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
            }`}
          >
            {finalPrice.toLocaleString()}원 결제하기
          </button>
        </div>
      </div>
    </div>
  );
}