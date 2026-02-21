# TUGOL v1.0 Master Development Plan

> 작성일: 2026-02-17 (화)
> 완료 목표: 2026-02-20 (금)
> 방법론: SDD (Spec-Driven Development) - 스펙 → 구현 → 검증
> 실행: Claude (설계/리뷰) + Codex (구현)

---

## 1. 현재 상태 요약

### v0 완성도

| 영역 | 완성도 | 핵심 이슈 |
|------|--------|-----------|
| 가격 엔진 | 95% | V1 활성, V2/V3/SDD10 참조용 |
| 예약/결제 | 85% | Toss 테스트 모드, 환불 미연동 |
| 사용자 인증 | 85% | 세션 기반, proxy.ts 작동 |
| 관리자 콘솔 | 60% | 페이지 존재하나 검증/완성도 부족 |
| 관리자 API | 70% | 기본 CRUD 있으나 에러/검증 불완전 |
| DB 스키마 | 90% | 19개 마이그레이션 적용됨 |
| 테스트 | 5% | 프레임워크 미설치 |
| SDD 문서 | 30% | 스캐폴딩만, 핵심 정의 미확정 |

### SDD 문서 현황

| 문서 | 상태 |
|------|------|
| 00-project.md | 빈 템플릿 (Goals/Definitions 미작성) |
| 01-admin/permissions-matrix.md | 빈 매트릭스 |
| 01-admin/admin-dashboard.md | 초안 (역할/API 미확정) |
| 01-admin/admin-tee-times.md | 초안 (역할 미확정) |
| 01-admin/admin-reservations.md | 미생성 |
| 01-admin/admin-users.md | 미생성 |
| 01-admin/admin-settlements.md | 미생성 |
| 01-admin/admin-crawler.md | 미생성 |
| 90-api/ | 미생성 |
| 99-v0-gap-backlog.md | 비어있음 |

---

## 2. v1.0 목표

### Goals
1. **관리자 콘솔 완성**: 6개 페이지 모두 프로덕션 수준으로 완성
2. **백엔드 API 견고화**: 모든 엔드포인트에 검증/에러/권한 일관 적용
3. **권한 체계 확립**: SUPER_ADMIN / ADMIN / CLUB_ADMIN 역할 분리
4. **데이터 정합성**: 타임존, 매출 정의, 예약 상태 머신 확정
5. **테스트 인프라**: Vitest 설치, 핵심 로직 80%+ 커버리지

### Non-Goals (v1.0에서 안 함)
- 사용자향 UI 리디자인 (v0 유지)
- 푸시/이메일 알림 시스템
- PWA / 다국어
- SDD-10 데이터 기반 가격 최적화
- 외부 가격 크롤러 고도화

---

## 3. 일정 (4일)

```
화(2/17) ─ Day 1: 기반 정의 + SDD 문서 작성
수(2/18) ─ Day 2: 콘솔 SDD 완성 + API 계약 작성
목(2/19) ─ Day 3: 구현 Phase 1 (DB + API + Auth)
금(2/20) ─ Day 4: 구현 Phase 2 (콘솔 UI + 테스트)
```

---

## 4. Day 1: 기반 정의 (2/17 화)

### 4-1. 00-project.md 핵심 정의 확정

#### 타임존 기준
```
표준: Asia/Seoul (KST, UTC+9)
규칙:
  - DB 저장: UTC (timestamptz)
  - API 응답: ISO 8601 (UTC)
  - UI 표시: KST 변환
  - 날짜 필터: YYYY-MM-DD (KST 기준 00:00:00 ~ 23:59:59)
  - tee_off 필드: timestamptz (UTC 저장, KST로 표시)
```

#### 매출(Revenue) 정의
```
gross_revenue: SUM(final_price) WHERE payment_status = 'PAID'
refund_amount: SUM(refund_amount) WHERE payment_status = 'REFUNDED'
net_revenue: gross_revenue - refund_amount
daily_revenue: net_revenue grouped by tee_off date (KST)
```

