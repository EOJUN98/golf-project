# Sector Design Gate - Pricing Crawler (v1.0)

## Meta

- Sector: Pricing / Crawler
- Owner: TUGOL Product Owner
- Date: 2026-02-19
- Status: Completed (C1~C5 Done)

## 1. Scope

- Goal:
  - 외부 최종판매가를 4시간 단위로 안정 수집하고, Admin에서 카테고리/메모 기반 운영이 가능하도록 만든다.
- Non-Goal:
  - 사용자향 UI 리디자인
  - 신규 크롤러 플랫폼 대규모 확장
- In Scope:
  - C1: GitHub Actions 워크플로우 GOLFROCK env 반영
  - C2: TeeupNJoy club discovery 실행/검증
  - C3: 임시 테스트 스크립트 정리
  - C4: 전체 window 크롤링 검증
  - C5: `/admin/crawler` UI 확인
- Out of Scope:
  - 가격 가중치 고도화 튜닝(후속 섹터)

## 2. As-Is / To-Be

- As-Is:
  - crawler core는 존재하나 운영 파이프라인(C1~C5) 일부 미완료
  - golfrock 테스트용 임시 스크립트가 잔존
- To-Be:
  - 4시간 cron 기반 수집 파이프라인이 운영 가능한 상태
  - admin/crawler에서 수집 결과 확인 가능

## 3. Data Design

- Tables/Fields:
  - `external_price_targets`
  - `external_price_snapshots`
  - `external_course_regions`
- Constraints/Indexes:
  - 기존 인덱스 유지, 신규 DDL 없음 (이번 단위)
- Migration Plan:
  - 없음
- Backfill Plan:
  - C4 실행 결과로 최근 window 데이터 적재

## 4. API Design

- Endpoints:
  - 기존 `/api/admin/crawler/*` 및 crawler 스크립트 사용
- Request Schema:
  - 기존 구현 유지
- Response Schema:
  - 기존 구현 유지
- Error Codes:
  - 기존 구현 유지

## 5. Auth / RBAC / RLS

- Roles:
  - SUPER_ADMIN, ADMIN
- Access Matrix:
  - crawler 실행/운영은 관리자 권한
- Service Role Usage:
  - crawler 적재 및 admin read 경로에서 허용

## 6. Failure & Edge Cases

- Failure Modes:
  - 외부 사이트 인증 실패, 네트워크 실패, 일부 타겟 실패
- Retry/Timeout:
  - 워크플로우 재실행 + window별 재실행
- Idempotency:
  - snapshot은 수집 시점 기준 append
- Timezone/Date rules:
  - 수집 window 기준은 기존 crawler 규칙 유지

## 7. QA / Acceptance Criteria

- AC:
  - [x] C1 반영
  - [x] C2 실행/검증 (HTTP direct discovery로 대체, teeup club_ids 14개 반영)
  - [x] C3 정리
  - [x] C4 실행/검증 (4개 window 재실행 및 DB 적재 확인)
  - [x] C5 UI 확인 (`/admin/crawler` 200 렌더링 + 핵심 지표 노출 확인)
- Manual QA Checklist:
  - [x] workflow env 주입 확인
  - [x] discovery 결과 확인 (`external_price_targets.parser_config.club_ids_count=14`)
  - [x] 4개 window 실행 로그 확인 (`crawl-final-prices.mjs`)
  - [x] DB 적재 확인 (SQL: recent snapshots by site/window)
  - [x] `/admin/crawler` 렌더링 확인 (title/카운터/지역 탭/코스 리스트)
  - [x] check 스크립트 통과
- Automated Test Plan:
  - `npm --prefix crawler run check`

## 8. Rollout / Rollback

- Deployment Order:
  - C1 → C2 → C3 → C4 → C5
- Monitoring:
  - workflow 실행 로그, `report:health` (환경 fetch 실패 시 SQL 검증으로 대체)
- Rollback Strategy:
  - workflow/env 변경 원복, 테스트 스크립트 복구는 git revert

## 9. Dependencies / Risks

- Dependencies:
  - GitHub Secrets (`GOLFROCK_LOGIN_ID`, `GOLFROCK_LOGIN_PW`)
  - 외부 사이트 접속 가능성
- Risks:
  - 외부 사이트 구조 변경
- Mitigation:
  - 실패 상태 저장, 수동 재실행, adapter 보수

## 10. Approval

- Approved By: Product Owner ("진행" 지시)
- Approved At: 2026-02-19
- Notes:
  - 본 섹터는 게이트 승인 후 구현 진행
  - C2: Playwright `SIGTRAP` 이슈를 우회하기 위해 `discover-teeup-club-ids.mjs`를 direct HTTP 방식으로 전환
  - C4: 2026-02-19 실행 결과
    - `WEEK_BEFORE` rows=17
    - `TWO_DAYS_BEFORE` rows=20
    - `SAME_DAY_MORNING` rows=2
    - `IMMINENT_3H` rows=6
  - C5: 검증 중 확인된 DEMO_MODE 인증 경로 오류(`users.segment_type` 조회) 수정 후 UI 확인 완료
