# v0 Gap Backlog (Input -> v1.0 SDD)

아래는 v0에서 구현되지 않았거나 불완전한 항목을 v1.0 스펙으로 흡수하기 위한 백로그다.

## Intake Format (복붙해서 항목별로 채우기)

```text
[ID] (예: ADMIN-001)
- 위치(Route/화면): (예: /admin)
- 현재 문제(As-Is):
- 목표 동작(To-Be):
- 중요도(P0/P1/P2):
- 영향(사용자/매출/운영):
- 관련 데이터(테이블/필드):
- 권한(누가 할 수 있어야 하는가):
- 완료 조건(AC):
- 메모/스크린샷/로그:
```

## Items

- [PRICING-001] `/admin/crawler` 골프장/지역 카테고리 분류 미완성
  - 위치(Route/화면): `/admin/crawler`
  - 현재 문제(As-Is): 수집 데이터가 운영 관점에서 카테고리 분류/필터링이 약함
  - 목표 동작(To-Be): 골프장/지역 기준 필터를 제공하고 운영자가 타겟을 구분 관리
  - 중요도(P0/P1/P2): P0
  - 영향(사용자/매출/운영): 매출, 운영
  - 관련 데이터(테이블/필드): `external_price_targets`, `external_price_snapshots`, `region`
  - 권한(누가 할 수 있어야 하는가): SUPER_ADMIN, ADMIN
  - 완료 조건(AC): 필터 조합 조회 가능, 카테고리별 목록 확인 가능

- [PRICING-002] 외부 최종판매가 4시간 단위 수집 안정화 미완성
  - 위치(Route/화면): crawler job + `/admin/crawler`
  - 현재 문제(As-Is): 수집 주기/성공률 관리가 명확하지 않음
  - 목표 동작(To-Be): 4시간 단위 자동 수집 + 실패 상태/재시도 관리
  - 중요도(P0/P1/P2): P0
  - 영향(사용자/매출/운영): 매출, 운영
  - 관련 데이터(테이블/필드): `external_price_snapshots.final_price`, `crawled_at`, `availability_status`
  - 권한(누가 할 수 있어야 하는가): SUPER_ADMIN, ADMIN
  - 완료 조건(AC): 4시간 단위 실행, 최신 수집 시각/성공여부가 admin에 표시

- [PRICING-003] 가격 정보별 특성 메모 저장 기능 미완성
  - 위치(Route/화면): `/admin/crawler`
  - 현재 문제(As-Is): 가격 맥락(성수기/이벤트/현장상황)을 남길 수 없음
  - 목표 동작(To-Be): 가격 행 옆에 운영 메모 입력/수정/저장
  - 중요도(P0/P1/P2): P0
  - 영향(사용자/매출/운영): 매출, 운영
  - 관련 데이터(테이블/필드): `external_price_snapshots.note(or traits)`, `note_author`, `note_updated_at`
  - 권한(누가 할 수 있어야 하는가): SUPER_ADMIN, ADMIN
  - 완료 조건(AC): 메모 저장 후 재조회 시 유지, 작성자/시간 확인 가능

- [PRICING-004] 프라이싱 엔진과 외부가격/특성 데이터 연동 미완성
  - 위치(Route/화면): `pricing engine`, `/api/pricing`
  - 현재 문제(As-Is): 엔진이 외부 최종판매가와 운영 메모를 충분히 반영하지 못함
  - 목표 동작(To-Be): 외부가격 + 날씨 + 임박도 + 성수기/비수기 + 메모 특성 기반 가격 판단
  - 중요도(P0/P1/P2): P0
  - 영향(사용자/매출/운영): 매출
  - 관련 데이터(테이블/필드): `tee_times`, `weather_cache`, `external_price_snapshots`, 메모 필드
  - 권한(누가 할 수 있어야 하는가): 시스템 로직 (관리자는 결과 확인)
  - 완료 조건(AC): 가격 결과에 근거(factors) 노출, 운영자가 검증 가능

- [ADMIN-001] Admin 티타임 추가/수정 DB 반영 신뢰도 보강 필요
  - 위치(Route/화면): `/admin/tee-times`
  - 현재 문제(As-Is): 화면 동작과 DB 반영 보장이 약한 구간이 존재
  - 목표 동작(To-Be): admin에서 생성/수정한 티타임이 DB에 즉시 반영되고 재조회 일치
  - 중요도(P0/P1/P2): P0
  - 영향(사용자/매출/운영): 운영, 매출
  - 관련 데이터(테이블/필드): `tee_times`, `updated_by`, `updated_at`
  - 권한(누가 할 수 있어야 하는가): SUPER_ADMIN, ADMIN, CLUB_ADMIN(자기 클럽)
  - 완료 조건(AC): 생성/수정 후 DB row와 UI 데이터 일치, BOOKED 수정 거부 서버 보장
