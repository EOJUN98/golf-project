# Sector Design Gate - Admin Reservations Schema Compatibility (v1.0)

## Meta

- Sector: Admin / Reservations / Schema Compatibility
- Owner: TUGOL Product Owner
- Date: 2026-02-19
- Status: Completed (S1~S4 Done)

## 1. Scope

- Goal:
  - `reservations.status`가 없는 레거시 DB(`payment_status`)에서도 admin 예약/통계 기능이 깨지지 않도록 호환 레이어를 적용한다.
- Non-Goal:
  - DB 마이그레이션 실행
  - 예약 도메인 상태모델 재설계
- In Scope:
  - S1: status 컬럼 자동 감지 유틸 추가
  - S2: canonical status 매핑 유틸 추가
  - S3: `/admin/reservations` 목록/상세의 status 의존 코드 호환화
  - S4: `app/admin/actions.ts` 통계/노쇼 액션의 status 의존 코드 호환화

## 2. As-Is / To-Be

- As-Is:
  - 일부 admin 기능이 `reservations.status` 고정 의존으로 레거시 스키마에서 500 또는 잘못된 결과를 낸다.
- To-Be:
  - status 컬럼 존재 여부를 런타임에서 감지하여 `status`/`payment_status` 모두 처리한다.
  - 노쇼 확정처럼 v1 스키마가 필요한 액션은 명시적 가이드 에러로 반환한다.

## 3. Data Design

- Tables/Fields:
  - `reservations.status` (v1)
  - `reservations.payment_status` (legacy)
  - `reservations.no_show_marked_at` (v1)
  - `tee_times.tee_off`
- Migration Plan:
  - 없음 (후속 섹터에서 별도 진행)

## 4. API/Action Design

- 대상:
  - `/admin/reservations` server query
  - `/admin/reservations/[id]` server query
  - `markReservationAsNoShow` action
  - `getAdminDashboardStats` action
- 에러 정책:
  - 레거시 스키마에서 노쇼 확정 시 `LEGACY_SCHEMA_UNSUPPORTED` 반환

## 5. QA / Acceptance Criteria

- AC:
  - [x] status 컬럼 자동 감지 유틸이 추가되었다.
  - [x] admin 예약 목록/상세에서 canonical status로 렌더링된다.
  - [x] admin dashboard stats가 레거시/신규 스키마 모두에서 계산 가능하다.
  - [x] lint/build가 통과한다.
- Manual QA Checklist:
  - [x] `/admin/reservations` -> 200
  - [x] `/admin/reservations?status=PAID` -> 200
  - [x] `/admin` -> 200
  - [x] `npm run lint`
  - [x] `npm run build`

## 6. Risks

- Risks:
  - 레거시 스키마에서 `NO_SHOW`, `COMPLETED` 상태는 원천 데이터가 없어 통계 0으로 보일 수 있음
- Mitigation:
  - 운영 문서에 v1 reservations 마이그레이션 선행 필요 조건 명시

## 7. Approval

- Approved By: Product Owner ("진행" 지시)
- Approved At: 2026-02-19
- Notes:
  - no-show 섹터에서 확인된 blocking 이슈를 즉시 해소하기 위해 연속 섹터로 수행
