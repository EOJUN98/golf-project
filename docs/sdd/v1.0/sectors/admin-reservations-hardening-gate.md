# Sector Design Gate - Admin Reservations Hardening (v1.0)

## Meta

- Sector: Admin / Reservations / Hardening
- Owner: TUGOL Product Owner
- Date: 2026-02-19
- Status: Completed (Implementation Done, Runtime QA Partially Blocked)

## 1. Scope

- Goal:
  - `/admin/reservations` 목록/상세 페이지의 관리자 접근 보안과 데이터 조회 경로를 안정화한다.
- Non-Goal:
  - 예약 환불 비즈니스 로직 재설계
  - UI 리디자인
  - 신규 DB 스키마 변경
- In Scope:
  - R1: 예약 목록 페이지에 `requireAdminAccess` 가드 적용
  - R2: 예약 상세 페이지에 `requireAdminAccess` 가드 적용
  - R3: anon key fallback 제거 및 admin client optional + server client 경로 통일
  - R4: 조회 오류 시 안전한 fallback 렌더링(빈 배열/null) 유지
- Out of Scope:
  - `/api/admin/reservations` 신규 라우트 설계
  - Toss 환불 연동 고도화

## 2. As-Is / To-Be

- As-Is:
  - 예약 관리 페이지가 관리자 가드 없이 service/anon fallback client를 직접 생성한다.
  - 환경에 따라 anon fallback으로 동작 시 데이터 누락/오동작 위험이 있다.
- To-Be:
  - 페이지 진입 전 관리자 권한이 강제되며, data client 경로가 프로젝트 공통 패턴으로 통일된다.

## 3. Data Design

- Tables/Fields:
  - `reservations`, `tee_times`, `golf_clubs`, `users`, `cancellation_policies`
- Constraints/Indexes:
  - 기존 유지
- Migration Plan:
  - 없음
- Backfill Plan:
  - 없음

## 4. API Design

- Endpoints:
  - 해당 섹터는 페이지 서버 조회 경로만 변경 (API 계약 변경 없음)
- Request Schema:
  - 기존 query params 유지 (`dateFrom/dateTo/status/golfClubId/userId`)
- Response Schema:
  - 페이지 렌더링 데이터 구조 유지
- Error Codes:
  - 인증 실패 시 `/login` redirect 또는 `/forbidden` redirect

## 5. Auth / RBAC / RLS

- Roles:
  - `SUPER_ADMIN`, `ADMIN`
- Access Matrix:
  - 예약 목록/상세 조회는 admin 권한 필수
- Service Role Usage:
  - `createSupabaseAdminClientOptional()` 우선 사용
  - 미설정 시 `createSupabaseServerClient()` fallback

## 6. Failure & Edge Cases

- Failure Modes:
  - admin client env 누락
  - reservation join query 실패
  - 상세 reservation 미존재
- Retry/Timeout:
  - 페이지 재요청으로 재시도
- Idempotency:
  - 읽기 전용 경로
- Timezone/Date rules:
  - 기존 dateFrom/dateTo 필터 규칙 유지

## 7. QA / Acceptance Criteria

- AC:
  - [x] 비로그인 사용자는 `/admin/reservations*` 접근 시 로그인/권한 흐름으로 차단되도록 코드 경로가 적용되었다.
  - [x] 관리자 권한 기준의 예약 목록/상세 렌더링 코드 경로가 통일되었다.
  - [x] lint/build가 통과한다.
- Manual QA Checklist:
  - [x] DEMO 모드 `/admin/reservations` 200
  - [ ] DEMO 모드 `/admin/reservations/[id]` 200 (존재 ID)
  - [ ] non-demo 비로그인 접근 시 인증 차단 확인
- Automated Test Plan:
  - `npm run lint`
  - `npm run build`

## 8. Rollout / Rollback

- Deployment Order:
  - R1 목록 -> R2 상세 -> R3 client 통일 -> QA
- Monitoring:
  - `/admin/reservations*` 접근 실패율
- Rollback Strategy:
  - 대상 페이지 파일 revert

## 9. Dependencies / Risks

- Dependencies:
  - `requireAdminAccess`
  - `createSupabaseAdminClientOptional`
  - `createSupabaseServerClient`
- Risks:
  - 권한 가드 적용 후 기존 수동 테스트 계정 접근 방식 변화
- Mitigation:
  - DEMO_MODE 경로에서 검증

## 10. Approval

- Approved By: Product Owner ("섹터진행해" 지시)
- Approved At: 2026-02-19
- Notes:
  - 본 섹터는 게이트 승인 후 구현 진행
  - 2026-02-19 구현 결과:
    - `/admin/reservations` 및 `/admin/reservations/[id]`에 `requireAdminAccess` 가드 적용
    - data client를 `createSupabaseAdminClientOptional() -> createSupabaseServerClient()` 경로로 통일
    - `app/admin/actions.ts`의 전역 anon fallback client 제거 (action 시점 client 획득)
    - `npm run lint`, `npm run build` 통과
  - Runtime QA 제한:
    - 현재 예약 데이터가 없어 `/admin/reservations/[id]`의 "존재 ID" 시나리오는 추가 seed 후 검증 필요