#### 예약 상태 머신
```
PENDING → PAID        (결제 확인 시)
PENDING → CANCELLED   (사용자 취소 / 타임아웃)
PAID → CANCELLED      (사용자 취소 요청)
PAID → REFUNDED       (환불 완료)
PAID → NO_SHOW        (미방문 처리)
PAID → COMPLETED      (라운드 완료)
CANCELLED → (종료 상태)
REFUNDED → (종료 상태)
NO_SHOW → (종료 상태)
COMPLETED → (종료 상태)
```

#### 보안/데이터 접근 정책
```
원칙: Admin UI에서 클라이언트 직결 DB write 금지
방법:
  - 읽기: Server Component + Service Role (RLS 우회)
  - 쓰기: Server Action → API Route → Service Role
  - 클라이언트: anon key만 사용 (RLS 적용)
```

### 4-2. 권한 매트릭스 확정

| Capability | SUPER_ADMIN | ADMIN | CLUB_ADMIN | 비고 |
|---|---|---|---|---|
| 대시보드 전체 지표 조회 | ✅ | ✅ | ❌ (자기 클럽만) | |
| 티타임 생성/수정/차단 (전체 클럽) | ✅ | ✅ | ❌ | |
| 티타임 생성/수정/차단 (자기 클럽) | ✅ | ✅ | ✅ | club_admins 테이블 |
| 예약 전체 조회 | ✅ | ✅ | ❌ (자기 클럽만) | |
| 예약 취소/환불 처리 | ✅ | ✅ | ❌ | |
| 노쇼 처리 | ✅ | ✅ | ✅ (자기 클럽만) | |
| 사용자 세그먼트 변경 | ✅ | ✅ | ❌ | |
| 사용자 블랙리스트 | ✅ | ✅ | ❌ | |
| 사용자 정지 | ✅ | ✅ | ❌ | |
| 관리자 권한 부여/해제 | ✅ | ❌ | ❌ | |
| 슈퍼관리자 권한 부여 | ✅ | ❌ | ❌ | |
| 정산 생성/확인 | ✅ | ✅ | ❌ (조회만) | |
| 정산 잠금(Lock) | ✅ | ❌ | ❌ | |
| 시스템 설정/시드 데이터 | ✅ | ❌ | ❌ | |
| 크롤러 모니터링 | ✅ | ✅ | ❌ | |
| 크롤러 설정 변경 | ✅ | ❌ | ❌ | |

### 4-3. v0 Gap 백로그 수집

v0에서 확인된 미완성/버그 항목을 `99-v0-gap-backlog.md`에 기록:

```
ADMIN-001: 대시보드 매출 집계가 실 데이터 기반이 아님
ADMIN-002: 티타임 생성 폼 검증 미완성
ADMIN-003: BOOKED 티타임 서버측 수정 거부 미구현
ADMIN-004: 예약 취소/환불 Toss API 미연동
ADMIN-005: 정산 생성 시 금액 계산 검증 부족
ADMIN-006: CLUB_ADMIN 클럽 필터링 미검증
API-001: 에러 응답 형식 비일관
API-002: 입력 검증 Zod 스키마 미적용
API-003: Rate limiting 미적용
AUTH-001: CLUB_ADMIN RLS 정책 미검증
TYPE-001: any 타입 15곳 존재
```

---

## 5. Day 2: SDD 문서 완성 (2/18 수)

### 5-1. 콘솔 페이지별 SDD (6개)

#### Page 1: /admin (Dashboard)

**목적**: 운영자가 매출/예약/티타임 현황을 한눈에 파악

**데이터 소스**:
```sql
-- 일별 매출
SELECT DATE(tee_off AT TIME ZONE 'Asia/Seoul') as day,
       SUM(r.final_price) as gross,
       SUM(CASE WHEN r.payment_status = 'REFUNDED' THEN r.refund_amount ELSE 0 END) as refunds
FROM reservations r
JOIN tee_times t ON r.tee_time_id = t.id
WHERE r.payment_status IN ('PAID', 'REFUNDED', 'COMPLETED')
GROUP BY day ORDER BY day DESC;

-- 요약 카드
SELECT
  COUNT(*) FILTER (WHERE status = 'OPEN') as open_slots,
  COUNT(*) FILTER (WHERE status = 'BOOKED') as booked_slots,
  COUNT(*) FILTER (WHERE status = 'BLOCKED') as blocked_slots
FROM tee_times
WHERE DATE(tee_off AT TIME ZONE 'Asia/Seoul') = :today;
```

