# Sector Design Gate - Admin Dashboard Visibility (v1.0)

## Meta

- Sector: Admin / Dashboard Visibility (Revenue chart + tee-time datetime)
- Owner: TUGOL Product Owner
- Date: 2026-02-20
- Status: Completed (V1~V3 Done)

## 1. Scope

- Goal:
  - `/admin`에서 "안 보이는 것처럼 느껴지는" 지표를 시각적으로 명확하게 보이도록 정렬한다.
- Non-Goal:
  - 예약 샘플 데이터 자동 생성
  - 매출 집계 정의 변경
- In Scope:
  - V1: 예약 데이터가 0건이어도 최근 14일 매출 차트 막대를 유지 표시
  - V2: `empty`와 `error` 상태를 UI에서 명확히 구분
  - V3: 티타임 관리 탭의 시간 컬럼을 날짜+시간(KST)으로 명확히 표시
- Out of Scope:
  - 예약 결제/생성 플로우 구현
  - 대시보드 전체 디자인 리뉴얼

## 2. As-Is / To-Be

- As-Is:
  - `revenue.status=empty`이면 막대 차트가 사라지고 텍스트만 표시된다.
  - 티타임 탭 컬럼명이 "시간"이라 날짜 포함 여부가 직관적이지 않다.
- To-Be:
  - `empty`에서도 14일 0원 차트가 렌더되고, 안내문으로 데이터 부재를 설명한다.
  - `error`만 차트 대신 에러 메시지를 노출한다.
  - 티타임 탭은 "일시 (KST)"로 표기하고 실제 렌더도 KST로 고정한다.

## 3. Data Design

- Tables/Fields:
  - `reservations(created_at, final_price)`
  - `tee_times(tee_off, base_price, current_price, status, weather_condition)`
- Constraints/Indexes:
  - 기존 유지
- Migration Plan:
  - 없음 (UI/표현 로직 변경)
- Backfill Plan:
  - 없음

## 4. API Design

- Endpoints:
  - 기존 `/admin` server component 데이터 사용
  - 기존 `PATCH /api/admin/tee-times` 유지
- Request Schema:
  - 변경 없음
- Response Schema:
  - 변경 없음
- Error Codes:
  - 변경 없음

## 5. Auth / RBAC / RLS

- Roles:
  - 기존 admin 콘솔 권한 정책 유지
- Access Matrix:
  - 변경 없음
- Service Role Usage:
  - 변경 없음

## 6. Failure & Edge Cases

- Failure Modes:
  - reservations 조회 오류 시 차트 대신 에러 메시지 노출
  - 브라우저 로컬 타임존으로 인한 티타임 표기 오차
- Retry/Timeout:
  - 새로고침으로 재조회
- Idempotency:
  - read-only UI 변경
- Timezone/Date rules:
  - 티타임 일시는 `Asia/Seoul` 고정 formatter 사용

## 7. QA / Acceptance Criteria

- AC:
  - [x] V1: `revenue.status=empty`에서도 차트 영역에 14일 막대가 렌더된다.
  - [x] V2: `revenue.status=error`일 때만 차트 대신 오류 메시지를 노출한다.
  - [x] V3: 티타임 탭 첫 컬럼이 날짜+시간(KST)으로 표시된다.
- Manual QA Checklist:
  - [x] `reservations=0` 상태에서 `/admin` 차트 막대가 유지되는지 확인
  - [x] 차트 하단 empty 안내문 노출 확인
  - [x] 티타임 관리 탭 헤더/값이 `일시 (KST)` 형식인지 확인
- Automated Test Plan:
  - [x] `npm run lint`

## 8. Rollout / Rollback

- Deployment Order:
  - UI 컴포넌트 반영 -> lint 확인 -> 문서/로그 동기화
- Monitoring:
  - `/admin` 진입 후 차트 렌더 가시성
  - 운영자 피드백("매출 추이 안 보임" 재발 여부)
- Rollback Strategy:
  - `components/AdminDashboardNew.tsx` 변경 revert

## 9. Dependencies / Risks

- Dependencies:
  - `app/admin/page.tsx`에서 14일 `chartData`를 계속 생성한다는 전제
- Risks:
  - `empty` 상태에서 0원 차트를 오해할 가능성
- Mitigation:
  - 하단 안내문으로 "예약 데이터 없음"을 명확히 표시

## 10. Approval

- Approved By: Product Owner ("진행", "다음거부터 진행해")
- Approved At: 2026-02-20
- Notes:
  - 구현 파일:
    - `components/AdminDashboardNew.tsx`
  - 문서 정합성:
    - `docs/sdd/v1.0/01-admin/admin-dashboard.md`
