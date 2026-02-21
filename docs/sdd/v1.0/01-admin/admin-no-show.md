# /admin/no-show SDD (v1.0)

## Summary

- 목적: 티오프 후 유예시간이 지난 결제 예약을 노쇼 후보로 조회하고, 관리자가 노쇼 처리를 수행한다.
- 우선순위: P1 (예약 운영 안정화)

## Core Requirements

1. 관리자 전용 접근(비로그인/권한 없음 차단)
2. 날짜 기준 후보 조회
3. 단건 노쇼 처리 액션
4. 처리 결과 메시지/에러 노출

## API

- `GET /api/admin/no-show?date=YYYY-MM-DD`
- `POST /api/admin/no-show`
  - body: `{ reservationId: string }`

## Auth

- 페이지 접근: `requireAdminAccess()`
- API 접근: `requireAdminAccess()`

## Data Source

- `reservations`
- `tee_times`
- `golf_clubs`
- `users`

## Schema Compatibility

- 현재 운영 DB에 `reservations.status`가 없고 `payment_status`만 존재하는 레거시 스키마가 확인됨.
- API는 status 컬럼을 자동 감지한다:
  - 조회(GET): `status`/`payment_status` 모두 호환
  - 처리(POST): `status + no_show_marked_at` 미지원 스키마에서는 `409` 가이드 에러 반환
- 실제 노쇼 확정 처리까지 운영하려면 `reservations` v1 마이그레이션 적용이 선행되어야 한다.
- 2026-02-20 기준 `20260219133000_reservations_v1_schema_alignment.sql` 적용으로
  운영 DB의 `status` 컬럼이 복구되었고 기본 경로(legacy guard 미진입)로 동작한다.

## Acceptance Criteria

- `/admin/no-show` 페이지가 404 없이 렌더링된다.
- 날짜별 후보 조회가 가능하다.
- 노쇼 처리 성공/실패 메시지를 확인할 수 있다.
