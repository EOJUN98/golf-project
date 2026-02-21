# Sector Design Gate - Admin No-Show Management (v1.0)

## Meta

- Sector: Admin / No-Show Management
- Owner: TUGOL Product Owner
- Date: 2026-02-19
- Status: Completed (N1~N4 Done, Legacy Schema Guard Applied)

## 1. Scope

- Goal:
  - 누락된 `/admin/no-show` 페이지를 복구하고, 노쇼 후보 조회/처리 흐름을 운영 가능 상태로 만든다.
- Non-Goal:
  - 노쇼 정책 알고리즘 변경
  - 예약 환불 정책 변경
  - 신규 테이블/마이그레이션
- In Scope:
  - N1: `/admin/no-show` 페이지 신규 추가
  - N2: 노쇼 후보 조회 UI + 날짜 필터 + 수동 새로고침
  - N3: 노쇼 처리 버튼 연동 (`POST /api/admin/no-show`)
  - N4: `GET/POST /api/admin/no-show` 인증/조회 경로 하드닝
- Out of Scope:
  - 자동 배치 노쇼 처리
  - CLUB_ADMIN 세분화 권한 정책

## 2. As-Is / To-Be

- As-Is:
  - 사이드바에는 `/admin/no-show` 링크가 있으나 실제 페이지가 없어 404가 발생한다.
  - no-show API는 서버 클라이언트 단일 경로로만 동작하여 환경에 따라 조회 안정성이 떨어질 수 있다.
- To-Be:
  - `/admin/no-show`에서 날짜별 노쇼 후보를 조회하고 단건 노쇼 처리 가능
  - API는 admin client optional 우선 경로로 안정화

## 3. Data Design

- Tables/Fields:
  - `reservations.status` 또는 `reservations.payment_status(legacy)`, `reservations.final_price`
  - `reservations.no_show_marked_at` (v1 스키마 적용 시)
  - `tee_times.tee_off`
  - `users.name`, `users.phone`, `users.no_show_count`
- Constraints/Indexes:
  - 기존 유지
- Migration Plan:
  - 없음
- Backfill Plan:
  - 없음

## 4. API Design

- Endpoints:
  - `GET /api/admin/no-show?date=YYYY-MM-DD`
  - `POST /api/admin/no-show`
- Request Schema:
  - GET: `date` optional (`YYYY-MM-DD`, default today)
  - POST: `{ reservationId: string }`
- Response Schema:
  - GET: `{ date, totalReservations, candidatesForNoShow, reservations[] }`
  - POST: `{ success, message, userSuspended }`
- Error Codes:
  - `400` validation
  - `401` unauthorized
  - `403` forbidden
  - `409` legacy schema(노쇼 처리 미지원)
  - `500` internal

## 5. Auth / RBAC / RLS

- Roles:
  - `SUPER_ADMIN`, `ADMIN`
- Access Matrix:
  - no-show 관리 화면/처리는 admin 권한 필수
- Service Role Usage:
  - admin client optional 사용, 미설정 시 server client fallback

## 6. Failure & Edge Cases

- Failure Modes:
  - 잘못된 date 포맷
  - 잘못된 reservationId
  - 이미 NO_SHOW 또는 PAID가 아닌 예약 처리 요청
- Retry/Timeout:
  - 실패 시 UI에서 재시도 가능
- Idempotency:
  - 동일 reservation 재처리 시 정책 함수에서 중복 거부
- Timezone/Date rules:
  - date 필터 입력은 `YYYY-MM-DD`, 후보 판단은 서버 현재시각 기준 grace period 적용

## 7. QA / Acceptance Criteria

- AC:
  - [x] `/admin/no-show` 페이지가 404 없이 렌더링된다.
  - [x] 날짜별 후보 조회가 동작한다.
  - [x] 노쇼 처리 성공/실패 메시지가 UI에 표시된다.
  - [x] lint/build가 통과한다.
- Manual QA Checklist:
  - [x] DEMO 모드 `/admin/no-show` 200
  - [x] GET `/api/admin/no-show?date=...` 200
  - [x] POST invalid payload -> 400
  - [x] POST unknown reservationId -> 400
- Automated Test Plan:
  - `npm run lint`
  - `npm run build`

## 8. Rollout / Rollback

- Deployment Order:
  - N4(API 하드닝) -> N1/N2(UI 페이지) -> N3(처리 연동) -> QA
- Monitoring:
  - `/api/admin/no-show` 4xx/5xx 비율
- Rollback Strategy:
  - 신규 페이지/컴포넌트 및 API 변경 revert

## 9. Dependencies / Risks

- Dependencies:
  - `requireAdminAccess`
  - `markNoShow` policy function
- Risks:
  - 실제 후보 데이터가 없는 환경에서 운영 동작 체감이 낮을 수 있음
  - 레거시 `reservations(payment_status)` 스키마에서는 실제 노쇼 확정(POST 성공) 불가
- Mitigation:
  - 빈 상태 UI/메시지 제공
  - API에서 스키마 자동 감지 후 조회는 호환, 처리 미지원은 409 가이드 응답
  - 2026-02-20 기준 DB는 `status` 컬럼이 복구되어 기본 경로로 동작

## 10. Approval

- Approved By: Product Owner ("짆애해" 지시)
- Approved At: 2026-02-19
- Notes:
  - 본 섹터는 게이트 승인 후 구현 완료
  - 후속 섹터로 `reservations` v1 스키마 마이그레이션/정합성 복구 필요
