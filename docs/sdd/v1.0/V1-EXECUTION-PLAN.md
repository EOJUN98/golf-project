# v1.0 실행 계획 (Codex 지시용) - 줄 번호 단위 상세 구현 스펙

> 작성: 2026-02-17, 갱신: 2026-02-18
> 우선순위: ① 프라이싱 엔진 (Step 0→3) → ② Admin 티타임 DB 연동
> 방식: 각 Step을 Codex에게 1건씩 지시. **줄 번호, import, 함수 시그니처, 완전한 코드가 포함됨.**
> **규칙**: 기존 코드 삭제 금지. 삽입/추가만 허용. 삭제가 필요한 경우 명시적으로 표기.

---

## 현재 코드 정밀 분석 (2026-02-17 기준)

### 핵심 파일 목록 + 줄 수 + 구조

| # | 파일 경로 | 줄 수 | 핵심 export/함수 | 상태 |
|---|----------|-------|-----------------|------|
| 1 | `utils/pricingEngine.ts` | 244 | `calculatePricing(ctx)`, `PricingContext`, `PricingResult`, `SeededRandom` | 작동 중. 시장가 미반영 |
| 2 | `app/api/pricing/route.ts` | 265 | `GET()` → calculatePricing 호출, marketReference 조회만 | 작동 중. 엔진에 미전달 |
| 3 | `components/admin/CrawlerMonitorClient.tsx` | 442 | `CrawlerMonitorClient(props)` → 지역탭+검색+지역매핑 | 날짜필터/메모/수집상태 없음 |
| 4 | `app/admin/crawler/page.tsx` | 347 | `AdminCrawlerPage()` Server Component → 3테이블 조회 | 작동 중 |
| 5 | `app/admin/tee-times/page.tsx` | 570 | `AdminTeeTimesPage()` Client → Server Action 호출 | DB 신뢰도 약함 |
| 6 | `app/admin/tee-times/actions.ts` | 398 | `getAccessibleGolfClubs`, `getTeeTimes`, `createTeeTime`, `updateTeeTime`, `blockTeeTime`, `unblockTeeTime` | 작동하나 검증 불완전 |
| 7 | `app/api/admin/tee-times/route.ts` | 86 | `PATCH()` only (set-status, update-base-price) | GET/POST/DELETE 없음 |
| 8 | `app/api/admin/crawler/regions/route.ts` | 125 | `POST()`, `DELETE()` → external_course_regions CRUD | 작동 중 |
| 9 | `lib/auth/getCurrentUserWithRoles.ts` | 399 | `getCurrentUserWithRoles()`, `requireAdminAccess()`, `requireSuperAdminAccess()`, `requireClubAccess(clubId)` | 작동 중 |
| 10 | `lib/supabase/admin.ts` | 37 | `createSupabaseAdminClient()`, `createSupabaseAdminClientOptional()` | 작동 중 |

### DB 테이블 현황

| 테이블 | 주요 컬럼 | 비고 |
|--------|-----------|------|
| `external_price_targets` | id, site_code, course_name, url, adapter_code, source_platform, active | 크롤링 대상 |
| `external_price_snapshots` | id, target_id, site_code, course_name, play_date, final_price, original_price, crawled_at, crawl_status, availability_status, collection_window, error_message, source_platform | **note 없음 ← Step 2에서 추가** |
| `external_course_regions` | course_name, course_name_normalized, region, note, active | 지역 매핑 |
| `tee_times` | id, golf_club_id, tee_off, base_price, status, reserved_by, reserved_at, updated_by, updated_at, weather_condition | 티타임 슬롯 |
| `weather_cache` | target_date, target_hour, pop, rn1, wsd, tmp(?) | 날씨 캐시 |

### 인증/권한 패턴 (모든 API에서 동일하게 사용)

```typescript
// 패턴 1: 관리자 전용 API (crawler, tee-times 등)
import { requireAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';
const admin = await requireAdminAccess();
// admin = { id: string, isSuperAdmin: boolean, isAdmin: boolean, isClubAdmin: boolean, clubIds: number[] }
// 실패 시 Error 던짐 (message: 'UNAUTHORIZED' | 'FORBIDDEN')

// 패턴 2: Supabase admin client (RLS 우회)
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
const supabase = createSupabaseAdminClient();
// 또는 optional 버전:
import { createSupabaseAdminClientOptional } from '@/lib/supabase/admin';
const adminClient = createSupabaseAdminClientOptional();
const supabase = adminClient ?? await createSupabaseServerClient();
```

### API 응답 패턴 (신규 API는 이 패턴 따름)

```typescript
// 성공
return NextResponse.json({ success: true, data: {...} });
return NextResponse.json({ success: true, data: [...], meta: { total: 10 } });

// 실패
return NextResponse.json(
  { success: false, error: { code: 'FORBIDDEN', message: '관리자 권한이 필요합니다' } },
  { status: 403 }
);
// code 종류: FORBIDDEN, UNAUTHORIZED, VALIDATION_ERROR, NOT_FOUND, CONFLICT, INTERNAL_ERROR
```

---

## 가격 엔진 v1.0: 추가할 Factor 7개 상세 설계

### 현재 Factor (pricingEngine.ts:69-243)

```
순서 | 코드          | 위치(줄)      | 동작
1    | WEATHER_STORM | 80-93        | 강수 10mm+ → 차단 (return)
2    | TIME_STEP     | 95-128       | 2시간 전부터 3단계 고정액 할인
3    | WEATHER       | 130-156      | 강수확률 기반 % 할인
4    | VIP_STATUS    | 158-169      | PRESTIGE 5%
5    | LBS_NEARBY    | 171-182      | 15km 이내 10%
6    | MAX_CAP       | 184-199      | 40% 초과 시 복원
7    | PANIC_MODE    | 204-230      | 30분 전 + 20% 확률
```

### 추가할 Factor (삽입 위치 포함)

```
순서  | 코드           | 삽입 위치              | 조건                        | 할인/조정
2.5   | MARKET_PRICE  | 128줄 뒤 (Step1 뒤)    | 시장가 < currentPrice       | (currentPrice - marketPrice) × 50% 감액
3.5a  | TEMPERATURE   | 156줄 뒤 (WEATHER 뒤)  | tmp >= 35 또는 tmp <= 5     | 5% 할인
3.5b  | WIND          | TEMPERATURE 뒤         | wsd >= 15                   | 5% 할인
4.5a  | PEAK_SEASON   | 182줄 뒤 (LBS 뒤)     | 성수기 판단                 | 지금까지 할인의 50% 복원
4.5b  | OFF_SEASON    | PEAK_SEASON else       | 비수기 판단                 | 5% 추가 할인
4.5c  | WEEKDAY       | OFF_SEASON 뒤          | 평일(공휴일 제외)+비성수기   | 3% 추가 할인
4.5d  | EVENT         | WEEKDAY 뒤             | marketTags에 '이벤트' 포함  | 3% 추가 할인
4.5e  | LOW_DEMAND    | EVENT 뒤               | demandRate > 0.7            | 3% 추가 할인
```

### 시즌 판단 로직

```
함수: getSeasonType(date, tags?)
1. 태그 우선: tags에 '성수기' → peak, '비수기' → off
2. 자동 판단:
   - peak: 3-5월(봄) 또는 9-10월(가을) + 주말/공휴일
   - off: 12-2월(겨울) 평일 또는 7-8월(한여름) 평일
   - normal: 그 외
```

### 한국 공휴일 2026

```typescript
const KOREAN_HOLIDAYS_2026 = [
  '2026-01-01', // 신정
  '2026-01-28', '2026-01-29', '2026-01-30', // 설날
  '2026-03-01', // 삼일절
  '2026-05-05', // 어린이날
  '2026-05-24', // 부처님오신날
  '2026-06-06', // 현충일
  '2026-08-15', // 광복절
  '2026-09-24', '2026-09-25', '2026-09-26', // 추석
  '2026-10-03', // 개천절
  '2026-10-09', // 한글날
  '2026-12-25', // 성탄절
];
```

---

# ====================================================================
# Step 0: /admin/crawler 카테고리 분류 개선
# ====================================================================

## 목표

관리자가 골프장/지역/날짜/상태 조합으로 필터링하고, 선택한 골프장의 개별 가격 스냅샷 행을 확인할 수 있게 한다.

## 변경 파일 목록

| 파일 | 변경 유형 | 설명 |
|------|-----------|------|
| `app/admin/crawler/page.tsx` | 수정 | searchParams 추가, snapshot 개별 행 조회, props 확장 |
| `components/admin/CrawlerMonitorClient.tsx` | 수정 | FilterBar 추가, SnapshotTable 추가, URL 기반 필터 |

---

## Step 0-1: `app/admin/crawler/page.tsx` 수정

### 변경 1: 함수 시그니처에 searchParams 추가 (줄 269)

**변경 전** (줄 269):
```typescript
export default async function AdminCrawlerPage() {
```

**변경 후**:
```typescript
export default async function AdminCrawlerPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; region?: string; course?: string; status?: string }>
}) {
```

### 변경 2: searchParams 파싱 추가 (줄 270, try 블록 시작 전에 삽입)

**줄 270 (`try {`) 바로 위에 삽입:**

```typescript
  const params = await searchParams;
  const filterFrom = params.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const filterTo = params.to || new Date().toISOString().slice(0, 10);
  const filterRegion = params.region || null;
  const filterCourse = params.course || null;
  const filterStatus = params.status || null;
```

### 변경 3: snapshot 개별 행 조회 추가 (줄 307, `]` 뒤에 삽입)

