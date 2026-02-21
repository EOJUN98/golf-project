# Sector Design Gate - Admin Dashboard (v1.0)

## Meta

- Sector: Admin / Dashboard
- Owner: TUGOL Product Owner
- Date: 2026-02-19
- Status: Completed (D1~D3 Done)

## 1. Scope

- Goal:
  - `/admin` 대시보드에서 매출 추이와 AI 프라이싱 상태를 신뢰 가능한 운영 지표로 표시한다.
- Non-Goal:
  - 대시보드 전체 UI 리디자인
  - 신규 대시보드 전용 DB 테이블 추가
- In Scope:
  - D1: 일별 매출 추이 데이터 생성 로직 보강 (KST 일자 정규화, recent window, 오류/빈데이터 분리)
  - D2: AI Pricing Engine 상태를 실계산 기반 헬스 정보로 표시
  - D3: 티타임 PATCH 실패 메시지 표시 개선
- Out of Scope:
  - 예약/정산 도메인의 비즈니스 규칙 변경

## 2. As-Is / To-Be

- As-Is:
  - 매출 차트는 단순 합산이며, 빈 데이터와 조회 실패를 UI에서 명확히 분리하지 못함
  - AI Pricing Engine 카드가 정적 문구로만 표시됨
  - PATCH 실패 시 사용자 메시지가 `Request failed` 수준으로 제한됨
- To-Be:
  - 최근 N일(KST) 일자별 매출 시계열과 오류/빈데이터 상태를 구분해 표기
  - 엔진 계산 가능 여부를 샘플 티타임 기반 헬스로 노출
  - API 에러 코드/메시지를 대시보드 티타임 관리에서 그대로 반영

## 3. Data Design

- Tables/Fields:
  - `reservations.final_price`, `reservations.created_at`
  - `tee_times.*`
  - `weather_cache.*` (엔진 헬스 샘플 계산 시 사용)
- Constraints/Indexes:
  - 기존 스키마 유지, 신규 인덱스/DDL 없음
- Migration Plan:
  - 없음
- Backfill Plan:
  - 없음 (조회 시 계산)

## 4. API Design

- Endpoints:
  - 신규 API 없음 (server component + 기존 `/api/admin/tee-times` 사용)
- Request Schema:
  - 기존 PATCH payload 유지
- Response Schema:
  - 기존 PATCH `{ success, error: { code, message } }` 해석 강화
- Error Codes:
  - `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `INTERNAL_ERROR`

## 5. Auth / RBAC / RLS

- Roles:
  - SUPER_ADMIN, ADMIN, CLUB_ADMIN
- Access Matrix:
  - 대시보드 진입은 admin console 권한 필요
- Service Role Usage:
  - 집계/전체 조회는 service-role available 시 우선 사용, 미사용 시 경고 표시

## 6. Failure & Edge Cases

- Failure Modes:
  - reservations 조회 실패
  - 티타임/날씨 데이터 없음으로 엔진 샘플 계산 불가
  - PATCH 에러 객체 포맷 불일치
- Retry/Timeout:
  - UI 새로고침
- Idempotency:
  - 대시보드 read 집계는 조회 재실행 시 동일 조건에서 동일 결과
- Timezone/Date rules:
  - 일별 매출 집계는 KST date 기준

## 7. QA / Acceptance Criteria

- AC:
  - [x] D1: 차트 데이터가 최근 N일 기준으로 생성되고 오류/빈데이터가 구분 표기됨
  - [x] D2: AI Pricing Engine 카드에 실계산 기반 상태가 표시됨
  - [x] D3: PATCH 실패 시 API 에러 메시지가 사용자에게 표시됨
- Manual QA Checklist:
  - [x] `/admin` 200 렌더링 확인
  - [x] 매출 추이 섹션에서 `error / empty / data` 상태 확인
  - [x] 티타임 상태/가격 수정 실패 메시지 확인
- Automated Test Plan:
  - `npm run lint`
  - `npm run build`

## 8. Rollout / Rollback

- Deployment Order:
  - D1 → D2 → D3 → QA
- Monitoring:
  - 대시보드 경고 배너, 서버 로그
- Rollback Strategy:
  - `app/admin/page.tsx`, `components/AdminDashboardNew.tsx` 변경 revert

## 9. Dependencies / Risks

- Dependencies:
  - `utils/pricingEngine.ts` 계산 로직 안정성
  - `reservations.final_price` 데이터 품질
- Risks:
  - 집계 기준 변경 시 기존 수치와 운영 인식 차이 발생 가능
- Mitigation:
  - 현행 기준(예약 final_price 합산) 유지 + 상태/오류를 명시

## 10. Approval

- Approved By: Product Owner ("진행해" 지시)
- Approved At: 2026-02-19
- Notes:
  - 본 섹터는 게이트 승인 후 구현 진행
  - 구현 요약:
    - `app/admin/page.tsx`에서 KST 기준 최근 14일 매출 시계열 및 revenue 상태(`ok|empty|error`) 생성
    - 엔진 상태를 샘플 티타임 실계산(`calculatePricing`) 결과로 생성해 UI에 전달
    - `components/AdminDashboardNew.tsx`에서 상태별 렌더링 및 PATCH 에러 메시지 파싱 개선
  - 검증:
    - `/admin` 200 확인
    - 렌더링 텍스트 확인: `일별 매출 추이 (최근 14일)`, `샘플 티타임 ID`
    - PATCH validation 에러 응답: `id는 양의 정수여야 합니다.`
