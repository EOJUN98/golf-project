# v1.0 Priority Update (Owner Direction)

## Priority Order

1. 프라이싱 엔진
2. Admin 페이지 정비 (특히 티타임 관리)

## Execution Rule

- 위 우선순위 섹터라도 구현 전에 `docs/sdd/v1.0/SECTOR-WORKFLOW.md`의 게이트를 먼저 완료해야 한다.
- 승인 전 구현 금지.

## Pricing Engine v1 Scope

- Step 0: `/admin/crawler`에서 골프장/지역 카테고리 분류
- Step 1: 외부 최종판매가 수집 (4시간 단위)
- Step 2: 가격 정보별 특성 메모 저장
- Step 3: 가격 엔진 연동

상세 스펙은 `docs/sdd/v1.0/02-pricing-engine-v1.md`를 따른다.

## Admin Scope (pricing 이후)

- `/admin/tee-times`에서 티타임 추가/수정 가능
- admin 설정값이 DB(`tee_times`)에 확실히 반영되어야 함

상세 스펙은 `docs/sdd/v1.0/01-admin/admin-tee-times.md`를 따른다.
