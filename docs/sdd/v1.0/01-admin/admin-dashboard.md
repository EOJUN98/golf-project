# /admin (Dashboard) SDD (v1.0)

## Summary

- 목적: 운영자가 티타임/예약/매출 상태를 “신뢰 가능한 기준”으로 빠르게 확인한다.
- 성공조건(AC):
  - 일별 매출 추이가 “0원”과 “조회 실패”를 구분한다.
  - 데이터 접근 제한(RLS/Service Role 미설정)이 있으면 경고로 명확히 드러난다.
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

## API / Server

- Read:
  - Option A) `GET /api/admin/dashboard?from=YYYY-MM-DD&to=YYYY-MM-DD&clubId=`
  - Option B) server component에서 직접 조회(단, Service Role 정책과 충돌하지 않아야 함)
- Write:
  - 티타임 상태/가격 변경: `PATCH /api/admin/tee-times`

## UI States

- loading: skeleton
- empty: “데이터가 없습니다” (0건)
- error: “조회 실패” + 원인(권한/설정/서버)
- warning: Service Role 미설정 등 “제한 모드”

