/**
 * SDD-05: Reservation Detail Page
 *
 * Main page for viewing reservation details with:
 * - Reservation info (tee time, golf club, price)
 * - Status badges (PAID, CANCELLED, IMMINENT, etc.)
 * - Weather badge and forecast
 * - Cancellation policy sections
 * - Cancellation button (conditional)
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ReservationDetail, ReservationDetailUIState, WeatherData, CancellationEligibility } from '@/types/reservationDetail';
import { calculateHoursLeft, formatCurrency, formatTeeOffTime, getCancelReasonText } from '@/utils/reservationDetailHelpers';
import WeatherBadge from '@/components/reservation/WeatherBadge';
import StatusBadges from '@/components/reservation/StatusBadges';
import CancellationPolicy from '@/components/reservation/CancellationPolicy';
import CancellationButton from '@/components/reservation/CancellationButton';
import { Loader2, MapPin, Calendar, Clock, CreditCard, ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

interface ReservationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function ReservationDetailPage({ params }: ReservationDetailPageProps) {
  const router = useRouter();
  const [resolvedParams, setResolvedParams] = useState<{ id: string } | null>(null);
  const [data, setData] = useState<ReservationDetail | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [eligibility, setEligibility] = useState<CancellationEligibility | null>(null);
  const [uiState, setUIState] = useState<ReservationDetailUIState>({
    isLoading: true,
    showCancelModal: false,
    isCancelling: false,
    cancelError: null,
    weatherStatus: 'unknown',
    eligibility: null
  });

  // Resolve params
  useEffect(() => {
    params.then(p => setResolvedParams(p));
  }, [params]);

  // Fetch reservation detail
  useEffect(() => {
    if (!resolvedParams) return;

    async function fetchData() {
      try {
        const res = await fetch(`/api/reservation/${resolvedParams!.id}`);
        if (!res.ok) {
          throw new Error('Failed to fetch reservation');
        }

        const result = await res.json();
        if (result.success && result.data) {
          setData(result.data);
          setWeather(result.data.weather);
          setEligibility(result.data.eligibility);
        }
      } catch (error) {
        console.error('[ReservationDetail] Fetch error:', error);
      } finally {
        setUIState(prev => ({ ...prev, isLoading: false }));
      }
    }

    fetchData();
  }, [resolvedParams]);

  // Handle cancellation
  const handleCancel = async () => {
    if (!data || !resolvedParams) return;

    setUIState(prev => ({ ...prev, isCancelling: true, cancelError: null }));

    try {
      const res = await fetch('/api/reservations/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reservationId: resolvedParams.id,
          userId: data.user.id,
          cancelReason: 'USER_REQUEST'
        })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Cancellation failed');
      }

      // Show success and redirect
      alert(`취소가 완료되었습니다.\n환불 예정 금액: ${formatCurrency(result.refundAmount || 0)}`);
      router.push('/reservations');
    } catch (error: any) {
      console.error('[ReservationDetail] Cancel error:', error);
      setUIState(prev => ({ ...prev, cancelError: error.message }));
      alert(`취소 실패: ${error.message}`);
    } finally {
      setUIState(prev => ({ ...prev, isCancelling: false }));
    }
  };

  // Loading state
  if (uiState.isLoading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const { reservation, teeTime, golfClub, user } = data;
  const hoursLeft = calculateHoursLeft(teeTime.tee_off);
  const teeOffFormatted = formatTeeOffTime(teeTime.tee_off);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">돌아가기</span>
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Title & Status Badges */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">예약 상세</h1>
          <StatusBadges reservation={reservation} user={user} eligibility={eligibility} />
        </div>

        {/* Golf Club & Tee Time Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">골프장 정보</h2>

          {/* Golf Club Name */}
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">{golfClub.name}</p>
              {golfClub.location_name && (
                <p className="text-sm text-gray-600 mt-1">{golfClub.location_name}</p>
              )}
            </div>
          </div>

          {/* Tee Off Time */}
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">
                {teeOffFormatted.date} ({teeOffFormatted.dayOfWeek})
              </p>
              <p className="text-sm text-gray-600 mt-1 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {teeOffFormatted.time} 티오프
              </p>
            </div>
          </div>

          {/* Hours Left */}
          {reservation.status === 'PAID' && hoursLeft > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                티오프까지 <span className="font-bold">{hoursLeft.toFixed(1)}시간</span> 남음
              </p>
            </div>
          )}
        </div>

        {/* Weather Badge */}
        {weather && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">기상 예보</h2>
            <WeatherBadge weather={weather} teeOff={teeTime.tee_off} />
          </div>
        )}

        {/* Payment Info */}
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">결제 정보</h2>

          <div className="space-y-3">
            {/* Base Price */}
            {teeTime.base_price && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">정가</span>
                <span className="text-gray-900">{formatCurrency(teeTime.base_price)}</span>
              </div>
            )}

            {/* Final Price */}
            <div className="flex justify-between items-center pt-3 border-t">
              <span className="font-medium text-gray-900">최종 결제 금액</span>
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(reservation.final_price)}
              </span>
            </div>

            {/* Payment Status */}
            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                결제 상태: <span className="font-medium">{reservation.status}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Cancellation Info (if cancelled) */}
        {reservation.status === 'CANCELLED' && reservation.cancelled_at && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-6 space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-orange-600" />
              <h3 className="font-semibold text-orange-900">취소 완료</h3>
            </div>
            <div className="space-y-2 text-sm text-orange-800">
              <p>취소 일시: {new Date(reservation.cancelled_at).toLocaleString('ko-KR')}</p>
              <p>취소 사유: {getCancelReasonText(reservation.cancel_reason)}</p>
              {reservation.refund_amount > 0 && (
                <p className="font-medium">
                  환불 금액: {formatCurrency(reservation.refund_amount)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* No-Show Info */}
        {reservation.status === 'NO_SHOW' && reservation.no_show_marked_at && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 space-y-3">
            <div className="flex items-center gap-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <h3 className="font-semibold text-red-900">노쇼 처리</h3>
            </div>
            <div className="space-y-2 text-sm text-red-800">
              <p>노쇼 처리 일시: {new Date(reservation.no_show_marked_at).toLocaleString('ko-KR')}</p>
              <p>환불 불가 (노쇼 페널티 적용)</p>
              {user.is_suspended && (
                <p className="font-medium mt-2 bg-red-100 border border-red-300 rounded p-2">
                  ⚠ 계정이 정지되었습니다. 추가 예약이 제한됩니다.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Cancellation Policy */}
        {reservation.status === 'PAID' && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <CancellationPolicy
              reservation={reservation}
              eligibility={eligibility}
              hoursLeft={hoursLeft}
            />
          </div>
        )}

        {/* Cancellation Button */}
        {reservation.status === 'PAID' && eligibility && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <CancellationButton
              reservation={reservation}
              eligibility={eligibility}
              onCancel={handleCancel}
              isLoading={uiState.isCancelling}
            />

            {/* Cancel Not Available Message */}
            {!eligibility.canCancel && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">
                  취소 불가: {eligibility.reason}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  문의사항은 골프장으로 연락해 주세요
                </p>
              </div>
            )}
          </div>
        )}

        {/* Reservation ID (for support) */}
        <div className="text-center">
          <p className="text-xs text-gray-400">
            예약 ID: {reservation.id}
          </p>
        </div>
      </div>
    </div>
  );
}
