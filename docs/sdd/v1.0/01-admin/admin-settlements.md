# /admin/settlements SDD (v1.0)

## Summary

- 목적: 골프장 정산 생성/조회/상태관리(DRAFT/CONFIRMED/LOCKED)를 관리자 권한으로 운영한다.
- 우선순위: P1 (운영 정산 신뢰도 확보)

## Core Requirements

1. 관리자 권한 없는 접근 차단
2. 정산 목록/상세/생성 화면의 안정 렌더
3. 정산 액션(create/update) 권한 모델 유지
4. admin client optional 우선 + server client fallback

## Auth

- 페이지 진입 권한: `SUPER_ADMIN`, `ADMIN`
- 페이지 진입 가드: `requireAdminAccess()`
- 액션 권한:
  - 생성/미리보기: `requireClubAccess()`
  - 상태변경: `requireAdminAccess()` / `LOCKED`는 `requireSuperAdminAccess()`

## Data Source

- `settlements`
- `settlement_summary` (view)
- `reservations`
- `golf_clubs`
- `users`

## Runtime Notes

- settlements 페이지/액션은 `createSupabaseAdminClientOptional()` 우선 사용
- service role 미설정 시 `createSupabaseServerClient()` fallback
- 2026-02-20 기준 스키마 정합화 마이그레이션 적용 완료:
  - `20260219133000_reservations_v1_schema_alignment.sql`

## Acceptance Criteria

- `/admin/settlements`, `/admin/settlements/new`, `/admin/settlements/[id]`가 관리자 가드 하에 동작한다.
- settlements actions가 글로벌 고정 client 없이 동작한다.
- lint/build 통과.
