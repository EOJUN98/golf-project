# Sector Design Gate - Pricing Crawler Notes (v1.0)

## Meta

- Sector: Pricing / Crawler / Step 2 Notes
- Owner: TUGOL Product Owner
- Date: 2026-02-19
- Status: Completed (N1~N4 Done)

## 1. Scope

- Goal:
  - `/admin/crawler`에서 가격 스냅샷 행 단위 메모/특성(traits)을 입력·수정·조회하고, 엔진 연동 가능한 구조로 저장한다.
- Non-Goal:
  - 신규 크롤러 사이트 추가
  - 사용자향 페이지 변경
  - 기존 스냅샷 적재 파이프라인 로직 변경
- In Scope:
  - N1: 스냅샷 행 조회 API (`GET /api/admin/crawler/snapshots`)
  - N2: 스냅샷 메모/traits 저장 API (`PATCH /api/admin/crawler/snapshots`)
  - N3: `/admin/crawler` 상세 패널에 스냅샷 행 목록 + 메모 저장 UI 추가
  - N4: 메모 작성자/수정시각 저장 및 화면 노출
- Out of Scope:
  - 엔진 할인 로직에서 traits 반영(다음 섹터)

## 2. As-Is / To-Be

- As-Is:
  - `/admin/crawler`는 골프장 요약 통계만 제공하고, 가격 행별 메모를 저장할 수 없다.
  - `external_price_snapshots`의 `payload`는 존재하지만 운영 메모 구조가 표준화되어 있지 않다.
- To-Be:
  - 관리자가 골프장 선택 후 최근 스냅샷 행을 보고 각 행별 메모/traits를 저장할 수 있다.
  - 메모는 `payload.manual_note` 구조로 표준화되어 저장된다.

## 3. Data Design

- Tables/Fields:
  - `external_price_snapshots.id`
  - `external_price_snapshots.payload` (JSONB)
  - `external_price_snapshots.crawled_at`, `play_date`, `final_price`, `availability_status`, `collection_window`
- Constraints/Indexes:
  - 신규 DDL 없음
  - traits 길이/개수는 API validation으로 제어
- Migration Plan:
  - 없음 (`payload` 내 구조 확장)
- Backfill Plan:
  - 기존 row는 note 없음으로 유지, 저장 시점부터 `payload.manual_note` 생성

## 4. API Design

- Endpoints:
  - `GET /api/admin/crawler/snapshots?courseName=<name>&limit=<n>`
  - `PATCH /api/admin/crawler/snapshots`
- Request Schema:
  - GET query:
    - `courseName: string (required)`
    - `limit: number (optional, default 20, max 100)`
  - PATCH body:
    - `snapshotId: number (required)`
    - `note: string (optional, max 300)`
    - `traits: string[] (optional, each <= 30, max 8)`
- Response Schema:
  - GET:
    - `{ success: true, data: SnapshotNoteRow[] }`
  - PATCH:
    - `{ success: true, data: SnapshotNoteRow }`
- Error Codes:
  - `400` validation
  - `401` 로그인 없음
  - `403` admin 권한 없음
  - `404` snapshot 없음
  - `500` internal/config

## 5. Auth / RBAC / RLS

- Roles:
  - `SUPER_ADMIN`, `ADMIN`
- Access Matrix:
  - 조회/수정 모두 admin 권한 필요
- Service Role Usage:
  - `external_price_snapshots`는 service_role 정책 기반 접근

## 6. Failure & Edge Cases

- Failure Modes:
  - 잘못된 snapshot id
  - payload가 object가 아닌 비정상 JSON
  - 공백 note + 빈 traits 저장 요청
- Retry/Timeout:
  - 클라이언트에서 저장 실패 시 재시도 가능
- Idempotency:
  - 동일 payload 재저장 시 결과 동일
- Timezone/Date rules:
  - 저장 시각은 서버 UTC ISO, UI 표시는 KST locale

## 7. QA / Acceptance Criteria

- AC:
  - [x] `/admin/crawler`에서 스냅샷 행 리스트가 골프장 선택 기준으로 표시된다.
  - [x] 스냅샷 행에 note/traits를 저장하면 즉시 재조회 시 반영된다.
  - [x] 응답에 note 작성자/수정시각이 포함된다.
  - [x] 유효하지 않은 payload 입력에 대해 400 에러를 반환한다.
- Manual QA Checklist:
  - [x] GET snapshots 정상 응답 확인
  - [x] PATCH note 저장 후 GET 반영 확인
  - [x] 빈 note + 빈 traits 저장 시 manual_note 제거 확인
  - [x] 권한 없는 호출 401 확인 (비로그인)
- Automated Test Plan:
  - `npm run lint`
  - `npm run build`

## 8. Rollout / Rollback

- Deployment Order:
  - N1 API 조회 -> N2 API 저장 -> N3 UI 연결 -> QA
- Monitoring:
  - `/api/admin/crawler/snapshots` 4xx/5xx 비율
  - 저장 후 즉시 재조회 일치 여부
- Rollback Strategy:
  - 신규 API route + UI section revert
  - payload 내 생성된 `manual_note`는 데이터 보존(필요 시 후속 정리)

## 9. Dependencies / Risks

- Dependencies:
  - `requireAdminAccess`
  - service role 환경변수 (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- Risks:
  - snapshot 수가 많을 때 조회 응답 지연
  - 자유 입력 note의 품질 편차
- Mitigation:
  - courseName 필터 + limit 강제
  - note 길이/traits 개수 제한

## 10. Approval

- Approved By: Product Owner ("진행" 지시)
- Approved At: 2026-02-19
- Notes:
  - 본 섹터는 게이트 승인 후 구현 진행
  - 2026-02-19 QA:
    - `GET /api/admin/crawler/snapshots?courseName=포천힐스&limit=3` -> `200`
    - `PATCH /api/admin/crawler/snapshots` note/traits 저장 후 GET 재조회에서 `manualNote` 반영 확인
    - 동일 snapshot에 `note=\"\"`, `traits=[]` 저장 시 `manualNote=null` 확인
    - 비로그인 서버(`NEXT_PUBLIC_DEMO_MODE` 미설정)에서 동일 GET 호출 시 `401` 확인
    - `npm run lint` / `npm run build` 통과