**현재 줄 292-307에서 Promise.all이 3개 테이블을 조회함.**
**줄 307 (`]);`) 바로 뒤에 추가:**

```typescript
    // Step 0: 개별 스냅샷 행 조회 (필터 적용)
    let snapshotDetailQuery = supabase
      .from('external_price_snapshots')
      .select('id, target_id, site_code, course_name, play_date, final_price, original_price, crawled_at, crawl_status, availability_status, collection_window, source_platform, error_message')
      .gte('play_date', filterFrom)
      .lte('play_date', filterTo)
      .order('play_date', { ascending: false })
      .order('crawled_at', { ascending: false })
      .limit(500);

    if (filterCourse) {
      snapshotDetailQuery = snapshotDetailQuery.eq('course_name', filterCourse);
    }
    if (filterStatus) {
      snapshotDetailQuery = snapshotDetailQuery.eq('availability_status', filterStatus);
    }

    const { data: snapshotDetails } = await snapshotDetailQuery;
```

### 변경 4: CrawlerMonitorClient에 추가 props 전달 (줄 337-345)

**변경 전** (줄 337-345):
```typescript
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
```

**변경 후**:
```typescript
  return (
    <CrawlerMonitorClient
      generatedAt={new Date().toISOString()}
      lookbackDays={LOOKBACK_DAYS}
      regionOrder={REGION_ORDER}
      groupedCourses={aggregated.grouped}
      totalCourses={aggregated.totalCourses}
      totalSnapshots={aggregated.totalSnapshots}
      loadError={loadError}
      snapshotDetails={snapshotDetails || []}
      filters={{
        from: filterFrom,
        to: filterTo,
        region: filterRegion,
        course: filterCourse,
        status: filterStatus,
      }}
    />
  );
```

---

## Step 0-2: `components/admin/CrawlerMonitorClient.tsx` 수정

### 변경 1: 타입 추가 (줄 35-45 사이에 삽입)

**줄 35 (`}`) 뒤, 줄 37 (`interface CrawlerMonitorClientProps`) 앞에 삽입:**

```typescript
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
```

### 변경 2: Props 타입 확장 (줄 37-45)

**변경 전** (줄 37-45):
```typescript
interface CrawlerMonitorClientProps {
  generatedAt: string;
  lookbackDays: number;
  regionOrder: RegionKey[];
  groupedCourses: Record<RegionKey, CourseSummary[]>;
  totalCourses: number;
  totalSnapshots: number;
  loadError?: string | null;
}
```

**변경 후**:
```typescript
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
```

### 변경 3: props 디스트럭처링 확장 (줄 86-94)

**변경 전** (줄 86-94):
```typescript
export default function CrawlerMonitorClient({
  generatedAt,
  lookbackDays,
  regionOrder,
  groupedCourses,
  totalCourses,
  totalSnapshots,
  loadError,
}: CrawlerMonitorClientProps) {
```

**변경 후**:
```typescript
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
```

### 변경 4: FilterBar 컴포넌트 추가 (파일 최하단, `export default` 앞)

**줄 86 (`export default function`) 바로 앞에 삽입:**

```typescript
function FilterBar({
  filters,
  regions,
  courses,
  onFilterChange,
}: {
  filters: FilterState;
  regions: RegionKey[];
  courses: string[];
  onFilterChange: (key: string, value: string) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm font-semibold text-gray-900 mb-3">스냅샷 필터</p>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <select
          value={filters.region || ''}
          onChange={(e) => onFilterChange('region', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">전체 지역</option>
          {regions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        <select
          value={filters.course || ''}
          onChange={(e) => onFilterChange('course', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">전체 골프장</option>
          {courses.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <input
          type="date"
          value={filters.from}
          onChange={(e) => onFilterChange('from', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="date"
          value={filters.to}
          onChange={(e) => onFilterChange('to', e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />

        <select
          value={filters.status || ''}
          onChange={(e) => onFilterChange('status', e.target.value)}
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
            <th className="text-left px-3 py-2">메모</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((snap) => (
            <tr key={snap.id} className="border-t border-gray-200 hover:bg-gray-50">
              <td className="px-3 py-2 font-medium text-gray-900 truncate max-w-[160px]">
                {snap.course_name}
              </td>
              <td className="px-3 py-2 text-gray-700">{snap.play_date || '-'}</td>
              <td className="px-3 py-2 text-right font-semibold text-gray-900">
                {snap.final_price ? `${Math.round(snap.final_price).toLocaleString('ko-KR')}원` : '-'}
              </td>
              <td className="px-3 py-2 text-right text-gray-500">
                {snap.original_price ? `${Math.round(snap.original_price).toLocaleString('ko-KR')}원` : '-'}
              </td>
              <td className="px-3 py-2 text-gray-700">{formatDateTime(snap.crawled_at)}</td>
              <td className="px-3 py-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${availabilityBadgeClass(snap.availability_status)}`}>
                  {snap.availability_status || '-'}
                </span>
              </td>
              <td className="px-3 py-2 text-gray-600 text-xs">{snap.source_platform || snap.site_code}</td>
              <td className="px-3 py-2 text-gray-600 text-xs">{snap.collection_window || '-'}</td>
              <td className="px-3 py-2">
                <span className="text-xs text-gray-400">Step 2에서 활성화</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### 변경 5: 컴포넌트 본문에 FilterBar + SnapshotTable 삽입

**줄 247 (지역 탭 `</div>` 닫힘) 뒤, 줄 249 (grid 시작) 앞에 삽입:**

```typescript
        {/* Step 0: 필터 바 */}
        <FilterBar
          filters={filters}
          regions={regionOrder}
          courses={Array.from(
            new Set(
              Object.values(groupedCourses)
                .flat()
                .map((c) => c.courseName)
            )
          ).sort((a, b) => a.localeCompare(b, 'ko'))}
          onFilterChange={(key, value) => {
            const params = new URLSearchParams(window.location.search);
            if (value) params.set(key, value);
            else params.delete(key);
            router.push(`/admin/crawler?${params.toString()}`);
          }}
        />
```

**줄 437 (selectedSummary 섹션의 마지막 `</div>` 닫힘) 뒤, section 닫힘 전에 삽입:**

선택한 골프장의 스냅샷만 필터링해서 SnapshotTable에 전달:

```typescript
                {/* Step 0: 개별 스냅샷 테이블 */}
                <div>
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">가격 히스토리</h4>
                  <SnapshotTable
                    snapshots={snapshotDetails.filter(
                      (s) => s.course_name === selectedSummary?.courseName
                    )}
                  />
                </div>
```

### AC (완료 조건)

- [ ] 지역 드롭다운 → URL `?region=수도권` → 서버 재조회 → 해당 지역만 표시
- [ ] 골프장 드롭다운 → URL `?course=골프장명` → 서버 재조회
- [ ] 날짜 범위 → URL `?from=2026-02-01&to=2026-02-18` → 해당 기간 스냅샷만
- [ ] 상태 필터 → URL `?status=AVAILABLE` → 해당 상태만
- [ ] 골프장 선택 시 우측에 요약 + 하단에 가격 히스토리 테이블 표시
- [ ] 기존 지역 매핑 CRUD 정상 작동 (regression 없음)

---

# ====================================================================
# Step 1-A: 수집 실행 API
# ====================================================================

## 목표

`POST /api/admin/crawler/run` → active 타겟 전체 또는 지정 ID들을 수집 실행하고 결과를 DB에 저장.

## 신규 파일: `app/api/admin/crawler/run/route.ts`

**디렉토리 생성 필요**: `app/api/admin/crawler/run/`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';

interface CrawlResult {
  targetId: number;
  courseName: string;
  playDate: string;
  finalPrice: number | null;
  originalPrice: number | null;
  availabilityStatus: 'AVAILABLE' | 'NO_DATA' | 'FAILED';
  errorMessage?: string;
}

// POST /api/admin/crawler/run
export async function POST(request: NextRequest) {
  // 1. 권한 확인 (Cron 호출도 지원)
  const cronSecret = process.env.CRON_SECRET;
  const cronHeader = request.headers.get('x-cron-secret');
  const isCronCall = cronSecret && cronHeader === cronSecret;

  if (!isCronCall) {
    try {
      await requireAdminAccess();
    } catch {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '관리자 권한이 필요합니다' } },
        { status: 403 }
      );
    }
  }

  const body = await request.json().catch(() => ({}));
  const targetIds: number[] | undefined = body.targetIds;

  const supabase = createSupabaseAdminClient();

  // 2. active 타겟 조회
  let targetQuery = supabase
    .from('external_price_targets')
    .select('*')
    .eq('active', true);

  if (targetIds && targetIds.length > 0) {
    targetQuery = targetQuery.in('id', targetIds);
  }

  const { data: targets, error: targetError } = await targetQuery;
  if (targetError || !targets) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '타겟 조회 실패' } },
      { status: 500 }
    );
  }

  // 3. 각 타겟별 수집 실행
  const results: CrawlResult[] = [];
  const errors: { targetId: number; courseName: string; error: string }[] = [];

  for (const target of targets) {
    try {
      const result = await executeCrawl(target);
      results.push(result);

      // snapshot INSERT
      await supabase.from('external_price_snapshots').insert({
        target_id: target.id,
        site_code: target.site_code,
        course_name: target.course_name,
        play_date: result.playDate,
        final_price: result.finalPrice,
        original_price: result.originalPrice,
        crawled_at: new Date().toISOString(),
        crawl_status: result.availabilityStatus === 'FAILED' ? 'FAILED' : 'SUCCESS',
        availability_status: result.availabilityStatus,
        source_platform: target.source_platform,
        error_message: result.errorMessage || null,
      });
    } catch (err) {
      errors.push({
        targetId: target.id,
        courseName: target.course_name,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      total: targets.length,
      succeeded: results.filter((r) => r.availabilityStatus === 'AVAILABLE').length,
      failed: errors.length,
      noData: results.filter((r) => r.availabilityStatus === 'NO_DATA').length,
      errors: errors.slice(0, 10), // 최대 10개만
      executedAt: new Date().toISOString(),
    },
  });
}

