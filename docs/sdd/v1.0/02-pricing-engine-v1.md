# Pricing Engine v1.0 SDD

## Summary

- v1.0 최우선 과제는 프라이싱 엔진의 입력 데이터를 안정적으로 수집/저장/활용하는 것이다.
- 핵심 목표는 "시장 최종판매가 + 운영 메모 + 시간/날씨/시즌 특성" 기반 가격 판단이 가능하도록 만드는 것.

## Step Plan (고정)

### Step 0. /admin/crawler 분류 화면

- Route: `/admin/crawler`
- 요구사항:
  - 골프장 기준 카테고리
  - 지역 기준 카테고리
  - 필터 조합(골프장 + 지역)
- 완료 조건(AC):
  - 관리자가 타겟을 골프장/지역별로 구분해 조회할 수 있다.

### Step 1. 최종판매가 수집 (4시간 단위)

- 요구사항:
  - 외부 골프 예약 사이트 + 골프장 사이트의 최종판매가를 수집
  - 수집 주기: 4시간
  - 실패/누락 상태를 구분 저장
- 완료 조건(AC):
  - 스케줄러가 4시간마다 수집 실행
  - 가격/수집시각/출처/상태가 DB에 저장
  - 최근 수집 성공률을 admin에서 확인 가능

### Step 2. 가격 정보 옆 특성 메모 저장

- 요구사항:
  - 각 가격 행에 "간단 메모"를 붙일 수 있어야 함
  - 예: 성수기/비수기, 이벤트, 특이 공지, 현장 체감 이슈
- 완료 조건(AC):
  - 메모 입력/수정/조회 가능
  - 메모 작성자/작성시간 기록
  - 엔진 입력으로 사용할 수 있는 구조(JSON 또는 태그) 보장

### Step 3. 가격 엔진 연동

- 요구사항:
  - 엔진 입력:
    - 외부 최종판매가
    - 날씨
    - 티타임 임박도
    - 성수기/비수기
    - 메모 특성
  - 엔진 출력:
    - 추천 최종가
    - 반영 근거(factors)
    - 차단/예외 여부
- 완료 조건(AC):
  - `/api/pricing` 또는 엔진 경유 경로에서 위 입력을 실제 사용
  - 응답에 근거(factors)가 포함되어 관리자 검증 가능

#### Step 3 구현 상태 (2026-02-19)

- 반영 완료:
  - `MARKET_PRICE`와 함께 `manual_note.traits` 기반 factor 반영
  - 반영 factor:
    - `TRAIT_PEAK_SEASON` (할인 일부 복원)
    - `TRAIT_OFF_SEASON` (추가 할인)
    - `TRAIT_EVENT` (추가 할인)
    - `TRAIT_LOW_DEMAND` (추가 할인)
  - `/api/pricing` 응답의 `marketReference`에 아래 검증 필드 노출:
    - `manualNote`
    - `manualTraits`
    - `manualNoteUpdatedAt`
    - `manualNoteUpdatedByEmail`

## Data Contract (v1.0 최소)

- `external_price_snapshots`:
  - `course_name`, `play_date`, `final_price`, `crawled_at`, `availability_status`
- 추가 필요(신규/확장):
  - `source_type` (예약사이트/골프장사이트)
  - `region` (조회 필터용)
  - `note` or `traits` (운영 메모)
  - `note_author`, `note_updated_at`

## Ops / Monitoring

- 크롤러 실패율, 최신 수집 시각, 사이트별 상태를 `/admin/crawler`에서 확인
- 4시간 스케줄 실패 시 수동 재실행 버튼 제공
