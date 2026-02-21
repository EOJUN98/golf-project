# v1.0 Project Spec

## Versioning

- 현재 구현 상태는 `v0`로 간주한다.
- `v1.0` 개발은 본 문서(및 하위 SDD) 스펙을 기준으로만 진행한다.

## Goals (To Fill)

- [x] 프라이싱 엔진 v1 완성 (최우선)
  - 외부 최종판매가 4시간 단위 수집
  - 특성 메모 저장
  - 엔진 연동으로 추천가/근거 출력
- [x] Admin 티타임 관리 신뢰도 확보
  - 관리자 화면에서 티타임 추가/수정
  - 변경 내용 DB 반영 보장

## Non-Goals (To Fill)

- [ ] 사용자향 UI 대규모 리디자인
- [ ] 알림/마케팅 자동화 확장

## Definitions (To Fill)

- 타임존 기준: `Asia/Seoul` (KST)
- 매출(Revenue) 정의: 우선 `reservations.final_price` 기반 집계, 환불 반영 규칙은 Admin 정산 스펙에서 고정
- 예약 상태 머신: `PENDING/PAID/CANCELLED/REFUNDED/NO_SHOW/COMPLETED`
- 가격(프라이싱) 정의:
  - 필수 입력: 외부 최종판매가, 날씨, 티타임 임박도, 성수기/비수기, 운영 메모 특성
  - 출력: 추천 최종가 + 근거(factors) + 차단/예외 여부

## Environments (To Fill)

- dev: 로컬/개발
- stage: v1 사전검증 (배포 전 운영 리허설)
- prod: 실서비스

## Security / Data Access Policy (To Fill)

- Admin UI에서 클라이언트 직결 write 허용 여부: 허용하지 않음 (서버 경유만)
- Service Role 사용 범위:
  - admin 집계/운영성 write/API에 한정
  - 사용자 일반 화면 read/write에는 사용 금지