// 크롤링 실행 함수 (adapter_code별 분기)
// Phase 1: placeholder (fetch 시도만). Phase 2에서 실제 파싱 구현.
async function executeCrawl(target: {
  id: number;
  course_name: string;
  url: string;
  adapter_code: string;
}): Promise<CrawlResult> {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const playDate = tomorrow.toISOString().slice(0, 10);

  // adapter_code에 따른 분기:
  // - 'playwright_generic': TODO Phase 2
  // - 'api_direct': TODO Phase 2
  // - 'static_manual': 크롤링 안 함 (수동 입력)

  if (target.adapter_code === 'static_manual') {
    return {
      targetId: target.id,
      courseName: target.course_name,
      playDate,
      finalPrice: null,
      originalPrice: null,
      availabilityStatus: 'NO_DATA',
      errorMessage: 'Manual entry target - no crawl',
    };
  }

  try {
    const response = await fetch(target.url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'User-Agent': 'TUGOL-PriceCrawler/1.0' },
    });

    if (!response.ok) {
      return {
        targetId: target.id,
        courseName: target.course_name,
        playDate,
        finalPrice: null,
        originalPrice: null,
        availabilityStatus: 'FAILED',
        errorMessage: `HTTP ${response.status}`,
      };
    }

    // TODO Phase 2: parser_config에 따른 실제 가격 파싱
    return {
      targetId: target.id,
      courseName: target.course_name,
      playDate,
      finalPrice: null,
      originalPrice: null,
      availabilityStatus: 'NO_DATA',
      errorMessage: 'Parser not implemented yet',
    };
  } catch (err) {
    return {
      targetId: target.id,
      courseName: target.course_name,
      playDate,
      finalPrice: null,
      originalPrice: null,
      availabilityStatus: 'FAILED',
      errorMessage: err instanceof Error ? err.message : 'fetch failed',
    };
  }
}
```

### AC

- [ ] `POST /api/admin/crawler/run` → 관리자 권한 확인 → active 타겟 조회 → 각각 수집 시도
- [ ] 수집 결과가 `external_price_snapshots`에 INSERT됨
- [ ] 권한 없으면 403 반환
- [ ] `{ targetIds: [1,2,3] }` 전달 시 해당 타겟만 수집
- [ ] CRON_SECRET 헤더로 내부 호출 가능

---

# ====================================================================
# Step 1-B: Cron 스케줄러
# ====================================================================

## 목표

Vercel Cron으로 4시간마다 자동 수집 실행.

## 신규 파일: `app/api/cron/crawl-prices/route.ts`

**디렉토리 생성 필요**: `app/api/cron/crawl-prices/`

```typescript
import { NextRequest, NextResponse } from 'next/server';

// Vercel Cron: 4시간마다 호출
// vercel.json: { "crons": [{ "path": "/api/cron/crawl-prices", "schedule": "0 */4 * * *" }] }

export async function GET(request: NextRequest) {
  // 1. CRON_SECRET 검증 (Vercel Cron은 Authorization 헤더로 전송)
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json(
      { success: false, error: 'CRON_SECRET not configured' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  // 2. 내부 크롤러 API 호출
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/admin/crawler/run`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret,
      },
      body: JSON.stringify({}),
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      executedAt: new Date().toISOString(),
      result: result.data || result,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: 'Crawl execution failed', detail: err instanceof Error ? err.message : 'unknown' },
      { status: 500 }
    );
  }
}
```

## 신규 파일: `vercel.json` (프로젝트 루트)

```json
{
  "crons": [
    {
      "path": "/api/cron/crawl-prices",
      "schedule": "0 */4 * * *"
    }
  ]
}
```

## 환경 변수 추가 필요

`.env.local`에 추가:
```
CRON_SECRET=your-random-secret-string-here
```

### AC

- [ ] `GET /api/cron/crawl-prices` + Bearer token → 크롤러 실행
- [ ] CRON_SECRET 불일치 시 401
- [ ] `vercel.json` cron 설정 존재
- [ ] Vercel 배포 후 4시간마다 자동 실행 확인

---

# ====================================================================
# Step 1-C: 수집 상태 UI (CrawlStatusPanel)
# ====================================================================

## 목표

크롤러 모니터링 상단에 "마지막 수집 시각 | 성공률 | 수동 실행 버튼" 패널 추가.

## 변경 파일: `components/admin/CrawlerMonitorClient.tsx`

### 변경 1: CrawlStatusPanel 컴포넌트 추가 (FilterBar 위에)

**FilterBar 함수 바로 위에 삽입:**

```typescript
function CrawlStatusPanel({
  latestCrawledAt,
  totalSnapshots,
  successCount,
}: {
  latestCrawledAt: string | null;
  totalSnapshots: number;
  successCount: number;
}) {
  const [running, setRunning] = useState(false);
  const [lastResult, setLastResult] = useState<{
    total: number;
    succeeded: number;
    failed: number;
    noData: number;
    executedAt: string;
  } | null>(null);
  const router = useRouter();

  const successRate = totalSnapshots > 0 ? Math.round((successCount / totalSnapshots) * 100) : 0;

  const handleManualRun = async () => {
    if (!confirm('수동 수집을 실행하시겠습니까? 모든 active 타겟을 수집합니다.')) return;
    setRunning(true);
    try {
      const res = await fetch('/api/admin/crawler/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const json = await res.json();
      if (json.success) {
        setLastResult(json.data);
        router.refresh();
      }
    } catch {
      // 에러 무시 (UI에 반영 안 됨)
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">수집 현황</h3>
          <p className="text-xs text-gray-500 mt-1">
            마지막 수집: {latestCrawledAt ? formatDateTime(latestCrawledAt) : '정보 없음'} |
            성공률: {successRate}% ({successCount}/{totalSnapshots})
          </p>
        </div>
        <button
          onClick={handleManualRun}
          disabled={running}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg disabled:opacity-50 hover:bg-blue-700"
        >
          {running ? '수집 중...' : '수동 수집 실행'}
        </button>
      </div>

      {lastResult && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          <div className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-xs text-gray-500">전체</p>
            <p className="text-lg font-bold">{lastResult.total}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-2 text-center">
            <p className="text-xs text-green-600">성공</p>
            <p className="text-lg font-bold text-green-700">{lastResult.succeeded}</p>
          </div>
          <div className="bg-amber-50 rounded-lg p-2 text-center">
            <p className="text-xs text-amber-600">데이터없음</p>
            <p className="text-lg font-bold text-amber-700">{lastResult.noData}</p>
          </div>
          <div className="bg-red-50 rounded-lg p-2 text-center">
            <p className="text-xs text-red-600">실패</p>
            <p className="text-lg font-bold text-red-700">{lastResult.failed}</p>
          </div>
        </div>
      )}
    </div>
  );
}
```

### 변경 2: CrawlStatusPanel 렌더링 삽입

**본문의 줄 225 (지역 탭 `<div className="flex flex-wrap gap-2">`) 앞에 삽입:**

```typescript
        {/* Step 1-C: 수집 상태 패널 */}
        <CrawlStatusPanel
          latestCrawledAt={
            Object.values(groupedCourses)
              .flat()
              .reduce<string | null>((latest, c) => {
                if (!c.latestCrawledAt) return latest;
                if (!latest) return c.latestCrawledAt;
                return new Date(c.latestCrawledAt) > new Date(latest) ? c.latestCrawledAt : latest;
              }, null)
          }
          totalSnapshots={totalSnapshots}
          successCount={
            Object.values(groupedCourses)
              .flat()
              .reduce((sum, c) => sum + c.availableCount, 0)
          }
        />
```

### AC

- [ ] 상단에 수집 현황 카드 표시 (마지막 수집, 성공률)
- [ ] "수동 수집 실행" 버튼 클릭 → confirm → POST /api/admin/crawler/run
- [ ] 수집 완료 후 결과 4칸 카드 표시 (전체/성공/데이터없음/실패)
- [ ] 페이지 자동 새로고침 (router.refresh)

---

# ====================================================================
# Step 2-A: DB 마이그레이션 (snapshot 메모 필드)
# ====================================================================

## 목표

`external_price_snapshots` 테이블에 note, note_tags, note_author, note_updated_at 컬럼 추가.

## 신규 파일: `supabase/migrations/20260218100000_snapshot_notes.sql`

```sql
-- v1.0 Step 2-A: snapshot별 운영 메모 + 태그 필드 추가
-- 용도: 성수기/비수기/이벤트 등 특성을 가격 행에 기록하여 프라이싱 엔진 입력으로 활용

ALTER TABLE external_price_snapshots
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS note_tags TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS note_author UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS note_updated_at TIMESTAMPTZ;

-- GIN 인덱스: 태그 기반 검색 최적화
CREATE INDEX IF NOT EXISTS idx_snapshots_note_tags
  ON external_price_snapshots USING GIN(note_tags);

-- 코멘트
COMMENT ON COLUMN external_price_snapshots.note IS '운영자 메모 (자유 텍스트, 최대 500자)';
COMMENT ON COLUMN external_price_snapshots.note_tags IS '구조화된 태그 배열. 허용값: 성수기, 비수기, 이벤트, 우천, 주말특가, 공휴일, 얼리버드, 마감임박';
COMMENT ON COLUMN external_price_snapshots.note_author IS '메모 작성 관리자 ID';
COMMENT ON COLUMN external_price_snapshots.note_updated_at IS '메모 최종 수정 시각';

-- RLS 정책: 관리자만 note 업데이트 가능 (기존 RLS에 추가)
-- 참고: external_price_snapshots에 기존 RLS가 없으면 이 정책만 추가
-- 만약 RLS가 비활성화되어 있으면 service_role로 접근하므로 별도 정책 불필요
```

### AC

- [ ] 마이그레이션 실행 후 `note`, `note_tags`, `note_author`, `note_updated_at` 컬럼 존재
- [ ] `note_tags`에 GIN 인덱스 존재
- [ ] 기존 데이터에 영향 없음 (all NULL/empty default)

---

# ====================================================================
# Step 2-B: 메모 CRUD API
# ====================================================================

## 목표

`PATCH /api/admin/crawler/snapshots/:id/note` → 스냅샷에 메모/태그 저장.

## 신규 파일: `app/api/admin/crawler/snapshots/[id]/note/route.ts`

**디렉토리 생성 필요**: `app/api/admin/crawler/snapshots/[id]/note/`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { requireAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';
import { z } from 'zod';

const ALLOWED_TAGS = [
  '성수기', '비수기', '이벤트', '우천',
  '주말특가', '공휴일', '얼리버드', '마감임박',
] as const;

const NoteUpdateSchema = z.object({
  note: z.string().max(500).optional(),
  note_tags: z.array(z.enum(ALLOWED_TAGS)).max(5).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let admin;
  try {
    admin = await requireAdminAccess();
  } catch {
    return NextResponse.json(
      { success: false, error: { code: 'FORBIDDEN', message: '관리자 권한이 필요합니다' } },
      { status: 403 }
    );
  }

  const { id } = await params;
  const snapshotId = Number(id);
  if (!Number.isFinite(snapshotId) || snapshotId <= 0) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 ID' } },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = NoteUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || '입력값 오류' } },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();

  // snapshot 존재 확인
  const { data: existing } = await (supabase as any)
    .from('external_price_snapshots')
    .select('id')
    .eq('id', snapshotId)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json(
      { success: false, error: { code: 'NOT_FOUND', message: '스냅샷을 찾을 수 없습니다' } },
      { status: 404 }
    );
  }

  const { data: updated, error } = await (supabase as any)
    .from('external_price_snapshots')
    .update({
      note: parsed.data.note ?? null,
      note_tags: parsed.data.note_tags ?? [],
      note_author: admin.id,
      note_updated_at: new Date().toISOString(),
    })
    .eq('id', snapshotId)
    .select('id, note, note_tags, note_author, note_updated_at')
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '메모 저장 실패' } },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: updated });
}
```

**주의**: `(supabase as any)` 사용 이유: `external_price_snapshots`이 database.ts 타입에 없을 수 있음 (기존 코드 `app/api/pricing/route.ts:189`에서도 동일 패턴 사용 중).

### AC

- [ ] `PATCH /api/admin/crawler/snapshots/123/note` + `{ note: "테스트", note_tags: ["성수기"] }` → 200
- [ ] 허용되지 않은 태그 전송 시 400
- [ ] 존재하지 않는 ID → 404
- [ ] 권한 없으면 403
- [ ] DB에 note, note_tags, note_author, note_updated_at 저장 확인

---

# ====================================================================
# Step 2-C: 메모 인라인 편집 UI
# ====================================================================

## 목표

SnapshotTable의 "메모" 칸을 클릭하면 인라인 에디터가 열리고, 태그 칩 + 자유 텍스트를 저장할 수 있게 한다.

## 변경 파일: `components/admin/CrawlerMonitorClient.tsx`

### 변경 1: 태그 상수 추가 (파일 상단, WINDOW_LABELS 뒤에)

**줄 52 (WINDOW_LABELS 끝) 뒤에 삽입:**

```typescript
const SNAPSHOT_TAGS = [
  { value: '성수기', color: 'bg-red-100 text-red-700' },
  { value: '비수기', color: 'bg-blue-100 text-blue-700' },
  { value: '이벤트', color: 'bg-purple-100 text-purple-700' },
  { value: '우천', color: 'bg-gray-100 text-gray-700' },
  { value: '주말특가', color: 'bg-amber-100 text-amber-700' },
  { value: '공휴일', color: 'bg-pink-100 text-pink-700' },
  { value: '얼리버드', color: 'bg-green-100 text-green-700' },
  { value: '마감임박', color: 'bg-orange-100 text-orange-700' },
] as const;
```

### 변경 2: SnapshotDetailRow 타입에 note 필드 추가

**SnapshotDetailRow interface에 추가:**

```typescript
  // Step 2에서 추가:
  note: string | null;
  note_tags: string[];
  note_author: string | null;
  note_updated_at: string | null;
