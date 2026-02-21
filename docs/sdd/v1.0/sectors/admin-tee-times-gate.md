# Sector Design Gate - Admin Tee Times (v1.0)

## Meta

- Sector: Admin / Tee Times
- Owner: TUGOL Product Owner
- Date: 2026-02-19
- Status: Completed (TA/TA-2/TB + Manual QA Done)

## 1. Scope

- Goal:
  - `/admin/tee-times`의 생성/수정/차단이 API 경유로 일관 처리되고, DB 반영 신뢰도를 확보한다.
- Non-Goal:
  - 티타임 화면 UI 리디자인
  - 티타임 외 다른 admin 도메인(정산/사용자) 기능 변경
- In Scope:
  - TA: `/api/admin/tee-times` 확장(GET/POST + 기존 PATCH 정리)
  - TA-2: `/api/admin/tee-times/[id]` PATCH/DELETE 추가
  - TB: `/admin/tee-times`의 CRUD 호출을 Server Action에서 API 호출로 전환
  - BOOKED 수정 거부(서버 409) 및 에러 UI 반영
- Out of Scope:
  - 골프장 목록 API 신규 분리 (`getAccessibleGolfClubs`는 유지)

## 2. As-Is / To-Be

- As-Is:
  - 페이지가 Server Action CRUD에 의존
  - API는 `/api/admin/tee-times`의 PATCH 일부 액션만 제공
- To-Be:
  - 목록/생성/수정/차단/해제가 API 기반으로 통일
  - 서버에서 권한/검증/BOOKED 제약을 일관되게 강제

## 3. Data Design

- Tables/Fields:
  - `tee_times`: `id`, `golf_club_id`, `tee_off`, `base_price`, `status`, `updated_by`, `updated_at`
  - `club_admins`: club-level 권한 판단
  - `users`: admin/role 판단
- Constraints/Indexes:
  - 기존 스키마 유지
- Migration Plan:
  - 없음
- Backfill Plan:
  - 없음

## 4. API Design

- Endpoints:
  - `GET /api/admin/tee-times?clubId=&date=YYYY-MM-DD`
  - `POST /api/admin/tee-times`
  - `PATCH /api/admin/tee-times` (기존 action 호환 유지)
  - `PATCH /api/admin/tee-times/:id`
  - `DELETE /api/admin/tee-times/:id`
- Request Schema:
  - create: `golf_club_id`, `tee_off`, `base_price`, `status(OPEN|BLOCKED)`
  - update: `tee_off?`, `base_price?`, `status?(OPEN|BLOCKED)`
- Response Schema:
  - success: `{ success: true, data? }`
  - fail: `{ success: false, error: { code, message } }`
- Error Codes:
  - `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`

## 5. Auth / RBAC / RLS

- Roles:
  - SUPER_ADMIN, ADMIN, CLUB_ADMIN
- Access Matrix:
  - SUPER_ADMIN/ADMIN: 전체 클럽
  - CLUB_ADMIN: 본인 `clubIds`만
- Service Role Usage:
  - admin endpoint에서 허용(옵셔널 admin client 우선)

## 6. Failure & Edge Cases

- Failure Modes:
  - 잘못된 날짜/가격/상태 입력
  - 권한 없는 club 접근
  - 존재하지 않는 tee_time ID
  - BOOKED 항목 수정/차단 시도
- Retry/Timeout:
  - 프론트에서 재조회 버튼/재시도
- Idempotency:
  - PATCH는 동일 payload 반복 시 동일 결과 유지
- Timezone/Date rules:
  - 조회 필터는 KST `YYYY-MM-DD` day range

## 7. QA / Acceptance Criteria

- AC:
  - [x] GET API로 club/date 필터 조회 가능
  - [x] POST API로 생성 후 즉시 재조회 시 반영
  - [x] PATCH `:id`로 수정/상태 변경 가능
  - [x] DELETE `:id`는 OPEN 상태만 허용
  - [x] BOOKED 수정 시 `409 CONFLICT`
  - [x] CLUB_ADMIN은 본인 클럽 외 접근 불가
- Manual QA Checklist:
  - [x] `npm run lint`
  - [x] `npm run build`
  - [x] `/admin/tee-times` 실제 동작 확인
  - [x] API 시나리오 확인 (GET→POST→PATCH→DELETE, 상태코드 검증)
  - [x] BOOKED 수정 시 `409 CONFLICT` 검증
- Automated Test Plan:
  - 현재는 수동 QA 중심(테스트 프레임워크 추후)

## 8. Rollout / Rollback

- Deployment Order:
  - API 확장(TA) → 페이지 연동(TB) → QA
- Monitoring:
  - 브라우저 네트워크 로그 + 서버 로그
- Rollback Strategy:
  - 페이지를 Server Action 경로로 되돌리는 revert

## 9. Dependencies / Risks

- Dependencies:
  - `getCurrentUserWithRoles` role 정확성
  - admin/clubAdmin RLS 정책 일치
- Risks:
  - 기존 dashboard PATCH(action 방식) 호환성 깨짐
- Mitigation:
  - `/api/admin/tee-times`의 action PATCH 인터페이스 유지

## 10. Approval

- Approved By: Product Owner ("규칙에 맞게 진행해" 지시)
- Approved At: 2026-02-19
- Notes:
  - 설계 게이트 승인 후 구현 착수
  - 수동 QA(2026-02-19):
    - API 시나리오: GET(200) → POST(200) → PATCH `:id`(200) → PATCH action BLOCKED/OPEN(200) → DELETE BLOCKED(409) → DELETE OPEN(200)
    - BOOKED 검증: DB에서 테스트 row 상태를 BOOKED로 전환 후 PATCH `:id`가 409 반환 확인
  - QA 중 수정:
    - POST 생성 시 `current_price` 누락으로 500 발생하여 `current_price=base_price`로 보완
    - DEMO fallback user의 비-UUID `updated_by`로 쓰기 실패 가능성 방어 (`updated_by`를 UUID일 때만 기록)
