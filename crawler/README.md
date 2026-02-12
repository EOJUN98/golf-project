# TUGOL Price Crawler (Independent Service)

이 디렉터리는 메인 Next.js 앱과 분리된 **독립 크롤러 프로젝트**입니다.
가격 로직 기준 데이터를 수집/저장하는 전용 시스템으로 운영합니다.

## 목적
- 외부 골프 예약 채널의 최종가 수집
- 9슬롯 샘플링(1/2/3부 × 이른/중간/늦은)
- 수집 시점 라벨 관리
  - `WEEK_BEFORE`
  - `TWO_DAYS_BEFORE`
  - `SAME_DAY_MORNING`
  - `IMMINENT_3H`

## 실행
```bash
cd crawler
npm install
npm run install:browser
```

환경 변수 파일 생성:
```bash
cp .env.local.example .env.local
```

타깃 등록:
```bash
npm run target:add -- \
  --site=teeupnjoy \
  --course='360도' \
  --url='https://www.teeupnjoy.com/hp/join/reslist.do' \
  --adapter=teeupnjoy_api \
  --platform=WEB \
  --config='{"club_id":3,"join_type":"join"}'
```

기본 타깃(teeupnjoy/golfrock/golfpang/golfmon/smartscore) 자동 등록:
```bash
npm run target:seed
```
주의: `teeupnjoy`는 `parser_config.club_ids` 값이 실제 운영 매핑으로 갱신되어야 전량 수집이 가능합니다.

TeeupNJoy `club_ids` 자동 발굴:
```bash
npm run teeup:discover -- --from=1 --to=500 --date=2026-02-19
```
발견된 club_ids를 타깃 parser_config에 즉시 반영:
```bash
npm run teeup:discover -- --from=1 --to=500 --write-site=teeupnjoy
# 또는 --write-target-id=1
```

크롤링 실행:
```bash
npm run crawl -- --dry-run
npm run crawl -- --window=WEEK_BEFORE
```

## 루트 앱과의 관계
루트 `package.json`의 아래 스크립트는 이 프로젝트를 호출만 합니다.
- `npm run crawl:prices`
- `npm run crawl:target:add`
- `npm run crawl:target:seed`
- `npm run crawl:teeup:discover`

즉, 앱 코드와 크롤러 실행/의존성은 분리되어 관리됩니다.

## 자동 실행 (GitHub Actions)
워크플로우 파일: `.github/workflows/crawler-ingest.yml`

필수 Repository Secrets:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

동작:
- 매시 13분(UTC) 자동 실행
- `target:seed`로 타깃 보정 후 크롤링
- 00:13 UTC에는 `teeup:discover`도 함께 실행
- 수동 실행(`workflow_dispatch`)에서 단일 윈도우 실행 가능