```

### 변경 3: InlineNoteEditor 컴포넌트 추가 (SnapshotTable 위에)

```typescript
function InlineNoteEditor({
  snapshotId,
  currentNote,
  currentTags,
  onSaved,
}: {
  snapshotId: number;
  currentNote: string | null;
  currentTags: string[];
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(currentNote || '');
  const [tags, setTags] = useState<string[]>(currentTags);
  const [saving, setSaving] = useState(false);

  if (!editing) {
    return (
      <div
        className="flex items-center gap-1 cursor-pointer min-w-[80px]"
        onClick={() => setEditing(true)}
      >
        {currentTags.length > 0 && (
          <div className="flex gap-0.5 flex-wrap">
            {currentTags.map((tag) => {
              const tagConfig = SNAPSHOT_TAGS.find((t) => t.value === tag);
              return (
                <span
                  key={tag}
                  className={`text-[10px] px-1 py-0.5 rounded-full ${tagConfig?.color || 'bg-gray-100'}`}
                >
                  {tag}
                </span>
              );
            })}
          </div>
        )}
        {currentNote ? (
          <span className="text-xs text-gray-600 truncate max-w-[80px]" title={currentNote}>
            {currentNote}
          </span>
        ) : (
          <span className="text-xs text-gray-400 hover:text-blue-500">+ 메모</span>
        )}
      </div>
    );
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/crawler/snapshots/${snapshotId}/note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note: note || undefined,
          note_tags: tags,
        }),
      });
      if (res.ok) {
        setEditing(false);
        onSaved();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="absolute z-20 bg-white border border-gray-300 rounded-lg shadow-lg p-3 w-64 right-0 top-0">
      <div className="flex flex-wrap gap-1 mb-2">
        {SNAPSHOT_TAGS.map((tagDef) => (
          <button
            key={tagDef.value}
            type="button"
            onClick={() => {
              setTags((prev) =>
                prev.includes(tagDef.value)
                  ? prev.filter((t) => t !== tagDef.value)
                  : [...prev, tagDef.value]
              );
            }}
            className={`text-[10px] px-2 py-1 rounded-full border transition-colors ${
              tags.includes(tagDef.value)
                ? tagDef.color + ' border-transparent font-semibold'
                : 'bg-white border-gray-300 text-gray-500 hover:border-gray-400'
            }`}
          >
            {tagDef.value}
          </button>
        ))}
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="메모 입력 (선택)"
        className="w-full text-xs border border-gray-300 rounded p-2 resize-none"
        rows={2}
        maxLength={500}
      />

      <div className="flex gap-2 mt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 text-xs px-3 py-1.5 bg-blue-600 text-white rounded font-semibold disabled:opacity-50"
        >
          {saving ? '저장중...' : '저장'}
        </button>
        <button
          onClick={() => {
            setEditing(false);
            setNote(currentNote || '');
            setTags(currentTags);
          }}
          className="flex-1 text-xs px-3 py-1.5 bg-gray-200 text-gray-700 rounded font-semibold"
        >
          취소
        </button>
      </div>
    </div>
  );
}
```

### 변경 4: SnapshotTable의 메모 칸 활성화

**SnapshotTable 내 메모 칸을 변경:**

```typescript
{/* 변경 전: */}
<td className="px-3 py-2">
  <span className="text-xs text-gray-400">Step 2에서 활성화</span>
</td>

{/* 변경 후: */}
<td className="px-3 py-2 relative">
  <InlineNoteEditor
    snapshotId={snap.id}
    currentNote={snap.note}
    currentTags={snap.note_tags || []}
    onSaved={() => router.refresh()}
  />
</td>
```

### 변경 5: page.tsx의 snapshot 조회에 note 필드 추가

**`app/admin/crawler/page.tsx`의 snapshotDetailQuery select에 추가:**

```typescript
// 변경 전:
.select('id, target_id, site_code, course_name, play_date, final_price, original_price, crawled_at, crawl_status, availability_status, collection_window, source_platform, error_message')