**API**:
- `GET /api/admin/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD&clubId=` (신규)
- Response: `{ revenue: DailyRevenue[], summary: DashboardSummary }`

**UI 구성**:
| 섹션 | 내용 |
|------|------|
| 상단 카드 4개 | 오늘 매출 / 예약 건수 / 오픈 슬롯 / 노쇼 건수 |
| 차트 | 7일/30일 매출 추이 (라인 차트) |
| 테이블 탭 | 최근 예약 / 노쇼 위험 유저 / 임박 딜 |

**에러 상태**:
- Service Role 미설정: 노란 배너 "제한 모드: Service Role 미설정"
- 데이터 없음: "선택 기간에 데이터가 없습니다"
- 서버 에러: "대시보드 로딩 실패" + 재시도 버튼

---

#### Page 2: /admin/tee-times (티타임 관리)

**목적**: 날짜/클럽별 티타임 CRUD + 차단 관리

**핵심 규칙**:
1. BOOKED 상태 티타임은 수정/차단 불가 (서버 거부)
2. 날짜 필터는 KST 기준 (YYYY-MM-DD)
3. 모든 변경에 updated_by/updated_at 기록
4. CLUB_ADMIN은 자기 클럽만 표시

**API**:
- `GET /api/admin/tee-times?clubId=&date=YYYY-MM-DD` (기존 Server Action → API 전환)
- `POST /api/admin/tee-times` (생성)
- `PATCH /api/admin/tee-times/:id` (수정)
- `DELETE /api/admin/tee-times/:id` (삭제 - OPEN만)

**Request/Response 스키마**:
```typescript
// POST /api/admin/tee-times
const CreateTeeTimeSchema = z.object({
  golf_club_id: z.number().int().positive(),
  tee_off: z.string().datetime(),       // ISO 8601
  base_price: z.number().int().min(0),
  status: z.enum(['OPEN', 'BLOCKED']),   // 생성 시 BOOKED 불가
})

// PATCH /api/admin/tee-times/:id
const UpdateTeeTimeSchema = z.object({
  base_price: z.number().int().min(0).optional(),
  status: z.enum(['OPEN', 'BLOCKED']).optional(),
}).refine(data => Object.keys(data).length > 0)
```

**UI 구성**:
| 영역 | 내용 |
|------|------|
| 필터 바 | 클럽 드롭다운 + 날짜 피커 |
| 목록 | 시간/가격/상태/예약자 테이블 |
| 액션 | 수정(모달), 차단/해제(인라인), 삭제(확인) |
| 생성 | 날짜+시간 선택 → 가격 입력 → 저장 |
| 일괄 생성 | 시작시간~종료시간, 간격(분), 가격 → 벌크 생성 |

---

#### Page 3: /admin/reservations (예약 관리)

**목적**: 예약 조회/상태 변경/환불 처리

**핵심 규칙**:
1. 예약 상태 변경은 상태 머신을 따름
2. 환불은 Toss API 호출 후 DB 업데이트
3. 노쇼 처리 시 사용자 no_show_count 증가
4. CLUB_ADMIN은 자기 클럽 예약만 조회

**API**:
- `GET /api/admin/reservations?status=&clubId=&from=&to=&page=&limit=` (리스트)
- `GET /api/admin/reservations/:id` (상세)
- `POST /api/admin/reservations/:id/cancel` (취소)
- `POST /api/admin/reservations/:id/refund` (환불 - Toss 연동)
- `POST /api/admin/reservations/:id/no-show` (노쇼 처리)
- `POST /api/admin/reservations/:id/complete` (완료 처리)

**UI 구성**:
| 영역 | 내용 |
|------|------|
| 필터 | 상태/클럽/날짜 범위/검색어(이름/이메일/전화) |
| 목록 | 예약ID/사용자/티타임/금액/상태/결제상태 |
| 상세 | 예약 정보 + 할인 내역 + 결제 정보 + 액션 버튼 |
| 액션 | 취소 / 환불 / 노쇼 / 완료 (상태 머신에 따른 활성화) |

