# Sector Design Gate - Pricing Engine Core (v1.0)

## Meta

- Sector: Pricing Engine / Core
- Owner: TUGOL Product Owner
- Date: 2026-02-19
- Status: Completed (P1~P3 Done)

## 1. Scope

- Goal:
  - 외부 시장 최종판매가를 엔진 계산에 실제 반영해 추천가의 현실 정합성을 높인다.
- Non-Goal:
  - 가격엔진 전체 알고리즘 리라이트
  - 신규 테이블/마이그레이션 추가
- In Scope:
  - P1: `calculatePricing` 입력에 시장가(`marketPrice`) 추가
  - P2: 시장가 하향 수렴 factor(`MARKET_PRICE`) 적용
  - P3: `/api/pricing`에서 market reference를 계산 전에 로드해 엔진에 전달
- Out of Scope:
  - 시즌/이벤트/수요율 고급 factor 추가

## 2. As-Is / To-Be

- As-Is:
  - `/api/pricing`가 marketReference를 응답에만 붙이고, `calculatePricing`엔 미전달
  - 엔진은 시간/날씨/VIP/LBS만 반영
- To-Be:
  - marketPrice가 존재하면 엔진에서 실제 가격 결정 factor로 사용
  - 응답의 factors에 `MARKET_PRICE` 근거가 표시

## 3. Data Design

- Tables/Fields:
  - `external_price_snapshots.course_name`, `play_date`, `final_price`, `availability_status`, `crawled_at`
  - `golf_clubs.id`, `name`
  - `tee_times.golf_club_id`, `tee_off`, `base_price`
- Constraints/Indexes:
  - 기존 스키마/인덱스 유지
- Migration Plan:
  - 없음
- Backfill Plan:
  - 없음

## 4. API Design

- Endpoints:
  - `GET /api/pricing`
- Request Schema:
  - 기존 유지 (`date`, `golfClubId`, `userDistanceKm`, `limit`)
- Response Schema:
  - 기존 유지 + `factors` 내 `MARKET_PRICE` 가능
- Error Codes:
  - 기존 유지 (`status=error` 패턴)

## 5. Auth / RBAC / RLS

- Roles:
  - 사용자/비로그인 모두 pricing 조회 가능(기존 정책 유지)
- Access Matrix:
  - 기존 `/api/pricing` 동작 유지
- Service Role Usage:
  - `external_price_snapshots` 조회 시 `createSupabaseAdminClientOptional()` 사용
  - service key 미설정 시 기존 server client로 fallback(시장가 factor 비활성)

## 6. Failure & Edge Cases

- Failure Modes:
  - market snapshot 미존재
  - course name 매칭 실패
  - market price가 null/0/비정상 값
- Retry/Timeout:
  - 기존 요청 재시도
- Idempotency:
  - 동일 입력/동일 now에서 결정적 결과
- Timezone/Date rules:
  - market 키는 KST `play_date` 기준 매칭

## 7. QA / Acceptance Criteria

- AC:
  - [x] 시장가가 낮을 때 `MARKET_PRICE` factor가 응답 factors에 노출된다.
  - [x] 시장가가 없으면 기존 로직과 동일하게 계산된다.
  - [x] 응답 `marketReference.deltaFromMarket`가 엔진 적용 후 가격 기준으로 계산된다.
- Manual QA Checklist:
  - [x] `/api/pricing` 응답에 `MARKET_PRICE` factor 확인
  - [x] market snapshot 없는 케이스에서도 500 없이 정상 응답
- Automated Test Plan:
  - `npm run lint`
  - `npm run build`

## 8. Rollout / Rollback

- Deployment Order:
  - P1(PricingContext 확장) → P2(엔진 factor) → P3(API 연동) → QA
- Monitoring:
  - `/api/pricing` 응답 factors, market delta 추이
- Rollback Strategy:
  - `utils/pricingEngine.ts`, `app/api/pricing/route.ts` 변경 revert

## 9. Dependencies / Risks

- Dependencies:
  - crawler 스냅샷 최신성/매칭 정확도
- Risks:
  - 시장가 매칭 오류 시 과할인/과소할인 가능
- Mitigation:
  - 시장가 하향 반영만 허용, 적용량 상한 적용(기준가의 20%)

## 10. Approval

- Approved By: Product Owner ("진행해" 지시)
- Approved At: 2026-02-19
- Notes:
  - 본 섹터는 게이트 승인 후 구현 진행
  - 2026-02-19 QA:
    - 임시 snapshot(`source_url=qa://codex-market-price-ac-20260219`) 삽입 후
      `/api/pricing?golfClubId=1&date=2026-01-17&limit=3`에서 `MARKET_PRICE` 및 `deltaFromMarket=10000` 확인
    - 임시 row 삭제 후 동일 date 재조회 시 `snapshotKeys=0`, `MARKET_PRICE` 미노출 확인
