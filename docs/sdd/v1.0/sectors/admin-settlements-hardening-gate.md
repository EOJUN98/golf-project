# Sector Design Gate - Admin Settlements Hardening (v1.0)

## Meta

- Sector: Admin / Settlements / Hardening
- Owner: TUGOL Product Owner
- Date: 2026-02-20
- Status: Completed (S1~S4 Done)

## 1. Scope

- Goal:
  - `/admin/settlements*` 경로의 인증/데이터 접근 경로를 v1 공통 패턴으로 정렬한다.
- Non-Goal:
  - 정산 계산 로직 변경
  - 정산 UI 리디자인
  - 정산 상태 머신 변경
- In Scope:
  - S1: settlements list/new/detail 페이지에 `requireAdminAccess` 가드 적용
  - S2: 페이지/server action에서 global `createClient` 제거
  - S3: `createSupabaseAdminClientOptional() -> createSupabaseServerClient()` 경로 통일
  - S4: lint/build + 주요 런타임 경로 점검

## 2. As-Is / To-Be

- As-Is:
  - settlements 관련 페이지/액션이 전역 service-role client에 의존한다.
  - 페이지 레벨 인증 가드가 없어 비로그인 접근 제어가 일관되지 않다.
- To-Be:
  - 관리자 가드가 경로 진입 전에 적용된다.
  - 데이터 접근 경로가 다른 admin 섹터와 동일 패턴으로 정렬된다.

## 3. Data Design

- Tables/Views:
  - `settlements`, `settlement_summary`, `reservations`, `golf_clubs`, `users`
- Migration Plan:
  - 없음 (이전 섹터에서 스키마 복구 완료)

## 4. API/Action Design

- 대상:
  - `app/admin/settlements/page.tsx`
  - `app/admin/settlements/new/page.tsx`
  - `app/admin/settlements/[id]/page.tsx`
  - `app/admin/settlements/actions.ts`
- 계약:
  - 기존 request/response 스키마 유지

## 5. Auth / RBAC / RLS

- Roles:
  - `SUPER_ADMIN`, `ADMIN` (페이지 진입)
  - 개별 액션 권한(`requireClubAccess`, `requireSuperAdminAccess`)은 기존 유지
- Access Policy:
  - 비로그인: `/login?redirect=...`
  - 권한 없음: `/forbidden`

## 6. Failure & Edge Cases

- Failure Modes:
  - admin client env 누락
  - relation query 실패
  - settlement id 미존재
- Mitigation:
  - admin client optional + server client fallback
  - 기존 빈결과/null fallback UI 유지

## 7. QA / Acceptance Criteria

- AC:
  - [x] settlements 페이지 3개에 admin 가드가 적용된다.
  - [x] settlements server action global client 의존이 제거된다.
  - [x] `/admin/settlements`, `/admin/settlements/new`가 200 응답한다.
  - [x] `npm run lint`, `npm run build` 통과

## 8. Rollout / Rollback

- Deployment Order:
  - S2(actions) -> S1(pages) -> S4(QA)
- Rollback:
  - 대상 파일 revert

## 9. Dependencies / Risks

- Dependencies:
  - `requireAdminAccess`, `createSupabaseAdminClientOptional`, `createSupabaseServerClient`
- Risks:
  - 기존 강한 service-role 경로 제거 후 권한 부족 시 일부 쿼리 결과 축소 가능
- Mitigation:
  - admin client optional 우선 사용으로 기존 운영성과 유지

## 10. Approval

- Approved By: Product Owner ("resume" 지시)
- Approved At: 2026-02-20
- Notes:
  - `/admin/settlements/non-existent-id` 검증 시 UUID 형식 오류 로그는 출력되지만, 페이지는 안전 fallback(찾을 수 없음)으로 200 응답
