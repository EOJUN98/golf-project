"use client";

import React, { useState, useEffect, useRef } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { loadPaymentWidget, ANONYMOUS } from '@tosspayments/payment-widget-sdk';

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  teeTime: {
    id: number;
    time: string;
    teeOffTime: Date;
    basePrice: number;
    finalPrice: number;
    reasons: string[];
    weather: {
      sky?: string;
      temperature?: number;
      rainProb: number;
    };
  };
  userId: number;
  userSegment: string;
  onSuccess: () => void;
}

export default function BookingModal({
  isOpen,
  onClose,
  teeTime,
  userId,
  userSegment,
  onSuccess,
}: BookingModalProps) {
  const [paymentWidget, setPaymentWidget] = useState<any>(null);
  const [isWidgetReady, setIsWidgetReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Initialize payment widget when modal opens
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setPaymentWidget(null);
      setIsWidgetReady(false);
      setIsLoading(false);
      setError(null);
      hasInitialized.current = false;
      return;
    }

    // Prevent double initialization
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initializeWidget = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

        if (!clientKey) {
          throw new Error('Toss Client Key가 설정되지 않았습니다.');
        }

        // Step 1: Load payment widget
        const customerKey = userId ? `USER-${userId}` : ANONYMOUS;
        const widget = await loadPaymentWidget(clientKey, customerKey);

        // Step 2: Wait for container to be in DOM
        await new Promise(resolve => setTimeout(resolve, 150));

        // Step 3: Render payment methods to the container
        await widget.renderPaymentMethods(
          '#payment-widget',
          { value: teeTime.finalPrice },
          { variantKey: 'DEFAULT' }
        );

        // Step 4: Wait for widget to fully render in DOM (critical!)
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Step 5: Verify widget is actually in DOM
        let widgetElement = document.querySelector('#payment-widget iframe');
        let retries = 0;
        const maxRetries = 5;

        while (!widgetElement && retries < maxRetries) {
          console.warn(`Widget iframe not found (attempt ${retries + 1}/${maxRetries}), waiting...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          widgetElement = document.querySelector('#payment-widget iframe');
          retries++;
        }

        if (!widgetElement) {
          console.error('Widget iframe never appeared after multiple retries');
          throw new Error('결제 위젯 로딩 실패: iframe이 생성되지 않았습니다.');
        }

        console.log('✅ Payment widget iframe found and ready');

        // Step 6: Mark as ready
        setPaymentWidget(widget);
        setIsWidgetReady(true);
      } catch (err) {
        console.error('Failed to initialize payment widget:', err);
        setError(
          err instanceof Error
            ? err.message
            : '결제 위젯을 불러오는데 실패했습니다.'
        );
      } finally {
        setIsLoading(false);
      }
    };

    initializeWidget();
  }, [isOpen, userId, teeTime.finalPrice]);

  const handlePayment = async () => {
    console.log('💳 Payment button clicked');
    console.log('Widget ready state:', { paymentWidget: !!paymentWidget, isWidgetReady });

    if (!paymentWidget || !isWidgetReady) {
      console.error('❌ Widget not ready');
      setError('결제 위젯이 준비되지 않았습니다. 잠시만 기다려주세요.');
      return;
    }

    // Double-check widget is actually ready
    const widgetElement = document.querySelector('#payment-widget iframe');
    console.log('Widget iframe check:', !!widgetElement);

    if (!widgetElement) {
      console.error('❌ Widget iframe not found in DOM');
      setError('결제 위젯을 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      return;
    }

    try {
      // Extra safety: Small delay before payment request
      console.log('⏳ Waiting 500ms before payment request...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // Generate unique order ID with embedded metadata
      const orderId = `ORD-${Date.now()}-${userId}-${teeTime.id}`;

      // Store metadata in sessionStorage for success page
      const metadata = {
        userId,
        teeTimeId: teeTime.id,
        finalPrice: teeTime.finalPrice,
        discountBreakdown: {
          basePrice: teeTime.basePrice,
          finalPrice: teeTime.finalPrice,
          discountAmount: teeTime.basePrice - teeTime.finalPrice,
          discountPercent: Math.round(
            ((teeTime.basePrice - teeTime.finalPrice) / teeTime.basePrice) * 100
          ),
          reasons: teeTime.reasons,
          userSegment,
        },
      };
      sessionStorage.setItem('paymentMetadata', JSON.stringify(metadata));

      console.log('🚀 Requesting payment with orderId:', orderId);

      // Request payment
      await paymentWidget.requestPayment({
        orderId,
        orderName: `${teeTime.teeOffTime.toLocaleDateString()} ${teeTime.time} 티타임`,
        customerName: userId ? `회원 ${userId}` : '비회원 고객',
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });

      console.log('✅ Payment request sent successfully');
    } catch (err) {
      console.error('❌ Payment request failed:', err);
      const errorMessage = err instanceof Error ? err.message : '결제 요청에 실패했습니다.';

      // If still getting render error, tell user to wait
      if (errorMessage.includes('렌더링') || errorMessage.includes('rendered')) {
        setError('결제 UI를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
      } else {
        setError(errorMessage);
      }
    }
  };

  if (!isOpen) return null;

  const discountAmount = teeTime.basePrice - teeTime.finalPrice;
  const discountPercent = Math.round((discountAmount / teeTime.basePrice) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl animate-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">결제하기</h2>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Booking Summary */}
        <div className="bg-blue-50 rounded-xl p-4 mb-6">
          <div className="text-sm text-gray-600 mb-2">
            {teeTime.teeOffTime.toLocaleDateString('ko-KR', {
              month: 'long',
              day: 'numeric',
              weekday: 'short',
            })}
          </div>
          <div className="text-xl font-bold text-gray-900 mb-3">
            {teeTime.time}
          </div>

          {/* Weather */}
          {teeTime.weather.sky && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <span>{teeTime.weather.sky}</span>
              {teeTime.weather.temperature && (
                <span>• {teeTime.weather.temperature}°C</span>
              )}
              <span>• 강수확률 {teeTime.weather.rainProb}%</span>
            </div>
          )}

          {/* Pricing */}
          <div className="border-t border-blue-200 pt-3 mt-3">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>정가</span>
              <span className="line-through">
                {teeTime.basePrice.toLocaleString()}원
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
              <span>{teeTime.finalPrice.toLocaleString()}원</span>
            </div>
          </div>

          {/* Discount Reasons */}
          {teeTime.reasons.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {teeTime.reasons.map((reason, idx) => (
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

        {/* Loading Indicator */}
        {(isLoading || !isWidgetReady) && !error && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4 mb-4">
            <Loader2 className="animate-spin text-blue-600" size={40} />
            <p className="text-sm text-gray-500">
              {isLoading ? '결제 정보를 불러오고 있습니다...' : '결제 위젯을 준비하고 있습니다...'}
            </p>
          </div>
        )}

        {/* Payment Widget Container - ALWAYS PRESENT */}
        <div
          id="payment-widget"
          ref={widgetContainerRef}
          className={`w-full transition-opacity duration-500 ${
            isLoading || !isWidgetReady ? 'opacity-0 h-0 overflow-hidden' : 'opacity-100'
          }`}
          style={{ minHeight: isLoading || !isWidgetReady ? '0' : '300px' }}
        />

        {/* Payment Button */}
        <button
          onClick={handlePayment}
          disabled={!isWidgetReady || isLoading || !!error}
          className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg mt-4 transition-all ${
            !isWidgetReady || isLoading || error
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
          }`}
        >
          {isLoading
            ? '결제 정보 불러오는 중...'
            : !isWidgetReady
            ? '결제 위젯 준비 중...'
            : error
            ? '결제 불가'
            : `${teeTime.finalPrice.toLocaleString()}원 결제하기`}
        </button>

        {/* Terms */}
        <p className="text-xs text-gray-500 text-center mt-4">
          예약 확정 후 취소 시 환불 정책이 적용됩니다.
        </p>
      </div>
    </div>
  );
}
