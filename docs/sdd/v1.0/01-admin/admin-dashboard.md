# /admin (Dashboard) SDD (v1.0)

## Summary

- 목적: 운영자가 티타임/예약/매출 상태를 “신뢰 가능한 기준”으로 빠르게 확인한다.
- 성공조건(AC):
  - 일별 매출 추이가 최근 14일(KST) 기준으로 표시되고, “0건(empty)”과 “조회 실패(error)”를 구분한다.
  - 데이터 접근 제한(RLS/Service Role 미설정)이 있으면 경고로 명확히 드러난다.
  - AI Pricing Engine 상태가 정적 문구가 아니라 샘플 티타임 실계산 결과로 표시된다.
  - 티타임 변경(가격/상태)은 서버 검증을 거쳐 일관되게 반영된다.

## Roles / Permissions

- SUPER_ADMIN: 전체 지표/전체 수정 가능
- ADMIN: (작성 필요)
- CLUB_ADMIN: (작성 필요)

## Data

- Sources:
  - tee_times
  - reservations
  - users (optional)
- Revenue Definition: `docs/sdd/v1.0/00-project.md`에 정의된 기준을 따른다.
- Timezone: `docs/sdd/v1.0/00-project.md`에 정의된 기준을 따른다.
- Revenue Chart Window:
  - 최근 14일(KST)
  - `reservations.created_at`을 KST date로 변환해 일자별 `final_price` 합산
  - 상태:
    - `ok`: 데이터 존재
    - `empty`: 최근 14일 데이터 없음
    - `error`: reservations 조회 실패

## API / Server

- Read:
  - Option A) `GET /api/admin/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD&clubId=`
  - Option B) server component에서 직접 조회(단, Service Role 정책과 충돌하지 않아야 함)
- Write:
  - 티타임 상태/가격 변경: `PATCH /api/admin/tee-times`
- Pricing Engine Health:
  - server component에서 샘플 티타임 1건을 선택해 `calculatePricing` 실행
  - 결과 상태를 `healthy|degraded|unavailable`로 대시보드 카드에 노출

## UI States

- loading: skeleton
- empty: “데이터가 없습니다” (0건)
- error: “조회 실패” + 원인(권한/설정/서버)
- warning: Service Role 미설정 등 “제한 모드”
- chart:
  - `error`: 실패 메시지 표시
  - `empty`: 14일 0원 막대 차트 + “최근 14일 예약 데이터가 없습니다.” 안내문
  - `ok`: 막대 차트 렌더링