---

#### Page 4: /admin/users (사용자 관리)

**목적**: 사용자 검색/세그먼트 관리/블랙리스트/정지

**핵심 규칙**:
1. 세그먼트 변경 시 override 필드 기록
2. 블랙리스트 시 사유 필수
3. 정지 시 만료일 설정 가능
4. 관리자 토글은 SUPER_ADMIN만

**API**:
- `GET /api/admin/users?q=&segment=&page=&limit=` (검색)
- `GET /api/admin/users/:id` (상세)
- `PATCH /api/admin/users/:id` (수정)
- `POST /api/admin/users/:id/suspend` (정지)
- `POST /api/admin/users/:id/unsuspend` (정지 해제)

**UI 구성**:
| 영역 | 내용 |
|------|------|
| 검색 | 이메일/이름/전화 통합검색 + 세그먼트 필터 |
| 목록 | 이름/이메일/세그먼트/노쇼횟수/블랙리스트/정지 상태 |
| 상세 | 기본정보 + 행동통계 + 예약이력 + 관리 액션 |
| 탭: 정지된 사용자 | /admin/users/suspended 별도 페이지 |

---

#### Page 5: /admin/settlements (정산 관리)

**목적**: 기간별 골프장 정산 생성/확인/잠금

**핵심 규칙**:
1. 정산 워크플로우: DRAFT → CONFIRMED → LOCKED
2. LOCKED 후 변경 불가 (SUPER_ADMIN만 잠금)
3. 금액 계산: gross - refunds - platform_fee = club_payout
4. CLUB_ADMIN은 자기 클럽 정산만 조회(수정 불가)

**API**:
- `GET /api/admin/settlements?clubId=&status=&page=&limit=` (리스트)
- `GET /api/admin/settlements/:id` (상세)
- `POST /api/admin/settlements` (생성)
- `PATCH /api/admin/settlements/:id/confirm` (확인)
- `PATCH /api/admin/settlements/:id/lock` (잠금)

**정산 생성 로직**:
```sql
SELECT
  SUM(CASE WHEN payment_status = 'PAID' THEN final_price ELSE 0 END) as gross,
  SUM(CASE WHEN payment_status = 'REFUNDED' THEN refund_amount ELSE 0 END) as refunds,
  COUNT(*) FILTER (WHERE payment_status = 'NO_SHOW') as no_show_count
FROM reservations r
JOIN tee_times t ON r.tee_time_id = t.id
WHERE t.golf_club_id = :clubId
  AND DATE(t.tee_off AT TIME ZONE 'Asia/Seoul') BETWEEN :start AND :end;
```

---

#### Page 6: /admin/settings (시스템 설정)

**목적**: DB 상태 확인, 시드 데이터, 시스템 설정

**핵심 규칙**:
1. SUPER_ADMIN 전용
2. 시드 데이터는 프로덕션에서 비활성
3. DB 연결 상태 + 테이블별 레코드 수 표시

**UI 구성**:
| 영역 | 내용 |
|------|------|
| DB 상태 | 연결 상태, Service Role 유무, RLS 활성 여부 |
| 테이블 현황 | 테이블별 레코드 수 |
| 시드 데이터 | 테스트 데이터 생성 버튼 (dev/stage만) |
| 환경 정보 | NODE_ENV, 버전, 배포 시간 |

---

### 5-2. API 계약서 (90-api/)

#### 공통 규격

**에러 응답 형식**:
```typescript
interface ApiErrorResponse {
  success: false
  error: {
    code: string        // 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'VALIDATION_ERROR' | ...
    message: string     // 사용자 표시용 한글 메시지
    details?: unknown   // 개발용 상세 정보 (프로덕션에서 제거)
  }
}
```

**성공 응답 형식**:
```typescript
interface ApiSuccessResponse<T> {
  success: true
  data: T
  meta?: {
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
}
```

**페이지네이션 규격**:
- 쿼리: `?page=1&limit=20`
- 기본값: page=1, limit=20, max limit=100

**인증 헤더**:
- 모든 admin API: Cookie 기반 Supabase Auth
- Server Action: 자동 쿠키 전달

#### 에러 코드 카탈로그