// 변경 후:
.select('id, target_id, site_code, course_name, play_date, final_price, original_price, crawled_at, crawl_status, availability_status, collection_window, source_platform, error_message, note, note_tags, note_author, note_updated_at')
```

### AC

- [ ] 스냅샷 테이블 메모 칸 클릭 → 인라인 에디터 열림
- [ ] 태그 칩 토글 가능 (최대 5개)
- [ ] 메모 텍스트 입력 가능 (최대 500자)
- [ ] 저장 → DB 반영 → 페이지 새로고침 → 태그/메모 유지
- [ ] 취소 → 원래 값 복원

---

# ====================================================================
# Step 3-A: pricingEngine.ts 확장 (핵심!)
# ====================================================================

## 목표

7개 신규 Factor를 기존 계산 로직 **사이에** 삽입. 기존 코드 1글자도 변경하지 않는다.

## 변경 파일: `utils/pricingEngine.ts` (현재 244줄)

### 변경 1: PricingContext 타입 확장 (줄 18-24)

**변경 전** (줄 18-24):
```typescript
export interface PricingContext {
  teeTime: TeeTime;
  user?: User;
  weather?: Weather;
  userDistanceKm?: number; // LBS (Optional)
  now?: Date; // For testing time travel
}
```

**변경 후**:
```typescript
export interface PricingContext {
  teeTime: TeeTime;
  user?: User;
  weather?: Weather;
  userDistanceKm?: number; // LBS (Optional)
  now?: Date; // For testing time travel
  // v1.0 신규 입력
  marketPrice?: number;    // 외부 최종판매가 (원)
  marketTags?: string[];   // snapshot note_tags (예: ['성수기', '이벤트'])
  demandRate?: number;     // 당일 OPEN 비율 (0.0~1.0, 0.75 = 75% 미예약)
}
```

### 변경 2: 헬퍼 함수 추가 (줄 67 뒤, calculatePricing 앞)

**줄 67 (`}` SeededRandom 클래스 닫힘) 뒤, 줄 69 (`export function calculatePricing`) 앞에 삽입:**

```typescript
// ===== v1.0 헬퍼 함수 =====

const KOREAN_HOLIDAYS_2026 = [
  '2026-01-01', '2026-01-28', '2026-01-29', '2026-01-30',
  '2026-03-01', '2026-05-05', '2026-05-24',
  '2026-06-06', '2026-08-15',
  '2026-09-24', '2026-09-25', '2026-09-26',
  '2026-10-03', '2026-10-09', '2026-12-25',
];

function isHoliday(date: Date): boolean {
  const dateStr = date.toISOString().slice(0, 10);
  return KOREAN_HOLIDAYS_2026.includes(dateStr);
}

function getSeasonType(date: Date, tags?: string[]): 'peak' | 'off' | 'normal' {
  if (tags?.includes('성수기')) return 'peak';
  if (tags?.includes('비수기')) return 'off';

  const month = date.getMonth() + 1;
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if ([3, 4, 5, 9, 10].includes(month) && (isWeekend || isHoliday(date))) return 'peak';
  if ([12, 1, 2, 7, 8].includes(month) && !isWeekend && !isHoliday(date)) return 'off';

  return 'normal';
}

function isWeekdayNotHoliday(date: Date): boolean {
  const day = date.getDay();
  return day >= 1 && day <= 5 && !isHoliday(date);
}
```

### 변경 3: calculatePricing 디스트럭처링 확장 (줄 70)

**변경 전** (줄 70):
```typescript
  const { teeTime, user, weather, userDistanceKm } = ctx;
```

**변경 후**:
```typescript
  const { teeTime, user, weather, userDistanceKm, marketPrice, marketTags, demandRate } = ctx;
```

### 변경 4: MARKET_PRICE Factor 삽입 (줄 128 뒤)

**줄 128 (`}` TIME_STEP if문 닫힘) 바로 뒤에 삽입:**

```typescript

  // --- [v1.0] Step 1.5: MARKET_PRICE (시장가 기반 조정) ---
  if (marketPrice !== undefined && marketPrice > 0 && marketPrice < currentPrice) {
    const delta = currentPrice - marketPrice;
    const marketDiscount = Math.floor(delta * 0.5);
    currentPrice -= marketDiscount;
    factors.push({
      code: 'MARKET_PRICE',
      description: `시장가 반영 (외부 ${marketPrice.toLocaleString()}원 대비 조정)`,
      amount: -marketDiscount,
      rate: Number((marketDiscount / basePrice).toFixed(3)),
    });
  }
```

### 변경 5: TEMPERATURE + WIND Factor 삽입 (줄 156 뒤)

**줄 156 (`}` WEATHER if문 닫힘) 바로 뒤에 삽입:**

```typescript

  // --- [v1.0] Step 2 추가: TEMPERATURE (기온 할인) ---
  if (weather && (weather as any).tmp !== undefined) {
    const temp = Number((weather as any).tmp);
    if (temp >= 35) {
      const discountAmount = Math.floor(currentPrice * 0.05);
      currentPrice -= discountAmount;
      factors.push({
        code: 'TEMPERATURE',
        description: `폭염 할인 (${temp}°C)`,
        amount: -discountAmount,
        rate: 0.05,
      });
    } else if (temp <= 5) {
      const discountAmount = Math.floor(currentPrice * 0.05);
      currentPrice -= discountAmount;
      factors.push({
        code: 'TEMPERATURE',
        description: `한파 할인 (${temp}°C)`,
        amount: -discountAmount,
        rate: 0.05,
      });
    }
  }

  // --- [v1.0] Step 2 추가: WIND (강풍 할인) ---
  if (weather && weather.wsd >= 15) {
    const discountAmount = Math.floor(currentPrice * 0.05);
    currentPrice -= discountAmount;
    factors.push({
      code: 'WIND',
      description: `강풍 할인 (${weather.wsd}m/s)`,
      amount: -discountAmount,
      rate: 0.05,
    });
  }
```

### 변경 6: SEASON + WEEKDAY + EVENT + DEMAND Factor 삽입 (줄 182 뒤)

**줄 182 (`}` LBS_NEARBY if문 닫힘) 바로 뒤에 삽입:**

```typescript

  // --- [v1.0] Step 2.5: SEASON / WEEKDAY / EVENT / DEMAND ---
  const seasonType = getSeasonType(teeOff, marketTags);
  const teeOffIsWeekday = isWeekdayNotHoliday(teeOff);

  if (seasonType === 'peak') {
    const totalDiscountSoFar = basePrice - currentPrice;
    if (totalDiscountSoFar > 0) {
      const restoreAmount = Math.floor(totalDiscountSoFar * 0.5);
      currentPrice += restoreAmount;
      factors.push({
        code: 'PEAK_SEASON',
        description: '성수기 할인 축소 (수요 높음)',
        amount: restoreAmount,
        rate: 0,
      });
    }
  } else if (seasonType === 'off') {
    const discountAmount = Math.floor(currentPrice * 0.05);
    currentPrice -= discountAmount;
    factors.push({
      code: 'OFF_SEASON',
      description: '비수기 추가 할인',
      amount: -discountAmount,
      rate: 0.05,
    });
  }

  if (teeOffIsWeekday && seasonType !== 'peak') {
    const discountAmount = Math.floor(currentPrice * 0.03);
    currentPrice -= discountAmount;
    factors.push({
      code: 'WEEKDAY',
      description: '평일 할인',
      amount: -discountAmount,
      rate: 0.03,
    });
  }

  if (marketTags?.includes('이벤트')) {
    const discountAmount = Math.floor(currentPrice * 0.03);
    currentPrice -= discountAmount;
    factors.push({
      code: 'EVENT',
      description: '이벤트 할인',
      amount: -discountAmount,
      rate: 0.03,
    });
  }

  if (demandRate !== undefined && demandRate > 0.7) {
    const discountAmount = Math.floor(currentPrice * 0.03);
    currentPrice -= discountAmount;
    factors.push({
      code: 'LOW_DEMAND',
      description: `수요 부족 할인 (예약률 ${Math.round((1 - demandRate) * 100)}%)`,
      amount: -discountAmount,
      rate: 0.03,
    });
  }
```

### 중요 주의사항

1. **SeededRandom 클래스 (줄 50-67)**: 절대 변경 금지
2. **TIME_STEP 계산 (줄 95-128)**: 절대 변경 금지
3. **WEATHER 차단 (줄 80-93)**: 절대 변경 금지
4. **MAX_CAP (줄 184-199)**: 절대 변경 금지. 새 Factor 포함해서 40% 자동 적용됨
5. **`(weather as any).tmp`**: weather_cache에 tmp 컬럼이 없을 수 있음. 있으면 사용, 없으면 skip

### AC

- [ ] `PricingContext`에 `marketPrice`, `marketTags`, `demandRate` 추가됨
- [ ] 기존 6개 Factor 정상 작동 (regression 없음)
- [ ] 시장가 100,000원 < 현재가 150,000원 → MARKET_PRICE -25,000원 반영
- [ ] 성수기(3월 주말) → PEAK_SEASON으로 기존 할인 50% 복원
- [ ] 비수기(1월 평일) → OFF_SEASON -5%, WEEKDAY -3% 적용
- [ ] 40% MAX_CAP이 모든 새 할인 포함해서 적용

---

# ====================================================================
# Step 3-B: /api/pricing/route.ts 연동
# ====================================================================

## 목표

기존 pricing API가 시장가와 태그를 엔진에 전달하도록 수정.

## 변경 파일: `app/api/pricing/route.ts` (현재 265줄)

### 변경 1: ExternalSnapshotRow 타입 확장 (줄 11-17)

**변경 전** (줄 11-17):
```typescript
type ExternalSnapshotRow = {
  course_name: string;
  play_date: string | null;
  final_price: number | null;
  crawled_at: string;
  availability_status: 'AVAILABLE' | 'NO_DATA' | 'AUTH_REQUIRED' | 'REMOVED' | 'FAILED';
};
```

**변경 후**:
```typescript
type ExternalSnapshotRow = {
  course_name: string;
  play_date: string | null;
  final_price: number | null;
  crawled_at: string;
  availability_status: 'AVAILABLE' | 'NO_DATA' | 'AUTH_REQUIRED' | 'REMOVED' | 'FAILED';
  note_tags?: string[];
};
```

### 변경 2: externalQuery의 select에 note_tags 추가 (줄 191)

**변경 전** (줄 191):
```typescript
      .select('course_name, play_date, final_price, crawled_at, availability_status')
