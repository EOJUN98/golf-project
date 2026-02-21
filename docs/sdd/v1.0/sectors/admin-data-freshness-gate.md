# Sector Design Gate - Admin Data Freshness (v1.0)

## Meta

- Sector: Admin / Data Freshness (tee_times, weather_cache)
- Owner: TUGOL Product Owner
- Date: 2026-02-20
- Status: Completed (F1~F4 Done)

## 1. Scope

- Goal:
  - 미래 OPEN 티타임/날씨 데이터가 비어 대시보드와 프라이싱이 무력화되는 상태를 방지한다.
- Non-Goal:
  - 예약/매출 샘플 데이터 인위적 생성
  - 프라이싱 알고리즘 자체 변경
- In Scope:
  - F1: `seedCoreData`를 "최초 1회 seed"에서 "미래 N일 top-up" 방식으로 변경
  - F2: 기존 stale DB(미래 OPEN=0) 즉시 복구를 위한 one-off 실행
  - F3: 운영자가 settings 화면의 기존 seed 버튼으로 재실행 가능한 흐름 유지
- Out of Scope:
  - 예약 생성 로직 자동화
  - 크롤러 파이프라인 구조 변경

## 2. As-Is / To-Be

- As-Is:
  - `tee_times`/`weather_cache`가 과거 데이터만 있어도 기존 seed는 "테이블이 비어있지 않음"으로 종료
  - `/api/pricing`은 미래 OPEN 티타임이 0이면 정상(200)이어도 `data: []`
  - `/admin` 매출/엔진 상태가 사용자 관점에서 "작동안함"으로 인식됨
- To-Be:
  - seed 실행 시 항상 미래 14일 기준 누락 슬롯만 보충(중복 삽입 없음)
  - 운영자는 `/admin/settings`에서 동일 버튼으로 데이터 신선도 회복 가능

## 3. Data Design

- Tables/Fields:
  - `tee_times(golf_club_id, tee_off, base_price, status, updated_by)`
  - `weather_cache(target_date, target_hour, pop, rn1, wsd)`
- Constraints/Indexes:
  - 기존 스키마 유지, 신규 DDL 없음
- Migration Plan:
  - 앱 코드 변경 + 원격 one-off 데이터 보충 SQL 실행
- Backfill Plan:
  - KST 기준 오늘~+13일 범위 누락 데이터만 삽입

## 4. API Design

- Endpoints:
  - 기존 `app/admin/settings/actions.ts`의 `seedCoreData` 재사용
- Request Schema:
  - 기존 form action 유지
- Response Schema:
  - redirect message에 보충된 row 수 반영
- Error Codes:
  - 기존 `FORBIDDEN`, `SEED_DISABLED`, DB 에러 메시지 유지

## 5. Auth / RBAC / RLS

- Roles:
  - SUPER_ADMIN만 실행 가능 (기존 정책 유지)
- Access Matrix:
  - ADMIN/CLUB_ADMIN 실행 불가
- Service Role Usage:
  - settings seed는 service-role client 사용(기존과 동일)

## 6. Failure & Edge Cases

- Failure Modes:
  - golf_club 미존재
  - future range 조회 실패
  - insert 충돌/실패
- Retry/Timeout:
  - 동일 액션 재실행 가능 (idempotent top-up)
- Idempotency:
  - existing key(date+time/date+hour) 존재 시 skip
- Timezone/Date rules:
  - 모든 horizon 계산은 `Asia/Seoul` 기준

## 7. QA / Acceptance Criteria

- AC:
  - [x] F1: seed 실행 시 미래 14일 tee_times 누락 슬롯이 채워진다
  - [x] F2: seed 실행 시 미래 14일 weather_cache 누락 hour가 채워진다
  - [x] F3: 동일 액션 재실행 시 중복 데이터 폭증 없이 안정 동작한다
  - [x] F4: `/api/pricing?limit=5`가 미래 OPEN 존재 시 빈 배열이 아니게 된다
- Manual QA Checklist:
  - [x] DB: `open_future_tee_times > 0` 확인
  - [x] DB: 미래 14일 weather row 존재 확인
  - [x] one-off 복구 SQL 실행 결과 확인 (`+126 tee_times`, `+140 weather_cache`)
  - [x] `/api/pricing` 응답 데이터 확인
- Automated Test Plan:
  - [x] `npm run lint`
  - [x] `npm run build`

## 8. Rollout / Rollback

- Deployment Order:
  - F1 코드 반영 → F2 one-off 복구 → F3 검증
- Monitoring:
  - `/api/pricing` 데이터 개수
  - admin settings 실행 후 메시지/오류
- Rollback Strategy:
  - `app/admin/settings/actions.ts` 변경 revert
  - one-off insert 데이터는 필요 시 수동 정리

## 9. Dependencies / Risks

- Dependencies:
  - `SUPABASE_SERVICE_ROLE_KEY` 설정
  - `golf_clubs` 최소 1개 존재
- Risks:
  - 운영 환경에서 seed 실행 오남용 시 데이터 과다 생성
- Mitigation:
  - SUPER_ADMIN 제한 유지
  - top-up idempotent 로직으로 중복 삽입 최소화

## 10. Approval

- Approved By: Product Owner ("다음거부터 진행해")
- Approved At: 2026-02-20
- Notes:
  - 본 섹터는 승인 후 구현 진행
  - 구현 요약:
    - `app/admin/settings/actions.ts`를 horizon top-up(idempotent) 방식으로 개편
    - `app/admin/settings/page.tsx` 문구를 "초기 seed"에서 "데이터 보정"으로 변경
    - `tee_times.current_price`/`currency` 스키마 정합성 반영
    - `/api/admin/tee-times` 계열 base_price 수정 시 current_price 동기화
  - 운영 복구:
    - 원격 one-off SQL 보충 실행 완료
    - 결과: 미래 OPEN 티타임 `0 -> 117`, `/api/pricing` 데이터 반환 정상화