| Code | HTTP | 설명 |
|------|------|------|
| UNAUTHORIZED | 401 | 인증 실패 (로그인 필요) |
| FORBIDDEN | 403 | 권한 부족 |
| NOT_FOUND | 404 | 리소스 없음 |
| VALIDATION_ERROR | 400 | 입력 검증 실패 |
| CONFLICT | 409 | 상태 충돌 (e.g. BOOKED 티타임 수정) |
| PAYMENT_ERROR | 502 | 외부 결제 API 실패 |
| INTERNAL_ERROR | 500 | 서버 내부 오류 |

---

### 5-3. DB 스키마 변경 계획

v1.0에서 필요한 마이그레이션:

```sql
-- Migration: 20260217_v1_audit_and_indexes.sql

-- 1. admin_audit_logs 테이블 (관리자 액션 추적)
CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL REFERENCES users(id),
  action TEXT NOT NULL,          -- 'tee_time.create', 'user.blacklist', etc.
  target_table TEXT NOT NULL,    -- 'tee_times', 'users', 'reservations'
  target_id TEXT NOT NULL,       -- 대상 레코드 ID
  old_value JSONB,               -- 변경 전
  new_value JSONB,               -- 변경 후
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 인덱스 추가
CREATE INDEX idx_reservations_payment_status ON reservations(payment_status);
CREATE INDEX idx_reservations_tee_time_id ON reservations(tee_time_id);
CREATE INDEX idx_tee_times_tee_off_date ON tee_times(DATE(tee_off AT TIME ZONE 'Asia/Seoul'));
CREATE INDEX idx_tee_times_golf_club_status ON tee_times(golf_club_id, status);
CREATE INDEX idx_admin_audit_logs_created ON admin_audit_logs(created_at DESC);
CREATE INDEX idx_admin_audit_logs_admin ON admin_audit_logs(admin_user_id);

-- 3. RLS for admin_audit_logs
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read audit logs"
  ON admin_audit_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND (is_admin = true OR is_super_admin = true))
  );
```

---

## 6. Day 3: 구현 Phase 1 (2/19 목)

### Codex 지시 순서

