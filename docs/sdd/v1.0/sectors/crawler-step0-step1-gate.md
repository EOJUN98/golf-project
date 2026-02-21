# Sector Design Gate - Crawler Step0/Step1 (v1.0)

## Meta

- Sector: Admin Crawler / Filter + Run API + Cron + Status Panel
- Owner: TUGOL Product Owner
- Date: 2026-02-20
- Status: Completed (Step0 + 1-A + 1-B + 1-C Done, Cron Runtime Verified)

## 1. Scope

- Goal:
  - 크롤러 운영의 필수 경로(Step 0, 1-A, 1-B, 1-C)를 이번 주 내 완료한다.
- Non-Goal:
  - Step 2 메모 인라인 UX 재설계
  - 크롤러 파서 정밀도 고도화(사이트별 파싱 개선)
- In Scope:
  - Step 0: `/admin/crawler` 필터바 + 스냅샷 테이블
  - Step 1-A: `POST /api/admin/crawler/run`
  - Step 1-B: `GET /api/cron/crawl-prices` + `vercel.json` cron
  - Step 1-C: CrawlerStatusPanel + 수동 실행 버튼
- Out of Scope:
  - 가격 엔진 factor 조정
  - 예약/정산 도메인 변경

## 2. As-Is / To-Be

- As-Is:
  - 수동 수집 실행 API 부재
  - Cron 엔드포인트/스케줄 파일 부재
  - 날짜/상태 기반 서버 필터와 스냅샷 테이블 부재
  - 상단 수집 상태 패널 부재
- To-Be:
  - 운영자가 `/admin/crawler`에서 필터링과 수동 실행을 바로 수행 가능
  - 4시간 주기 자동 수집이 배포 설정(`vercel.json`)에 고정

## 3. Data Design

- Tables/Fields:
  - `external_price_targets(active, id, site_code, course_name, adapter_code, url)`
  - `external_price_snapshots(target_id, site_code, course_name, play_date, final_price, original_price, crawled_at, crawl_status, availability_status, collection_window, source_platform, error_message, payload)`
- Constraints/Indexes:
  - 기존 테이블/인덱스 유지
- Migration Plan:
  - 없음
- Backfill Plan:
  - 없음 (실행 시점부터 신규 snapshot 축적)

## 4. API Design

- Endpoints:
  - `POST /api/admin/crawler/run`
  - `GET /api/cron/crawl-prices`
- Request Schema:
  - run: `{ targetIds?: number[] }`
  - cron: Authorization Bearer 토큰
- Response Schema:
  - run: `{ success, data: { total, succeeded, noData, failed, errors[], executedAt } }`
  - cron: `{ success, executedAt, result }`
- Error Codes:
  - `FORBIDDEN`, `UNAUTHORIZED`, `VALIDATION_ERROR`, `INTERNAL_ERROR`

## 5. Auth / RBAC / RLS

- Roles:
  - 관리자만 수동 실행 가능
- Access Matrix:
  - `POST /api/admin/crawler/run`: `requireAdminAccess` 또는 `x-cron-secret` 내부 호출
  - `GET /api/cron/crawl-prices`: `Authorization: Bearer CRON_SECRET`
- Service Role Usage:
  - snapshot 집계/조회에 service role client 사용

## 6. Failure & Edge Cases

- Failure Modes:
  - crawler 프로세스 실행 실패
  - 일부 target만 실패
  - CRON_SECRET 미설정
- Retry/Timeout:
  - 수동 실행 재시도 가능
  - 각 실행 결과는 errors 배열에 누적 반환
- Idempotency:
  - 동일 시간 재실행 시 snapshot가 추가로 누적될 수 있음(정상)
- Timezone/Date rules:
  - 필터 `from/to`는 `YYYY-MM-DD`, snapshot `play_date` 기준

## 7. QA / Acceptance Criteria

- AC:
  - [x] Step 0 필터바(지역/골프장/날짜/상태) 동작 및 URL 반영
  - [x] Step 0 스냅샷 테이블 렌더(필터 결과)
  - [x] Step 1-A run API 동작, snapshot 집계 응답 반환
  - [x] Step 1-B cron API + `vercel.json` 존재
  - [x] Step 1-C 수집 상태 패널 + 수동 실행 버튼 동작
- Manual QA Checklist:
  - [x] `/admin/crawler` 200 응답 확인 (로컬 3010)
  - [x] `/api/admin/crawler/run` 실행 성공 확인 (`targetIds:[1]`, `total:1`, `noData:1`)
  - [x] cron API 미설정 상태 에러 확인 (`CRON_SECRET not configured`)
  - [x] cron API 인증 성공 시 run API 연계 확인 (`Authorization: Bearer local-cron-secret` → 200)
  - [x] 로컬 실수집 실행(`node crawler/src/crawl-final-prices.mjs --limit=3`) 후 DB에 AVAILABLE 대량 반영 확인
- Automated Test Plan:
  - [x] `npm run lint`
  - [x] `npm run build`

## 8. Rollout / Rollback

- Deployment Order:
  - run API -> cron API + vercel.json -> crawler UI
- Monitoring:
  - `/api/admin/crawler/run` 실패율
  - `/admin/crawler` 실행/조회 오류
- Rollback Strategy:
  - 신규 API route 및 UI props 변경 revert

## 9. Dependencies / Risks

- Dependencies:
  - `crawler/src/crawl-final-prices.mjs`
  - `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`
- Risks:
  - 서버 환경에서 crawler 프로세스 실행 제약 가능성
- Mitigation:
  - 실행 실패를 구조화된 에러로 반환
  - cron/run 경로를 분리해 원인 추적 용이화

## 10. Approval

- Approved By: Product Owner ("크롤러 먼저, 이번주 내 완료")
- Approved At: 2026-02-20
- Notes:
  - 구현 파일:
    - `app/admin/crawler/page.tsx`
    - `components/admin/CrawlerMonitorClient.tsx`
    - `app/api/admin/crawler/run/route.ts`
    - `app/api/cron/crawl-prices/route.ts`
    - `vercel.json`
  - 런타임 검증:
    - dev(3010)에서 `/api/admin/crawler/run` 호출 성공
    - cron 경로 `CRON_SECRET` 미설정/설정 환경 모두 검증
    - cron 내부 호출 base URL을 request origin 우선 사용하도록 보강(`localhost:3000` 고정 의존 제거)