```

**변경 후**:
```typescript
      .select('course_name, play_date, final_price, crawled_at, availability_status, note_tags')
```

### 변경 3: calculatePricing 호출 부분 변경 (줄 141-147)

**변경 전** (줄 141-147):
```typescript
    const pricing = calculatePricing({
      teeTime,
      user: user || undefined,
      weather: weather || undefined,
      userDistanceKm: Number.isFinite(userDistanceKm) ? userDistanceKm : undefined,
      now,
    });
```

**변경 후**:
```typescript
    // v1.0: 시장가 + 태그를 엔진에 전달
    const courseName = clubNameById.get(teeTime.golf_club_id);
    const playDate = toSeoulDate(new Date(teeTime.tee_off));
    const marketKey = courseName ? `${normalizeCourseName(courseName)}|${playDate}` : null;
    const marketSnap = marketKey ? marketSnapshotByKey.get(marketKey) : undefined;

    const marketPriceValue =
      marketSnap?.availability_status === 'AVAILABLE' && marketSnap?.final_price
        ? Number(marketSnap.final_price)
        : undefined;

    const marketTagsValue = marketSnap?.note_tags || undefined;

    const pricing = calculatePricing({
      teeTime,
      user: user || undefined,
      weather: weather || undefined,
      userDistanceKm: Number.isFinite(userDistanceKm) ? userDistanceKm : undefined,
      now,
      marketPrice: marketPriceValue,
      marketTags: marketTagsValue,
    });
```

**주의**: `clubNameById`, `toSeoulDate`, `normalizeCourseName`, `marketSnapshotByKey`는 이미 줄 164-204에서 정의됨. 하지만 현재 코드에서는 이 변수들이 줄 162 이후에 선언되고, `results` map은 줄 139에서 시작됨. 따라서 **results map을 marketSnapshot 조회 이후로 이동**해야 함.

### 변경 4: 코드 순서 재배치 (핵심!)

현재 구조:
```
줄 139-160: results = teeTimes.map(... calculatePricing ...)
줄 162-205: clubNameById, marketSnapshotByKey 구축
줄 207-236: enrichedResults = results.map(... marketReference 첨부 ...)
```

**변경 후 구조**:
```
줄 139-160: → 삭제하고 아래로 이동
줄 162-205: clubNameById, marketSnapshotByKey 구축 (유지)
줄 207+: results 계산 + marketReference 첨부를 한 번에
```

**구체적으로**: 줄 139-160의 `const results = ...` 를 줄 206 뒤로 이동하고, `enrichedResults`와 합침.

**변경 후 (줄 139부터 전체 교체):**

```typescript
  // --- Market reference data ---
  const teeTimeRows = teeTimes || [];
  const clubIds = Array.from(new Set(teeTimeRows.map((row) => row.golf_club_id)));

  let clubNameById = new Map<number, string>();
  if (clubIds.length > 0) {
    const { data: clubs } = await supabase
      .from('golf_clubs')
      .select('id, name')
      .in('id', clubIds);

    clubNameById = new Map(
      (clubs || []).map((club: Pick<GolfClub, 'id' | 'name'>) => [club.id, club.name])
    );
  }

  const dateFilters = Array.from(
    new Set(teeTimeRows.map((row) => toSeoulDate(new Date(row.tee_off))))
  );

  const marketSnapshotByKey = new Map<string, ExternalSnapshotRow>();

  if (dateFilters.length > 0) {
    const firstDate = dateFilters[0];
    const lastDate = dateFilters[dateFilters.length - 1];

    const externalQuery = (supabase as any)
      .from('external_price_snapshots')
      .select('course_name, play_date, final_price, crawled_at, availability_status, note_tags')
      .gte('play_date', firstDate)
      .lte('play_date', lastDate)
      .order('crawled_at', { ascending: false })
      .limit(2000);

    const { data: externalSnapshots } = await externalQuery;

    for (const row of (externalSnapshots || []) as ExternalSnapshotRow[]) {
      if (!row.play_date) continue;
      const key = `${normalizeCourseName(row.course_name)}|${row.play_date}`;
      if (marketSnapshotByKey.has(key)) continue;
      marketSnapshotByKey.set(key, row);
    }
  }

  // --- Calculate pricing with market data ---
  const enrichedResults = (teeTimeRows).map((teeTime: TeeTime) => {
    const weather = selectClosestWeather(teeTime.tee_off, weatherRows);

    // v1.0: 시장가 + 태그
    const courseName = clubNameById.get(teeTime.golf_club_id);
    const playDate = toSeoulDate(new Date(teeTime.tee_off));
    const marketKey = courseName ? `${normalizeCourseName(courseName)}|${playDate}` : null;
    const marketSnap = marketKey ? marketSnapshotByKey.get(marketKey) : undefined;

    const marketPriceValue =
      marketSnap?.availability_status === 'AVAILABLE' && marketSnap?.final_price
        ? Number(marketSnap.final_price)
        : undefined;

    const marketTagsValue = marketSnap?.note_tags || undefined;

    const pricing = calculatePricing({
      teeTime,
      user: user || undefined,
      weather: weather || undefined,
      userDistanceKm: Number.isFinite(userDistanceKm) ? userDistanceKm : undefined,
      now,
      marketPrice: marketPriceValue,
      marketTags: marketTagsValue,
    });

    const marketPrice =
      marketSnap?.availability_status === 'AVAILABLE' && marketSnap?.final_price !== null
        ? Number(marketSnap.final_price)
        : null;
    const marketDelta =
      marketPrice !== null ? Math.round(pricing.finalPrice - marketPrice) : null;

    return {
      ...teeTime,
      finalPrice: pricing.finalPrice,
      originalPrice: pricing.basePrice,
      discountRate: Math.round(pricing.discountRate * 100),
      isBlocked: pricing.isBlocked,
      blockReason: pricing.blockReason,
      factors: pricing.factors,
      stepStatus: pricing.stepStatus,
      panicMode: pricing.panicMode,
      marketReference: marketSnap
        ? {
            courseName: marketSnap.course_name,
            playDate: marketSnap.play_date,
            finalPrice: marketPrice,
            crawledAt: marketSnap.crawled_at,
            availabilityStatus: marketSnap.availability_status,
            deltaFromMarket: marketDelta,
          }
        : null,
    };
  });
```

**그리고 기존 줄 207-236의 `const enrichedResults = results.map(...)` 블록은 삭제.**

### AC

- [ ] `/api/pricing?date=2026-03-01&golfClubId=1` → factors에 MARKET_PRICE, PEAK_SEASON 등 포함
- [ ] marketReference에 note_tags 정보 포함
- [ ] 기존 응답 구조 동일 (regression 없음)
- [ ] 시장가 없는 티타임 → MARKET_PRICE factor 미포함

---

# ====================================================================
# Step 3-C: 가격 엔진 시뮬레이션 UI
# ====================================================================

## 목표

관리자가 날짜/골프장을 선택하면 가격 엔진 결과를 시뮬레이션할 수 있는 페이지.

## 신규 파일: `app/admin/pricing-test/page.tsx`

```typescript
'use client';

import { useState } from 'react';

interface PricingFactor {
  code: string;
  description: string;
  amount: number;
  rate: number;
}

interface PricingRow {
  id: number;
  tee_off: string;
  originalPrice: number;
  finalPrice: number;
  discountRate: number;
  isBlocked: boolean;
  factors: PricingFactor[];
  marketReference: {
    finalPrice: number | null;
    deltaFromMarket: number | null;
  } | null;
}

export default function PricingTestPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [clubId, setClubId] = useState('1');
  const [results, setResults] = useState<PricingRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSimulate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pricing?date=${date}&golfClubId=${clubId}&limit=50`);
      const json = await res.json();
      if (json.status === 'success') {
        setResults(json.data);
      } else {
        setError('조회 실패');
      }
    } catch {
      setError('API 호출 실패');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">가격 엔진 시뮬레이션</h1>
        <p className="text-gray-600 mt-1">티타임별 가격 계산 결과와 적용된 Factor를 확인합니다.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">날짜</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">골프장 ID</label>
            <input
              type="number"
              value={clubId}
              onChange={(e) => setClubId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              min={1}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSimulate}
              disabled={loading}
              className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg font-semibold disabled:opacity-50 hover:bg-blue-700"
            >
              {loading ? '계산 중...' : '시뮬레이션 실행'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left">티오프</th>
                <th className="px-4 py-3 text-right">기본가</th>
                <th className="px-4 py-3 text-right">최종가</th>
                <th className="px-4 py-3 text-right">할인율</th>
                <th className="px-4 py-3 text-right">시장가</th>
                <th className="px-4 py-3 text-left">Factors</th>
                <th className="px-4 py-3 text-center">차단</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {results.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    {new Date(row.tee_off).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="px-4 py-3 text-right">{row.originalPrice?.toLocaleString()}원</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-700">
                    {row.finalPrice?.toLocaleString()}원
                  </td>
                  <td className="px-4 py-3 text-right text-red-600">{row.discountRate}%</td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {row.marketReference?.finalPrice
                      ? `${row.marketReference.finalPrice.toLocaleString()}원`
                      : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {(row.factors || []).map((f, i) => (
                        <span
                          key={`${f.code}-${i}`}
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            f.amount < 0
                              ? 'bg-green-100 text-green-700'
                              : f.amount > 0
                                ? 'bg-red-100 text-red-700'
                                : 'bg-gray-100 text-gray-700'
                          }`}
                          title={f.description}
                        >
                          {f.code}: {f.amount > 0 ? '+' : ''}{f.amount.toLocaleString()}원
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.isBlocked ? '차단' : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

