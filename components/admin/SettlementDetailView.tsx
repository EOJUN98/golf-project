/**
 * SDD-07: Settlement Detail View Component
 *
 * Display and manage settlement details with status transitions
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SettlementDetail } from '@/types/settlement';
import { updateSettlementStatus, updateSettlementNotes } from '@/app/admin/settlements/actions';
import { formatSettlementCurrency, formatSettlementPeriod } from '@/utils/settlementCalculations';
import {
  ArrowLeft,
  FileText,
  Building2,
  Calendar,
  CheckCircle,
  Lock,
  Edit3,
  Save,
  Loader2,
  AlertTriangle,
  User,
  DollarSign
} from 'lucide-react';

interface Props {
  detail: SettlementDetail;
}

export default function SettlementDetailView({ detail }: Props) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [notes, setNotes] = useState(detail.settlement.notes || '');

  const { settlement, golf_club, reservations, created_by, confirmed_by, locked_by, can_confirm, can_lock, can_edit } = detail;

  const handleStatusChange = async (newStatus: 'CONFIRMED' | 'LOCKED') => {
    const confirmMsg = newStatus === 'CONFIRMED'
      ? '이 정산을 확정하시겠습니까? 확정 후에는 예약 내역을 변경할 수 없습니다.'
      : '이 정산을 잠금 처리하시겠습니까? 잠금 후에는 수정이 불가능합니다. (SUPER_ADMIN만 가능)';

    if (!confirm(confirmMsg)) return;

    setIsProcessing(true);
    setError(null);

    try {
      // SDD-08: No admin_user_id needed - uses session
      const result = await updateSettlementStatus({
        settlement_id: settlement.id,
        new_status: newStatus
      });

      if (result.success) {
        alert(result.message);
        router.refresh();
      } else {
        setError(result.error || '상태 변경 실패');
        alert(`실패: ${result.message}`);
      }
    } catch (err: any) {
      setError(err.message);
      alert(`오류: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveNotes = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      // SDD-08: No admin_user_id needed - uses session
      const result = await updateSettlementNotes({
        settlement_id: settlement.id,
        notes
      });

      if (result.success) {
        setIsEditingNotes(false);
        router.refresh();
      } else {
        setError(result.error || '메모 저장 실패');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string; icon: any }> = {
      DRAFT: { label: '초안', className: 'bg-yellow-100 text-yellow-800', icon: FileText },
      CONFIRMED: { label: '확정', className: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      LOCKED: { label: '잠금', className: 'bg-green-100 text-green-800', icon: Lock }
    };

    const { label, className, icon: Icon } = config[status] || {
      label: status,
      className: 'bg-gray-100 text-gray-800',
      icon: FileText
    };

    return (
      <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${className}`}>
        <Icon className="w-4 h-4" />
        {label}
      </span>
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('ko-KR');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <button
            onClick={() => router.push('/admin/settlements')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">정산 목록으로</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Title & Status */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">정산 상세</h1>
              <p className="text-sm font-mono text-gray-500">ID: {settlement.id}</p>
            </div>
            <div>{getStatusBadge(settlement.status)}</div>
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

        {/* Golf Club & Period */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">정산 정보</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Building2 className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">골프장</p>
                <p className="font-medium text-gray-900">{golf_club.name}</p>
                {golf_club.location_name && (
                  <p className="text-sm text-gray-600 mt-1">{golf_club.location_name}</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-gray-600">정산 기간</p>
                <p className="font-medium text-gray-900">
                  {formatSettlementPeriod(settlement.period_start, settlement.period_end)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg shadow p-6 text-white">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-6 h-6" />
            <h2 className="text-lg font-semibold">정산 금액</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <p className="text-blue-200 text-xs mb-1">총 결제액</p>
              <p className="text-xl font-bold">{formatSettlementCurrency(settlement.gross_amount)}</p>
            </div>

            <div>
              <p className="text-blue-200 text-xs mb-1">환불액</p>
              <p className="text-xl font-bold text-orange-300">
                -{formatSettlementCurrency(settlement.refund_amount)}
              </p>
            </div>

            <div>
              <p className="text-blue-200 text-xs mb-1">순액 (Net)</p>
              <p className="text-xl font-bold">{formatSettlementCurrency(settlement.net_amount)}</p>
            </div>

            <div>
              <p className="text-blue-200 text-xs mb-1">
                수수료 ({(settlement.commission_rate * 100).toFixed(1)}%)
              </p>
              <p className="text-xl font-bold text-red-300">
                -{formatSettlementCurrency(settlement.platform_fee)}
              </p>
            </div>

            <div>
              <p className="text-blue-200 text-xs mb-1">골프장 지급액</p>
              <p className="text-2xl font-bold text-green-300">
                {formatSettlementCurrency(settlement.club_payout)}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-blue-500">
            <p className="text-blue-200 text-sm">
              예약 건수: <span className="font-semibold text-white">{settlement.reservation_count}건</span>
            </p>
          </div>
        </div>

        {/* Configuration */}
        <div className="bg-white rounded-lg shadow p-6 space-y-3">
          <h2 className="text-lg font-semibold text-gray-900">정산 설정</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-600">수수료율</p>
              <p className="font-medium text-gray-900">
                {(settlement.commission_rate * 100).toFixed(1)}%
              </p>
            </div>

            <div>
              <p className="text-gray-600">노쇼 포함</p>
              <p className="font-medium text-gray-900">
                {settlement.include_no_show ? '✓ 예' : '✗ 아니오'}
              </p>
            </div>

            <div>
              <p className="text-gray-600">취소 포함</p>
              <p className="font-medium text-gray-900">
                {settlement.include_cancelled ? '✓ 예' : '✗ 아니오'}
              </p>
            </div>

            <div>
              <p className="text-gray-600">환불 포함</p>
              <p className="font-medium text-gray-900">
                {settlement.include_refunded ? '✓ 예' : '✗ 아니오'}
              </p>
            </div>
          </div>
        </div>

        {/* Audit Trail */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">처리 이력</h2>

          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3 pb-3 border-b">
              <User className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-gray-900">생성</p>
                <p className="text-gray-600 mt-1">{formatDate(settlement.created_at)}</p>
                {created_by && <p className="text-gray-500 text-xs mt-1">{created_by.email}</p>}
              </div>
            </div>

            {settlement.confirmed_at && (
              <div className="flex items-start gap-3 pb-3 border-b">
                <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">확정</p>
                  <p className="text-gray-600 mt-1">{formatDate(settlement.confirmed_at)}</p>
                  {confirmed_by && (
                    <p className="text-gray-500 text-xs mt-1">{confirmed_by.email}</p>
                  )}
                </div>
              </div>
            )}

            {settlement.locked_at && (
              <div className="flex items-start gap-3">
                <Lock className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">잠금</p>
                  <p className="text-gray-600 mt-1">{formatDate(settlement.locked_at)}</p>
                  {locked_by && <p className="text-gray-500 text-xs mt-1">{locked_by.email}</p>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">메모</h2>
            {can_edit && !isEditingNotes && (
              <button
                onClick={() => setIsEditingNotes(true)}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center gap-1"
              >
                <Edit3 className="w-4 h-4" />
                편집
              </button>
            )}
          </div>

          {isEditingNotes ? (
            <div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="메모를 입력하세요..."
              />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleSaveNotes}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
                >
                  {isProcessing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  저장
                </button>
                <button
                  onClick={() => {
                    setIsEditingNotes(false);
                    setNotes(settlement.notes || '');
                  }}
                  disabled={isProcessing}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  취소
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">
              {settlement.notes || '메모가 없습니다'}
            </p>
          )}
        </div>

        {/* Reservations List */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            포함된 예약 목록 ({reservations.length}건)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    예약 ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    티오프
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    사용자
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    상태
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    결제액
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    환불액
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    순액
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reservations.map(res => (
                  <tr
                    key={res.id}
                    onClick={() => router.push(`/admin/reservations/${res.id}`)}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono text-gray-900">
                        {res.id.slice(0, 8)}...
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900">
                        {new Date(res.tee_off).toLocaleString('ko-KR')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {res.user_name || res.user_email}
                        </p>
                        <p className="text-xs text-gray-500">{res.user_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-800">
                        {res.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatSettlementCurrency(res.paid_amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm text-orange-600">
                        {res.refund_amount > 0
                          ? formatSettlementCurrency(res.refund_amount)
                          : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {formatSettlementCurrency(res.net_contribution)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {reservations.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">포함된 예약이 없습니다</p>
              </div>
            )}
          </div>
        </div>

        {/* Admin Actions */}
        {(can_confirm || can_lock) && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">관리자 액션</h2>

            <div className="space-y-3">
              {can_confirm && (
                <button
                  onClick={() => handleStatusChange('CONFIRMED')}
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
                      정산 확정
                    </>
                  )}
                </button>
              )}

              {can_lock && (
                <button
                  onClick={() => handleStatusChange('LOCKED')}
                  disabled={isProcessing}
                  className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 active:bg-green-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      처리 중...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      정산 잠금 (SUPER_ADMIN)
                    </>
                  )}
                </button>
              )}

              {settlement.status === 'LOCKED' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
                  <Lock className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-green-900">잠금 완료</p>
                    <p className="text-sm text-green-700 mt-1">
                      이 정산은 잠금 처리되어 더 이상 수정할 수 없습니다
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
