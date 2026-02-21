# Sector Design Gate - Reservations v1 Schema Alignment (v1.0)

## Meta

- Sector: Backend / Reservations Schema Recovery
- Owner: TUGOL Product Owner
- Date: 2026-02-19
- Status: Completed (V1~V4 Done)

## 1. Scope

- Goal:
  - 레거시 DB(`payment_status`만 존재)와 v1 앱 스키마 불일치를 해소해 admin 운영 기능을 안정화한다.
- Non-Goal:
  - 정산/노쇼 정책 알고리즘 재설계
  - RLS 정책 전면 개편
  - 사용자향 기능 추가
- In Scope:
  - V1: `reservations` v1 필수 컬럼/기본값/체크/인덱스 정합화
  - V2: `cancellation_policies` 테이블/기본 정책 보강
  - V3: `settlements` 테이블 및 `settlement_summary` 뷰 보강
  - V4: 런타임 회귀 확인(no-show/settlement 페이지)

## 2. As-Is / To-Be

- As-Is:
  - `reservations`에 `status`, `no_show_marked_at`, `settlement_id` 등 핵심 컬럼 부재
  - `cancellation_policies`, `settlements` 테이블 부재
  - no-show/admin-settlement 운영 기능이 부분 실패 또는 제한 동작
- To-Be:
  - v1 코드가 기대하는 최소 스키마가 원격 DB에 보장됨
  - no-show 조회/처리 및 settlement 조회 경로가 치명 오류 없이 동작

## 3. Data Design

- Tables/Fields:
  - `reservations`: `status`, `is_imminent_deal`, `cancelled_at`, `cancel_reason`, `refund_amount`, `no_show_marked_at`, `policy_version`, `payment_mode`, `payment_reference`, `payment_metadata`, `risk_score`, `risk_factors`, `precheck_*`, `penalty_agreement_*`, `paid_amount`, `settlement_id`
  - `cancellation_policies`
  - `settlements`
  - `settlement_summary` view
- Constraints/Indexes:
  - `reservations_status_check`, `reservations_payment_mode_check`, `check_paid_amount_positive`
  - `idx_reservations_status_created_at`, `idx_reservations_user_id`, `idx_reservations_tee_time_id`, `idx_reservations_settlement_id`
- Migration Plan:
  - idempotent 단일 보정 마이그레이션 적용
- Backfill Plan:
  - `reservations.status` NULL 시 `payment_status` 값으로 백필
  - `paid_amount` = 0 인 기존 데이터는 상태 기반으로 `final_price`로 백필

## 4. API / Action Design

- 영향 엔드포인트/액션:
  - `GET/POST /api/admin/no-show`
  - `/admin/reservations*`, `/admin/settlements*`
  - `getAdminDashboardStats`, settlement server actions
- 에러 전략:
  - 스키마 미지원으로 인한 500 대신 명시적 가이드 또는 정상 fallback

## 5. Auth / RBAC / RLS

- Roles:
  - `SUPER_ADMIN`, `ADMIN`, `CLUB_ADMIN` (기존 코드 기준)
- Service Role Usage:
  - 기존 규칙 유지(관리자 조회/운영 API에 한정)
- RLS:
  - 본 섹터에서는 스키마 정합성 중심, RLS 전면 변경은 비범위

## 6. Failure & Edge Cases

- Failure Modes:
  - 기존 제약과 신규 제약 충돌
  - settlement FK 추가 시 참조 테이블 미존재
  - 마이그레이션 중 일부 객체만 생성되는 불완전 상태
- Mitigation:
  - `IF NOT EXISTS`/`DO $$` 기반 idempotent SQL
  - 테이블 생성 -> FK/뷰 순서 보장

## 7. QA / Acceptance Criteria

- AC:
  - [x] `reservations` v1 핵심 컬럼이 존재한다.
  - [x] `cancellation_policies` / `settlements` / `settlement_summary`가 존재한다.
  - [x] `/api/admin/no-show` GET 200, POST가 스키마 미지원 에러 없이 동작한다.
  - [x] `/admin/settlements`가 치명 오류 없이 렌더링된다.
  - [x] `npm run lint`, `npm run build` 통과

## 8. Rollout / Rollback

- Deployment Order:
  - V1 reservations -> V2 cancellation_policies -> V3 settlements/view -> V4 QA
- Rollback Strategy:
  - 본 마이그레이션은 additive 중심. 장애 시 앱 레벨 fallback 유지 후 후속 hotfix migration 적용

## 9. Dependencies / Risks

- Dependencies:
  - Supabase migration apply 권한
  - 운영 DB 접속 가능 상태
- Risks:
  - 기존 로컬 migration 이력과 원격 migration 이력의 drift
- Mitigation:
  - 보정 마이그레이션을 self-contained/idempotent로 구성

## 10. Approval

- Approved By: Product Owner ("다음진행" 지시)
- Approved At: 2026-02-19
- Notes:
  - 본 섹터는 v1 admin 안정화를 위한 선행 스키마 복구 섹터
  - 적용 마이그레이션: `20260219133000_reservations_v1_schema_alignment.sql`
  - 적용 결과: no-show/settlement admin 경로 런타임 정상화 확인
