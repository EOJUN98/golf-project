# Sector Design Gate - Pricing Engine Traits Integration (v1.0)

## Meta

- Sector: Pricing Engine / Step 3 Traits Integration
- Owner: TUGOL Product Owner
- Date: 2026-02-19
- Status: Completed (T1~T4 Done)

## 1. Scope

- Goal:
  - crawler 메모/traits(`payload.manual_note`)를 가격 계산에 반영해 성수기/비수기/이벤트/수요 특성을 추천가 판단에 사용한다.
- Non-Goal:
  - 전면 알고리즘 교체
  - 신규 테이블 추가
  - 예약 API 동작 변경
- In Scope:
  - T1: `/api/pricing`에서 snapshot payload의 `manual_note.traits` 추출
  - T2: `calculatePricing` 입력에 traits 전달
  - T3: traits 기반 factor 적용 (`TRAIT_PEAK_SEASON`, `TRAIT_OFF_SEASON`, `TRAIT_EVENT`, `TRAIT_LOW_DEMAND`)
  - T4: 응답 `marketReference`에 메모/traits 노출(검증용)
- Out of Scope:
  - 수요율(demandRate) 실측 모델링
  - traits 자동 분류/추론

## 2. As-Is / To-Be

- As-Is:
  - 엔진은 시장가(`MARKET_PRICE`)까지만 반영하고 메모/traits는 무시한다.
- To-Be:
  - traits가 존재하면 할인/복원 factor가 계산에 반영되고, 응답 factors에서 근거 코드가 확인된다.

## 3. Data Design

- Tables/Fields:
  - `external_price_snapshots.payload.manual_note.text`
  - `external_price_snapshots.payload.manual_note.traits`
  - `external_price_snapshots.payload.manual_note.updated_at`
  - `external_price_snapshots.payload.manual_note.updated_by_email`
- Constraints/Indexes:
  - 신규 DDL 없음
  - traits 파싱은 애플리케이션 레벨에서 안전 파싱
- Migration Plan:
  - 없음
- Backfill Plan:
  - 기존 row는 traits 없음으로 간주

## 4. API Design

- Endpoints:
  - `GET /api/pricing`
- Request Schema:
  - 기존 유지 (`date`, `golfClubId`, `userDistanceKm`, `limit`)
- Response Schema:
  - `factors[]`에 `TRAIT_*` 코드 추가 가능
  - `marketReference.manualNote` / `marketReference.manualTraits` 추가
- Error Codes:
  - 기존 유지 (`status=error`)

## 5. Auth / RBAC / RLS

- Roles:
  - 공개 pricing 조회(기존 유지)
- Access Matrix:
  - `/api/pricing` 호출자는 auth 무관
- Service Role Usage:
  - market snapshot read는 admin client optional 사용(기존 정책 유지)

## 6. Failure & Edge Cases

- Failure Modes:
  - payload 구조가 비정상(JSON scalar/array)
  - traits 타입 불일치
  - 성수기/비수기 traits 동시 존재
- Retry/Timeout:
  - 기존 동작 유지
- Idempotency:
  - 동일 입력+동일 시각에서 결정적 결과
- Timezone/Date rules:
  - snapshot 매칭은 KST play_date 키 유지

## 7. QA / Acceptance Criteria

- AC:
  - [x] traits에 `이벤트`가 있으면 `TRAIT_EVENT` factor가 응답에 나타난다.
  - [x] traits에 `성수기`가 있으면 할인 일부 복원(`TRAIT_PEAK_SEASON`)이 반영된다.
  - [x] traits가 없으면 기존 계산과 동일하게 동작한다.
  - [x] `marketReference`에 manual note/traits가 노출된다.
- Manual QA Checklist:
  - [x] 임시 snapshot + traits 삽입 후 `/api/pricing` factors 확인
  - [x] 임시 snapshot 삭제 후 traits factor 미노출 확인
  - [x] payload 비정상 row가 있어도 500 없이 정상 응답
- Automated Test Plan:
  - `npm run lint`
  - `npm run build`

## 8. Rollout / Rollback

- Deployment Order:
  - T1(parse) -> T2(context) -> T3(factor) -> T4(response) -> QA
- Monitoring:
  - `/api/pricing` factors 중 `TRAIT_*` 비율
- Rollback Strategy:
  - `utils/pricingEngine.ts`, `app/api/pricing/route.ts` revert

## 9. Dependencies / Risks

- Dependencies:
  - Step2 메모 저장 API/구조(`payload.manual_note`) 완료 상태
- Risks:
  - traits 오기입으로 과할인/과복원 가능
- Mitigation:
  - factor 강도 상한 적용(보수적 3~5%)
  - 성수기/비수기 동시 입력 시 성수기 우선

## 10. Approval

- Approved By: Product Owner ("진행" 지시)
- Approved At: 2026-02-19
- Notes:
  - 본 섹터는 게이트 승인 후 구현 진행
  - 2026-02-19 QA:
    - 임시 snapshot(`source_url=qa://codex-traits-ac-20260219`)으로
      `비수기/이벤트/저수요` traits 주입 후
      `/api/pricing?golfClubId=1&date=2026-01-17&limit=1`에서
      `TRAIT_OFF_SEASON`, `TRAIT_EVENT`, `TRAIT_LOW_DEMAND` 노출 확인
    - 동일 row를 `성수기` trait로 수정 후 `TRAIT_PEAK_SEASON` 노출 확인
    - 임시 row 삭제 후 traits factor 미노출 확인
    - payload가 string JSON인 비정상 row에서도 `/api/pricing` `status=success` 확인 후 정리
