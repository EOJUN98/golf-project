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

interface ManualNoteView {
  text: string | null;
  traits: string[];
  updatedAt: string | null;
  updatedBy: string | null;
  updatedByEmail: string | null;
}

interface SnapshotNoteRow {
  id: number;
  siteCode: string;
  courseName: string;
  playDate: string | null;
  collectionWindow: string | null;
  availabilityStatus: string | null;
  crawlStatus: string | null;
  finalPrice: number | null;
  crawledAt: string;
  manualNote: ManualNoteView | null;
}

interface SnapshotDetailRow {
  id: number;
  target_id: number | null;
  site_code: string;
  course_name: string;
  play_date: string | null;
  final_price: number | null;
  original_price: number | null;
  crawled_at: string;
  crawl_status: string | null;
  availability_status: string | null;
  collection_window: string | null;
  source_platform: string | null;
  error_message: string | null;
}

interface FilterState {
  from: string;
  to: string;
  region: string | null;
  course: string | null;
  status: string | null;
}

interface CrawlerMonitorClientProps {
  generatedAt: string;
  lookbackDays: number;
  regionOrder: RegionKey[];
  groupedCourses: Record<RegionKey, CourseSummary[]>;
  totalCourses: number;
  totalSnapshots: number;
  loadError?: string | null;
  snapshotDetails: SnapshotDetailRow[];
  filters: FilterState;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractApiErrorMessage(json: unknown, fallback: string) {
  if (!isRecord(json)) return fallback;

  const error = json.error;
  if (typeof error === 'string' && error.trim()) return error;

  if (isRecord(error) && typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

interface CrawlerRunSummary {
  total: number;
  succeeded: number;
  noData: number;
  authRequired?: number;
  failed: number;
  siteBreakdown?: Array<{
    siteCode: string;
    total: number;
    succeeded: number;
    noData: number;
    authRequired: number;
    failed: number;
  }>;
  errors?: Array<{
    targetId?: number;
    siteCode?: string;
    courseName?: string;
    message: string;
  }>;
  executedAt: string;
}

function CrawlStatusPanel({
  latestCrawledAt,
  totalSnapshots,
  successCount,
}: {
  latestCrawledAt: string | null;
  totalSnapshots: number;
  successCount: number;
}) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<CrawlerRunSummary | null>(null);

  const successRate = totalSnapshots > 0 ? Math.round((successCount / totalSnapshots) * 100) : 0;

  const handleManualRun = async () => {
    if (!window.confirm('수동 수집을 실행하시겠습니까? 모든 active 타겟을 수집합니다.')) return;

    try {
      setRunning(true);
      setRunError(null);
      const res = await fetch('/api/admin/crawler/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) {
        throw new Error(extractApiErrorMessage(json, '수동 수집 실행에 실패했습니다.'));
      }

      const data = json.data as CrawlerRunSummary | undefined;
      if (data) {
        setLastResult(data);
      }
      router.refresh();
    } catch (error) {
      setRunError(error instanceof Error ? error.message : '수동 수집 실행 중 오류가 발생했습니다.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">수집 현황</h3>
          <p className="text-xs text-gray-500 mt-1">
            마지막 수집: {latestCrawledAt ? formatDateTime(latestCrawledAt) : '정보 없음'} | 성공률: {successRate}% ({successCount}/{totalSnapshots})
          </p>
        </div>
        <button
          type="button"
          onClick={handleManualRun}
          disabled={running}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50 hover:bg-blue-700"
        >
          {running ? '수집 중...' : '수동 수집 실행'}
        </button>
      </div>

      {runError && (
        <p className="mt-2 text-xs text-red-700">{runError}</p>
      )}

      {lastResult && (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="bg-gray-50 rounded-lg p-2 text-center">
              <p className="text-xs text-gray-500">전체</p>
              <p className="text-lg font-bold text-gray-900">{lastResult.total}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-2 text-center">
              <p className="text-xs text-green-600">성공</p>
              <p className="text-lg font-bold text-green-700">{lastResult.succeeded}</p>
            </div>
            <div className="bg-amber-50 rounded-lg p-2 text-center">
              <p className="text-xs text-amber-600">데이터없음</p>
              <p className="text-lg font-bold text-amber-700">{lastResult.noData}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-2 text-center">
              <p className="text-xs text-purple-600">인증필요</p>
              <p className="text-lg font-bold text-purple-700">{lastResult.authRequired || 0}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2 text-center">
              <p className="text-xs text-red-600">실패</p>
              <p className="text-lg font-bold text-red-700">{lastResult.failed}</p>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            실행 시각: {formatDateTime(lastResult.executedAt)}
          </p>
        </div>
      )}

      {lastResult?.errors && lastResult.errors.length > 0 && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-700 mb-2">
            실패/경고 상세 ({lastResult.errors.length}건)
          </p>
          <div className="space-y-1.5">
            {lastResult.errors.map((error, index) => (
              <p key={`${error.targetId || 'global'}-${index}`} className="text-xs text-red-700">
                [{error.siteCode || '-'}] {error.courseName || '-'}
                {error.targetId ? ` (#${error.targetId})` : ''}: {error.message}
              </p>
            ))}
          </div>
        </div>
      )}

      {lastResult?.siteBreakdown && lastResult.siteBreakdown.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs border border-gray-200 rounded-lg overflow-hidden">
            <thead className="bg-gray-100 text-gray-700">
              <tr>
                <th className="text-left px-2 py-1.5">site</th>
                <th className="text-right px-2 py-1.5">전체</th>
                <th className="text-right px-2 py-1.5">성공</th>
                <th className="text-right px-2 py-1.5">데이터없음</th>
                <th className="text-right px-2 py-1.5">인증필요</th>
                <th className="text-right px-2 py-1.5">실패</th>
              </tr>
            </thead>
            <tbody>
              {lastResult.siteBreakdown.map((site) => (
                <tr key={site.siteCode} className="border-t border-gray-200">
                  <td className="px-2 py-1.5 text-gray-900 font-semibold">{site.siteCode}</td>
                  <td className="px-2 py-1.5 text-right text-gray-700">{site.total}</td>
                  <td className="px-2 py-1.5 text-right text-green-700">{site.succeeded}</td>
                  <td className="px-2 py-1.5 text-right text-amber-700">{site.noData}</td>
                  <td className="px-2 py-1.5 text-right text-purple-700">{site.authRequired}</td>
                  <td className="px-2 py-1.5 text-right text-red-700">{site.failed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FilterBar({
  filters,
  regions,
  courses,
  onFilterChange,
}: {
  filters: FilterState;
  regions: RegionKey[];
  courses: string[];
  onFilterChange: (key: keyof FilterState, value: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm font-semibold text-gray-900 mb-3">스냅샷 필터</p>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <select
          value={filters.region || ''}
          onChange={(event) => onFilterChange('region', event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">전체 지역</option>
          {regions.map((region) => (
            <option key={region} value={region}>{region}</option>
          ))}
        </select>

        <select
          value={filters.course || ''}
          onChange={(event) => onFilterChange('course', event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">전체 골프장</option>
          {courses.map((course) => (
            <option key={course} value={course}>{course}</option>
          ))}
        </select>

        <input
          type="date"
          value={filters.from}
          onChange={(event) => onFilterChange('from', event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />

        <input
          type="date"
          value={filters.to}
          onChange={(event) => onFilterChange('to', event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />

        <select
          value={filters.status || ''}
          onChange={(event) => onFilterChange('status', event.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">전체 상태</option>
          <option value="AVAILABLE">AVAILABLE</option>
          <option value="NO_DATA">NO_DATA</option>
          <option value="FAILED">FAILED</option>
          <option value="AUTH_REQUIRED">AUTH_REQUIRED</option>
        </select>
      </div>
    </div>
  );
}

function SnapshotTable({ snapshots }: { snapshots: SnapshotDetailRow[] }) {
  if (snapshots.length === 0) {
    return (
      <div className="text-sm text-gray-500 py-8 text-center">
        조건에 해당하는 스냅샷이 없습니다.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="text-left px-3 py-2">골프장</th>
            <th className="text-left px-3 py-2">플레이 날짜</th>
            <th className="text-right px-3 py-2">최종판매가</th>
            <th className="text-right px-3 py-2">원가</th>
            <th className="text-left px-3 py-2">수집시각</th>
            <th className="text-left px-3 py-2">상태</th>
            <th className="text-left px-3 py-2">출처</th>
            <th className="text-left px-3 py-2">수집시점</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((snapshot) => (
            <tr key={snapshot.id} className="border-t border-gray-200 hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900 truncate max-w-[180px]">{snapshot.course_name}</td>
              <td className="px-3 py-2 text-gray-700">{snapshot.play_date || '-'}</td>
              <td className="px-3 py-2 text-right font-semibold text-gray-900">{formatPrice(snapshot.final_price)}</td>
              <td className="px-3 py-2 text-right text-gray-600">{formatPrice(snapshot.original_price)}</td>
              <td className="px-3 py-2 text-gray-700">{formatDateTime(snapshot.crawled_at)}</td>
              <td className="px-3 py-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${availabilityBadgeClass(snapshot.availability_status)}`}>
                  {snapshot.availability_status || '-'}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-600 text-xs">{snapshot.source_platform || snapshot.site_code}</td>
              <td className="px-3 py-2 text-gray-600 text-xs">{snapshot.collection_window || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CrawlerMonitorClient({
  generatedAt,
  lookbackDays,
  regionOrder,
  groupedCourses,
  totalCourses,
  totalSnapshots,
  loadError,
  snapshotDetails,
  filters,
}: CrawlerMonitorClientProps) {
  const router = useRouter();
  const defaultRegion = regionOrder.find((region) => (groupedCourses[region] || []).length > 0) || regionOrder[0];
  const initialRegion = regionOrder.includes((filters.region || '') as RegionKey)
    ? (filters.region as RegionKey)
    : defaultRegion;
  const [selectedRegion, setSelectedRegion] = useState<RegionKey>(initialRegion);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedCourse, setSelectedCourse] = useState<string | null>(filters.course || null);
  const [regionDraft, setRegionDraft] = useState<RegionKey>('수도권');
  const [savingRegion, setSavingRegion] = useState(false);
  const [regionMessage, setRegionMessage] = useState<string | null>(null);
  const [regionError, setRegionError] = useState<string | null>(null);
  const [snapshotRows, setSnapshotRows] = useState<SnapshotNoteRow[]>([]);
  const [snapshotLoading, setSnapshotLoading] = useState(false);
  const [snapshotError, setSnapshotError] = useState<string | null>(null);
  const [snapshotMessage, setSnapshotMessage] = useState<string | null>(null);
  const [savingSnapshotId, setSavingSnapshotId] = useState<number | null>(null);
  const [noteDraftById, setNoteDraftById] = useState<Record<number, string>>({});
  const [traitsDraftById, setTraitsDraftById] = useState<Record<number, string>>({});

  const allCourses = useMemo(
    () =>
      Array.from(
        new Set(
          Object.values(groupedCourses)
            .flat()
            .map((course) => course.courseName)
        )
      ).sort((a, b) => a.localeCompare(b, 'ko')),
    [groupedCourses]
  );

  const latestCrawledAt = useMemo(
    () =>
      Object.values(groupedCourses)
        .flat()
        .reduce<string | null>((latest, course) => {
          if (!course.latestCrawledAt) return latest;
          if (!latest) return course.latestCrawledAt;
          return new Date(course.latestCrawledAt) > new Date(latest) ? course.latestCrawledAt : latest;
        }, null),
    [groupedCourses]
  );

  const successCount = useMemo(
    () => Object.values(groupedCourses).flat().reduce((sum, course) => sum + course.availableCount, 0),
    [groupedCourses]
  );

  const updateQueryFilter = (key: keyof FilterState, value: string) => {
    if (key === 'region' && regionOrder.includes((value || '') as RegionKey)) {
      setSelectedRegion(value as RegionKey);
    }
    if (key === 'course') {
      setSelectedCourse(value || null);
    }
    const params = new URLSearchParams(window.location.search);
    const trimmed = value.trim();
    if (trimmed) params.set(key, trimmed);
    else params.delete(key);
    router.push(`/admin/crawler?${params.toString()}`);
  };

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
  const selectedCourseSnapshots = useMemo(
    () =>
      snapshotDetails.filter(
        (snapshot) => snapshot.course_name === selectedSummary?.courseName
      ),
    [snapshotDetails, selectedSummary?.courseName]
  );

  useEffect(() => {
    if (!selectedSummary) return;
    setRegionDraft(selectedSummary.region);
    setRegionMessage(null);
    setRegionError(null);
  }, [selectedSummary?.courseName, selectedSummary?.region]);

  useEffect(() => {
    if (!selectedSummary) {
      setSnapshotRows([]);
      setSnapshotError(null);
      setSnapshotMessage(null);
      setNoteDraftById({});
      setTraitsDraftById({});
      return;
    }

    const abortController = new AbortController();
    let active = true;

    const loadSnapshotRows = async () => {
      try {
        setSnapshotLoading(true);
        setSnapshotError(null);
        setSnapshotMessage(null);

        const response = await fetch(
          `/api/admin/crawler/snapshots?courseName=${encodeURIComponent(selectedSummary.courseName)}&limit=20`,
          {
            method: 'GET',
            signal: abortController.signal,
            cache: 'no-store',
          }
        );

        const json = await response.json();
        if (!response.ok) {
          throw new Error(extractApiErrorMessage(json, '스냅샷을 불러오지 못했습니다.'));
        }

        const rows = Array.isArray(json.data) ? (json.data as SnapshotNoteRow[]) : [];
        if (!active) return;

        setSnapshotRows(rows);
        const noteDrafts: Record<number, string> = {};
        const traitsDrafts: Record<number, string> = {};
        for (const row of rows) {
          noteDrafts[row.id] = row.manualNote?.text || '';
          traitsDrafts[row.id] = (row.manualNote?.traits || []).join(', ');
        }
        setNoteDraftById(noteDrafts);
        setTraitsDraftById(traitsDrafts);
      } catch (error) {
        if (!active) return;
        if (error instanceof Error && error.name === 'AbortError') return;
        setSnapshotError(error instanceof Error ? error.message : '스냅샷 조회 중 오류가 발생했습니다.');
      } finally {
        if (active) setSnapshotLoading(false);
      }
    };

    loadSnapshotRows();

    return () => {
      active = false;
      abortController.abort();
    };
  }, [selectedSummary?.courseName]);

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

  const saveSnapshotNote = async (snapshotId: number) => {
    try {
      setSavingSnapshotId(snapshotId);
      setSnapshotError(null);
      setSnapshotMessage(null);

      const note = (noteDraftById[snapshotId] || '').trim();
      const traits = (traitsDraftById[snapshotId] || '')
        .split(',')
        .map((trait) => trait.trim())
        .filter(Boolean);

      const response = await fetch('/api/admin/crawler/snapshots', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          snapshotId,
          note,
          traits,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(extractApiErrorMessage(json, '메모 저장에 실패했습니다.'));
      }

      const updated = json.data as SnapshotNoteRow | undefined;
      if (!updated) {
        throw new Error('저장 결과가 비어 있습니다.');
      }

      setSnapshotRows((prev) =>
        prev.map((row) => (row.id === updated.id ? updated : row))
      );
      setNoteDraftById((prev) => ({
        ...prev,
        [updated.id]: updated.manualNote?.text || '',
      }));
      setTraitsDraftById((prev) => ({
        ...prev,
        [updated.id]: (updated.manualNote?.traits || []).join(', '),
      }));
      setSnapshotMessage(`스냅샷 #${updated.id} 메모를 저장했습니다.`);
    } catch (error) {
      setSnapshotError(error instanceof Error ? error.message : '메모 저장 중 오류가 발생했습니다.');
    } finally {
      setSavingSnapshotId(null);
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

        <CrawlStatusPanel
          latestCrawledAt={latestCrawledAt}
          totalSnapshots={totalSnapshots}
          successCount={successCount}
        />

        <FilterBar
          filters={filters}
          regions={regionOrder}
          courses={allCourses}
          onFilterChange={updateQueryFilter}
        />

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
                  updateQueryFilter('region', region);
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

                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">가격 히스토리</h4>
                  <SnapshotTable snapshots={selectedCourseSnapshots} />
                </div>

                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">가격 행 메모/특성 (최근 20건)</p>
                    {snapshotLoading && <p className="text-xs text-gray-500">불러오는 중...</p>}
                  </div>

                  {snapshotMessage && (
                    <p className="mt-2 text-xs text-emerald-700">{snapshotMessage}</p>
                  )}
                  {snapshotError && (
                    <p className="mt-2 text-xs text-red-700">{snapshotError}</p>
                  )}

                  <div className="mt-3 space-y-3">
                    {!snapshotLoading && snapshotRows.length === 0 && (
                      <p className="text-sm text-gray-500">표시할 스냅샷이 없습니다.</p>
                    )}

                    {snapshotRows.map((row) => (
                      <div key={row.id} className="rounded-lg border border-gray-200 bg-white p-3">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                          <span className="font-semibold text-gray-900">#{row.id}</span>
                          <span>{row.siteCode}</span>
                          <span>{row.playDate || '-'}</span>
                          <span>{row.collectionWindow || '-'}</span>
                          <span>{formatPrice(row.finalPrice)}</span>
                          <span className={`px-2 py-0.5 rounded-full ${availabilityBadgeClass(row.availabilityStatus)}`}>
                            {row.availabilityStatus || '-'}
                          </span>
                          <span>수집: {formatDateTime(row.crawledAt)}</span>
                        </div>

                        <div className="mt-2 grid grid-cols-1 lg:grid-cols-[1fr_280px_auto] gap-2">
                          <input
                            value={noteDraftById[row.id] || ''}
                            onChange={(event) =>
                              setNoteDraftById((prev) => ({
                                ...prev,
                                [row.id]: event.target.value,
                              }))
                            }
                            placeholder="간단 메모 (예: 성수기 / 우천예보 / 이벤트)"
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <input
                            value={traitsDraftById[row.id] || ''}
                            onChange={(event) =>
                              setTraitsDraftById((prev) => ({
                                ...prev,
                                [row.id]: event.target.value,
                              }))
                            }
                            placeholder="특성 태그 (쉼표 구분)"
                            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() => saveSnapshotNote(row.id)}
                            disabled={savingSnapshotId === row.id}
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold disabled:opacity-50"
                          >
                            {savingSnapshotId === row.id ? '저장 중...' : '저장'}
                          </button>
                        </div>

                        <p className="mt-2 text-xs text-gray-500">
                          마지막 수정: {formatDateTime(row.manualNote?.updatedAt || null)} | 작성자:{' '}
                          {row.manualNote?.updatedByEmail || row.manualNote?.updatedBy || '-'}
                        </p>
                      </div>
                    ))}
                  </div>
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
