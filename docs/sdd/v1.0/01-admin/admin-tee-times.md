# /admin/tee-times SDD (v1.0)

## Summary

- 목적: 골프장별 티타임을 날짜 기준으로 생성/수정/차단하고, 운영 실수를 줄인다.
- 성공조건(AC):
  - 클럽/날짜 필터가 안정적으로 동작(타임존 이슈로 하루 밀림 없음)
  - BOOKED 티타임은 서버에서 수정/차단이 거부된다
  - 변경은 모두 감사필드(updated_by/updated_at)와 함께 기록된다

## Roles / Permissions

- SUPER_ADMIN: 전체 클럽 관리
- ADMIN: 전체 클럽 관리(정책 확정 필요)
- CLUB_ADMIN: 본인 클럽만 관리

## Data

- Tables:
  - tee_times
  - golf_clubs
  - club_admins (권한)
- Date Handling:
  - UI는 `YYYY-MM-DD` 문자열로 필터를 유지한다.
  - 서버는 KST 기준으로 start/end 범위를 계산한다.

## API / Server Actions

- Read:
  - `getAccessibleGolfClubs()`
  - `getTeeTimes(golfClubId, dateYmd)`
- Write:
  - `createTeeTime()`
  - `updateTeeTime()`
  - `blockTeeTime()`
  - `unblockTeeTime()`

## UI States

- loading: clubs/teeTimes 로딩 분리
- empty: “선택한 날짜에 티타임이 없습니다”
- error: 권한/설정/서버 에러 메시지 표준화

