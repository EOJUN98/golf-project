"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { loadPaymentWidget, ANONYMOUS } from '@tosspayments/payment-widget-sdk';
// ✅ 핵심: 공통 타입을 가져와서 page.tsx와 서로 말이 통하게 맞춤
import { TeeTimeWithPricing } from '@/utils/supabase/queries';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  teeTime: TeeTimeWithPricing;
  userId?: string; // UUID string
  userSegment?: string;
  onSuccess?: () => void;
}

export default function BookingModal({
  isOpen,
  onClose,
  teeTime,
  userId, // No default value
  userSegment = 'SMART',
  onSuccess,
}: BookingModalProps) {
  const paymentWidgetRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ 데이터 변환: DB에서 온 데이터(teeTime)를 화면에 뿌리기 좋게 변수에 담음
  // 1. 가격 (finalPrice가 없으면 price 사용)
  const finalPrice = teeTime.finalPrice || (teeTime as any).price || 0;
  const basePrice = teeTime.basePrice || (teeTime as any).price || 0;
  
  // 2. 날짜 (ISO String -> Date 객체 변환)
  const teeDate = new Date(teeTime.tee_off);
  const timeString = teeDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  const dateString = teeDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

  // 3. 날씨 (없을 경우 대비)
  const weather = teeTime.weather || { sky: '맑음', temperature: 20, rainProb: 0 };
  
  // 4. 이유 태그 (없을 경우 빈 배열)
  const reasons = teeTime.reasons || [];

  // 위젯 초기화
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

        // 비회원/회원 구분
        const customerKey = userId ? `USER-${userId}` : ANONYMOUS;
        const widget = await loadPaymentWidget(clientKey, customerKey);

        // 결제 UI 렌더링
        await widget.renderPaymentMethods(
          '#payment-widget',
          { value: finalPrice },
          { variantKey: 'DEFAULT' }
        );

        // 이용약관 렌더링 (선택)
        await widget.renderAgreement(
          '#agreement', 
          { variantKey: 'AGREEMENT' }
        );

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
      setError('결제 위젯이 준비되지 않았습니다. 잠시만 기다려주세요.');
      return;
    }

    try {
      const orderId = `ORD-${Date.now()}-${userId}-${teeTime.id}`;

      // 결제 성공 페이지에서 보여줄 데이터를 세션에 저장 (선택 사항)
      const metadata = {
        userId,
        teeTimeId: teeTime.id,
        finalPrice: finalPrice,
        discountBreakdown: {
          basePrice: basePrice,
          finalPrice: finalPrice,
          discountAmount: basePrice - finalPrice,
          reasons: reasons,
          userSegment,
        },
      };
      sessionStorage.setItem('paymentMetadata', JSON.stringify(metadata));

      // 결제 요청
      await paymentWidgetRef.current.requestPayment({
        orderId,
        orderName: `${dateString} ${timeString} 티타임`,
        customerName: userId ? `회원 ${userId}` : '비회원 고객',
        successUrl: `${window.location.origin}/api/payments/confirm?tee_time_id=${teeTime.id}&user_id=${userId}`,
        failUrl: `${window.location.origin}/payment/fail`,
      });

      if (onSuccess) onSuccess();

    } catch (err) {
      console.error('Payment request failed:', err);
      if ((err as any).code === 'USER_CANCEL') return; // 사용자가 창을 닫은 건 에러 아님
      
      setError(
        err instanceof Error ? err.message : '결제 요청에 실패했습니다.'
      );
    }
  };

  if (!isOpen) return null;

  // 할인율 계산
  const discountAmount = basePrice - finalPrice;
  const discountPercent = basePrice > 0 ? Math.round((discountAmount / basePrice) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">결제하기</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Booking Summary */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <div className="text-sm text-gray-600 mb-2">
            {dateString}
          </div>
          <div className="text-xl font-bold text-gray-900 mb-3">
            {timeString}
          </div>

          {/* Weather */}
          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
            <span>{weather.sky || '맑음'}</span>
            {weather.temperature && (
              <span>• {weather.temperature}°C</span>
            )}
            <span>• 강수확률 {weather.rainProb || 0}%</span>
          </div>

          {/* Pricing */}
          <div className="border-t border-blue-200 pt-3 mt-3">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>정가</span>
              <span className="line-through">
                {basePrice.toLocaleString()}원
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-sm text-red-600 font-bold mb-2">
                <span>할인 ({discountPercent}%)</span>
                <span>-{discountAmount.toLocaleString()}원</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-black text-blue-600">
              <span>최종 금액</span>
              <span>{finalPrice.toLocaleString()}원</span>
            </div>
          </div>

          {/* Discount Reasons */}
          {reasons.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {reasons.map((reason, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium"
                >
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
            <Loader2 className="animate-spin text-blue-600 mb-3" size={40} />
            <p className="text-sm text-gray-500">결제 위젯을 불러오는 중...</p>
          </div>
        )}

        {/* Payment Widget Container */}
        <div
          id="payment-widget"
          className="w-full mb-4"
          style={{ minHeight: isReady ? '300px' : '0' }}
        />
        
        {/* Agreement (Optional) */}
        <div id="agreement" className="w-full mb-4" />

        {/* Payment Button */}
        <button
          onClick={handlePayment}
          disabled={!isReady || !!error}
          className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
            !isReady || error
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
          }`}
        >
          {!isReady
            ? '결제 위젯 준비 중...'
            : error
            ? '결제 불가'
            : `${finalPrice.toLocaleString()}원 결제하기`}
        </button>

        {/* Terms */}
        <p className="text-xs text-gray-500 text-center mt-4">
          예약 확정 후 취소 시 환불 정책이 적용됩니다.
        </p>
      </div>
    </div>
  );
}