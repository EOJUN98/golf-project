'use client';

import { useEffect, useMemo, useState } from 'react';

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
  const defaultRegion = regionOrder.find((region) => (groupedCourses[region] || []).length > 0) || regionOrder[0];
  const [selectedRegion, setSelectedRegion] = useState<RegionKey>(defaultRegion);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null);

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
