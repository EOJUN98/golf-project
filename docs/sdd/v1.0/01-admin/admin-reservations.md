# /admin/reservations SDD (v1.0)

## Summary

- 목적: 관리자 권한으로 예약 목록/상세를 조회하고 운영 액션(노쇼 처리, 사용자 정지 해제)을 수행한다.
- 우선순위: P1 (Pricing/티타임 안정화 이후 Admin 운영 신뢰도 보강)

## Core Requirements

1. 관리자 권한 없는 접근 차단
2. 예약 목록 필터링(기간/상태/클럽/유저) 안정 동작
3. 예약 상세에서 노쇼/정지 해제 액션 연동
4. Service role 경로 우선, session client fallback

## Auth

- 진입 권한: `SUPER_ADMIN`, `ADMIN`
- 진입 가드: `requireAdminAccess()`
- 인증 실패 처리:
  - 비로그인: `/login?redirect=/admin/reservations...`
  - 권한 없음: `/forbidden`

## Data Source

- `reservations`
- `tee_times`
- `golf_clubs`
- `users`
- `cancellation_policies`

## Runtime Notes

- 목록/상세 페이지는 `createSupabaseAdminClientOptional()` 우선 사용
- service role 미설정 시 `createSupabaseServerClient()` fallback

## Schema Compatibility

- 운영 DB에 `reservations.status`가 없는 레거시 상태(`payment_status`만 존재)가 확인됨.
- admin 예약 기능은 런타임에서 status 컬럼을 감지한다:
  - 목록/통계 조회: `status`/`payment_status` 모두 호환
  - 노쇼 확정 액션: `status + no_show_marked_at` 미지원 스키마에서는 가이드 에러 반환
- 실제 NO_SHOW/COMPLETED 운영까지 포함하려면 `reservations` v1 마이그레이션 적용이 필요하다.
- 2026-02-20 기준 `20260219133000_reservations_v1_schema_alignment.sql` 적용으로
  운영 DB 핵심 컬럼(`status`, `no_show_marked_at`, `settlement_id` 등)이 복구되었다.

## Acceptance Criteria

- 관리자만 목록/상세를 볼 수 있다.
- 목록 필터 적용 후 결과가 안정적으로 렌더링된다.
- 상세의 운영 액션 호출이 권한 모델과 충돌하지 않는다.
