// ==================================================================
// Booking Modal Component
// ==================================================================

import React, { useState } from 'react';
import { X, Check, Loader2, AlertCircle } from 'lucide-react';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleBooking = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Booking failed');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create reservation');
      setIsSubmitting(false);
    }
  };

  const discountAmount = teeTime.basePrice - teeTime.finalPrice;
  const discountPercent = Math.round((discountAmount / teeTime.basePrice) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">예약 확인</h2>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X size={24} />
          </button>
        </div>

        {/* Success State */}
        {success && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Check size={32} className="text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">예약 완료!</h3>
            <p className="text-gray-600">티타임이 성공적으로 예약되었습니다.</p>
          </div>
        )}

        {/* Error State */}
        {error && !success && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-red-700 mb-1">예약 실패</h4>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Booking Details */}
        {!success && (
          <>
            <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-3">
              {/* Tee Time */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">티오프 시간</span>
                <span className="text-gray-900 font-bold text-lg">{teeTime.time}</span>
              </div>

              {/* Date */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">날짜</span>
                <span className="text-gray-900">
                  {teeTime.teeOffTime.toLocaleDateString('ko-KR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    weekday: 'short',
                  })}
                </span>
              </div>

              {/* Weather */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">날씨</span>
                <span className="text-gray-900">
                  {teeTime.weather.sky} {teeTime.weather.temperature}°C · 강수확률 {teeTime.weather.rainProb}%
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 my-3"></div>

              {/* Original Price */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">정가</span>
                <span className="text-gray-400 line-through">{teeTime.basePrice.toLocaleString()}원</span>
              </div>

              {/* Discount */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600 font-medium">할인</span>
                <span className="text-red-600 font-bold">-{discountAmount.toLocaleString()}원 ({discountPercent}%)</span>
              </div>

              {/* Discount Reasons */}
              {teeTime.reasons.length > 0 && (
                <div className="pt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {teeTime.reasons.map((reason, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium"
                      >
                        {reason}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-gray-200 my-3"></div>

              {/* Final Price */}
              <div className="flex justify-between items-center">
                <span className="text-gray-900 font-bold text-lg">최종 결제 금액</span>
                <span className="text-blue-600 font-black text-2xl">{teeTime.finalPrice.toLocaleString()}원</span>
              </div>
            </div>

            {/* User Segment Badge */}
            <div className="mb-6 flex items-center justify-center gap-2">
              <span className="text-sm text-gray-600">회원 등급:</span>
              <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                {userSegment}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 bg-gray-200 text-gray-700 py-4 rounded-xl font-bold text-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleBooking}
                disabled={isSubmitting}
                className="flex-1 bg-black text-white py-4 rounded-xl font-bold text-lg hover:bg-gray-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    예약 중...
                  </>
                ) : (
                  '예약 확정'
                )}
              </button>
            </div>

            {/* Terms */}
            <p className="text-xs text-gray-500 text-center mt-4">
              예약 확정 시 <span className="underline">취소 및 환불 규정</span>에 동의하게 됩니다.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
