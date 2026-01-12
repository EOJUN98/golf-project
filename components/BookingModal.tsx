"use client";

import React, { useState, useEffect } from 'react';
import { X, Loader2, AlertCircle } from 'lucide-react';
import { loadPaymentWidget, PaymentWidgetInstance } from '@tosspayments/payment-widget-sdk';

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
  const [paymentWidget, setPaymentWidget] = useState<PaymentWidgetInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Toss Payment Widget
  useEffect(() => {
    if (!isOpen) return;

    async function initializeWidget() {
      try {
        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;

        if (!clientKey) {
          throw new Error('Toss Client Key not found');
        }

        const widget = await loadPaymentWidget(clientKey, userId.toString());
        setPaymentWidget(widget);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to load payment widget:', err);
        setError('결제 위젯을 불러오는데 실패했습니다.');
        setIsLoading(false);
      }
    }

    initializeWidget();
  }, [isOpen, userId]);

  // Render payment widget when ready
  useEffect(() => {
    if (!paymentWidget || !isOpen) return;

    try {
      paymentWidget.renderPaymentMethods('#payment-widget', teeTime.finalPrice);
    } catch (err) {
      console.error('Failed to render payment widget:', err);
      setError('결제 위젯 렌더링에 실패했습니다.');
    }
  }, [paymentWidget, isOpen, teeTime.finalPrice]);

  if (!isOpen) return null;

  const handlePayment = async () => {
    if (!paymentWidget) {
      setError('결제 위젯이 준비되지 않았습니다.');
      return;
    }

    try {
      // Generate unique order ID with metadata
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
          discountPercent: Math.round(((teeTime.basePrice - teeTime.finalPrice) / teeTime.basePrice) * 100),
          reasons: teeTime.reasons,
          userSegment,
        },
      };
      sessionStorage.setItem('paymentMetadata', JSON.stringify(metadata));

      // Request payment
      await paymentWidget.requestPayment({
        orderId,
        orderName: `${teeTime.teeOffTime.toLocaleDateString()} ${teeTime.time} 티타임`,
        customerName: `User ${userId}`,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch (err) {
      console.error('Payment request failed:', err);
      setError(err instanceof Error ? err.message : '결제 요청에 실패했습니다.');
    }
  };

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
            className="text-gray-400 hover:text-gray-600 transition-colors"
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
              {teeTime.weather.temperature && <span>• {teeTime.weather.temperature}°C</span>}
              <span>• 강수확률 {teeTime.weather.rainProb}%</span>
            </div>
          )}

          {/* Pricing */}
          <div className="border-t border-blue-200 pt-3 mt-3">
            <div className="flex justify-between text-sm text-gray-600 mb-1">
              <span>정가</span>
              <span className="line-through">{teeTime.basePrice.toLocaleString()}원</span>
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

        {/* Payment Widget Container */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="animate-spin text-blue-600" size={40} />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
            <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
            <div>
              <p className="text-red-800 font-bold text-sm mb-1">오류 발생</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        ) : (
          <div id="payment-widget" className="mb-4" />
        )}

        {/* Payment Button */}
        {!isLoading && !error && (
          <button
            onClick={handlePayment}
            className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg active:scale-95"
          >
            {teeTime.finalPrice.toLocaleString()}원 결제하기
          </button>
        )}

        {/* Terms */}
        <p className="text-xs text-gray-500 text-center mt-4">
          예약 확정 후 취소 시 환불 정책이 적용됩니다.
        </p>
      </div>
    </div>
  );
}
