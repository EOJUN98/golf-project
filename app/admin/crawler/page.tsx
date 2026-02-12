import { createClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import CrawlerMonitorClient from '@/components/admin/CrawlerMonitorClient';
import { requireSuperAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';

export const dynamic = 'force-dynamic';

type RegionKey = '충청' | '수도권' | '강원' | '경상' | '전라' | '제주';
type WindowKey = 'WEEK_BEFORE' | 'TWO_DAYS_BEFORE' | 'SAME_DAY_MORNING' | 'IMMINENT_3H';

interface TargetRow {
  id: number;
  site_code: string;
  course_name: string;
  active: boolean;
}

interface SnapshotRow {
  target_id: number | null;
  site_code: string;
  course_name: string;
  final_price: number | null;
  collection_window: WindowKey | null;
  availability_status: string | null;
  crawl_status: string | null;
  crawled_at: string;
  error_message: string | null;
}

interface RegionMappingRow {
  course_name: string;
  course_name_normalized: string;
  region: RegionKey;
  active: boolean;
}

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

const REGION_ORDER: RegionKey[] = ['충청', '수도권', '강원', '경상', '전라', '제주'];
const WINDOW_KEYS: WindowKey[] = ['WEEK_BEFORE', 'TWO_DAYS_BEFORE', 'SAME_DAY_MORNING', 'IMMINENT_3H'];
const LOOKBACK_DAYS = 30;

function createEmptyWindowStats(): Record<WindowKey, WindowStats> {
  return {
    WEEK_BEFORE: { count: 0, latestPrice: null, latestCrawledAt: null },
    TWO_DAYS_BEFORE: { count: 0, latestPrice: null, latestCrawledAt: null },
    SAME_DAY_MORNING: { count: 0, latestPrice: null, latestCrawledAt: null },
    IMMINENT_3H: { count: 0, latestPrice: null, latestCrawledAt: null },
  };
}

function inferRegionFromCourseName(courseName: string): RegionKey {
  const name = courseName.toLowerCase();

  const hasAny = (keywords: string[]) => keywords.some((keyword) => name.includes(keyword));

  if (hasAny(['제주', '서귀포'])) return '제주';
  if (hasAny(['강원', '춘천', '원주', '강릉', '속초', '평창', '정선', '홍천', '횡성', '인제'])) return '강원';
  if (hasAny(['충청', '천안', '아산', '청주', '충주', '당진', '서산', '태안', '공주', '보령', '세종'])) return '충청';
  if (hasAny(['전라', '광주', '전주', '군산', '익산', '목포', '순천', '여수', '나주', '완주'])) return '전라';
  if (hasAny(['경상', '대구', '부산', '울산', '포항', '경주', '구미', '창원', '김해', '진주', '통영'])) return '경상';

  return '수도권';
}

function normalizeCourseName(value: string): string {
  return value
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[()_\-]/g, '');
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function aggregateCourseSummaries(
  targets: TargetRow[],
  snapshots: SnapshotRow[],
  manualRegionMap: Map<string, RegionKey>
): { grouped: Record<RegionKey, CourseSummary[]>; totalCourses: number; totalSnapshots: number } {
  const map = new Map<string, CourseSummary>();

  const ensureCourse = (courseNameRaw: string, siteCodeRaw: string) => {
    const courseName = courseNameRaw.trim();
    if (!courseName || courseName === '*') return null;

    if (!map.has(courseName)) {
      const normalized = normalizeCourseName(courseName);
      const region = manualRegionMap.get(normalized) || inferRegionFromCourseName(courseName);
      map.set(courseName, {
        courseName,
        region,
        sites: siteCodeRaw ? [siteCodeRaw] : [],
        latestCrawledAt: null,
        latestStatus: null,
        latestAvailability: null,
        latestPrice: null,
        totalSnapshots: 0,
        availableCount: 0,
        noDataCount: 0,
        failedCount: 0,
        authRequiredCount: 0,
        minPrice: null,
        maxPrice: null,
        avgPrice: null,
        windowStats: createEmptyWindowStats(),
        lastError: null,
      });
    }

    const summary = map.get(courseName)!;
    if (siteCodeRaw && !summary.sites.includes(siteCodeRaw)) {
      summary.sites.push(siteCodeRaw);
    }
    return summary;
  };

  for (const target of targets) {
    ensureCourse(target.course_name, target.site_code);
  }

  const priceAccumulator = new Map<string, number[]>();

  for (const row of snapshots) {
    const summary = ensureCourse(row.course_name, row.site_code);
    if (!summary) continue;

    summary.totalSnapshots += 1;

    const availability = row.availability_status || 'UNKNOWN';
    const crawlStatus = row.crawl_status || 'UNKNOWN';

    if (availability === 'AVAILABLE') summary.availableCount += 1;
    if (availability === 'NO_DATA') summary.noDataCount += 1;
    if (availability === 'AUTH_REQUIRED') summary.authRequiredCount += 1;
    if (availability === 'FAILED' || crawlStatus === 'FAILED') summary.failedCount += 1;

    if (!summary.latestCrawledAt || new Date(row.crawled_at) > new Date(summary.latestCrawledAt)) {
      summary.latestCrawledAt = row.crawled_at;
      summary.latestStatus = crawlStatus;
      summary.latestAvailability = availability;
      summary.latestPrice = row.final_price;
      summary.lastError = row.error_message;
    }

    const price = toNumber(row.final_price);
    if (price !== null && availability === 'AVAILABLE') {
      if (!priceAccumulator.has(summary.courseName)) {
        priceAccumulator.set(summary.courseName, []);
      }
      priceAccumulator.get(summary.courseName)!.push(price);
    }

    if (row.collection_window && WINDOW_KEYS.includes(row.collection_window)) {
      const windowStat = summary.windowStats[row.collection_window];
      windowStat.count += 1;
      if (!windowStat.latestCrawledAt || new Date(row.crawled_at) > new Date(windowStat.latestCrawledAt)) {
        windowStat.latestCrawledAt = row.crawled_at;
        windowStat.latestPrice = price;
      }
    }
  }

  for (const [courseName, prices] of priceAccumulator.entries()) {
    if (prices.length === 0) continue;
    const summary = map.get(courseName);
    if (!summary) continue;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const avg = prices.reduce((acc, value) => acc + value, 0) / prices.length;
    summary.minPrice = min;
    summary.maxPrice = max;
    summary.avgPrice = avg;
  }

  const grouped: Record<RegionKey, CourseSummary[]> = {
    충청: [],
    수도권: [],
    강원: [],
    경상: [],
    전라: [],
    제주: [],
  };

  for (const summary of map.values()) {
    grouped[summary.region].push({
      ...summary,
      sites: [...summary.sites].sort(),
    });
  }

  for (const region of REGION_ORDER) {
    grouped[region].sort((a, b) => {
      if (a.latestCrawledAt && b.latestCrawledAt) {
        return new Date(b.latestCrawledAt).getTime() - new Date(a.latestCrawledAt).getTime();
      }
      if (a.latestCrawledAt) return -1;
      if (b.latestCrawledAt) return 1;
      return a.courseName.localeCompare(b.courseName, 'ko');
    });
  }

  return {
    grouped,
    totalCourses: map.size,
    totalSnapshots: snapshots.length,
  };
}

export default async function AdminCrawlerPage() {
  try {
    await requireSuperAdminAccess();
  } catch (error) {
    if (error instanceof Error && error.message === 'UNAUTHORIZED') {
      redirect('/login?redirect=/admin/crawler');
    }
    redirect('/forbidden');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const sinceIso = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();

  let loadError: string | null = null;
  let targets: TargetRow[] = [];
  let snapshots: SnapshotRow[] = [];
  const manualRegionMap = new Map<string, RegionKey>();

  try {
    const [
      { data: targetData, error: targetError },
      { data: snapshotData, error: snapshotError },
      { data: mappingData, error: mappingError },
    ] = await Promise.all([
      supabase
        .from('external_price_targets')
        .select('id, site_code, course_name, active')
        .eq('active', true),
      supabase
        .from('external_price_snapshots')
        .select('target_id, site_code, course_name, final_price, collection_window, availability_status, crawl_status, crawled_at, error_message')
        .gte('crawled_at', sinceIso)
        .order('crawled_at', { ascending: false })
        .limit(10000),
      supabase
        .from('external_course_regions')
        .select('course_name, course_name_normalized, region, active')
        .eq('active', true),
    ]);

    if (targetError) {
      throw new Error(targetError.message);
    }
    if (snapshotError) {
      throw new Error(snapshotError.message);
    }
    if (mappingError) {
      throw new Error(mappingError.message);
    }

    targets = (targetData || []) as TargetRow[];
    snapshots = ((snapshotData || []) as SnapshotRow[]).map((row) => ({
      ...row,
      final_price: toNumber(row.final_price),
    }));

    const mappings = (mappingData || []) as RegionMappingRow[];
    for (const mapping of mappings) {
      const normalized = mapping.course_name_normalized || normalizeCourseName(mapping.course_name);
      manualRegionMap.set(normalized, mapping.region);
    }
  } catch (error) {
    loadError = error instanceof Error ? error.message : '데이터 조회 중 오류가 발생했습니다.';
  }

  const aggregated = aggregateCourseSummaries(targets, snapshots, manualRegionMap);

  return (
    <CrawlerMonitorClient
      generatedAt={new Date().toISOString()}
      lookbackDays={LOOKBACK_DAYS}
      regionOrder={REGION_ORDER}
      groupedCourses={aggregated.grouped}
      totalCourses={aggregated.totalCourses}
      totalSnapshots={aggregated.totalSnapshots}
      loadError={loadError}
    />
  );
}
