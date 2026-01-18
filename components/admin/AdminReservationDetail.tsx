/**
 * SDD-06: Admin Reservation Detail Component
 *
 * Displays reservation details with admin actions
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminReservationDetail as DetailType } from '@/types/adminManagement';
import { markReservationAsNoShow, unsuspendUser } from '@/app/admin/actions';
import { formatCurrency, formatTeeOffTime, getCancelReasonText, calculateHoursLeft } from '@/utils/reservationDetailHelpers';
import { ArrowLeft, AlertTriangle, UserX, CheckCircle, Loader2, MapPin, Calendar, Clock, CreditCard } from 'lucide-react';

interface Props {
  detail: DetailType;
}

export default function AdminReservationDetail({ detail }: Props) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { reservation, user, teeTime, golfClub, policy, canMarkNoShow, canUnsuspendUser } = detail;

  const hoursLeft = calculateHoursLeft(teeTime.tee_off);
  const teeOffFormatted = formatTeeOffTime(teeTime.tee_off);

  const handleMarkNoShow = async () => {
    if (!confirm('이 예약을 노쇼로 처리하시겠습니까? 사용자가 정지될 수 있습니다.')) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // SDD-08: No adminUserId needed - uses session
      const result = await markReservationAsNoShow({
        reservationId: reservation.id.toString()
      });

      if (result.success) {
        alert(`${result.message}\n${result.userSuspended ? '사용자가 정지되었습니다.' : ''}`);
        router.refresh();
      } else {
        setError(result.error || '노쇼 처리 실패');
        alert(`실패: ${result.message}`);
      }
    } catch (err: any) {
      setError(err.message);
      alert(`오류: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUnsuspend = async () => {
    if (!confirm(`${user.email} 사용자의 정지를 해제하시겠습니까?`)) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // SDD-08: No adminUserId needed - uses session
      const result = await unsuspendUser({
        userId: user.id,
        reason: 'Admin action from reservation detail'
      });

      if (result.success) {
        alert(result.message);
        router.refresh();
      } else {
        setError(result.error || '정지 해제 실패');
        alert(`실패: ${result.message}`);
      }
    } catch (err: any) {
      setError(err.message);
      alert(`오류: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      PAID: { label: '결제 완료', className: 'bg-green-100 text-green-800' },
      CANCELLED: { label: '취소됨', className: 'bg-orange-100 text-orange-800' },
      NO_SHOW: { label: '노쇼', className: 'bg-red-100 text-red-800' },
      REFUNDED: { label: '환불 완료', className: 'bg-blue-100 text-blue-800' },
      COMPLETED: { label: '이용 완료', className: 'bg-gray-100 text-gray-800' }
    };

    const { label, className } = config[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return <span className={`px-3 py-1 rounded-full text-sm font-medium ${className}`}>{label}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">예약 목록으로</span>
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">
        {/* Title & Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">예약 상세 (관리자)</h1>
              <p className="text-sm text-gray-500">예약 ID: {reservation.id}</p>
            </div>
            <div className="flex gap-2">
              {getStatusBadge(reservation.status)}
              {reservation.is_imminent_deal && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                  🔥 임박딜
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">오류 발생</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
        )}

        {/* User Info */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">사용자 정보</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">이름</p>
              <p className="font-medium text-gray-900">{user.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">이메일</p>
              <p className="font-medium text-gray-900">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">전화번호</p>
              <p className="font-medium text-gray-900">{user.phone || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">노쇼 횟수</p>
              <p className={`font-bold ${user.no_show_count > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {user.no_show_count}회
              </p>
            </div>
          </div>

          {user.is_suspended && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <UserX className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-900">정지된 사용자</p>
                  <p className="text-sm text-red-700 mt-1">사유: {user.suspended_reason || '-'}</p>
                  {user.suspended_at && (
                    <p className="text-xs text-red-600 mt-1">
                      정지 일시: {new Date(user.suspended_at).toLocaleString('ko-KR')}
                    </p>
                  )}
                </div>
              </div>
              {canUnsuspendUser && (
                <button
                  onClick={handleUnsuspend}
                  disabled={isProcessing}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  정지 해제
                </button>
              )}
            </div>
          )}
        </div>

        {/* Golf Club & Tee Time */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">골프장 & 티타임</h2>

          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-gray-900">{golfClub.name}</p>
              {golfClub.location_name && (
                <p className="text-sm text-gray-600 mt-1">{golfClub.location_name}</p>
              )}
            </div>
          </div>

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

          {reservation.status === 'PAID' && hoursLeft > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-900">
                티오프까지 <span className="font-bold">{hoursLeft.toFixed(1)}시간</span> 남음
              </p>
            </div>
          )}

          {reservation.status === 'PAID' && hoursLeft < 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <p className="text-sm text-orange-900">
                티오프 경과: <span className="font-bold">{Math.abs(hoursLeft).toFixed(1)}시간</span>
              </p>
            </div>
          )}
        </div>

        {/* Payment Info */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">결제 정보</h2>

          <div className="space-y-3">
            {teeTime.base_price && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">정가</span>
                <span className="text-gray-900">{formatCurrency(teeTime.base_price)}</span>
              </div>
            )}

            <div className="flex justify-between items-center pt-3 border-t">
              <span className="font-medium text-gray-900">최종 결제 금액</span>
              <span className="text-xl font-bold text-gray-900">
                {formatCurrency(reservation.final_price)}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <CreditCard className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">
                결제 상태: <span className="font-medium">{reservation.payment_status}</span>
              </span>
            </div>

            {reservation.payment_key && (
              <div className="text-xs text-gray-500">
                Payment Key: {reservation.payment_key}
              </div>
            )}
          </div>
        </div>

        {/* Cancellation/NoShow Info */}
        {(reservation.status === 'CANCELLED' || reservation.status === 'NO_SHOW') && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {reservation.status === 'CANCELLED' ? '취소 정보' : '노쇼 정보'}
            </h2>

            {reservation.status === 'CANCELLED' && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">취소 일시</span>
                  <span className="text-gray-900">
                    {reservation.cancelled_at
                      ? new Date(reservation.cancelled_at).toLocaleString('ko-KR')
                      : '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">취소 사유</span>
                  <span className="text-gray-900">{getCancelReasonText(reservation.cancel_reason)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">환불 금액</span>
                  <span className="text-gray-900 font-bold">
                    {formatCurrency(reservation.refund_amount)}
                  </span>
                </div>
              </div>
            )}

            {reservation.status === 'NO_SHOW' && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">노쇼 처리 일시</span>
                  <span className="text-gray-900">
                    {reservation.no_show_marked_at
                      ? new Date(reservation.no_show_marked_at).toLocaleString('ko-KR')
                      : '-'}
                  </span>
                </div>
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800">
                  환불 불가 (노쇼 페널티 적용)
                </div>
              </div>
            )}
          </div>
        )}

        {/* Policy Info */}
        {policy && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">정책 정보</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">정책 이름</span>
                <span className="text-gray-900 font-medium">{policy.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">정책 버전</span>
                <span className="text-gray-900">{policy.version}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">취소 가능 시간</span>
                <span className="text-gray-900">{policy.cancel_cutoff_hours}시간 전</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">환불율</span>
                <span className="text-gray-900">{(policy.refund_rate * 100).toFixed(0)}%</span>
              </div>
              {policy.description && (
                <div className="pt-2 border-t">
                  <p className="text-gray-600">{policy.description}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Admin Actions */}
        {(canMarkNoShow || canUnsuspendUser) && (
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">관리자 액션</h2>

            <div className="space-y-3">
              {canMarkNoShow && (
                <button
                  onClick={handleMarkNoShow}
                  disabled={isProcessing}
                  className="w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 active:bg-red-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-5 h-5" />
                      노쇼 처리
                    </>
                  )}
                </button>
              )}

              {canUnsuspendUser && !canMarkNoShow && (
                <button
                  onClick={handleUnsuspend}
                  disabled={isProcessing}
                  className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      사용자 정지 해제
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
