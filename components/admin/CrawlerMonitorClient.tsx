'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type RegionKey = '충청' | '수도권' | '강원' | '경상' | '전라' | '제주';

type WindowKey = 'WEEK_BEFORE' | 'TWO_DAYS_BEFORE' | 'SAME_DAY_MORNING' | 'IMMINENT_3H';

interface WindowStats {
  count: number;
  latestPrice: number | null;
  latestCrawledAt: string | null;
}

interface CourseSummary {
  courseName: string;
  region: RegionKey;
  regionSource: 'MANUAL' | 'AUTO';
  sites: string[];
  latestCrawledAt: string | null;
  latestStatus: string | null;
  latestAvailability: string | null;
  latestPrice: number | null;
  totalSnapshots: number;
  availableCount: number;
  noDataCount: number;
  failedCount: number;
  authRequiredCount: number;
  minPrice: number | null;
  maxPrice: number | null;
  avgPrice: number | null;
  windowStats: Record<WindowKey, WindowStats>;
  lastError: string | null;
}

interface CrawlerMonitorClientProps {
  generatedAt: string;
  lookbackDays: number;
  regionOrder: RegionKey[];
  groupedCourses: Record<RegionKey, CourseSummary[]>;
  totalCourses: number;
  totalSnapshots: number;
  loadError?: string | null;
}

const WINDOW_LABELS: Record<WindowKey, string> = {
  WEEK_BEFORE: '1주 전',
  TWO_DAYS_BEFORE: '2일 전',
  SAME_DAY_MORNING: '당일 오전',
  IMMINENT_3H: '임박 3시간',
};

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

function formatPrice(value: number | null) {
  if (value === null || Number.isNaN(value)) return '-';
  return `${Math.round(value).toLocaleString('ko-KR')}원`;
}

function statusBadgeClass(status: string | null) {
  if (status === 'SUCCESS') return 'bg-green-100 text-green-700';
  if (status === 'FAILED') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-700';
}

function availabilityBadgeClass(status: string | null) {
  if (status === 'AVAILABLE') return 'bg-blue-100 text-blue-700';
  if (status === 'NO_DATA') return 'bg-amber-100 text-amber-700';
  if (status === 'AUTH_REQUIRED') return 'bg-purple-100 text-purple-700';
  if (status === 'FAILED') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-700';
}

