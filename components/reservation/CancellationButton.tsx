/**
 * SDD-05: Cancellation Button Component
 *
 * Displays cancellation button with confirmation modal
 * Only shown when eligibility rules are met:
 * - canCancel === true
 * - User not suspended
 * - Not imminent deal
 * - Status is PAID
 */

'use client';

import { useState } from 'react';
import { CancellationButtonProps } from '@/types/reservationDetail';
import { shouldShowCancelButton } from '@/utils/reservationDetailHelpers';
import { AlertTriangle, X, Loader2 } from 'lucide-react';

export default function CancellationButton({
  reservation,
  eligibility,
  onCancel,
  isLoading
}: CancellationButtonProps) {
  const [showModal, setShowModal] = useState(false);

  // Check if button should be shown
  const showButton = eligibility && eligibility.canCancel && reservation.status === 'PAID';

  if (!showButton) {
    return null;
  }

  const handleConfirmCancel = () => {
    onCancel();
    setShowModal(false);
  };

  return (
    <>
      {/* Cancel Button */}
      <button
        onClick={() => setShowModal(true)}
        disabled={isLoading}
        className="w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 active:bg-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            취소 처리 중...
          </span>
        ) : (
          '예약 취소하기'
        )}
      </button>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">예약 취소 확인</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {/* Warning Icon */}
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                </div>
              </div>

              {/* Message */}
              <div className="text-center space-y-2">
                <p className="text-gray-900 font-medium">
                  정말 예약을 취소하시겠습니까?
                </p>
                <p className="text-sm text-gray-600">
                  취소 후 전액 환불이 진행됩니다.
                </p>
                {eligibility && eligibility.hoursLeft > 0 && (
                  <p className="text-xs text-gray-500">
                    티오프까지 {eligibility.hoursLeft.toFixed(1)}시간 남음
                  </p>
                )}
              </div>

              {/* Refund Amount */}
              {reservation.final_price && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-900 font-medium">환불 예정 금액</span>
                    <span className="text-lg font-bold text-blue-900">
                      {new Intl.NumberFormat('ko-KR', {
                        style: 'currency',
                        currency: 'KRW'
                      }).format(reservation.final_price)}
                    </span>
                  </div>
                  <p className="text-xs text-blue-700 mt-2">
                    환불은 결제 수단에 따라 2-7일 소요될 수 있습니다
                  </p>
                </div>
              )}

              {/* Warning Note */}
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                <p className="text-xs text-orange-800">
                  ⚠ 취소 후에는 되돌릴 수 없습니다. 신중히 결정해 주세요.
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-6 border-t">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                돌아가기
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white font-medium rounded-lg hover:bg-red-700 active:bg-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    처리 중
                  </span>
                ) : (
                  '취소 확정'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
