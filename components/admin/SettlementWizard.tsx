/**
 * SDD-07: Settlement Creation Wizard Component
 *
 * Multi-step form for creating settlements with preview
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SettlementConfig, DEFAULT_SETTLEMENT_CONFIG, SettlementPreviewResult } from '@/types/settlement';
import { previewSettlement, createSettlement } from '@/app/admin/settlements/actions';
import { getMonthPeriod, getCurrentMonthPeriod, getPreviousMonthPeriod, formatSettlementCurrency } from '@/utils/settlementCalculations';
import { ArrowLeft, ArrowRight, Calendar, Settings, FileText, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';

interface Props {
  golfClubs: Array<{ id: number; name: string; location_name: string | null }>;
}

type WizardStep = 'club' | 'period' | 'config' | 'preview' | 'confirm';

export default function SettlementWizard({ golfClubs }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<WizardStep>('club');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [selectedClubId, setSelectedClubId] = useState<number | null>(null);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [config, setConfig] = useState<SettlementConfig>(DEFAULT_SETTLEMENT_CONFIG);
  const [notes, setNotes] = useState('');

  // Preview state
  const [previewData, setPreviewData] = useState<SettlementPreviewResult | null>(null);

  const selectedClub = golfClubs.find(c => c.id === selectedClubId);

  const handleSelectQuickPeriod = (type: 'current' | 'previous' | 'custom') => {
    if (type === 'current') {
      const period = getCurrentMonthPeriod();
      setPeriodStart(period.start);
      setPeriodEnd(period.end);
    } else if (type === 'previous') {
      const period = getPreviousMonthPeriod();
      setPeriodStart(period.start);
      setPeriodEnd(period.end);
    }
  };

  const handlePreview = async () => {
    if (!selectedClubId || !periodStart || !periodEnd) {
      setError('골프장과 기간을 선택해주세요');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // SDD-08: No admin_user_id needed - uses session
      const result = await previewSettlement({
        golf_club_id: selectedClubId,
        period_start: periodStart,
        period_end: periodEnd,
        config
      });

      if (!result.success || !result.data) {
        setError(result.error || '미리보기 실패');
        return;
      }

      setPreviewData(result.data);
      setStep('preview');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!selectedClubId || !periodStart || !periodEnd) {
      setError('필수 정보가 누락되었습니다');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // SDD-08: No admin_user_id needed - uses session
      const result = await createSettlement({
        golf_club_id: selectedClubId,
        period_start: periodStart,
        period_end: periodEnd,
        config,
        notes
      });

      if (!result.success) {
        setError(result.error || '정산 생성 실패');
        return;
      }

      // Navigate to detail page
      router.push(`/admin/settlements/${result.settlement_id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStepIndicator = () => {
    const steps: { key: WizardStep; label: string }[] = [
      { key: 'club', label: '골프장 선택' },
      { key: 'period', label: '기간 설정' },
      { key: 'config', label: '설정' },
      { key: 'preview', label: '미리보기' },
      { key: 'confirm', label: '생성' }
    ];

    const currentIndex = steps.findIndex(s => s.key === step);

    return (
      <div className="flex items-center justify-between mb-8">
        {steps.map((s, index) => (
          <div key={s.key} className="flex items-center">
            <div
              className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${
                index <= currentIndex
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}
            >
              {index < currentIndex ? (
                <CheckCircle className="w-6 h-6" />
              ) : (
                <span>{index + 1}</span>
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-16 h-1 mx-2 ${
                  index < currentIndex ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderClubSelection = () => (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">골프장 선택</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {golfClubs.map(club => (
          <div
            key={club.id}
            onClick={() => setSelectedClubId(club.id)}
            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
              selectedClubId === club.id
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{club.name}</h3>
                {club.location_name && (
                  <p className="text-sm text-gray-600 mt-1">{club.location_name}</p>
                )}
              </div>
              {selectedClubId === club.id && (
                <CheckCircle className="w-6 h-6 text-blue-600" />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 mt-6">
        <button
          onClick={() => router.back()}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          <ArrowLeft className="w-5 h-5 inline mr-2" />
          취소
        </button>
        <button
          onClick={() => setStep('period')}
          disabled={!selectedClubId}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          다음
          <ArrowRight className="w-5 h-5 inline ml-2" />
        </button>
      </div>
    </div>
  );

  const renderPeriodSelection = () => (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">정산 기간 설정</h2>

      {selectedClub && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-900">
            선택된 골프장: <span className="font-semibold">{selectedClub.name}</span>
          </p>
        </div>
      )}

      {/* Quick Period Buttons */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => handleSelectQuickPeriod('previous')}
          className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
        >
          <Calendar className="w-5 h-5 mx-auto mb-1 text-gray-600" />
          <span className="block font-medium">지난달</span>
        </button>
        <button
          onClick={() => handleSelectQuickPeriod('current')}
          className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
        >
          <Calendar className="w-5 h-5 mx-auto mb-1 text-gray-600" />
          <span className="block font-medium">이번달</span>
        </button>
        <button
          onClick={() => handleSelectQuickPeriod('custom')}
          className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
        >
          <Calendar className="w-5 h-5 mx-auto mb-1 text-gray-600" />
          <span className="block font-medium">직접 선택</span>
        </button>
      </div>

      {/* Custom Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            시작일
          </label>
          <input
            type="date"
            value={periodStart}
            onChange={e => setPeriodStart(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            종료일
          </label>
          <input
            type="date"
            value={periodEnd}
            onChange={e => setPeriodEnd(e.target.value)}
            min={periodStart}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {periodStart && periodEnd && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-900">
            선택된 기간: <span className="font-semibold">
              {new Date(periodStart).toLocaleDateString('ko-KR')} ~ {new Date(periodEnd).toLocaleDateString('ko-KR')}
            </span>
          </p>
        </div>
      )}

      <div className="flex justify-between gap-3 mt-6">
        <button
          onClick={() => setStep('club')}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          <ArrowLeft className="w-5 h-5 inline mr-2" />
          이전
        </button>
        <button
          onClick={() => setStep('config')}
          disabled={!periodStart || !periodEnd}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          다음
          <ArrowRight className="w-5 h-5 inline ml-2" />
        </button>
      </div>
    </div>
  );

  const renderConfigSelection = () => (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">정산 설정</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            플랫폼 수수료율
          </label>
          <div className="flex items-center gap-4">
            <input
              type="number"
              step="0.01"
              min="0"
              max="1"
              value={config.commission_rate}
              onChange={e =>
                setConfig({ ...config, commission_rate: parseFloat(e.target.value) || 0 })
              }
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-700">
              = {(config.commission_rate * 100).toFixed(1)}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            예: 0.10 = 10% (기본값)
          </p>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-medium text-gray-900 mb-3">포함할 예약 유형</h3>

          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.include_no_show}
                onChange={e =>
                  setConfig({ ...config, include_no_show: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                노쇼 (NO_SHOW) 포함 - 환불 없음
              </span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.include_cancelled}
                onChange={e =>
                  setConfig({ ...config, include_cancelled: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                취소 (CANCELLED) 포함 - 환불액 차감
              </span>
            </label>

            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={config.include_refunded}
                onChange={e =>
                  setConfig({ ...config, include_refunded: e.target.checked })
                }
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                환불 완료 (REFUNDED) 포함 - 환불액 차감
              </span>
            </label>
          </div>
        </div>

        <div className="border-t pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            메모 (선택사항)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="정산에 대한 메모를 입력하세요..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-between gap-3 mt-6">
        <button
          onClick={() => setStep('period')}
          className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
        >
          <ArrowLeft className="w-5 h-5 inline mr-2" />
          이전
        </button>
        <button
          onClick={handlePreview}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              계산 중...
            </>
          ) : (
            <>
              미리보기
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderPreview = () => {
    if (!previewData) return null;

    const { summary, reservations, warnings, can_create, validation_errors } = previewData;

    return (
      <div className="space-y-6">
        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">경고</p>
                <ul className="text-sm text-yellow-800 mt-2 space-y-1">
                  {warnings.map((warning, index) => (
                    <li key={index}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Validation Errors */}
        {validation_errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-red-900">검증 오류</p>
                <ul className="text-sm text-red-800 mt-2 space-y-1">
                  {validation_errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">정산 요약</h2>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">골프장</p>
              <p className="font-semibold text-gray-900">{summary.golf_club_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">기간</p>
              <p className="font-semibold text-gray-900">
                {new Date(summary.period_start).toLocaleDateString('ko-KR')} ~{' '}
                {new Date(summary.period_end).toLocaleDateString('ko-KR')}
              </p>
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">총 예약</span>
              <span className="font-medium">{summary.total_reservations}건</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">포함된 예약</span>
              <span className="font-medium text-green-600">{summary.included_reservations}건</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">제외된 예약</span>
              <span className="font-medium text-orange-600">{summary.excluded_reservations}건</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">이미 정산된 예약</span>
              <span className="font-medium text-red-600">{summary.already_settled_count}건</span>
            </div>
          </div>

          <div className="border-t pt-4 mt-4 space-y-3">
            <div className="flex justify-between text-lg">
              <span className="text-gray-600">총 결제액 (Gross)</span>
              <span className="font-bold">{formatSettlementCurrency(summary.gross_amount)}</span>
            </div>
            <div className="flex justify-between text-lg">
              <span className="text-gray-600">환불액</span>
              <span className="font-bold text-orange-600">
                -{formatSettlementCurrency(summary.refund_amount)}
              </span>
            </div>
            <div className="flex justify-between text-lg border-t pt-3">
              <span className="text-gray-900 font-semibold">순액 (Net)</span>
              <span className="font-bold text-blue-600">
                {formatSettlementCurrency(summary.net_amount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">
                플랫폼 수수료 ({(summary.config.commission_rate * 100).toFixed(1)}%)
              </span>
              <span className="font-medium text-blue-600">
                -{formatSettlementCurrency(summary.platform_fee)}
              </span>
            </div>
            <div className="flex justify-between text-xl border-t pt-3">
              <span className="text-gray-900 font-bold">골프장 지급액</span>
              <span className="font-bold text-green-600">
                {formatSettlementCurrency(summary.club_payout)}
              </span>
            </div>
          </div>
        </div>

        {/* Reservations Preview */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            포함된 예약 미리보기 ({summary.included_reservations}건)
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">예약 ID</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">티오프</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">사용자</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">상태</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">결제액</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">환불액</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">순액</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {reservations
                  .filter(r => !r.already_settled)
                  .slice(0, 10)
                  .map(res => (
                    <tr key={res.id}>
                      <td className="px-3 py-2 font-mono text-xs">{res.id.slice(0, 8)}...</td>
                      <td className="px-3 py-2">
                        {new Date(res.tee_off).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-3 py-2">{res.user_email}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-1 rounded-full text-xs bg-gray-100">
                          {res.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right font-medium">
                        {formatSettlementCurrency(res.paid_amount)}
                      </td>
                      <td className="px-3 py-2 text-right text-orange-600">
                        {res.refund_amount > 0 ? formatSettlementCurrency(res.refund_amount) : '-'}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {formatSettlementCurrency(res.net_contribution)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            {reservations.filter(r => !r.already_settled).length > 10 && (
              <p className="text-center text-sm text-gray-500 mt-4">
                ...외 {reservations.filter(r => !r.already_settled).length - 10}건 더 있습니다
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between gap-3">
          <button
            onClick={() => setStep('config')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            <ArrowLeft className="w-5 h-5 inline mr-2" />
            설정 수정
          </button>
          <button
            onClick={handleCreate}
            disabled={!can_create || isLoading}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                생성 중...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                정산 생성
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div>
      {renderStepIndicator()}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-900">오류</p>
              <p className="text-sm text-red-800 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {step === 'club' && renderClubSelection()}
      {step === 'period' && renderPeriodSelection()}
      {step === 'config' && renderConfigSelection()}
      {step === 'preview' && renderPreview()}
    </div>
  );
}
