# /admin/crawler SDD (v1.0)

## Summary

- 목적: 프라이싱 엔진 입력 데이터(외부 최종판매가)를 운영자가 카테고리 단위로 확인/관리한다.
- 우선순위: P0 (v1.0 최우선 프라이싱 엔진의 Step 0~2 담당)

## Core Requirements

1. 골프장 카테고리 분류
2. 지역 카테고리 분류
3. 4시간 단위 수집 상태 확인
4. 가격 행별 특성 메모 저장/수정

## Data

- 주 테이블:
  - `external_price_targets`
  - `external_price_snapshots`
- 메모 저장 구조:
  - `external_price_snapshots.payload.manual_note`
    - `text: string | null`
    - `traits: string[]`
    - `updated_at: ISO string`
    - `updated_by: string`
    - `updated_by_email: string | null`

## API

- `GET /api/admin/crawler/snapshots?courseName=<name>&limit=<n>`
  - 최근 스냅샷 행 + `manualNote` 반환
- `PATCH /api/admin/crawler/snapshots`
  - body: `{ snapshotId, note?, traits? }`
  - 스냅샷 행의 `payload.manual_note` 생성/수정/삭제
- `POST /api/admin/crawler/run` (수동 실행)
  - body: `{ targetIds?: number[] }`
  - 응답: `{ total, succeeded, noData, authRequired, failed, siteBreakdown[], errors[], executedAt }`
- `GET /api/cron/crawl-prices` (자동 실행 엔트리)
  - `Authorization: Bearer <CRON_SECRET>` 필요
  - 내부적으로 request origin 기반으로 `/api/admin/crawler/run` 호출

## UI States

- loading: 수집 결과/카테고리 로딩
- empty: 조회 조건에 해당 데이터 없음
- error: 수집 실패/권한/서버 에러
- success: 가격 + 특성 메모 + 최신 수집 시각 표시

## Acceptance Criteria

- 골프장/지역/날짜/상태 필터 조합으로 조회 가능
- 최근 4시간 이내 수집 여부를 명확히 표시
- 메모 저장 후 재조회 시 동일하게 보존
- 수동 실행 버튼으로 크롤링 실행 결과(전체/성공/데이터없음/실패)를 확인 가능
- 수동 실행 결과에 사이트별 집계(`siteBreakdown`)가 노출되어 원인 구분이 가능