#### Step 3-1: 테스트 인프라 설치
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```
- vitest.config.ts 생성
- package.json에 "test" 스크립트 추가

#### Step 3-2: 공통 유틸리티 생성

**파일: lib/api/response.ts** - API 응답 헬퍼
```typescript
export function apiSuccess<T>(data: T, meta?: PaginationMeta): ApiSuccessResponse<T>
export function apiError(code: ErrorCode, message: string, status: number): NextResponse
```

**파일: lib/api/validation.ts** - Zod 검증 헬퍼
```typescript
export function validateRequest<T>(schema: ZodSchema<T>, data: unknown): T  // throws on failure
```

**파일: lib/api/auth.ts** - 인증/권한 헬퍼
```typescript
export async function requireAuth(): Promise<User>              // 401 if not authenticated
export async function requireAdmin(): Promise<AdminUser>         // 403 if not admin
export async function requireSuperAdmin(): Promise<AdminUser>    // 403 if not super admin
export async function requireClubAccess(clubId: number): Promise<AdminUser>  // 403 if no club access
```

**파일: lib/api/audit.ts** - 감사 로그
```typescript
export async function logAdminAction(params: {
  adminUserId: string
  action: string
  targetTable: string
  targetId: string
  oldValue?: unknown
  newValue?: unknown
}): Promise<void>
```

#### Step 3-3: DB 마이그레이션 실행
- `20260217_v1_audit_and_indexes.sql` 적용

#### Step 3-4: Admin API 리팩토링

**우선순위 순서**:

1. **GET /api/admin/dashboard** (신규)
   - 일별 매출, 요약 카드, 최근 예약
   - Zod 검증: from/to date, clubId optional

2. **티타임 API 정리** (기존 Server Action → API Route)
   - GET /api/admin/tee-times (리스트)
   - POST /api/admin/tee-times (생성)
   - PATCH /api/admin/tee-times/:id (수정 - BOOKED 거부)
   - DELETE /api/admin/tee-times/:id (삭제 - OPEN만)

3. **예약 Admin API** (신규/보강)
   - GET /api/admin/reservations (리스트 + 페이지네이션)
   - GET /api/admin/reservations/:id (상세)
   - POST /api/admin/reservations/:id/cancel (취소)
   - POST /api/admin/reservations/:id/refund (환불)
   - POST /api/admin/reservations/:id/no-show (노쇼)

4. **정산 API 정리**
   - 기존 Server Action → API Route 전환
   - 금액 계산 로직 서버측 검증

#### Step 3-5: Toss 환불 API 연동
```typescript
// lib/payments/toss.ts
export async function refundPayment(paymentKey: string, reason: string, amount?: number): Promise<TossRefundResponse>
```

---

## 7. Day 4: 구현 Phase 2 (2/20 금)

### Codex 지시 순서

#### Step 4-1: 콘솔 UI 보강

1. **대시보드** (`app/admin/page.tsx`)
   - 기존 컴포넌트 → 새 API 연동
   - 매출 차트: 7일/30일 토글
   - Service Role 미설정 경고 배너
   - Error/Loading/Empty 상태 처리

2. **티타임 관리** (`app/admin/tee-times/page.tsx`)
   - 폼 검증 완성 (Zod + 에러 메시지)
   - 일괄 생성 기능
   - BOOKED 상태 수정 방지 UI
   - CLUB_ADMIN 클럽 필터링

3. **예약 관리** (`app/admin/reservations/page.tsx`)
   - 필터: 상태/클럽/날짜/검색어
   - 상세 페이지: 상태 머신에 따른 액션 버튼
   - 환불 모달: 금액 확인 + Toss 연동

4. **사용자 관리** (`app/admin/users/page.tsx`)
   - 검색 기능 완성
   - 세그먼트 변경 모달 (사유 입력)
   - 블랙리스트/정지 모달

#### Step 4-2: 핵심 테스트 작성

**테스트 대상 (우선순위)**:

| 파일 | 테스트 | 설명 |
|------|--------|------|
| utils/pricingEngine.ts | pricingEngine.test.ts | 가격 계산, 할인 적용, 40% 캡 |
| lib/api/response.ts | response.test.ts | 응답 헬퍼 |
| lib/api/validation.ts | validation.test.ts | Zod 검증 |
| app/api/admin/dashboard | dashboard.test.ts | 매출 집계 |
| app/api/admin/tee-times | tee-times.test.ts | CRUD + BOOKED 거부 |

#### Step 4-3: 타입 안전성

- `any` 타입 15곳 제거
- 적절한 인터페이스로 대체
- `npm run build` strict 통과 확인

---

## 8. 파일 구조 (v1.0 목표)

```
docs/sdd/v1.0/
├── 00-project.md              ← 핵심 정의 (확정)
├── 01-admin/
│   ├── admin-dashboard.md     ← 대시보드 SDD
│   ├── admin-tee-times.md     ← 티타임 SDD
│   ├── admin-reservations.md  ← 예약 SDD (신규)
│   ├── admin-users.md         ← 사용자 SDD (신규)
│   ├── admin-settlements.md   ← 정산 SDD (신규)
│   ├── admin-settings.md      ← 설정 SDD (신규)
│   └── permissions-matrix.md  ← 권한 매트릭스 (확정)
├── 90-api/
│   ├── api-common.md          ← 공통 규격 (신규)
│   ├── api-admin-dashboard.md ← 대시보드 API (신규)
│   ├── api-admin-tee-times.md ← 티타임 API (신규)
│   ├── api-admin-reservations.md ← 예약 API (신규)
│   ├── api-admin-users.md     ← 사용자 API (신규)
│   └── api-admin-settlements.md ← 정산 API (신규)
├── 99-v0-gap-backlog.md       ← v0 미완성 목록 (채움)
└── V1-MASTER-PLAN.md          ← 이 문서

lib/
├── api/
│   ├── response.ts            ← API 응답 헬퍼 (신규)
│   ├── validation.ts          ← Zod 검증 헬퍼 (신규)
│   ├── auth.ts                ← 인증/권한 헬퍼 (신규)
│   └── audit.ts               ← 감사 로그 (신규)
├── payments/
│   └── toss.ts                ← Toss 환불 (신규)
└── auth/
    └── getCurrentUserWithRoles.ts  ← 기존