### AC

- [ ] `/admin/pricing-test` 페이지 접근 가능
- [ ] 날짜 + 골프장 ID 선택 → "시뮬레이션 실행" → 가격 테이블 표시
- [ ] 각 행에 Factor 칩 표시 (할인=초록, 복원=빨강)
- [ ] 시장가 있는 행은 시장가 컬럼에 가격 표시

---

# ====================================================================
# Step Admin-A: 티타임 API Route 전환
# ====================================================================

## 목표

`app/api/admin/tee-times/route.ts`에 GET/POST 추가, 신규 `[id]/route.ts`에 PATCH/DELETE 추가.

## 변경 파일: `app/api/admin/tee-times/route.ts` (현재 86줄)

### 기존 PATCH 유지 + GET/POST 추가

**줄 1 위에 전체 파일을 교체 (기존 PATCH 코드 포함):**

파일이 길어지므로, 기존 PATCH를 유지하면서 앞에 GET과 POST를 추가.

**줄 26 (`export async function PATCH`) 앞에 삽입:**

```typescript
// ===== GET: 티타임 목록 조회 =====
export async function GET(req: NextRequest) {
  try {
    const currentUser = await requireAdminAccess();

    const params = req.nextUrl.searchParams;
    const clubId = params.get('clubId');
    const date = params.get('date');

    if (!clubId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'clubId와 date(YYYY-MM-DD)는 필수입니다' } },
        { status: 400 }
      );
    }

    // CLUB_ADMIN 권한 확인
    if (currentUser.isClubAdmin && !currentUser.clubIds.includes(Number(clubId))) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '해당 골프장에 대한 권한이 없습니다' } },
        { status: 403 }
      );
    }

    const adminClient = createSupabaseAdminClientOptional();
    const supabase = adminClient ?? await createSupabaseServerClient();

    const startISO = new Date(`${date}T00:00:00+09:00`).toISOString();
    const endISO = new Date(`${date}T23:59:59.999+09:00`).toISOString();

    const { data, error } = await supabase
      .from('tee_times')
      .select('*')
      .eq('golf_club_id', Number(clubId))
      .gte('tee_off', startISO)
      .lte('tee_off', endISO)
      .order('tee_off', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || [],
      meta: { total: data?.length || 0 },
    });
  } catch (err) {
    const mapped = mapError(err);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}

// ===== POST: 티타임 생성 =====
export async function POST(req: NextRequest) {
  try {
    const currentUser = await requireAdminAccess();

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '요청 본문이 필요합니다' } },
        { status: 400 }
      );
    }

    const { golf_club_id, tee_off, base_price, status } = body;

    // 검증
    if (!golf_club_id || !tee_off || base_price === undefined) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: 'golf_club_id, tee_off, base_price는 필수입니다' } },
        { status: 400 }
      );
    }

    if (typeof base_price !== 'number' || base_price < 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '가격은 0 이상이어야 합니다' } },
        { status: 400 }
      );
    }

    if (status && !['OPEN', 'BLOCKED'].includes(status)) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '상태는 OPEN 또는 BLOCKED만 가능합니다' } },
        { status: 400 }
      );
    }

    // 과거 시간 거부
    if (new Date(tee_off) <= new Date()) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '과거 시간에는 티타임을 생성할 수 없습니다' } },
        { status: 400 }
      );
    }

    // CLUB_ADMIN 권한 확인
    if (currentUser.isClubAdmin && !currentUser.clubIds.includes(Number(golf_club_id))) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '해당 골프장에 대한 권한이 없습니다' } },
        { status: 403 }
      );
    }

    const adminClient = createSupabaseAdminClientOptional();
    const supabase = adminClient ?? await createSupabaseServerClient();

    // 동일 시간대 중복 확인 (±5분)
    const teeOffDate = new Date(tee_off);
    const fiveMinBefore = new Date(teeOffDate.getTime() - 5 * 60000).toISOString();
    const fiveMinAfter = new Date(teeOffDate.getTime() + 5 * 60000).toISOString();

    const { data: duplicates } = await supabase
      .from('tee_times')
      .select('id')
      .eq('golf_club_id', Number(golf_club_id))
      .gte('tee_off', fiveMinBefore)
      .lte('tee_off', fiveMinAfter)
      .limit(1);

    if (duplicates && duplicates.length > 0) {
      return NextResponse.json(
        { success: false, error: { code: 'CONFLICT', message: '같은 시간대에 이미 티타임이 존재합니다 (±5분)' } },
        { status: 409 }
      );
    }

    const { data: created, error } = await supabase
      .from('tee_times')
      .insert({
        golf_club_id: Number(golf_club_id),
        tee_off,
        base_price: Math.floor(base_price),
        status: status || 'OPEN',
        updated_by: currentUser.id,
      } as any)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    const mapped = mapError(err);
    return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  }
}
```

**import에 `createSupabaseServerClient` 추가 (이미 있음 확인).**

## 신규 파일: `app/api/admin/tee-times/[id]/route.ts`

**디렉토리 생성 필요**: `app/api/admin/tee-times/[id]/`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdminClientOptional } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { requireAdminAccess } from '@/lib/auth/getCurrentUserWithRoles';

export const dynamic = 'force-dynamic';

// PATCH /api/admin/tee-times/:id
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdminAccess();
    const { id } = await params;
    const teeTimeId = Number(id);

    if (!Number.isFinite(teeTimeId) || teeTimeId <= 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '유효하지 않은 ID' } },
        { status: 400 }
      );
    }

    const adminClient = createSupabaseAdminClientOptional();
    const supabase = adminClient ?? await createSupabaseServerClient();

    // 현재 상태 확인
    const { data: existing, error: fetchError } = await supabase
      .from('tee_times')
      .select('*')
      .eq('id', teeTimeId)
      .maybeSingle();

    if (fetchError || !existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '티타임을 찾을 수 없습니다' } },
        { status: 404 }
      );
    }

    // BOOKED 상태면 수정 거부
    if (existing.status === 'BOOKED') {
      return NextResponse.json(
        { success: false, error: { code: 'CONFLICT', message: '예약된 티타임은 수정할 수 없습니다' } },
        { status: 409 }
      );
    }

    // CLUB_ADMIN 권한 확인
    if (currentUser.isClubAdmin && !currentUser.clubIds.includes(existing.golf_club_id)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '해당 골프장에 대한 권한이 없습니다' } },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || Object.keys(body).length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'VALIDATION_ERROR', message: '최소 하나의 필드를 변경해야 합니다' } },
        { status: 400 }
      );
    }

    // 허용 필드만 추출
    const updateData: Record<string, unknown> = { updated_by: currentUser.id };
    if (body.base_price !== undefined) {
      if (typeof body.base_price !== 'number' || body.base_price < 0) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: '가격은 0 이상이어야 합니다' } },
          { status: 400 }
        );
      }
      updateData.base_price = Math.floor(body.base_price);
    }
    if (body.status !== undefined) {
      if (!['OPEN', 'BLOCKED'].includes(body.status)) {
        return NextResponse.json(
          { success: false, error: { code: 'VALIDATION_ERROR', message: '상태는 OPEN 또는 BLOCKED만 가능합니다' } },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }
    if (body.tee_off !== undefined) {
      updateData.tee_off = body.tee_off;
    }

    const { data: updated, error } = await supabase
      .from('tee_times')
      .update(updateData as any)
      .eq('id', teeTimeId)
      .select('*')
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/admin/tee-times/:id
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdminAccess();
    const { id } = await params;
    const teeTimeId = Number(id);

    const adminClient = createSupabaseAdminClientOptional();
    const supabase = adminClient ?? await createSupabaseServerClient();

    const { data: existing } = await supabase
      .from('tee_times')
      .select('id, status, golf_club_id')
      .eq('id', teeTimeId)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '티타임을 찾을 수 없습니다' } },
        { status: 404 }
      );
    }

    if (existing.status !== 'OPEN') {
      return NextResponse.json(
        { success: false, error: { code: 'CONFLICT', message: `${existing.status} 상태의 티타임은 삭제할 수 없습니다` } },
        { status: 409 }
      );
    }

    if (currentUser.isClubAdmin && !currentUser.clubIds.includes(existing.golf_club_id)) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '해당 골프장에 대한 권한이 없습니다' } },
        { status: 403 }
      );
    }

    const { error } = await supabase
      .from('tee_times')
      .delete()
      .eq('id', teeTimeId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 });
    if (message === 'FORBIDDEN') return NextResponse.json({ error: 'FORBIDDEN' }, { status: 403 });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

### AC

- [ ] `GET /api/admin/tee-times?clubId=1&date=2026-02-18` → 해당 날짜 티타임 목록
- [ ] `POST /api/admin/tee-times` → 티타임 생성, 중복 검사, 과거 거부
- [ ] `PATCH /api/admin/tee-times/123` → 수정, BOOKED 거부
- [ ] `DELETE /api/admin/tee-times/123` → OPEN만 삭제 가능
- [ ] 기존 PATCH (set-status, update-base-price) 정상 작동

---