export default function CrawlerMonitorClient({
  generatedAt,
  lookbackDays,
  regionOrder,
  groupedCourses,
  totalCourses,
  totalSnapshots,
  loadError,
}: CrawlerMonitorClientProps) {
  const router = useRouter();
  const defaultRegion = regionOrder.find((region) => (groupedCourses[region] || []).length > 0) || regionOrder[0];
  const [selectedRegion, setSelectedRegion] = useState<RegionKey>(defaultRegion);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);
  const [regionDraft, setRegionDraft] = useState<RegionKey>('수도권');
  const [savingRegion, setSavingRegion] = useState(false);
  const [regionMessage, setRegionMessage] = useState<string | null>(null);
  const [regionError, setRegionError] = useState<string | null>(null);

  const regionCourses = groupedCourses[selectedRegion] || [];

  const filteredCourses = useMemo(() => {
    const keyword = searchKeyword.trim().toLowerCase();
    if (!keyword) return regionCourses;
    return regionCourses.filter((course) => course.courseName.toLowerCase().includes(keyword));
  }, [regionCourses, searchKeyword]);

  useEffect(() => {
    if (filteredCourses.length === 0) {
      setSelectedCourse(null);
      return;
    }

    if (!selectedCourse || !filteredCourses.some((item) => item.courseName === selectedCourse)) {
      setSelectedCourse(filteredCourses[0].courseName);
    }
  }, [filteredCourses, selectedCourse]);

  const selectedSummary = filteredCourses.find((course) => course.courseName === selectedCourse) || null;

  useEffect(() => {
    if (!selectedSummary) return;
    setRegionDraft(selectedSummary.region);
    setRegionMessage(null);
    setRegionError(null);
  }, [selectedSummary?.courseName, selectedSummary?.region]);

  const updateRegionMapping = async () => {
    if (!selectedSummary) return;

    try {
      setSavingRegion(true);
      setRegionMessage(null);
      setRegionError(null);

      const response = await fetch('/api/admin/crawler/regions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseName: selectedSummary.courseName,
          region: regionDraft,
          note: '관리자 모니터 화면 수동 지정',
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || '지역 저장에 실패했습니다.');
      }

      setRegionMessage('수동 지역 매핑을 저장했습니다.');
      router.refresh();
    } catch (error) {
      setRegionError(error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.');
    } finally {
      setSavingRegion(false);
    }
  };

  const clearRegionMapping = async () => {
    if (!selectedSummary) return;

    try {
      setSavingRegion(true);
      setRegionMessage(null);
      setRegionError(null);

      const response = await fetch('/api/admin/crawler/regions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseName: selectedSummary.courseName,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || '매핑 해제에 실패했습니다.');
      }

      setRegionMessage('수동 지역 매핑을 해제했습니다.');
      router.refresh();
    } catch (error) {
      setRegionError(error instanceof Error ? error.message : '해제 중 오류가 발생했습니다.');
    } finally {
      setSavingRegion(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900">크롤링 모니터링</h1>
          <p className="mt-2 text-sm text-gray-600">
            지역별/골프장별 수집 상태를 확인하고 가격 요약을 검토합니다.
          </p>
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
              <p className="text-xs text-gray-500">조회 기준</p>
              <p className="text-lg font-semibold text-gray-900">최근 {lookbackDays}일</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
              <p className="text-xs text-gray-500">골프장 수</p>
              <p className="text-lg font-semibold text-gray-900">{totalCourses.toLocaleString('ko-KR')}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4 border border-gray-200">
              <p className="text-xs text-gray-500">스냅샷 수</p>
              <p className="text-lg font-semibold text-gray-900">{totalSnapshots.toLocaleString('ko-KR')}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-gray-500">리포트 생성: {formatDateTime(generatedAt)}</p>
          {loadError && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              데이터 조회 오류: {loadError}
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {regionOrder.map((region) => {
            const count = groupedCourses[region]?.length || 0;
            const isActive = selectedRegion === region;
            return (
              <button
                key={region}
                type="button"
                onClick={() => {
                  setSelectedRegion(region);
                  setSearchKeyword('');
                }}
                className={
                  isActive
                    ? 'px-4 py-2 rounded-full bg-blue-600 text-white text-sm font-semibold'
                    : 'px-4 py-2 rounded-full bg-white border border-gray-300 text-gray-700 text-sm font-semibold hover:border-blue-400'
                }
              >
                {region} ({count})
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <section className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold text-gray-900">{selectedRegion} 골프장 목록</h2>
            </div>
            <input
              type="text"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="골프장 검색"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-3 max-h-[560px] overflow-y-auto space-y-2 pr-1">
              {filteredCourses.length === 0 && (
                <div className="text-sm text-gray-500 py-8 text-center">표시할 골프장이 없습니다.</div>
              )}
              {filteredCourses.map((course) => {
                const active = course.courseName === selectedCourse;
                return (
                  <button
                    key={course.courseName}
                    type="button"
                    onClick={() => setSelectedCourse(course.courseName)}
                    className={
                      active
                        ? 'w-full text-left rounded-lg border border-blue-300 bg-blue-50 px-3 py-3'
                        : 'w-full text-left rounded-lg border border-gray-200 bg-white px-3 py-3 hover:border-blue-300'
                    }
                  >
                    <p className="text-sm font-semibold text-gray-900 truncate">{course.courseName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      사이트: {course.sites.join(', ')} | 스냅샷: {course.totalSnapshots}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-6">
            {!selectedSummary ? (
              <div className="h-full flex items-center justify-center text-gray-500 text-sm">
                골프장을 선택하면 요약 정보가 표시됩니다.
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">{selectedSummary.courseName}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    지역: {selectedSummary.region} | 수집 사이트: {selectedSummary.sites.join(', ')}
                  </p>
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <p className="text-sm font-semibold text-gray-900">지역 매핑</p>
                    <span
                      className={
                        selectedSummary.regionSource === 'MANUAL'
                          ? 'text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700'
                          : 'text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700'
                      }
                    >
                      {selectedSummary.regionSource === 'MANUAL' ? '수동 매핑' : '자동 분류'}
                    </span>
                  </div>

                  <div className="flex flex-col md:flex-row md:items-center gap-2">
                    <select
                      value={regionDraft}
                      onChange={(event) => setRegionDraft(event.target.value as RegionKey)}
                      disabled={savingRegion}
                      className="w-full md:w-52 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="충청">충청</option>
                      <option value="수도권">수도권</option>
                      <option value="강원">강원</option>
                      <option value="경상">경상</option>
                      <option value="전라">전라</option>
                      <option value="제주">제주</option>
                    </select>

                    <button
                      type="button"
                      onClick={updateRegionMapping}
                      disabled={savingRegion}
                      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      {savingRegion ? '저장 중...' : '지역 저장'}
                    </button>

                    <button
                      type="button"
                      onClick={clearRegionMapping}
                      disabled={savingRegion}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-semibold disabled:opacity-50"
                    >
                      자동 분류로 복귀
                    </button>
                  </div>

                  {regionMessage && (
                    <p className="mt-2 text-xs text-emerald-700">{regionMessage}</p>
                  )}
                  {regionError && (
                    <p className="mt-2 text-xs text-red-700">{regionError}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                    <p className="text-xs text-gray-500">최신 수집 시각</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {formatDateTime(selectedSummary.latestCrawledAt)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                    <p className="text-xs text-gray-500">최신 최종가</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{formatPrice(selectedSummary.latestPrice)}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                    <p className="text-xs text-gray-500">최저/평균/최고</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {formatPrice(selectedSummary.minPrice)} / {formatPrice(selectedSummary.avgPrice)} / {formatPrice(selectedSummary.maxPrice)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3 bg-gray-50">
                    <p className="text-xs text-gray-500">총 스냅샷</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">
                      {selectedSummary.totalSnapshots.toLocaleString('ko-KR')}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusBadgeClass(selectedSummary.latestStatus)}`}>
                    상태: {selectedSummary.latestStatus || '-'}
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${availabilityBadgeClass(selectedSummary.latestAvailability)}`}>
                    가용성: {selectedSummary.latestAvailability || '-'}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-blue-100 text-blue-700">
                    AVAILABLE {selectedSummary.availableCount}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-amber-100 text-amber-700">
                    NO_DATA {selectedSummary.noDataCount}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-red-100 text-red-700">
                    FAILED {selectedSummary.failedCount}
                  </span>
                  <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-purple-100 text-purple-700">
                    AUTH_REQUIRED {selectedSummary.authRequiredCount}
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="text-left px-3 py-2">수집 시점</th>
                        <th className="text-right px-3 py-2">건수</th>
                        <th className="text-right px-3 py-2">최신 최종가</th>
                        <th className="text-right px-3 py-2">최신 수집시각</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(Object.keys(WINDOW_LABELS) as WindowKey[]).map((windowKey) => {
                        const item = selectedSummary.windowStats[windowKey];
                        return (
                          <tr key={windowKey} className="border-t border-gray-200">
                            <td className="px-3 py-2 font-medium text-gray-900">{WINDOW_LABELS[windowKey]}</td>
                            <td className="px-3 py-2 text-right text-gray-700">{item.count.toLocaleString('ko-KR')}</td>
                            <td className="px-3 py-2 text-right text-gray-700">{formatPrice(item.latestPrice)}</td>
                            <td className="px-3 py-2 text-right text-gray-700">{formatDateTime(item.latestCrawledAt)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {selectedSummary.lastError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    최근 오류: {selectedSummary.lastError}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