app/api/admin/
├── dashboard/route.ts         ← 대시보드 API (신규)
├── tee-times/
│   ├── route.ts               ← 리스트/생성
│   └── [id]/route.ts          ← 수정/삭제
├── reservations/
│   ├── route.ts               ← 리스트
│   └── [id]/
│       ├── route.ts           ← 상세
│       ├── cancel/route.ts    ← 취소
│       ├── refund/route.ts    ← 환불
│       └── no-show/route.ts   ← 노쇼
├── settlements/
│   ├── route.ts               ← 리스트/생성
│   └── [id]/
│       ├── route.ts           ← 상세
│       ├── confirm/route.ts   ← 확인
│       └── lock/route.ts      ← 잠금
└── users/
    ├── route.ts               ← 검색/수정
    └── [id]/
        ├── route.ts           ← 상세/수정
        ├── suspend/route.ts   ← 정지
        └── unsuspend/route.ts ← 정지해제
```

---

## 9. Codex 지시 단위 (작업 분할)

| # | Day | 작업명 | 크기 | 의존성 |
|---|-----|--------|------|--------|
| C-01 | 3 | 테스트 인프라 설치 (Vitest) | S | 없음 |
| C-02 | 3 | lib/api/ 공통 유틸 (response, validation, auth, audit) | M | 없음 |
| C-03 | 3 | DB 마이그레이션 (audit_logs, indexes) | S | 없음 |
| C-04 | 3 | GET /api/admin/dashboard | M | C-02 |
| C-05 | 3 | 티타임 API (CRUD + BOOKED 거부) | L | C-02 |
| C-06 | 3 | 예약 Admin API (리스트/상세/취소/환불/노쇼) | L | C-02 |
| C-07 | 3 | Toss 환불 연동 (lib/payments/toss.ts) | M | 없음 |
| C-08 | 3 | 정산 API 정리 (Server Action → Route) | M | C-02 |
| C-09 | 4 | 대시보드 UI 보강 | M | C-04 |
| C-10 | 4 | 티타임 관리 UI 보강 | M | C-05 |
| C-11 | 4 | 예약 관리 UI + 환불 모달 | M | C-06, C-07 |
| C-12 | 4 | 사용자 관리 UI 보강 | M | C-06 |
| C-13 | 4 | 핵심 유닛 테스트 (가격엔진, API 유틸) | M | C-01, C-02 |
| C-14 | 4 | any 타입 제거 + 빌드 확인 | S | 전체 |

**병렬 가능 그룹**:
- Day 3 Group A: C-01 + C-02 + C-03 + C-07 (독립)
- Day 3 Group B: C-04 + C-05 + C-06 + C-08 (C-02 의존)
- Day 4 Group A: C-09 + C-10 + C-11 + C-12 (각 API 의존)
- Day 4 Group B: C-13 + C-14 (전체 의존)

---

## 10. 검증 기준 (Definition of Done)

### v1.0 완료 조건
- [ ] `npm run build` 성공 (any 0개, strict 통과)
- [ ] `npm run test` 통과 (가격엔진 80%+, API 유틸 80%+)
- [ ] 6개 관리자 페이지 모두 작동 (SUPER_ADMIN 계정)
- [ ] CLUB_ADMIN 클럽 필터링 작동
- [ ] 예약 상태 머신 전이 모두 작동
- [ ] Toss 환불 테스트 카드 성공
- [ ] SDD 문서 6개 완성 + API 계약서 6개
- [ ] 권한 매트릭스 코드와 일치
- [ ] 감사 로그 기록 확인

### 수동 테스트 시나리오
1. SUPER_ADMIN 로그인 → 대시보드 매출 확인 → 티타임 생성 → 예약 → 취소/환불
2. CLUB_ADMIN 로그인 → 자기 클럽만 표시 확인 → 티타임 수정 → 다른 클럽 접근 거부
3. 결제 플로우: 예약 → Toss 결제 → 성공 → 취소 → 환불 → DB 상태 확인
4. 정산: 기간 선택 → DRAFT 생성 → CONFIRMED → LOCKED → 수정 거부
