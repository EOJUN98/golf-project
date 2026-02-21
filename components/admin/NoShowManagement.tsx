'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, RefreshCw, UserX } from 'lucide-react';

interface NoShowCandidate {
  reservationId: string;
  userId: string;
  userName: string | null;
  userPhone: string | null;
  userNoShowCount: number;
  teeOff: string | null;
  golfClubName: string | null;
  finalPrice: number;
}

interface NoShowResponse {
  success?: boolean;
  date: string;
  totalReservations: number;
  candidatesForNoShow: number;
  reservations: NoShowCandidate[];
  error?: string;
}

interface Props {
  initialDate: string;
}

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

function formatDateTime(value: string | null) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getErrorMessage(json: unknown, fallback: string) {
  if (!json || typeof json !== 'object') return fallback;
  if ('error' in json && typeof (json as { error?: unknown }).error === 'string') {
    const message = (json as { error: string }).error;
    return message || fallback;
  }
  return fallback;
}

export default function NoShowManagement({ initialDate }: Props) {
  const [date, setDate] = useState(initialDate);
  const [rows, setRows] = useState<NoShowCandidate[]>([]);
  const [totalReservations, setTotalReservations] = useState(0);
  const [candidateCount, setCandidateCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [processingReservationId, setProcessingReservationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadCandidates = async (targetDate: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/admin/no-show?date=${encodeURIComponent(targetDate)}`, {
        method: 'GET',
        cache: 'no-store',
      });
      const json = (await response.json()) as Partial<NoShowResponse>;

      if (!response.ok) {
        throw new Error(getErrorMessage(json, '노쇼 후보를 조회하지 못했습니다.'));
      }

      setRows(Array.isArray(json.reservations) ? json.reservations : []);
      setTotalReservations(Number(json.totalReservations || 0));
      setCandidateCount(Number(json.candidatesForNoShow || 0));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '조회 중 오류가 발생했습니다.');
      setRows([]);
      setTotalReservations(0);
      setCandidateCount(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates(initialDate);
  }, [initialDate]);

  const handleSearch = async () => {
    setMessage(null);
    await loadCandidates(date);
  };

  const handleMarkNoShow = async (reservationId: string) => {
    const confirmed = window.confirm('이 예약을 노쇼 처리하시겠습니까? 환불 불가 및 사용자 제재가 적용될 수 있습니다.');
    if (!confirmed) return;

    try {
      setProcessingReservationId(reservationId);
      setError(null);
      setMessage(null);

      const response = await fetch('/api/admin/no-show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reservationId }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(getErrorMessage(json, '노쇼 처리에 실패했습니다.'));
      }

      const successMessage = typeof json?.message === 'string' ? json.message : '노쇼 처리가 완료되었습니다.';
      setMessage(successMessage);
      await loadCandidates(date);
    } catch (handleError) {
      setError(handleError instanceof Error ? handleError.message : '노쇼 처리 중 오류가 발생했습니다.');
    } finally {
      setProcessingReservationId(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900">노쇼 관리</h1>
          <p className="mt-2 text-sm text-gray-600">
            티오프 후 유예시간이 지난 결제 예약을 조회하고 노쇼 처리를 수행합니다.
          </p>

          <div className="mt-4 flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">조회 날짜</label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="button"
              onClick={handleSearch}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
            >
              {loading ? '조회 중...' : '조회'}
            </button>

            <button
              type="button"
              onClick={() => loadCandidates(date)}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 disabled:opacity-50 inline-flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              새로고침
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs text-gray-500">결제 예약 수</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{totalReservations.toLocaleString('ko-KR')}</p>
            </div>
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-4">
              <p className="text-xs text-gray-500">노쇼 후보 수</p>
              <p className="text-xl font-bold text-red-600 mt-1">{candidateCount.toLocaleString('ko-KR')}</p>
            </div>
          </div>

          {message && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="text-left px-4 py-3">예약 ID</th>
                <th className="text-left px-4 py-3">고객</th>
                <th className="text-left px-4 py-3">골프장</th>
                <th className="text-left px-4 py-3">티오프</th>
                <th className="text-right px-4 py-3">결제 금액</th>
                <th className="text-right px-4 py-3">액션</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.reservationId} className="border-t border-gray-200">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{row.reservationId}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{row.userName || '-'}</p>
                    <p className="text-xs text-gray-500">{row.userPhone || '-'}</p>
                    <p className="text-xs text-gray-500">노쇼 누적: {row.userNoShowCount}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{row.golfClubName || '-'}</td>
                  <td className="px-4 py-3 text-gray-700">{formatDateTime(row.teeOff)}</td>
                  <td className="px-4 py-3 text-right text-gray-900 font-medium">{formatCurrency(row.finalPrice)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleMarkNoShow(row.reservationId)}
                      disabled={processingReservationId === row.reservationId}
                      className="px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold disabled:opacity-50 inline-flex items-center gap-1"
                    >
                      {processingReservationId === row.reservationId ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          처리 중
                        </>
                      ) : (
                        <>
                          <UserX className="w-3.5 h-3.5" />
                          노쇼 처리
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}

              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    노쇼 후보가 없습니다.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    조회 중...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