# ====================================================================
# Step Admin-B: 프론트엔드 API 연동
# ====================================================================

## 목표

`app/admin/tee-times/page.tsx`에서 Server Action 대신 API Route를 호출하도록 전환.

## 변경 파일: `app/admin/tee-times/page.tsx` (현재 570줄)

### 변경 1: import 변경 (줄 4-24)

**삭제할 import** (줄 17-24):
```typescript
import {
  getAccessibleGolfClubs,
  getTeeTimes,
  createTeeTime,
  updateTeeTime,
  blockTeeTime,
  unblockTeeTime
} from './actions';
```

### 변경 2: 에러 상태 추가 (줄 36 뒤)

**줄 36 (`const [fetching, setFetching] = useState(false);`) 뒤에 삽입:**

```typescript
  const [error, setError] = useState<string | null>(null);
```

### 변경 3: fetchClubs 함수 변경 (줄 52-65)

**변경 전** (줄 52-65):
```typescript
    async function fetchClubs() {
      setLoading(true);
      const result = await getAccessibleGolfClubs();

      if (result.success && result.clubs) {
        setClubs(result.clubs);
        if (result.clubs.length > 0) {
          setSelectedClubId(result.clubs[0].id);
        }
      } else {
        alert(result.error || 'Failed to load golf clubs');
      }
      setLoading(false);
    }
```

**변경 후**:
```typescript
    async function fetchClubs() {
      setLoading(true);
      try {
        const res = await fetch('/api/admin/golf-clubs');
        const json = await res.json();
        if (json.success && json.data) {
          setClubs(json.data);
          if (json.data.length > 0) {
            setSelectedClubId(json.data[0].id);
          }
        } else {
          setError(json.error?.message || '골프장 목록 조회 실패');
        }
      } catch {
        setError('골프장 목록 조회 중 오류 발생');
      }
      setLoading(false);
    }
```

**주의**: `/api/admin/golf-clubs` API가 아직 없으므로, 이 단계에서는 기존 Server Action을 유지하는 것도 가능. 또는 이 API를 별도로 생성해야 함. **대안: fetchClubs만 기존 Server Action 유지, 나머지만 API로 전환.**

**최종 결정 (실용적)**: `getAccessibleGolfClubs`만 Server Action으로 유지. 나머지 CRUD는 API Route로 전환.

```typescript
// 최종 import:
import { getAccessibleGolfClubs } from './actions';
// (getTeeTimes, createTeeTime, updateTeeTime, blockTeeTime, unblockTeeTime는 삭제)
```

### 변경 4: fetchTeeTimes 함수 변경 (줄 77-90)

**변경 전**:
```typescript
  const fetchTeeTimes = async () => {
    if (!selectedClubId) return;

    setFetching(true);
    const result = await getTeeTimes(selectedClubId, selectedDateYmd);

    if (result.success && result.teeTimes) {
      setTeeTimes(result.teeTimes);
    } else {
      alert(result.error || 'Failed to load tee times');
      setTeeTimes([]);
    }
    setFetching(false);
  };
```

**변경 후**:
```typescript
  const fetchTeeTimes = async () => {
    if (!selectedClubId) return;

    setFetching(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tee-times?clubId=${selectedClubId}&date=${selectedDateYmd}`);
      const json = await res.json();
      if (json.success) {
        setTeeTimes(json.data);
      } else {
        setError(json.error?.message || '티타임 조회 실패');
        setTeeTimes([]);
      }
    } catch {
      setError('티타임 조회 중 오류 발생');
      setTeeTimes([]);
    }
    setFetching(false);
  };
```

### 변경 5: handleCreateTeeTime 변경 (줄 92-113)

**변경 후**:
```typescript
  const handleCreateTeeTime = async () => {
    if (!selectedClubId) return;

    setError(null);
    const teeOffISO = new Date(`${selectedDateYmd}T${formData.tee_off_time}:00+09:00`).toISOString();

    try {
      const res = await fetch('/api/admin/tee-times', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          golf_club_id: selectedClubId,
          tee_off: teeOffISO,
          base_price: formData.base_price,
          status: formData.status,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsCreateModalOpen(false);
        resetForm();
        await fetchTeeTimes();
      } else {
        setError(json.error?.message || '생성 실패');
      }
    } catch {
      setError('티타임 생성 중 오류 발생');
    }
  };
```

### 변경 6: handleUpdateTeeTime 변경 (줄 115-139)

**변경 후**:
```typescript
  const handleUpdateTeeTime = async () => {
    if (!editingTeeTime) return;

    setError(null);
    const payload: Record<string, unknown> = {
      base_price: formData.base_price,
      status: formData.status,
    };

    if (formData.tee_off_time) {
      payload.tee_off = new Date(`${selectedDateYmd}T${formData.tee_off_time}:00+09:00`).toISOString();
    }

    try {
      const res = await fetch(`/api/admin/tee-times/${editingTeeTime.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setIsEditModalOpen(false);
        setEditingTeeTime(null);
        resetForm();
        await fetchTeeTimes();
      } else {
        if (res.status === 409) setError('예약된 티타임은 수정할 수 없습니다');
        else setError(json.error?.message || '수정 실패');
      }
    } catch {
      setError('티타임 수정 중 오류 발생');
    }
  };
```

### 변경 7: handleBlockTeeTime 변경 (줄 141-152)

**변경 후**:
```typescript
  const handleBlockTeeTime = async (id: number) => {
    if (!confirm('이 티타임을 차단하시겠습니까?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/tee-times/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'BLOCKED' }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchTeeTimes();
      } else {
        setError(json.error?.message || '차단 실패');
      }
    } catch {
      setError('차단 중 오류 발생');
    }
  };
```

### 변경 8: handleUnblockTeeTime 변경 (줄 154-165)

**변경 후**:
```typescript
  const handleUnblockTeeTime = async (id: number) => {
    if (!confirm('이 티타임을 다시 활성화하시겠습니까?')) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/tee-times/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'OPEN' }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchTeeTimes();
      } else {
        setError(json.error?.message || '활성화 실패');
      }
    } catch {
      setError('활성화 중 오류 발생');
    }
  };
```

### 변경 9: 에러 배너 UI 추가

**줄 232 (`return (`) 바로 뒤, `<div className="space-y-6">` 안에 삽입:**

```typescript
      {/* 에러 배너 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="text-red-500 hover:text-red-700 text-sm font-medium ml-4"
          >
            닫기
          </button>
        </div>
      )}
```

### AC

- [ ] 페이지 로드 시 골프장 목록 표시 (Server Action 유지)
- [ ] 골프장/날짜 선택 → `GET /api/admin/tee-times` 호출 → 테이블 표시
- [ ] 티타임 추가 → `POST /api/admin/tee-times` → 재조회
- [ ] 수정 → `PATCH /api/admin/tee-times/:id` → 재조회
- [ ] 차단/해제 → `PATCH /api/admin/tee-times/:id` → 재조회
- [ ] BOOKED 수정 시도 → 409 → 에러 배너 표시
- [ ] `alert()` 대신 에러 배너 사용

---

# ====================================================================
# Codex 지시 순서 (최종)
# ====================================================================

| 순서 | ID | 작업명 | 크기 | 핵심 변경 파일 | 의존성 |
|------|-----|--------|------|----------------|--------|
| 1 | S0 | 크롤러 카테고리 UI | M | `crawler/page.tsx`, `CrawlerMonitorClient.tsx` | 없음 |
| 2 | S1-A | 수집 실행 API | M | 신규: `api/admin/crawler/run/route.ts` | 없음 |
| 3 | S1-B | Cron 스케줄러 | S | 신규: `api/cron/crawl-prices/route.ts`, `vercel.json` | S1-A |
| 4 | S1-C | 수집 상태 UI | S | `CrawlerMonitorClient.tsx`에 추가 | S1-A |
| 5 | S2-A | snapshot 메모 DB | S | 신규: migration SQL | 없음 |
| 6 | S2-B | 메모 API | S | 신규: `api/admin/crawler/snapshots/[id]/note/route.ts` | S2-A |
| 7 | S2-C | 메모 인라인 UI | M | `CrawlerMonitorClient.tsx`에 추가 | S2-B, S0 |
| 8 | S3-A | 엔진 Factor 확장 | L | `utils/pricingEngine.ts` (기존 사이에 삽입) | 없음 |
| 9 | S3-B | API 시장가 연동 | M | `api/pricing/route.ts` (순서 재배치) | S3-A, S2-A |
| 10 | S3-C | 시뮬레이션 UI | M | 신규: `app/admin/pricing-test/page.tsx` | S3-B |
| 11 | TA | 티타임 API Route | L | `api/admin/tee-times/route.ts` + 신규 `[id]/route.ts` | 없음 |
| 12 | TB | 티타임 프론트 연동 | M | `admin/tee-times/page.tsx` (fetch 전환) | TA |
| 13 | TC | 정합성 테스트 | S | 수동 테스트 시나리오 | 전체 |

## 의존성 그래프

```
S0 ──────────────────┐
S1-A → S1-B          │
S1-A → S1-C          ├─→ S3-B → S3-C
S2-A → S2-B → S2-C ─┘

S3-A ────────────────┘

TA → TB → TC  (독립 트랙)
```

## 병렬 실행 가능한 조합

```
동시 실행 1: S0 + S1-A + S2-A + S3-A + TA (모두 독립)
동시 실행 2: S1-B + S1-C + S2-B + TB (각각 선행 완료 후)
동시 실행 3: S2-C + S3-B (선행 완료 후)
마지막: S3-C + TC
```
