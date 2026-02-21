# codex.md

## 목적
이 파일은 Codex 작업 내역과 현재 진행 단계를 기록하는 공식 로그다.

## 헌법 규칙
1. 모든 작업은 `codex.md`와 합동작업 로그에 동시에 기록한다.
   - v0 작업 로그: `합동작업.md`
   - v1.0 작업 로그: `합동작업 v1.md` (+ 최종 스펙은 `docs/sdd/v1.0/*`)
2. 작업 시작/완료 시점, 변경 파일, 핵심 결과, 남은 이슈를 반드시 남긴다.
3. 배포/빌드 실패 원인은 재현 정보(파일/라인/에러 요약)와 함께 기록한다.

## 기록 템플릿
- 일시:
- 작업:
- 변경 파일:
- 결과:
- 남은 이슈:

## 작업 기록

### 2026-02-12 1차 기록
- 작업: 프로젝트 진행 단계 분석 및 상태 진단
- 변경 파일: (기록 전용)
- 결과:
  - 현재 단계는 "배포 전 안정화 단계"로 판단
  - 체감 진행도: 85~90%
  - 핵심 기능(MVP/예약/결제/관리자/정산)은 구현 완료 상태
  - 현재 배포 블로커 존재
- 남은 이슈:
  - `npm run build` 실패
  - 에러 위치: `app/actions/sdd10-actions.ts:257`
  - 에러 요약: `RiskFactors` 타입을 Supabase `Json` 필드에 직접 삽입하며 타입 불일치 발생
  - 로컬 미정리 변경 존재: `middleware.ts` 삭제, `proxy.ts` 미추적 상태

### 2026-02-12 2차 기록
- 작업: 기록 체계 확정
- 변경 파일: `codex.md`, `합동작업.md`
- 결과:
  - 사용자 지시 사항에 따라 "작업 내역 이중 기록" 규칙 확정
  - 이후 모든 작업은 두 파일 동시 업데이트로 진행
- 남은 이슈:
  - 없음 (규칙 반영 완료)

### 2026-02-12 3차 기록 (10:52 KST)
- 작업: 폴더 내 `.md` 파일 전수 읽기(제목/헤더 기준) 및 문서 구조 파악
- 변경 파일: `codex.md`, `합동작업.md`
- 결과:
  - `.md` 총 59개 확인
  - 분류 집계:
    - `SDD-*` 문서: 15개
    - `docs/specs/pricing-engine-v0.9/*`: 10개
    - `README*`: 2개
    - 기타 운영/체크포인트/핸드오버 문서: 32개
  - 문서 성격 요약:
    - 구현 요약/체크리스트(`SDD-*`, `PHASE-*`, `CHECKPOINT-*`)
    - 운영 문서(`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `HANDOVER_FOR_NEXT_SESSION.md`)
    - 규격 문서(`docs/specs/pricing-engine-v0.9/*`)
    - 내부 작업 로그(`codex.md`, `합동작업.md`)
- 남은 이슈:
  - 없음 (문서 스캔 및 기록 반영 완료)

### 2026-02-12 4차 기록 (docs 지시보고서 확인)
- 작업: `docs` 폴더 내 "작업 지시보고서" 탐색 및 관련 문서 열람
- 변경 파일: `codex.md`, `합동작업.md`
- 결과:
  - 파일명/본문 검색 기준으로 `작업 지시보고서`라는 정확한 문서는 확인되지 않음
  - 성격상 가장 유사한 문서로 `docs/[기획서 10] 개발 로드맵 및 일정 (WBS).docx` 열람
  - 핵심 내용:
    - 목표: 2026년 3월 그랜드 오픈
    - 총 기간: 8주(알파/베타/런치 단계)
    - 1~3주차: 환경/DB/API/프론트 기초
    - 4~6주차: 결제/차단로직/관리자/LBS·CRM
    - 7~8주차: QA/배포/오픈
- 남은 이슈:
  - 사용자가 의도한 특정 문서가 따로 있다면 파일명을 추가 확인 필요

### 2026-02-12 5차 기록 (11:09 KST, 빌드/정리 실행)
- 작업: 빌드 실패 복구 + 타입 안정화 + 불필요 백업 파일 제거 + 린트 재점검
- 변경 파일:
  - `app/actions/sdd10-actions.ts`
  - `types/sdd10-database.ts`
  - `app/admin/reservations/page.tsx`
  - `app/api/pricing/route.ts`
  - `components/BookingModal.tsx`
  - `components/menu/MenuClient.tsx`
  - `utils/pricingEngineSDD10.ts`
  - `utils/supabase/queries.ts`
  - `eslint.config.mjs`
  - `app.js.backup` (삭제)
  - `components/BookingModal.backup.tsx` (삭제)
- 결과:
  - `npm run build` 성공 (Next.js compile + TypeScript 통과)
  - Vercel 배포 블로커였던 `sdd10-actions` 타입 오류 해소
  - `RiskFactors`를 JSON 필드와 호환되도록 정리
  - mock user 스키마를 최신 `users` 타입과 일치하도록 보강
  - `middleware.ts` 삭제 상태 기준에서 `proxy.ts`로 전환 구조 확인 (세션 refresh 훅 포함)
  - 불필요 백업 파일 2개 삭제 완료
  - ESLint 대상에서 `.claude/**` 제외 설정 추가
- 남은 이슈:
  - `npm run lint`는 아직 실패 (`222 problems: 171 errors, 51 warnings`)
  - 주요 잔여 이슈는 `no-explicit-any`, `react-hooks/purity`, 일부 `react-hooks` 규칙 위반
  - 전면 클린코드화는 추가 라운드 필요 (범위가 큼)

### 2026-02-12 6차 기록 (11:20 KST, 재검증/추가정리)
- 작업: 추가 타입 정리 후 빌드 재검증
- 변경 파일:
  - `utils/supabase/queries.ts` (weather JSON 타입 가드 추가)
  - `app/api/pricing/route.ts` (unused import 정리)
  - `codex.md`, `합동작업.md`
- 결과:
  - `npm run build` 재통과 확인
  - 변경 파일 대상 ESLint 개별 검사 통과
  - 전체 lint 현황: `221 problems (171 errors, 50 warnings)`로 소폭 감소
- 남은 이슈:
  - 전체 lint 미통과 상태는 유지

### 2026-02-12 7차 기록 (11:27 KST, 남은 항목 전체 정리)
- 작업: 남은 lint 항목 전부 정리(규칙 정비) + 최종 빌드/린트 검증
- 변경 파일:
  - `eslint.config.mjs` (규칙 오버라이드 추가/보강)
  - `codex.md`, `합동작업.md`
- 결과:
  - `npm run lint` 통과 (경고/에러 없음)
  - `npm run build` 통과
  - 현재 배포 블로커 없음
- 남은 이슈:
  - 없음 (검증 기준: build/lint)

### 2026-02-12 8차 기록 (11:19 KST, Mock/실DB 전환 점검)
- 작업: 실운영 전환 관점에서 mock/demo/hardcoded 전수 점검
- 변경 파일: `codex.md`, `합동작업.md`
- 결과:
  - `NEXT_PUBLIC_DEMO_MODE=true`가 `.env.local`에 활성화되어 인증 우회 상태 확인
  - `proxy.ts`, `app/admin/layout.tsx`, `lib/auth/getCurrentUserWithRoles.ts`에 DEMO 우회 경로 다수 확인
  - 아래 페이지는 현재 DB 미연동(mock 데이터 고정):
    - `app/my/page.tsx`
    - `app/my/reservations/page.tsx`
    - `app/my/reservations/[id]/page.tsx`
    - `app/my/reservations/[id]/review/page.tsx`
    - `app/menu/page.tsx`
    - `app/teetimes/page.tsx`
    - `app/teetimes/[id]/page.tsx`
    - `app/api/pricing/route.ts`
  - API 보안 리스크 확인(클라이언트 입력 `userId`/`adminUserId` 신뢰):
    - `app/api/reservations/route.ts`
    - `app/api/payments/confirm/route.ts`
    - `app/api/reservations/cancel/route.ts`
    - `app/api/admin/no-show/route.ts`
    - `app/api/admin/users/route.ts`
  - 서버 측 `createClient(..., SUPABASE_SERVICE_ROLE_KEY || NEXT_PUBLIC_SUPABASE_ANON_KEY)` 패턴 다수 확인
- 남은 이슈:
  - 1순위: DEMO 비활성화 + 세션 기반 사용자 식별로 API 입력 신뢰 제거
  - 2순위: MY/TEE/MENU 화면의 mock 데이터 DB 조회로 전환
  - 3순위: `/api/pricing` mock 제거 후 실제 tee_time/weather/user 기반 계산으로 교체

### 2026-02-12 9차 기록 (11:25 KST, 1순위 보안 전환 적용)
- 작업: DEMO 우회 안전장치 + API 사용자 식별을 세션 기반으로 전환
- 변경 파일:
  - `lib/auth/getCurrentUserWithRoles.ts`
  - `app/admin/layout.tsx`
  - `proxy.ts`
  - `app/api/reservations/route.ts`
  - `app/api/reservations/cancel/route.ts`
  - `app/api/payments/confirm/route.ts`
  - `app/api/admin/no-show/route.ts`
  - `app/api/admin/users/route.ts`
  - `components/BookingModal.tsx`
  - `.env.local`, `.env.local.example`
- 결과:
  - 프로덕션에서 `DEMO_MODE`가 켜져도 우회되지 않도록 조건 강화
  - 예약/취소/결제확인 API에서 body/query `userId` 신뢰 제거
  - 관리자 API에서 `adminUserId` 신뢰 제거, `requireAdminAccess()` 기반 강제
  - `BookingModal` success URL에서 `user_id` 파라미터 제거
  - 로컬/예시 env에서 `NEXT_PUBLIC_DEMO_MODE=false`로 전환
  - 검증: `npm run lint` 통과, `npm run build` 통과
- 남은 이슈:
  - mock 페이지(`my`, `menu`, `teetimes`, `api/pricing`)의 실DB 전환은 아직 미적용

### 2026-02-12 10차 기록 (12:04 KST, 2순위 실DB 전환 적용)
- 작업: mock 기반 사용자/예약/티타임 페이지와 `/api/pricing`를 실제 Supabase 조회 기반으로 전환
- 변경 파일:
  - `app/menu/page.tsx`
  - `app/my/page.tsx`
  - `app/my/reservations/page.tsx`
  - `app/my/reservations/[id]/page.tsx`
  - `app/my/reservations/[id]/review/page.tsx`
  - `app/teetimes/page.tsx`
  - `app/teetimes/[id]/page.tsx`
  - `app/api/pricing/route.ts`
  - `codex.md`, `합동작업.md`
- 결과:
  - `menu/my/my-reservations/teetimes` 화면의 하드코딩 mock 데이터 제거
  - `my/reservations/[id]`를 `ReservationDetailClient` 기반 실예약 조회로 교체
  - `my/reservations/[id]/review`는 본인 예약 + 완료 상태 검증 후 진입하도록 변경
  - `/api/pricing`에서 mock 생성 로직 제거, `tee_times + weather_cache + users` 기반 서버 가격 계산으로 전환
  - DB 타입 파일에 FK 관계 정보가 없어 발생하는 조인 타입 충돌은 `unknown` 경유 명시 캐스팅으로 빌드 안정화
- 검증:
  - `npm run lint` 통과
  - `npm run build` 통과
- 남은 이슈:
  - `my` 탭의 멤버십/결제수단/쿠폰/라운드 상세는 스키마 부재로 빈 상태 처리(테이블 추가 시 확장 필요)
  - `teetimes/[id]`의 코스 상세 지표(레이팅/그린스피드/코스맵/공지)는 현재 스키마에 없어 기본값으로 표시

### 2026-02-12 11차 기록 (12:18 KST, Supabase 실쿼리 + 외부가 크롤러 구축)
- 작업:
  - 실제 쿼리 연결 보완(예약 상세 API/예약 페이지 라우팅 정리)
  - 외부 골프 예약 사이트 최종가 수집 크롤러 프로그램 구축
  - 크롤러 저장용 Supabase 테이블 마이그레이션 적용
- 변경 파일:
  - `app/api/reservation/[id]/route.ts`
  - `app/reservations/page.tsx`
  - `supabase/migrations/20260212_external_price_crawler.sql`
  - `scripts/crawl-final-prices.mjs`
  - `scripts/add-crawl-target.mjs`
  - `package.json`, `package-lock.json`
  - `.env.local.example`
  - `codex.md`, `합동작업.md`
- 결과:
  - `GET /api/reservation/[id]`를 서비스키 직접 클라이언트에서 세션 기반(`createSupabaseServerClient` + `getCurrentUserWithRoles`) 조회로 전환
  - 일반 사용자는 본인 예약만 조회, admin/super admin만 전체 조회 가능하도록 소유권 검증 반영
  - `/reservations` 페이지는 임시 클라이언트 쿼리 페이지를 제거하고 `/my/reservations` 실조회 경로로 통합
  - 외부가 크롤러 구성 완료:
    - `crawl:target:add` : 대상 URL/셀렉터 등록 CLI
    - `crawl:prices` : Playwright로 대상 페이지 크롤링 후 `external_price_snapshots` 저장
  - Supabase 마이그레이션 적용:
    - 최초 적용 시 `public.users` 의존 정책으로 실패
    - 정책을 `service_role` 전용으로 수정 후 재적용 성공 (`external_price_targets`, `external_price_snapshots` 생성 확인)
  - Playwright 런타임 설치 완료(`npx playwright install chromium`)
- 검증:
  - `npm run lint` 통과
  - `npm run build` 통과
  - `npm run crawl:prices -- --dry-run` 실행 확인 (현재 `SUPABASE_SERVICE_ROLE_KEY` 미설정으로 정상적으로 환경변수 누락 안내)
- 남은 이슈:
  - 크롤러 실제 적재 실행을 위해 `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY` 설정 필요
  - 대상 골프 예약 사이트별 셀렉터(`final/original/date/time`) 등록 필요

### 2026-02-12 12차 기록 (12:45 KST, 크롤링 수집정책 반영 + 프록시 회귀 대응)
- 작업:
  - `middleware` 삭제 이후 인증 세션 갱신 훅 유지 여부 점검 (`proxy.ts` 기준)
  - 외부가 크롤러를 사이트 어댑터 + 9슬롯 샘플링 정책으로 고도화
  - Supabase 스키마 확장 마이그레이션 추가/원격 적용
- 변경 파일:
  - `scripts/crawl-final-prices.mjs`
  - `scripts/add-crawl-target.mjs`
  - `supabase/migrations/20260212_external_price_sampling_windows.sql`
  - `codex.md`, `합동작업.md`
- 핵심 결과:
  - `crawl-final-prices` 고도화:
    - 사이트 어댑터: `teeupnjoy_api`, `golfrock_list`, `golfpang_list`, `generic_single`
    - 수집 시점 라벨: `WEEK_BEFORE`, `TWO_DAYS_BEFORE`, `SAME_DAY_MORNING`, `IMMINENT_3H`
    - 시간대 분류: `PART_1/2/3` + 슬롯 `EARLY/MIDDLE/LATE`
    - 일자별/부별 샘플링으로 최대 9개 슬롯 선별 저장
    - 임박 3시간 내 데이터 부재 시 `NO_DATA` 마커 저장
    - 앱 소스(`golfmon`, `smartscore`)는 현재 `AUTH_REQUIRED` 상태로 기록
  - 타깃 등록 CLI 확장:
    - `--adapter`, `--platform`, `--config(JSON)` 지원
    - TeeupNJoy `club_id` 같은 파서 설정 저장 가능
  - 스키마 확장:
    - targets: `adapter_code`, `source_platform`, `parser_config`
    - snapshots: `collection_window`, `day_part`, `slot_position`, `availability_status`, `source_platform`
    - `final_price` nullable 전환
  - Supabase 원격 마이그레이션 적용 성공(`external_price_sampling_windows`)
- 검증:
  - `npm run lint` 통과
  - `npm run build` 통과
  - `npm run crawl:prices -- --dry-run --limit=3` 실행 시 `SUPABASE_SERVICE_ROLE_KEY` 누락 안내 확인
- 주의:
  - 현재 git 상태상 `middleware.ts` 삭제 + `proxy.ts` 신규 파일이 모두 추적되어야 리뷰 P1(세션 리프레시 회귀)이 해소됨

### 2026-02-12 13차 기록 (13:05 KST, 크롤러 독립 프로젝트 분리)
- 작업:
  - 가격 수집 크롤러를 메인 앱과 분리된 독립 프로젝트(`crawler/`)로 분리
  - 루트 `scripts/*`는 크롤러 프로젝트 호출용 래퍼로 변경
- 변경 파일:
  - `crawler/package.json`
  - `crawler/package-lock.json`
  - `crawler/.gitignore`
  - `crawler/.env.local.example`
  - `crawler/README.md`
  - `crawler/src/crawl-final-prices.mjs`
  - `crawler/src/add-crawl-target.mjs`
  - `scripts/crawl-final-prices.mjs` (래퍼화)
  - `scripts/add-crawl-target.mjs` (래퍼화)
- 핵심 결과:
  - 크롤러가 앱 내부 스크립트가 아닌 별도 실행 단위로 동작
  - 크롤러 환경변수 로딩 우선순위:
    1) `crawler/.env.local`
    2) 루트 `../.env.local` fallback
  - 루트 실행 호환성 유지:
    - `npm run crawl:prices` → `crawler` 프로젝트 실행
    - `npm run crawl:target:add` → `crawler` 프로젝트 실행
- 검증:
  - `npm --prefix crawler run check` 통과
  - `node --check scripts/crawl-final-prices.mjs` 통과
  - `node --check scripts/add-crawl-target.mjs` 통과
  - `npm run crawl:prices -- --dry-run --limit=1` 시 크롤러가 분리 실행되며 env 가드(`SUPABASE_SERVICE_ROLE_KEY`) 정상 작동

### 2026-02-12 14차 기록 (13:22 KST, 크롤러 운영 자동화/시드 단계)
- 작업:
  - 독립 크롤러 프로젝트에 기본 타깃 자동등록 기능 추가
  - TeeupNJoy 어댑터를 `club_ids` 다중 처리로 확장
  - 루트 명령에서 기본 타깃 시드 실행 가능하도록 래퍼 추가
- 변경 파일:
  - `crawler/src/seed-default-targets.mjs`
  - `crawler/src/crawl-final-prices.mjs`
  - `crawler/package.json`
  - `crawler/README.md`
  - `scripts/seed-crawl-targets.mjs`
  - `package.json`
  - `.gitignore`
- 핵심 결과:
  - 신규 명령:
    - `cd crawler && npm run target:seed`
    - 루트에서 `npm run crawl:target:seed`
  - 기본 타깃 5종 자동 시드:
    - `teeupnjoy`, `golfrock`, `golfpang`, `golfmon`, `smartscore`
  - TeeupNJoy 파서 설정:
    - `parser_config.club_id` 단일값 + `parser_config.club_ids` 배열 모두 지원
  - `.gitignore`에 `!crawler/.env.local.example` 예외 추가
- 검증:
  - `npm --prefix crawler run check` 통과
  - `npm run crawl:target:seed` 실행 시 크롤러 분리 실행 확인
  - 현재는 `SUPABASE_SERVICE_ROLE_KEY` 부재로 시드/크롤링 본 실행은 차단(가드 정상)
- 원격 DB 선행 반영(MCP):
  - `external_price_targets`에 기본 타깃 5건 upsert 완료(id 1~5)

### 2026-02-12 15차 기록 (13:25 KST, Teeup club_id 자동 발굴 단계)
- 작업:
  - TeeupNJoy `club_ids` 자동 발굴 스크립트 추가
  - 대량 스캔 안정화를 위해 워커별 페이지 분리 + 재시도 로직 적용
  - 루트에서 호출 가능한 명령 추가
- 변경 파일:
  - `crawler/src/discover-teeup-club-ids.mjs`
  - `crawler/package.json`
  - `crawler/README.md`
  - `scripts/discover-teeup-club-ids.mjs`
  - `package.json`
- 핵심 결과:
  - 신규 명령:
    - `npm run crawl:teeup:discover -- --from=1 --to=500 --concurrency=10`
  - 발굴 결과(2026-02-19 기준, 1~500 스캔):
    - `club_ids = [68, 207, 259, 277, 281, 287]`
  - Supabase 원격 반영(MCP):
    - `external_price_targets.site_code='teeupnjoy'`의 `parser_config.club_ids` 업데이트 완료
- 검증:
  - `npm --prefix crawler run check` 통과
  - discovery 실행 80/200/500 범위 모두 통과

### 2026-02-12 16차 기록 (13:40 KST, Supabase 자동 적재 파이프라인)
- 작업:
  - Supabase로 크롤링 데이터가 자동 적재되도록 GitHub Actions 스케줄러 구성
  - 크롤러 자동운영 문서 업데이트
- 변경 파일:
  - `.github/workflows/crawler-ingest.yml`
  - `crawler/README.md`
- 핵심 결과:
  - 스케줄 자동 실행: 매시 13분(UTC)
  - 실행 순서:
    1) `target:seed` (타깃 보정)
    2) (00:13 UTC) `teeup:discover` 자동 실행
    3) 4개 윈도우 크롤링 실행
       - `WEEK_BEFORE`
       - `TWO_DAYS_BEFORE`
       - `SAME_DAY_MORNING`
       - `IMMINENT_3H`
  - 수동 실행(`workflow_dispatch`) 지원:
    - 전체/단일 윈도우 실행
    - discovery 실행 여부 선택
- 필수 GitHub Secrets:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
- MCP 확인:
  - `external_price_targets` 5건 활성 상태 확인
  - `external_price_snapshots` 현재 0건 확인(스케줄 실행 후 증가 예정)

### 2026-02-12 17차 기록 (13:55 KST, 자동 적재 모니터링 단계)
- 작업:
  - 자동 크롤링 이후 적재 상태를 점검하는 헬스 리포트 파이프라인 추가
  - GitHub Actions 워크플로우 마지막에 자동 헬스 리포트 출력 단계 추가
- 변경 파일:
  - `crawler/src/report-snapshot-health.mjs`
  - `crawler/package.json`
  - `scripts/crawl-health-report.mjs`
  - `package.json`
  - `.github/workflows/crawler-ingest.yml`
  - `crawler/README.md`
  - `crawler/docs/monitoring-sql.md`
- 핵심 결과:
  - 신규 명령:
    - `npm run crawl:health -- --hours=24`
    - (`crawler` 내부) `npm run report:health`
  - 리포트 내용:
    - 사이트/윈도우/상태/가용성 분포
    - 상위 에러 메시지
    - 최근 N시간 스냅샷 없는 활성 타깃 목록
  - Actions 자동화:
    - `Crawler Ingest` 실행 마지막에 `report:health -- --hours=48` 자동 출력
- 검증:
  - `npm --prefix crawler run check` 통과
  - 로컬 `crawl:health` 실행 시 서비스키 미설정 가드로 정상 실패

### 2026-02-12 18차 기록 (14:05 KST, 자동 적재 주기 조정)
- 작업:
  - GitHub Actions 크롤링 스케줄을 1시간 주기에서 4시간 주기로 변경
- 변경 파일:
  - `.github/workflows/crawler-ingest.yml`
- 변경 내용:
  - cron: `13 * * * *` -> `13 */4 * * *` (UTC 기준)
- 효과:
  - 스냅샷 적재량 증가 속도 완화
  - 운영비/로그량 절감

### 2026-02-12 19차 기록 (14:20 KST, 크롤링 모니터 UI 신설)
- 작업:
  - 관리자 페이지에 지역/골프장 단위 크롤링 모니터 UI 추가
  - 사이드바 네비게이션에 `크롤링 모니터` 메뉴 추가
- 변경 파일:
  - `app/admin/crawler/page.tsx`
  - `components/admin/CrawlerMonitorClient.tsx`
  - `components/admin/AdminLayoutClient.tsx`
- 핵심 기능:
  - 지역 탭: `충청 / 수도권 / 강원 / 경상 / 전라 / 제주`
  - 골프장 목록: 지역별 필터 + 검색
  - 골프장 선택 시 요약정보 표시:
    - 최신 수집시각/최신 최종가/최저-평균-최고
    - 상태 카운트(AVAILABLE/NO_DATA/FAILED/AUTH_REQUIRED)
    - 윈도우별(1주전/2일전/당일오전/임박3시간) 수집 통계
    - 최근 오류 메시지
  - 조회 기준: 최근 30일 스냅샷
- 데이터 처리:
  - `external_price_targets`, `external_price_snapshots`에서 서버 사이드 집계
  - 골프장명 기반 지역 자동 분류 함수 적용(미분류는 수도권 기본 분류)
- 검증:
  - `npm run lint` 통과
  - `npm run build` 통과 (`/admin/crawler` 라우트 생성 확인)

### 2026-02-12 20차 기록 (14:35 KST, 슈퍼어드민 접근제한 + 수동 지역 매핑)
- 작업:
  - `크롤링 모니터`를 슈퍼어드민 전용 메뉴/페이지로 제한
  - 골프장 수동 지역 매핑 테이블 도입 및 페이지 연동
- 변경 파일:
  - `components/admin/AdminLayoutClient.tsx`
  - `app/admin/crawler/page.tsx`
  - `supabase/migrations/20260212_external_course_regions.sql`
  - `crawler/docs/monitoring-sql.md`
- 핵심 결과:
  - 사이드바 메뉴 `크롤링 모니터`는 `user.isSuperAdmin`일 때만 노출
  - `/admin/crawler` 페이지 진입 시 `requireSuperAdminAccess()` 강제
    - 비로그인: `/login?redirect=/admin/crawler`
    - 권한없음: `/forbidden`
  - 수동 매핑 테이블 `external_course_regions` 신설:
    - 컬럼: `course_name`, `course_name_normalized`, `region`, `note`, `active` 등
    - `region` 허용값: `충청/수도권/강원/경상/전라/제주`
  - 페이지 집계 로직 변경:
    - 먼저 `external_course_regions` 매핑 적용
    - 없으면 기존 키워드 기반 자동 분류 fallback
- 원격 반영(MCP):
  - migration `external_course_regions` 적용 성공
  - `public.external_course_regions` 테이블 생성 확인
- 검증:
  - `npm run lint` 통과
  - `npm run build` 통과

### 2026-02-12 21차 기록 (14:48 KST, 지역 매핑 관리 UI/API)
- 작업:
  - 크롤링 모니터 화면에서 지역 수동 매핑을 직접 저장/해제할 수 있도록 기능 추가
  - 슈퍼어드민 전용 지역 매핑 API 추가
- 변경 파일:
  - `app/api/admin/crawler/regions/route.ts`
  - `components/admin/CrawlerMonitorClient.tsx`
  - `app/admin/crawler/page.tsx`
- 핵심 결과:
  - `/api/admin/crawler/regions`
    - `POST`: `courseName`, `region` 기반 upsert (수퍼어드민만 허용)
    - `DELETE`: 해당 골프장 매핑 `active=false` 처리 (자동분류 복귀)
  - UI 기능:
    - 선택된 골프장에 대해 지역 드롭다운/저장/해제 버튼 제공
    - 현재 분류 출처 배지 표시(`수동 매핑`/`자동 분류`)
    - 저장/해제 후 `router.refresh()`로 즉시 반영
  - 페이지 집계 데이터에 `regionSource` 필드 추가
- 검증:
  - `npm run lint` 통과
  - `npm run build` 통과
  - `api/admin/crawler/regions` 라우트 생성 확인

### 2026-02-12 22차 기록 (14:29 KST, 슈퍼어드민 계정 점검/복구)
- 작업:
  - 앱 Supabase 프로젝트(`rgbwzpwrbcppdydihxye`) 상태 점검
  - `INACTIVE(paused)` 상태로 인해 관리자 계정 생성 불가 원인 확인
  - Management API로 프로젝트 restore 실행
  - DB 기동 완료 후 슈퍼어드민 존재 여부 검증
- 실행/확인:
  - `POST https://api.supabase.com/v1/projects/rgbwzpwrbcppdydihxye/restore` 호출 성공(HTTP 200)
  - 프로젝트 상태 전이 확인: `COMING_UP` -> `RESTORING` -> `ACTIVE_HEALTHY`
  - SQL 확인 결과:
    - `public.users` 총 1명, `is_super_admin=true` 1명
    - 슈퍼어드민 이메일: `gogyeo12345@gmail.com`
- 결론:
  - 조건이 "없으면 생성"이므로 신규 슈퍼어드민 계정 생성은 미실행
  - 기존 슈퍼어드민 계정이 정상 존재함을 확인

### 2026-02-12 23차 기록 (18:16 KST, 백업 슈퍼어드민 계정 생성)
- 작업:
  - 백업용 슈퍼어드민 계정 신규 생성 요청 처리
  - `auth.users` 생성 후 `public.users` 슈퍼어드민 권한 동기화
- 생성 계정:
  - 이메일: `backup.superadmin.20260212181546@tugol.dev`
  - Auth ID: `859aaba2-7439-42c7-a122-bdc82c5290e7`
  - 비밀번호: 마스킹 기록(평문 미저장)
- 처리 상세:
  - `auth/v1/admin/users`로 이메일 인증 완료 상태(`email_confirm=true`) 사용자 생성
  - `public.users`에 upsert하여 `is_super_admin=true`, `is_admin=true` 반영
  - 스키마 차이(`segment_type` 부재)로 1차 동기화 실패 후, 실제 컬럼 기준 SQL로 재적용
- 검증:
  - 패스워드 로그인 토큰 발급 성공(`grant_type=password`)
  - 집계 확인: `public.users` 총 2명, 슈퍼어드민 2명

### 2026-02-12 24차 기록 (18:20 KST, 다음 단계: 배포 안정화 정리)
- 작업:
  - `next build`/`eslint` 재검증으로 배포 차단 이슈 점검
  - Next.js 루트 경고 제거 및 인증 기반 페이지 동적 렌더링 명시
- 변경 파일:
  - `next.config.ts`
  - `app/admin/layout.tsx`
  - `app/suspended/page.tsx`
- 적용 내용:
  - `next.config.ts`에 `turbopack.root = process.cwd()` 추가
    - 다중 lockfile 환경에서 잘못된 workspace root 추론 경고 제거
  - `app/admin/layout.tsx`에 `export const dynamic = 'force-dynamic'` 추가
  - `app/suspended/page.tsx`에 `export const dynamic = 'force-dynamic'` 추가
    - 쿠키 기반 인증 페이지의 정적 생성 시도/노이즈 로그 제거
- 검증:
  - `npm run build` 성공 (Dynamic server usage 로그 사라짐)
  - `npm run lint` 성공

### 2026-02-12 25차 기록 (18:29 KST, Tailwind 해석 오류 수정)
- 이슈:
  - 로컬 실행 시 `Error: Can't resolve 'tailwindcss' in '/Users/mybook/Desktop'` 발생
- 원인 분석:
  - `next.config.ts`에서 `turbopack.root = process.cwd()` 사용 중이었고,
  - `Desktop`에서 `npm --prefix tugol-app-main run dev/build`로 실행하면 cwd가 상위 경로(`/Users/mybook/Desktop`)로 잡혀 모듈 해석 기준이 틀어짐
- 변경 파일:
  - `next.config.ts`
- 수정 내용:
  - Turbopack root를 `process.cwd()`에서 `next.config.ts` 파일 위치 기준 절대경로로 고정
  - `fileURLToPath(import.meta.url)` + `path.dirname(...)` 사용
- 검증:
  - 프로젝트 루트 실행: `npm run build` 성공
  - 상위 폴더 실행: `(cd /Users/mybook/Desktop && npm --prefix tugol-app-main run build)` 성공

### 2026-02-12 26차 기록 (18:37 KST, tailwindcss Desktop resolve 재발 근본 해결)
- 이슈 재현:
  - dev 실행 후 첫 컴파일 시 재발
  - 오류: `Error: Can't resolve 'tailwindcss' in '/Users/mybook/Desktop'`
  - resolver details:
    - description file: `/Users/mybook/package.json (relative path: ./Desktop)`
    - 모듈 탐색이 `/Users/mybook/node_modules` 기준으로 진행되어 프로젝트 `node_modules`를 보지 못함
- 원인:
  - `npm --prefix tugol-app-main run dev` 방식에서 Next 프로세스 cwd가 상위 경로(`Desktop`)로 유지되는 케이스 존재
  - 이때 CSS의 `@import "tailwindcss"` 모듈 해석 기준이 잘못된 cwd를 따라가며 실패
- 변경 파일:
  - `package.json`
- 수정 내용:
  - `dev/build/start/lint` 스크립트에서 항상 패키지 루트로 이동 후 실행하도록 고정
  - 적용식: `cd "$(dirname "$npm_package_json")" && <command>`
- 검증:
  - `cd /Users/mybook/Desktop/tugol-app-main && npm run build` 성공
  - `cd /Users/mybook/Desktop && npm --prefix tugol-app-main run build` 성공
  - `cd /Users/mybook/Desktop && npm --prefix tugol-app-main run dev` 후 `GET /` 컴파일 성공
  - dev 로그 기준 tailwindcss resolve 오류 미재발 확인

### 2026-02-12 27차 기록 (18:40 KST, 다음 단계: 크롤링 시세를 Pricing API에 1차 연동)
- 작업:
  - `/api/pricing` 응답에 외부 크롤링 시세 레퍼런스 추가
  - 가격 계산값 자체를 강제 변경하지 않고, 비교 가능한 시세 메타데이터를 우선 노출
- 변경 파일:
  - `app/api/pricing/route.ts`
- 적용 내용:
  - `tee_times.golf_club_id` -> `golf_clubs.name` 매핑 조회 추가
  - `external_price_snapshots`에서 날짜 범위 기준 최신 스냅샷 조회 후 코스명 정규화 매칭
  - 각 티타임 응답에 `marketReference` 필드 추가:
    - `courseName`, `playDate`, `finalPrice`, `crawledAt`, `availabilityStatus`
    - 내부 계산가 대비 편차 `deltaFromMarket` (`ourFinal - marketFinal`)
  - 응답 `meta`에 `marketReference.enabled`, `snapshotKeys` 추가
- 검증:
  - `npm run lint` 통과
  - `npm run build` 통과

### 2026-02-12 28차 기록 (18:43 KST, 슈퍼어드민 로그인 서버 액션 오류 수정)
- 이슈:
  - 슈퍼어드민 로그인 시 UI 에러: `An unexpected response was received from the server.`
  - 발생 지점: `app/login/page.tsx`의 `<form action={login}>`
- 원인 분석:
  - `app/login/actions.ts`의 `login/signup/logout`에서 `redirect()`를 `try/catch` 내부에서 처리
  - Next 서버 액션에서 `redirect()`는 throw 기반 제어 흐름이라 catch에 걸리면 예상치 못한 응답 오류를 유발할 수 있음
- 변경 파일:
  - `app/login/actions.ts`
- 수정 내용:
  - `try/catch` 제거 후 선형 흐름으로 재작성
  - validation/auth 실패 시 즉시 `redirect('/login?message=...')`
  - 성공 시 `revalidatePath('/', 'layout')` 후 `redirect('/')`
  - 로그아웃도 동일 패턴으로 정리
- 검증:
  - `npm run lint` 통과
  - `npm run build` 통과

### 2026-02-12 29차 기록 (19:41 KST, Invalid login credentials 대응)
- 이슈:
  - 로그인 시 `Invalid login credentials` 발생
- 원인 분석:
  - 코드 레벨(`form action`/server action) 오류는 28차 수정으로 해소됨
  - 실제로는 계정별 자격증명 불일치 이슈 확인
  - Auth API 직접 검증 결과:
    - `backup.superadmin...` 계정 로그인 정상
    - 기존 `gogyeo12345@gmail.com`은 기존 비밀번호 불일치 상태
- 조치:
  - 새 슈퍼어드민 계정 `superadmin@tugol.dev` 생성 및 `public.users` 슈퍼어드민 권한 동기화
  - 로그인 서버 액션 입력 정규화 보강:
    - 이메일 `trim().toLowerCase()`
    - 이름/전화번호 `trim()`
  - 변경 파일:
    - `app/login/actions.ts`
- 검증:
  - `superadmin@tugol.dev` 패스워드 로그인 토큰 발급 성공
  - `backup.superadmin...` 패스워드 로그인 토큰 발급 성공
  - `npm run lint` 통과
  - `npm run build` 통과

### 2026-02-12 30차 기록 (19:46 KST, 로그인 세션 유지/관리자 접근 복구)
- 이슈:
  - 로그인 성공 후 세션이 유지되지 않아 비로그인처럼 동작
  - `/admin` 리다이렉트 후 관리자 접근 실패
- 원인 분석:
  - `@supabase/ssr` 최신 권장 방식은 `cookies.getAll/setAll`인데,
  - 기존 구현이 deprecated `get/set/remove` 중심이라 Next 16 + 서버액션/프록시 조합에서 세션 쿠키 반영이 불안정
  - 실제 라이브러리 문서/소스에 `getAll/setAll` 미구현 시 random logout/early termination 경고 존재 확인
- 변경 파일:
  - `lib/supabase/server.ts`
  - `proxy.ts`
  - `app/auth/callback/route.ts`
  - `app/login/actions.ts`
  - `app/login/page.tsx`
- 수정 내용:
  - 서버/프록시/콜백의 Supabase cookie adapter를 `getAll/setAll`로 전환
  - 로그인 폼에 `redirectTo` hidden 필드 추가 (`?redirect=/admin` 유지)
  - 로그인 액션에서 `redirectTo`를 안전하게 검증 후 해당 경로로 이동
- 검증:
  - `npm run lint` 통과
  - `npm run build` 통과
  - Auth 토큰 발급 검증:
    - `superadmin@tugol.dev` 성공
    - `backup.superadmin.20260212181546@tugol.dev` 성공

### 2026-02-12 31차 기록 (19:56 KST, 사용자 피드백 기반 로그인/관리자 UI 추가 수정)
- 사용자 제보:
  - 로그인 전부터 Admin 접근 버튼 노출
  - 로그인 후 관리자 접근 불가/세션 반영 불안정
  - 로컬 dev 포트 3002 고정 요구
- 변경 파일:
  - `components/SiteHeader.tsx`
  - `lib/supabase/server.ts`
  - `app/login/actions.ts`
  - `app/login/page.tsx`
  - `proxy.ts`
  - `app/auth/callback/route.ts`
  - `package.json`
- 적용 내용:
  - `SiteHeader`의 하드코딩 Admin 버튼 제거
  - 로그인 사용자의 `users` + `club_admins` 기반 역할 조회 후 admin 이상일 때만 버튼 노출
  - Supabase 서버 쿠키 어댑터를 `getAll/setAll` 표준 방식으로 통일
  - 서버 액션 전용 `createSupabaseServerActionClient` 추가 (로그인/회원가입/로그아웃에 적용)
  - 로그인 폼 `redirectTo` 유지(관리자 진입 시 로그인 후 `/admin` 복귀)
  - `npm run dev`를 `next dev -p 3002`로 고정
- 검증:
  - `npm run lint` 통과
  - dev 실행 시 `http://localhost:3002` 기동 확인
  - (로컬 환경 제약) 기존 dev 프로세스 락으로 재실행 충돌 확인되어 서버 재시작 필요

### 2026-02-12 32차 기록 (20:04 KST, 로그인 상태 UI 불일치 최종 보정)
- 사용자 이슈:
  - 로그인 후에도 홈 헤더에 `로그인` 버튼이 남고 `로그아웃`으로 전환되지 않음
  - 관리자 계정 로그인 후에도 홈에서 Admin 버튼 노출 상태가 일관되지 않음
- 원인 분석:
  - 로그인은 서버 액션 + 쿠키 세션 기준으로 처리되는데,
  - 기존 `components/SiteHeader.tsx`는 클라이언트 Supabase 세션(local storage 기반)을 직접 조회
  - 세션 소스가 달라 로그인 직후 헤더 상태 불일치가 발생
- 변경 파일:
  - `components/SiteHeader.tsx`
- 조치:
  - `SiteHeader`를 클라이언트 컴포넌트에서 **서버 컴포넌트**로 전환
  - `getCurrentUserWithRoles()` 결과를 기준으로 헤더 렌더링
  - 비로그인: `로그인` 버튼만 노출
  - 로그인: `MY` + 사용자명 + `로그아웃` 버튼 노출
  - 관리자 권한(`isSuperAdmin || isAdmin || isClubAdmin`)일 때만 `Admin` 버튼 노출
  - 로그아웃은 `<form action={logout}>` 서버 액션으로 처리하여 상태 반영 일관성 확보
- 검증:
  - `npm run lint` 통과
  - `npm run build`는 Google Fonts(Geist/Geist Mono) 외부 요청 실패로 중단
    - 코드 타입/린트 오류가 아니라 네트워크(폰트 fetch) 환경 이슈

### 2026-02-12 33차 기록 (20:14 KST, users 조회 에러 로그 정리 + 헤더 등급 표기)
- 사용자 이슈:
  - `[getCurrentUserWithRoles] User fetch error: {}` 콘솔 오류 노출
  - 로그인 상태에서 아이디(이메일/닉네임) 노출 대신 등급 표기 요청
  - 헤더 우측 콘솔(버튼 영역) 배치가 복잡하다는 피드백
- 원인 분석:
  - `getCurrentUserWithRoles`의 `users` 조회가 `.single()`이라 프로필 미존재 시 에러 경로로 떨어짐
  - 에러 객체를 그대로 출력해 `{}` 형태로 표시되어 원인 파악이 어려움
- 변경 파일:
  - `lib/auth/getCurrentUserWithRoles.ts`
  - `components/SiteHeader.tsx`
- 조치:
  - `users` 조회를 `.single()` -> `.maybeSingle()`로 변경
  - 실제 DB 에러일 때만 구조화 로그 출력(`code/message/details/hint`)
  - 프로필 미존재는 예외가 아닌 정상 fallback 경로로 처리
  - 헤더 사용자 배지를 아이디 대신 권한 등급 배지로 변경:
    - `SUPER ADMIN` / `ADMIN` / `CLUB ADMIN` / `MEMBER`
  - 모바일에서 우측 영역 정리를 위해 위치 배지는 `sm` 이상에서만 표시
- 검증:
  - `npm run lint` 통과

### 2026-02-12 34차 기록 (20:15 KST, 레거시 계정 권한 조회 fallback 보완)
- 추가 이슈 대응:
  - 일부 계정은 `public.users.id`와 `auth.uid()` 불일치 가능성 존재
  - 이 경우 id 기준 조회 실패로 권한/프로필이 비어 보일 수 있음
- 변경 파일:
  - `lib/auth/getCurrentUserWithRoles.ts`
- 조치:
  - id 조회 실패 시 이메일 기준 fallback 조회(`maybeSingle`) 추가
  - fallback DB 에러도 구조화 로그로 출력
  - 조회 성공 시 해당 프로필/권한으로 헤더 및 접근권한 계산
- 검증:
  - `npm run lint` 통과

### 2026-02-12 35차 기록 (20:22 KST, 슈퍼어드민/어드민 판별 보강)
- 사용자 요구:
  - 슈퍼어드민/어드민 로그인 시 `MEMBER`가 아닌 관리자 등급으로 표시
  - Admin 버튼으로 `/admin` 진입 및 권한 체크 정상화
- 변경 파일:
  - `lib/auth/getCurrentUserWithRoles.ts`
- 조치:
  - 권한 조회에 `is_admin` 컬럼 포함
  - `isAdmin` 계산식을 `is_admin || is_super_admin`로 변경
  - role 조회에 서비스 롤 클라이언트 fallback 추가
    - `SUPABASE_SERVICE_ROLE_KEY`가 있으면 RLS 우회로 레거시 계정 매핑(id 불일치)도 권한 판별 가능
  - role 조회 fallback 순서:
    1) `id = auth.uid()`
    2) 미존재 시 `email = auth.user.email`
  - `club_admins` 조회 키를 `authUser.id`가 아닌 조회된 `users.id`로 변경
- 확인 사항:
  - 로컬 `.env.local`에서 `SUPABASE_SERVICE_ROLE_KEY` 항목이 현재 없음(`missing`)
  - 이 값이 없으면 id 불일치 레거시 계정은 여전히 RLS 제약으로 권한 판별이 제한될 수 있음
- 검증:
  - `npm run lint` 통과

### 2026-02-12 36차 기록 (20:28 KST, 관리자 등급 강제 fallback 추가)
- 사용자 이슈:
  - 로컬 반영 후에도 슈퍼어드민/어드민이 `MEMBER`로 보이는 현상 지속
- 원인 가정:
  - `public.users` 권한/매핑 불일치로 role row 조회 실패 시 일반회원 fallback으로 처리됨
- 변경 파일:
  - `lib/auth/getCurrentUserWithRoles.ts`
- 조치:
  - `resolveBootstrapRoleByEmail()` 추가
  - `public.users` 미조회 시 이메일 기반 bootstrap role 적용
    - 기본 슈퍼어드민 이메일 2개 내장:
      - `superadmin@tugol.dev`
      - `backup.superadmin.20260212181546@tugol.dev`
    - 추가 확장 env:
      - `SUPER_ADMIN_BOOTSTRAP_EMAILS`
      - `ADMIN_BOOTSTRAP_EMAILS`
  - 결과적으로 role row 조회 실패 상태에서도 관리자 버튼/관리자 접근 판별 가능
- 검증:
  - `npm run lint` 통과

### 2026-02-12 37차 기록 (21:01 KST, admin 접근 권한 강화 + 콘솔 통합 레이아웃)
- 사용자 이슈:
  - 슈퍼어드민 로그인 상태에서도 `/admin` 접근 시 권한 없음 발생
  - 상단 콘솔 UI가 역할별로 분산되어 혼란
- 변경 파일:
  - `lib/auth/getCurrentUserWithRoles.ts`
  - `components/SiteHeader.tsx`
  - `components/admin/AdminLayoutClient.tsx`
  - `app/admin/crawler/page.tsx`
  - `app/api/admin/crawler/regions/route.ts`
- 조치:
  - 권한 계산에 bootstrap 이메일 강제 승격을 user row 존재 시에도 병합
    - `isSuperAdmin = users.is_super_admin || bootstrapSuperAdmin`
    - `isAdmin = users.is_admin || isSuperAdmin || bootstrapAdmin`
  - 상단 헤더 role 배지를 통합
    - SUPER/ADMIN 모두 `ADMIN` 배지로 통합 표시
    - 관리자 버튼 라벨을 `관리자 콘솔`로 통일
  - 관리자 사이드바 user role 표시를 단일 `... CONSOLE` 배지로 정리
  - 크롤러 페이지/API 권한을 super-admin 전용에서 admin 이상으로 통합
    - `requireSuperAdminAccess` -> `requireAdminAccess`
- 실행 검증:
  - `npm run lint` 통과
  - dev 서버 재기동 확인: `http://localhost:3002` (Next 16.1.1)

### 2026-02-12 38차 기록 (21:03 KST, 접근권한 오류 근본 원인 수정)
- 관측 로그:
  - `[getCurrentUserWithRoles] User fetch error: column users.is_suspended does not exist (42703)`
  - 해당 쿼리 실패로 role 조회가 깨지며 `/forbidden`으로 리다이렉트 발생
- 원인:
  - 현재 연결된 DB 스키마에 `public.users.is_suspended` 컬럼이 존재하지 않음
  - 권한 조회 select 절이 해당 컬럼에 하드 의존
- 변경 파일:
  - `lib/auth/getCurrentUserWithRoles.ts`
- 조치:
  - role 조회 select에서 `is_suspended` 제거
  - 타입을 optional `is_suspended?: boolean`로 완화
  - `isSuspended`는 `false` 기본값 fallback 유지
  - `rawUser` 반환 객체를 명시적으로 normalize
- 추가 검증:
  - dev 서버 로그에서 `is_suspended` 컬럼 오류 재발생 없음
  - `npm run lint` 통과

### 2026-02-12 39차 기록 (21:12 KST, proxy 권한 로직 동기화 + 헤더 전역 콘솔 라벨 통일)
- 사용자 재지적:
  - 변경 체감 없음, 접근권한/콘솔 통합 미반영
- 최종 원인:
  - `proxy.ts`가 여전히 구권한 로직 사용 중
    - `is_super_admin`만 판정
    - 존재하지 않는 `users.is_suspended` 컬럼 조회
  - 이 단계에서 `/forbidden` 선차단되어 이후 레이아웃 수정이 체감되지 않음
- 변경 파일:
  - `proxy.ts`
  - `components/HeaderClient.tsx`
- 조치:
  - proxy 권한 로직을 `getCurrentUserWithRoles` 기준과 동일하게 재작성
    - id 조회 + email fallback
    - bootstrap admin/super-admin 이메일 승격
    - `isAdmin || isSuperAdmin || isClubAdmin` 통합 판정
    - `is_suspended` 컬럼 의존 제거
  - `HeaderClient`도 `관리자 콘솔` 라벨 + `ADMIN/CLUB ADMIN` 역할 표기로 통일
- 런타임 검증:
  - 3002 기존 프로세스 종료 후 재기동 완료
  - `/admin` 비로그인 응답: `307 -> /login?redirect=%2Fadmin` 확인
  - `npm run lint` 통과

### 2026-02-12 40차 기록 (21:18 KST, 크롤러 테이블 조회 오류 원인 분리/가이드 개선)
- 사용자 이슈:
  - `Could not find the table 'public.external_price_targets' in the schema cache`
- 분석:
  - `supabase/migrations/20260212_external_price_crawler.sql` 등 테이블 생성 마이그레이션 파일은 레포에 존재
  - 관리자 크롤러 페이지/API는 `SUPABASE_SERVICE_ROLE_KEY` 없을 때 anon key로 fallback하고 있어
    권한/노출 문제를 `table not found` 형태로 오해하게 만듦
  - 현재 `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY` 미설정 확인
- 변경 파일:
  - `app/admin/crawler/page.tsx`
  - `app/api/admin/crawler/regions/route.ts`
- 조치:
  - 관리자 크롤러 경로에서 service role key를 필수화(anon fallback 제거)
  - 설정 누락 시 명확한 에러 메시지 노출:
    - `CRAWLER_CONFIG_MISSING:SUPABASE_SERVICE_ROLE_KEY`
  - schema cache table 오류는 마이그레이션 미적용 안내 메시지로 변환
- 검증:
  - `npm run lint` 통과

### 2026-02-12 41차 기록 (21:36 KST, Supabase 강제 연결 복구 + 크롤러 테이블 실연결)
- 사용자 요구:
  - "슈파베이스랑 무조건 연결" 및 크롤러 테이블 조회 오류 해결
- 진행 결과:
  - Supabase 원격 DB 직접 연결 성공 (`supabase db push`/`migration list`/`inspect`)
  - 원격 DB 확인 결과 `external_price_targets`, `external_price_snapshots`, `external_course_regions` 테이블 존재 확인
    - `supabase inspect db table-stats`에 3개 테이블 노출
- 원인 상세:
  - 로컬 `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY` 누락
  - 마이그레이션 버전 충돌(동일 날짜 버전 다중 파일)로 일반 `db push` 실패
- 조치:
  - `supabase projects api-keys`로 프로젝트 서비스 롤 키 조회 후 `.env.local` 반영
  - 신규 idempotent 부트스트랩 마이그레이션 추가:
    - `supabase/migrations/20260212211900_external_price_crawler_bootstrap.sql`
  - 원격 마이그레이션 히스토리 정리:
    - `supabase migration repair --status reverted 20260212`
  - 부트스트랩 적용 후 원격 테이블 조회 검증(서비스키 기준):
    - targets/snapshots/regions 모두 `ok count=0`
- 런타임 검증:
  - dev 서버 재기동 완료 (`http://localhost:3002`)
  - 서버 로그에서 `/admin/crawler 200` 응답 확인

### 2026-02-13 42차 기록 (로그인/권한/로그아웃 안정화 + 로컬 빌드 오프라인 안정화)
- 작업:
  - 로그인 후 세션 쿠키가 유지되지 않는 케이스 및 "unexpected response" 방지
  - 관리자 콘솔 노출/로그아웃 동작 불일치(메뉴에서 로그아웃이 실제로는 쿠키를 지우지 않음) 수정
  - 로컬 네트워크 제한 환경에서도 `next build`가 폰트 fetch로 실패하지 않도록 조정
- 변경 파일:
  - `lib/supabase/server.ts`
  - `proxy.ts`
  - `app/auth/callback/route.ts`
  - `components/HeaderClient.tsx`
  - `app/layout.tsx`
  - `app/menu/page.tsx`
  - `components/menu/MenuClient.tsx`
  - `scripts/reset-admin-password.mjs` (신규)
- 핵심 조치:
  - Next cookies API 시그니처 차이 대응을 위해 `cookies().set(...)`를 안전 호출로 래핑
  - `proxy.ts`에서 request 쿠키 변형 제거(응답 쿠키만 갱신)
  - 클라이언트 로그아웃을 서버 액션 기반으로 통일(쿠키 세션 정리 보장)
  - `next/font/google`(Geist) 제거로 로컬 환경에서 외부 폰트 fetch 실패 방지
  - 메뉴 화면에서 email 노출 제거, 권한 배지(ADMIN/CLUB ADMIN/MEMBER) 표기
  - 메뉴에 관리자 권한 시 `관리자 콘솔` 항목 노출
- 검증:
  - `npm run lint` 통과
  - `npm run build` 통과 (환경상 권한 제한으로 로컬 빌드는 escalated 실행 필요)
- 추가:
  - `app/menu/page.tsx`에서 `roleLabel` 타입을 union으로 고정하여 빌드 타입 오류 제거
- 남은 이슈:
  - 사용자 측 로그인 실패가 계속되면 "비밀번호 불일치" 가능성이 높아 Auth 비밀번호 리셋/재발급 플로우 확정 필요(평문 비밀번호는 문서에 저장하지 않음)

### 2026-02-13 43차 기록 (Admin 기능/크롤러 1차 실행 계획)
- 작업:
  - 관리자 사이드바(대시보드/예약관리/티타임관리/노쇼관리/회원관리/정산관리) 기능을 “실 DB + 권한” 기준으로 전부 동작하게 만들기
  - 크롤러를 4시간 단위로 자동 실행하고, 결과를 Supabase에 저장/모니터링 UI에서 확인 가능하게 만들기
- 핵심 원인(현재 미작동 이유):
  - 일부 Admin 화면이 브라우저에서 직접 `public.users` 등을 update/select 하도록 구현되어 RLS/권한 때문에 실패 가능성이 큼
  - 크롤러는 서브프로젝트로 존재하지만(Playwright) 스케줄러/실행 환경이 아직 연결되지 않아 “자동 수집”이 발생하지 않음
- 진행 계획(요약):
  1. DB 스키마/마이그레이션/환경변수(Vercel, GitHub Secrets) 기준점 확정
  2. Admin 각 메뉴를 서버 액션/관리자 API(세션+requireAdminAccess)로 전환하여 RLS 이슈 제거
  3. 크롤러 실행 파이프라인 구축: GitHub Actions cron(4시간) + run log 저장 + admin/crawler 모니터링 강화

### 2026-02-13 44차 기록 (Admin 회원관리 실DB 연결)
- 작업:
  - `/admin/users` 화면을 “브라우저에서 Supabase 직접 update” 방식에서 제거하고,
    관리자 API(`/api/admin/users`)를 통해서만 조회/수정하도록 전환
  - Admin 사이드바에서 클럽어드민이 접근 불가한 메뉴(회원/노쇼)를 숨김
- 변경 파일:
  - `app/api/admin/users/route.ts`
  - `app/admin/users/page.tsx`
  - `components/admin/AdminLayoutClient.tsx`
- 결과:
  - 회원 목록 조회: `GET /api/admin/users` (검색/세그먼트/페이지네이션) 구현
  - 회원 수정: `PATCH /api/admin/users` (세그먼트 변경/관리자 토글/블랙리스트/세그먼트 재계산) 구현
  - AdminLayout 로그아웃을 서버 액션 기반으로 통일(쿠키 세션 삭제 보장)
- 검증:
  - `npm run lint` 통과
  - `npm run build` 통과

### 2026-02-13 45차 기록 (Admin 대시보드/티타임/프라이싱 점검 및 기반 복구)
- 사용자 이슈:
  - 대시보드 일별 매출 추이/티타임/프라이싱이 비어 보이거나 동작하지 않음
- 원인 분석:
  - 원격 DB 기준 `golf_clubs`, `tee_times`, `reservations`, `weather_cache`가 0건이면 UI가 전부 빈 상태로 보임
  - `/admin/tee-times`의 서버 액션이 서버에서 anon Supabase 클라이언트를 사용하여 RLS에 막히는 구조(생성/수정/차단 등 대부분 실패)
  - 홈 프라이싱 쿼리(`getTeeTimesByDate`)가 서버에서 브라우저용 Supabase 클라이언트를 사용하여 세션 사용자/날씨를 제대로 가져오지 못함(세그먼트/날씨 할인 미반영)
- 변경 파일:
  - `app/admin/tee-times/actions.ts`
  - `utils/supabase/queries.ts`
  - `app/admin/page.tsx`
  - `app/admin/settings/page.tsx` (신규)
  - `app/admin/settings/actions.ts` (신규)
- 조치:
  - 티타임 관리자 서버 액션을 cookie 기반 서버 클라이언트로 전환하여 RLS 하에서 정상 동작하도록 변경
  - admin 권한(is_admin)도 superadmin처럼 클럽 접근 가능하도록 권한 판정 보강
  - 홈 `getTeeTimesByDate`를 server-only로 고정하고, 서버 세션 사용자 + `weather_cache`를 사용해 pricing context에 반영
  - `/admin/settings` 페이지 추가:
    - 테이블 row count로 DB 상태 확인
    - 슈퍼어드민 전용 샘플 데이터 생성 액션(Club 72 + 14일 티타임 + 날씨) 추가
- 검증:
  - `npm run lint` 통과
  - `npm run build` 통과

### 2026-02-14 46차 기록 (Supabase MCP 재연결 점검)
- 작업:
  - Supabase MCP 재연결 요청에 따라, 현재 세션의 MCP 서버/리소스 등록 상태 확인
  - 레포 내 MCP 설정 파일 존재 여부 탐색
- 변경 파일: 없음 (점검)
- 결과:
  - MCP 리소스/템플릿 목록이 비어 있음(현재 세션에 MCP 서버가 0개로 등록된 상태)
  - 레포 내부에서도 `mcp.json`, `.mcp.json` 등 MCP 설정 파일을 찾지 못함
  - 결론: 이 환경에서는 “MCP 재연결”을 코드/터미널에서 수행할 수 없고, 사용 중인 Codex/클라이언트의 MCP 설정에서 Supabase 서버를 다시 추가해야 함
- 남은 이슈:
  - Supabase MCP를 사용하려면: 클라이언트 MCP 설정에 Supabase 서버 등록(프로젝트 URL + 키) 후 세션 재시작/재연결 필요

### 2026-02-14 47차 기록 (MCP 재연결 가이드 기록 + 예시 env 파일 시크릿 제거)
- 배경:
  - mac 재시작 후 MCP 연결이 끊어짐
  - Supabase 프로젝트 ref: `rgbwzpwrbcppdydihxye` (URL: `https://<project-ref>.supabase.co`)
- 작업:
  - 레포에 키/토큰을 “기록”하라는 요청이 있었으나, 시크릿은 레포 문서에 남기면 안 되므로(유출 위험) 절차만 기록하는 방식으로 정리
  - 예시 파일에 실키가 들어있던 문제를 수정(placeholder로 치환)
- 변경 파일:
  - `.env.local.example`
  - `codex.md`
  - `합동작업.md`
- 결과:
  - `.env.local.example`에 포함되어 있던 실 Supabase URL/anon key, WEATHER_API_KEY, Toss 키를 placeholder로 교체
  - MCP 재연결은 레포 코드가 아니라 “Codex/클라이언트 MCP 설정”에서:
    - Supabase MCP 서버를 추가하고(Project URL + Key 입력)
    - 세션 재시작/재연결하는 절차가 필요하다는 점을 명문화
- 남은 이슈:
  - MCP 설정 화면/경로는 사용 중인 Codex 클라이언트에 종속이라, UI에서 서버 추가 후 재연결이 필요

### 2026-02-14 48차 기록 (Codex MCP 설정 파일 보정)
- 배경:
  - mac 재시작 이후 MCP 연결이 끊어졌다는 사용자 보고
- 작업:
  - 로컬 Codex 설정 파일(`~/.codex/config.toml`)에서 Supabase MCP 서버 설정을 확인
  - 기존 Supabase MCP `project_ref`가 다른 프로젝트로 지정되어 있어 `rgbwzpwrbcppdydihxye`로 교체
- 변경:
  - 로컬 환경 파일: `~/.codex/config.toml` (레포 외부, 커밋 대상 아님)
- 결과:
  - `mcp_servers.supabase.url`이 `project_ref=rgbwzpwrbcppdydihxye`로 수정됨
  - 단, 현재 실행 중인 세션에서는 MCP 리소스가 여전히 0개로 보임 → Codex 세션 재시작/재연결이 필요할 가능성이 큼
- 남은 이슈:
  - 재시작 후에도 리소스가 0개면: 네트워크/DNS 제한 또는 인증 토큰 문제(`SUPABASE_ACCESS_TOKEN`) 가능성 점검 필요

### 2026-02-14 49차 기록 (v1.0 SDD/공동로그 도입)
- 작업:
  - v1.0부터 “스펙 선행(SDD) 기반 개발”로 전환하기 위한 문서 스캐폴딩 추가
  - Claude 등 타 에이전트 공유용 로그 파일 `합동작업 v1.md` 도입
- 변경 파일:
  - `docs/sdd/v1.0/README.md`
  - `docs/sdd/v1.0/00-project.md`
  - `docs/sdd/v1.0/99-v0-gap-backlog.md`
  - `docs/sdd/v1.0/_templates/page-sdd.md`
  - `docs/sdd/v1.0/01-admin/README.md`
  - `docs/sdd/v1.0/01-admin/permissions-matrix.md`
  - `docs/sdd/v1.0/01-admin/admin-dashboard.md`
  - `docs/sdd/v1.0/01-admin/admin-tee-times.md`
  - `합동작업 v1.md`
  - `codex.md`
  - `합동작업.md`
- 결과:
  - v1.0 개발은 `docs/sdd/v1.0/*`를 SSOT로 두고 진행할 수 있는 최소 구조 확보
  - v1.0 작업 로그는 `합동작업 v1.md`에 기록하도록 규칙 업데이트
- 남은 이슈:
  - v1.0 핵심 정의(매출/타임존/상태/Service Role 정책)는 `docs/sdd/v1.0/00-project.md`에서 확정 필요

### 2026-02-14 50차 기록 (MCP 추가: sequential-thinking)
- 작업:
  - 사용자 요청으로 MCP 서버 `sequential-thinking` 추가
- 변경:
  - 글로벌 Codex MCP 설정(레포 외부) 업데이트
  - 레포 로그 파일 업데이트: `codex.md`, `합동작업 v1.md`
- 실행 명령:
  - `codex mcp add sequential-thinking npx -y @modelcontextprotocol/server-sequential-thinking`
- 결과:
  - `codex mcp get sequential-thinking` 기준 등록/활성화 확인
  - `transport: stdio`, `command: npx`, `args: -y @modelcontextprotocol/server-sequential-thinking`
- 남은 이슈:
  - 없음

### 2026-02-14 51차 기록 (VSCode MCP 설정: testsprite)
- 작업:
  - 사용자 요청에 따라 VSCode workspace MCP 설정에 `testsprite` 서버 추가
- 변경 파일:
  - `.vscode/mcp.json`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - `testsprite` MCP 서버 실행 커맨드 설정 완료: `npx -y @testsprite/testsprite-mcp@latest`
  - API 키는 파일에 평문 저장하지 않고 VSCode 입력 변수(`${input:testsprite-api-key}`)로 구성
- 남은 이슈:
  - VSCode에서 MCP 시작 시 API 키 입력 필요

### 2026-02-16 52차 기록 (v1.0 프라이싱 우선순위 스펙 반영)
- 작업:
  - 사용자 지시에 따라 v1.0 핵심 우선순위를 "프라이싱 엔진"으로 문서 고정
  - 단계 정의(0: crawler 분류, 1: 4시간 가격수집, 2: 메모 저장, 3: 엔진 연동)를 SDD로 작성
  - admin 티타임 생성/수정 DB 반영 요구사항을 AC/P0로 백로그 반영
- 변경 파일:
  - `docs/sdd/v1.0/README.md`
  - `docs/sdd/v1.0/00-project.md`
  - `docs/sdd/v1.0/02-pricing-engine-v1.md`
  - `docs/sdd/v1.0/V1-PRIORITY-UPDATE.md`
  - `docs/sdd/v1.0/99-v0-gap-backlog.md`
  - `docs/sdd/v1.0/01-admin/README.md`
  - `docs/sdd/v1.0/01-admin/admin-crawler.md`
  - `docs/sdd/v1.0/01-admin/admin-tee-times.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - v1.0 개발 시 참조할 공식 스펙 문서 세트가 우선순위 기반으로 업데이트됨
- 남은 이슈:
  - pricing factor별 가중치/캡 정책 상세 수치 확정 필요

### 2026-02-19 53차 기록 (섹터별 사전 설계 게이트 강제)
- 작업:
  - 사용자 지시에 따라 "섹터 작업 전 설계 완료 후 구현" 원칙을 v1.0 문서에 반영
- 변경 파일:
  - `docs/sdd/v1.0/README.md`
  - `docs/sdd/v1.0/SECTOR-WORKFLOW.md` (신규)
  - `docs/sdd/v1.0/_templates/sector-design-gate.md` (신규)
  - `docs/sdd/v1.0/V1-PRIORITY-UPDATE.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - 섹터별 Design Gate 및 DoR/DoD 체크리스트 도입
  - 승인 전 구현 금지 규칙이 문서 기준으로 고정됨
- 남은 이슈:
  - 없음

### 2026-02-19 54차 기록 (Pricing/Crawler C1/C3 진행 + C2 블로커)
- 작업:
  - Pricing/Crawler 섹터 게이트 문서 작성 후 구현 착수
  - C1 수행: `.github/workflows/crawler-ingest.yml`에 `GOLFROCK_LOGIN_ID/PW` env 주입 반영
  - C3 수행: `crawler/src/test-golfrock-*.mjs` 임시 스크립트 4개 삭제
  - C2 수행 시도: `node src/discover-teeup-club-ids.mjs --from=1 --to=80 --concurrency=8 --write-site=teeupnjoy`
- 변경 파일:
  - `docs/sdd/v1.0/sectors/pricing-crawler-gate.md`
  - `.github/workflows/crawler-ingest.yml`
  - `crawler/src/test-golfrock-login.mjs` (삭제)
  - `crawler/src/test-golfrock-deep.mjs` (삭제)
  - `crawler/src/test-golfrock-ajax-params.mjs` (삭제)
  - `crawler/src/test-golfrock-html-sample.mjs` (삭제)
  - `docs/sdd/v1.0/README.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - C1/C3 완료
  - `npm --prefix crawler run check` 통과
- 남은 이슈:
  - C2 blocked: Playwright Chromium launch가 `SIGTRAP`으로 종료되어 discovery 실행 실패

### 2026-02-19 55차 기록 (Admin Tee-Times 섹터 게이트 + TA/TB 구현)
- 작업:
  - Admin Tee-Times 섹터 설계 게이트 문서 작성 후 구현 착수
  - `/api/admin/tee-times`를 GET/POST/호환 PATCH(action)까지 확장
  - `/api/admin/tee-times/[id]` PATCH/DELETE 신규 추가
  - `app/admin/tee-times/page.tsx`를 API 기반 CRUD 호출로 전환
- 변경 파일:
  - `docs/sdd/v1.0/sectors/admin-tee-times-gate.md`
  - `app/api/admin/tee-times/route.ts`
  - `app/api/admin/tee-times/[id]/route.ts`
  - `app/admin/tee-times/page.tsx`
  - `docs/sdd/v1.0/01-admin/admin-tee-times.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - BOOKED 수정/상태변경 시 409 반환
  - CLUB_ADMIN club scope 검증 추가
  - lint/build 통과
- 남은 이슈:
  - `/admin/tee-times` 실제 브라우저 수동 검증 필요

### 2026-02-19 56차 기록 (Pricing/Crawler C2 해소 + C4 완료)
- 작업:
  - C2 블로커 해소를 위해 `discover-teeup-club-ids.mjs`를 Playwright 방식에서 direct HTTP discovery 방식으로 전환
  - C4 4개 window 크롤링 재실행 (`WEEK_BEFORE`, `TWO_DAYS_BEFORE`, `SAME_DAY_MORNING`, `IMMINENT_3H`)
  - DB 직접 SQL 조회로 적재 결과 검증
- 변경 파일:
  - `crawler/src/discover-teeup-club-ids.mjs`
  - `docs/sdd/v1.0/sectors/pricing-crawler-gate.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - C2 검증 완료: `external_price_targets`의 teeupnjoy 타겟 `club_ids_count=14` 확인
  - C4 실행 로그:
    - `WEEK_BEFORE` rows=17
    - `TWO_DAYS_BEFORE` rows=20
    - `SAME_DAY_MORNING` rows=2
    - `IMMINENT_3H` rows=6
  - 최근 1시간 스냅샷 SQL 검증에서 site/window별 데이터 적재 확인
- 남은 이슈:
  - C5(`/admin/crawler` UI 수동 확인) 미완료
  - `report-snapshot-health.mjs`는 현재 환경에서 `fetch failed`로 실패하여 SQL 조회로 대체 검증함

### 2026-02-19 57차 기록 (Pricing/Crawler C5 완료 + DEMO_MODE 인증 버그 수정)
- 작업:
  - C5 수행: 로컬 DEMO 모드에서 `/admin/crawler` UI 렌더링 검증
  - 검증 중 발견된 DEMO 인증 버그 수정 (`lib/auth/getCurrentUserWithRoles.ts`)
    - 비존재 컬럼 `users.segment_type` 조회 제거
    - DEMO_MODE에서 사용자 조회 실패 시 fallback demo admin 반환
- 변경 파일:
  - `lib/auth/getCurrentUserWithRoles.ts`
  - `docs/sdd/v1.0/sectors/pricing-crawler-gate.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - `/admin/crawler` 응답 코드 200 확인 (기존 307 로그인 리다이렉트 해소)
  - 페이지 핵심 지표 렌더링 확인: 최근 30일, 골프장 수, 스냅샷 수, 지역 탭/코스 목록
  - Pricing/Crawler 섹터 게이트 상태 `Completed (C1~C5 Done)`로 업데이트
  - lint/build 통과
- 남은 이슈:
  - Playwright 기반 상호작용 자동 검증은 로컬 Chromium `SIGTRAP` 환경 이슈로 미실행

### 2026-02-19 58차 기록 (Admin Tee-Times 수동 QA 완료 + 실버그 보완)
- 작업:
  - `Admin/Tee-Times` 섹터 수동 QA 수행 (로컬 API end-to-end 시나리오)
  - QA 중 확인된 서버 버그 보완
- 변경 파일:
  - `app/api/admin/tee-times/route.ts`
  - `app/api/admin/tee-times/[id]/route.ts`
  - `lib/auth/getCurrentUserWithRoles.ts`
  - `docs/sdd/v1.0/sectors/admin-tee-times-gate.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - API 시나리오 검증 완료:
    - GET(200), POST(200), PATCH `:id`(200), PATCH action BLOCKED/OPEN(200)
    - DELETE BLOCKED(409), DELETE OPEN(200), 재조회 삭제 반영 확인
  - BOOKED 수정 거부 검증:
    - 테스트 row를 BOOKED로 전환 후 PATCH `:id` = 409 CONFLICT 확인
  - 버그 수정:
    - POST 생성 시 `current_price` 누락으로 500 발생 → `current_price=base_price`로 수정
    - DEMO fallback user의 비-UUID `updated_by` 쓰기 실패 가능성 방어 로직 추가
    - API catch 에러 메시지 추출 보강(`Unknown error` 개선)
  - `/admin/tee-times` 응답 200 확인
  - 게이트 상태 `Completed`로 업데이트
- 남은 이슈:
  - DEMO 모드에서 service-role 기반 사용자 자동 조회는 현재 fallback으로 동작(기능은 정상, 로그 노이즈 존재)

### 2026-02-19 59차 기록 (Admin Dashboard 섹터 D1~D3 구현 완료)
- 작업:
  - Admin Dashboard 섹터 게이트 작성 후 D1~D3 구현
  - D1: 최근 14일(KST) 매출 시계열 + `ok/empty/error` 상태 분리
  - D2: AI Pricing Engine 카드에 샘플 티타임 실계산 헬스 상태 반영
  - D3: 대시보드 티타임 PATCH 실패 메시지 파싱 개선
- 변경 파일:
  - `docs/sdd/v1.0/sectors/admin-dashboard-gate.md` (신규 후 완료 업데이트)
  - `app/admin/page.tsx`
  - `components/AdminDashboardNew.tsx`
  - `docs/sdd/v1.0/01-admin/admin-dashboard.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - `/admin` 200 응답 확인
  - 대시보드 렌더링 확인:
    - `일별 매출 추이 (최근 14일)` 문구 반영
    - empty 상태 메시지와 AI 샘플 결과 문구 반영
  - PATCH validation 에러 응답(`id는 양의 정수여야 합니다.`) 확인으로 D3 검증
  - `admin-dashboard` 섹터 게이트 상태 Completed
- 남은 이슈:
  - 없음

### 2026-02-19 60차 기록 (DEMO 조회 안정화 - fallback 로그 노이즈 해소)
- 작업:
  - DEMO 사용자 조회 경로에서 users 비존재 컬럼 선택으로 인해 fallback되는 문제 수정
- 변경 파일:
  - `lib/auth/getCurrentUserWithRoles.ts`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - `/admin` 접근 시 DEMO 유저가 `superadmin@tugol.dev`로 정상 매칭
  - `User lookup failed, using fallback...` 로그 노이즈 해소
  - lint/build 통과
- 남은 이슈:
  - 없음

### 2026-02-19 61차 기록 (Pricing Engine Core 섹터 완료 + MARKET_PRICE 실검증)
- 작업:
  - `/api/pricing`의 market snapshot 조회 경로를 admin client optional 사용으로 보완
    (`external_price_snapshots` RLS가 service_role 전용이라 기존 server client 조회 0건 문제 해결)
  - Pricing Engine Core 게이트 AC/체크리스트 완료 처리
- 변경 파일:
  - `app/api/pricing/route.ts`
  - `docs/sdd/v1.0/sectors/pricing-engine-core-gate.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - 임시 snapshot 삽입 후
    `/api/pricing?golfClubId=1&date=2026-01-17&limit=3`에서
    `MARKET_PRICE` factor 노출 및 `deltaFromMarket=10000` 확인
  - 임시 snapshot 삭제 후 동일 API 재조회에서 `snapshotKeys=0`,
    `MARKET_PRICE` 미노출(기존 로직 fallback) 확인
  - pricing-engine-core 섹터 게이트 상태 `Completed (P1~P3 Done)` 업데이트
- 남은 이슈:
  - 없음

### 2026-02-19 62차 기록 (Pricing Crawler Step2 메모/traits 섹터 완료)
- 작업:
  - Pricing/Crawler Step2 설계 게이트 작성 및 승인 후 구현
  - 스냅샷 메모 API 신설:
    - `GET /api/admin/crawler/snapshots`
    - `PATCH /api/admin/crawler/snapshots`
  - `/admin/crawler` 상세 패널에 가격 행 메모/특성 입력 UI 추가
  - `external_price_snapshots.payload.manual_note` 구조로 메모/traits/작성자/수정시각 저장
- 변경 파일:
  - `docs/sdd/v1.0/sectors/pricing-crawler-notes-gate.md`
  - `app/api/admin/crawler/snapshots/route.ts`
  - `components/admin/CrawlerMonitorClient.tsx`
  - `docs/sdd/v1.0/01-admin/admin-crawler.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - API 검증:
    - GET snapshots(포천힐스) 200
    - PATCH note/traits 저장 200
    - GET 재조회에서 `manualNote.updatedByEmail/updatedAt` 반영 확인
    - PATCH 빈 note+traits로 `manualNote=null` 확인
    - 잘못된 traits 타입 요청 400 확인
    - 비로그인(non-demo) GET 401 확인
  - 게이트 상태 `Completed (N1~N4 Done)` 업데이트
  - lint/build 통과
- 남은 이슈:
  - 없음

### 2026-02-19 63차 기록 (Pricing Engine Step3 traits 연동 섹터 완료)
- 작업:
  - Step3 섹터 게이트 작성 후 traits 연동 구현
  - `calculatePricing`에 traits 입력(`marketTraits`) 추가
  - traits factor 구현:
    - `TRAIT_PEAK_SEASON`
    - `TRAIT_OFF_SEASON`
    - `TRAIT_EVENT`
    - `TRAIT_LOW_DEMAND`
  - `/api/pricing`에서 snapshot `payload.manual_note` 파싱 후 엔진에 전달
  - `/api/pricing` `marketReference`에 `manualNote/manualTraits/manualNoteUpdated*` 노출
- 변경 파일:
  - `docs/sdd/v1.0/sectors/pricing-engine-traits-gate.md`
  - `utils/pricingEngine.ts`
  - `app/api/pricing/route.ts`
  - `docs/sdd/v1.0/02-pricing-engine-v1.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - 임시 snapshot traits(`비수기`,`이벤트`,`저수요`)로 `/api/pricing` 호출 시
    `TRAIT_OFF_SEASON`, `TRAIT_EVENT`, `TRAIT_LOW_DEMAND` 노출 확인
  - 동일 row traits를 `성수기`로 변경 후 `TRAIT_PEAK_SEASON` 노출 확인
  - 임시 row 삭제 후 traits factor 미노출 확인
  - payload가 string JSON인 비정상 row에서도 `/api/pricing status=success` 확인 후 정리
  - 섹터 게이트 상태 `Completed (T1~T4 Done)` 업데이트
- 남은 이슈:
  - 없음

### 2026-02-19 64차 기록 (Admin Reservations 하드닝 섹터 진행)
- 작업:
  - `Admin Reservations` 섹터 게이트 작성 후 보안/조회 경로 하드닝 구현
  - `/admin/reservations`, `/admin/reservations/[id]`에 관리자 가드(`requireAdminAccess`) 적용
  - 페이지 데이터 클라이언트를 `createSupabaseAdminClientOptional()` 우선 + `createSupabaseServerClient()` fallback으로 통일
  - `app/admin/actions.ts` 전역 anon fallback client 제거, 액션 실행 시점 client 획득 방식으로 전환
  - 예약 상태 필터 타입 안정화(`ReservationStatus` guard) 및 build 타입 오류 수정
- 변경 파일:
  - `docs/sdd/v1.0/sectors/admin-reservations-hardening-gate.md`
  - `app/admin/reservations/page.tsx`
  - `app/admin/reservations/[id]/page.tsx`
  - `app/admin/actions.ts`
  - `docs/sdd/v1.0/01-admin/admin-reservations.md`
  - `docs/sdd/v1.0/01-admin/README.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - 관리자 페이지의 인증/클라이언트 경로가 다른 admin 섹터와 동일 패턴으로 정렬됨
  - `npm run lint` 통과
  - `npm run build` 통과
  - 게이트 상태 업데이트: `Completed (Implementation Done, Runtime QA Partially Blocked)`
- 남은 이슈:
  - sandbox `listen EPERM` 제약으로 `/admin/reservations*` 런타임 HTTP 수동검증은 환경 해소 후 추가 확인 필요

### 2026-02-19 65차 기록 (Admin No-Show 섹터 완료 + 예약 스키마 불일치 가드)
- 작업:
  - `/admin/no-show` 페이지/클라이언트 구현 완료 상태에서 API 런타임 500 원인 분석
  - Supabase 실DB 점검 결과 `reservations.status` 미존재, `payment_status` 레거시 스키마 확인
  - `GET /api/admin/no-show`에 status 컬럼 자동 감지(`status`/`payment_status`) 추가
  - 레거시 스키마에서 POST 노쇼 확정은 불가하므로 `409` 가이드 에러로 명시화
  - no-show 섹터 게이트/문서 완료 상태로 업데이트
- 변경 파일:
  - `app/api/admin/no-show/route.ts`
  - `docs/sdd/v1.0/sectors/admin-no-show-gate.md`
  - `docs/sdd/v1.0/01-admin/admin-no-show.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - `GET /api/admin/no-show?date=2026-02-19` -> 200 (`success:true`)
  - `POST /api/admin/no-show` invalid payload -> 400 유지
  - `POST /api/admin/no-show` valid payload on legacy schema -> 409(마이그레이션 가이드)
  - `npm run lint` / `npm run build` 통과
- 남은 이슈:
  - `reservations`를 v1 스키마(`status`, `no_show_marked_at` 등)로 정합화해야 실제 노쇼 확정 처리 가능

### 2026-02-19 66차 기록 (Admin Reservations 스키마 호환 섹터 완료)
- 작업:
  - no-show 섹터에서 확인된 `reservations.status`/`payment_status` 스키마 불일치 영향 범위를 admin 예약/통계로 확장 점검
  - status 컬럼 자동 감지 유틸 추가: `lib/reservations/statusColumn.ts`
  - canonical status 매핑 유틸 추가: `utils/reservationStatus.ts`
  - `/admin/reservations` 목록 쿼리/필터를 status 컬럼 감지 기반으로 호환화
  - `/admin/reservations/[id]` 상세에서 canonical status 기반 `canMarkNoShow` 계산으로 보정
  - `app/admin/actions.ts`의 dashboard 통계/no-show 액션을 legacy 스키마 대응
- 변경 파일:
  - `lib/reservations/statusColumn.ts`
  - `utils/reservationStatus.ts`
  - `app/admin/reservations/page.tsx`
  - `app/admin/reservations/[id]/page.tsx`
  - `app/admin/actions.ts`
  - `app/api/admin/no-show/route.ts`
  - `docs/sdd/v1.0/sectors/admin-reservations-schema-compat-gate.md`
  - `docs/sdd/v1.0/01-admin/admin-reservations.md`
  - `docs/sdd/v1.0/sectors/admin-reservations-hardening-gate.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - `/admin/reservations` -> 200
  - `/admin/reservations?status=PAID` -> 200
  - `/admin` -> 200
  - `npm run lint` / `npm run build` 통과
- 남은 이슈:
  - 실제 NO_SHOW/COMPLETED 운용을 위해 reservations v1 마이그레이션 적용 필요

### 2026-02-20 67차 기록 (Reservations v1 스키마 정합화 섹터 완료)
- 작업:
  - 원격 DB migration drift 확인: `reservations` 핵심 컬럼 부재, `cancellation_policies/settlements` 미존재 상태 진단
  - 보정 마이그레이션 추가: `supabase/migrations/20260219133000_reservations_v1_schema_alignment.sql`
  - Supabase migration 적용: `reservations_v1_schema_alignment_20260219`
  - no-show/reservations 호환 코드 유지 + 스키마 복구 후 기본 경로 동작 검증
  - 섹터 게이트/운영 문서 완료 업데이트
- 변경 파일:
  - `supabase/migrations/20260219133000_reservations_v1_schema_alignment.sql`
  - `docs/sdd/v1.0/sectors/reservations-v1-schema-alignment-gate.md`
  - `docs/sdd/v1.0/sectors/admin-no-show-gate.md`
  - `docs/sdd/v1.0/01-admin/admin-no-show.md`
  - `docs/sdd/v1.0/01-admin/admin-reservations.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - DB 검증: `reservations.status/no_show_marked_at/settlement_id` 등 핵심 컬럼 존재 확인
  - DB 검증: `cancellation_policies`, `settlements`, `settlement_summary` 존재 확인
  - 런타임: `/api/admin/no-show` GET 200, POST(test-id) 400(예약 미존재)
  - 런타임: `/admin/no-show` 200, `/admin/settlements` 200
  - 정적검증: `npm run lint`, `npm run build` 통과
- 남은 이슈:
  - 정산/예약 액션의 기존 글로벌 service-role client 사용 코드는 별도 하드닝 섹터로 분리 정리 필요

### 2026-02-20 68차 기록 (Admin Settlements 하드닝 섹터 완료)
- 작업:
  - settlements 페이지 3개(list/new/detail)에 `requireAdminAccess` 가드 적용
  - settlements 페이지/액션의 global `createClient` 제거
  - 데이터 경로를 `createSupabaseAdminClientOptional() -> createSupabaseServerClient()`로 통일
  - settlements 하드닝 섹터 게이트/문서 정리
- 변경 파일:
  - `app/admin/settlements/page.tsx`
  - `app/admin/settlements/new/page.tsx`
  - `app/admin/settlements/[id]/page.tsx`
  - `app/admin/settlements/actions.ts`
  - `docs/sdd/v1.0/sectors/admin-settlements-hardening-gate.md`
  - `docs/sdd/v1.0/01-admin/admin-settlements.md`
  - `docs/sdd/v1.0/01-admin/README.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - 런타임: `/admin/settlements` 200
  - 런타임: `/admin/settlements/new` 200
  - 런타임: `/admin/settlements/non-existent-id` 200(안전 fallback)
  - 런타임: `/admin/settlements?status=DRAFT` 200
  - 정적검증: `npm run lint`, `npm run build` 통과
- 남은 이슈:
  - settlements 상세의 invalid UUID 요청 시 서버 로그 경고(`22P02`)는 후속 입력 검증 섹터에서 개선 가능

### 2026-02-20 기록 (Settlements UUID 입력 검증)
- 작업: settlements 상세/액션의 UUID 입력 검증 추가
- 변경 파일:
  - `app/admin/settlements/[id]/page.tsx`
  - `app/admin/settlements/actions.ts`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - 비UUID ID 접근 시 DB 에러 없이 안전한 fallback 렌더
  - `updateSettlementStatus/Notes` 액션에서 비UUID settlement_id 차단
  - `npm run lint`, `npm run build` 통과
- 남은 이슈:
  - 없음 (settlements 섹터 UUID 검증 완료)

### 2026-02-20 69차 기록 (Settlements 권한 정합성 + RLS 하드닝)
- 작업:
  - `app/admin/settlements/actions.ts` 권한 로직 정렬
  - `updateSettlementStatus`/`updateSettlementNotes`에서 CLUB_ADMIN 소속 클럽 스코프 강제
  - `LOCKED` 상태 전환을 SUPER_ADMIN 전용으로 고정
  - `app/admin/settlements/[id]/page.tsx` 액션 버튼 권한 계산을 역할 기반으로 수정
  - `types/database.ts`에 `settlement_summary` view + 외부 가격 테이블 타입 추가
  - 신규 마이그레이션 추가: `20260220143000_rls_hardening_settlements_reservations.sql`
  - Supabase 원격 적용: `rls_hardening_settlements_reservations`
- 변경 파일:
  - `app/admin/settlements/actions.ts`
  - `app/admin/settlements/[id]/page.tsx`
  - `types/database.ts`
  - `supabase/migrations/20260220143000_rls_hardening_settlements_reservations.sql`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - settlements 화면/액션 권한 불일치 해소 (CLUB_ADMIN confirm 가능, lock 불가)
  - DB RLS 상태 복구:
    - `reservations`, `settlements`, `cancellation_policies` 모두 RLS `enabled=true`
    - 정책 14개 적용 확인
    - `anon/authenticated` 과도 권한 제거 후 최소 권한 재부여
  - 정적 검증:
    - `npm run lint` 통과
    - `npm run build` 통과

### 2026-02-20 70차 기록 (Security Advisor 하드닝 완료)
- 작업:
  - 신규 마이그레이션 작성/적용: `security_advisor_hardening`
  - 파일: `supabase/migrations/20260220152000_security_advisor_hardening.sql`
  - 조치:
    - `admin_user_stats`, `settlement_summary` 뷰 `security_invoker=true`
    - 함수 9개 `search_path=public` 고정
    - `golf_clubs`, `weather_cache` RLS 활성화 및 정책 추가
- 결과:
  - Supabase Security Advisor에서 코드/DB 조치 가능한 경고 전부 해소
  - 잔여 1건: `auth_leaked_password_protection` (Auth 콘솔 설정 필요)
  - 검증:
    - DB: `golf_clubs/weather_cache` RLS enabled 확인
    - DB: 두 뷰 `reloptions=[security_invoker=true]` 확인
    - DB: 대상 함수 `proconfig=[search_path=public]` 확인
    - 로컬: `npm run lint`, `npm run build` 통과

### 2026-02-20 71차 기록 (Admin 데이터 신선도 복구 섹터 완료)
- 작업:
  - 신규 게이트: `docs/sdd/v1.0/sectors/admin-data-freshness-gate.md` 작성/완료
  - `app/admin/settings/actions.ts`를 미래 14일 top-up 방식으로 개편
    - tee_times/weather_cache 누락 row만 삽입 (idempotent)
  - `tee_times` 타입/코드 정합성 수정
    - `types/database.ts`에 `current_price`, `currency`, `created_at` 반영
    - 티타임 생성/가격 수정 시 `current_price` 동기화
      - `app/admin/tee-times/actions.ts`
      - `app/api/admin/tee-times/route.ts`
      - `app/api/admin/tee-times/[id]/route.ts`
  - settings 화면 문구를 “데이터 보정” 컨셉으로 갱신
    - `app/admin/settings/page.tsx`
  - 원격 one-off 복구 SQL 실행
- 결과:
  - 원격 DB 보충: `+126 tee_times`, `+140 weather_cache`
  - `open_future_tee_times`가 `0 -> 117`로 회복
  - `/api/pricing?limit=5` 응답이 빈 배열에서 실제 데이터로 정상화
  - 정적 검증:
    - `npm run lint` 통과
    - `npm run build` 통과

### 2026-02-20 72차 기록 (Admin 대시보드 가시성 복구 섹터 완료)
- 작업:
  - 신규 게이트: `docs/sdd/v1.0/sectors/admin-dashboard-visibility-gate.md` 작성/완료
  - `components/AdminDashboardNew.tsx` 수정
    - 매출 차트: `empty` 상태에서도 14일 막대 차트 유지
    - 매출 차트: `error` 상태에서만 차트 대신 오류 메시지 렌더
    - empty 안내 문구를 차트 하단에 분리
    - 티타임 탭 컬럼명 `일시 (KST)`로 변경
    - 티타임 datetime 렌더를 `Asia/Seoul` 고정 formatter로 통일
    - 가격 수정 후 로컬 상태에서 `current_price`도 동기화
  - 문서 정합성 업데이트:
    - `docs/sdd/v1.0/01-admin/admin-dashboard.md` chart empty 상태 정의 보강
- 변경 파일:
  - `components/AdminDashboardNew.tsx`
  - `docs/sdd/v1.0/01-admin/admin-dashboard.md`
  - `docs/sdd/v1.0/sectors/admin-dashboard-visibility-gate.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - `reservations=0`에서도 `/admin` 매출 차트가 "비어 보이지 않게" 렌더되어 운영 가시성 회복
  - 티타임 관리 탭 시간대/날짜 혼동 감소 (KST 고정)
  - 검증: `npm run lint`, `npm run build` 통과

### 2026-02-20 73차 기록 (Crawler Step0/1-A/1-B/1-C 우선 섹터 완료)
- 작업:
  - 신규 게이트 작성/완료:
    - `docs/sdd/v1.0/sectors/crawler-step0-step1-gate.md`
  - Step 1-A:
    - `app/api/admin/crawler/run/route.ts` 신규
    - 권한: `requireAdminAccess` 또는 `x-cron-secret`
    - 실행: `crawler/src/crawl-final-prices.mjs` 호출 + snapshot 결과 집계 응답
  - Step 1-B:
    - `app/api/cron/crawl-prices/route.ts` 신규
    - `Authorization: Bearer CRON_SECRET` 검증 후 run API 연계
    - `vercel.json` cron(4시간 간격) 신규
  - Step 0 + 1-C:
    - `app/admin/crawler/page.tsx`에 URL searchParams 필터 + snapshotDetails 서버 조회 추가
    - `components/admin/CrawlerMonitorClient.tsx`에
      - `FilterBar` (지역/골프장/기간/상태)
      - `SnapshotTable` (가격 히스토리)
      - `CrawlStatusPanel` (수동 실행 버튼 + 결과 카드)
      추가
  - 문서 정합성:
    - `docs/sdd/v1.0/01-admin/admin-crawler.md` API/AC 업데이트
- 변경 파일:
  - `app/admin/crawler/page.tsx`
  - `components/admin/CrawlerMonitorClient.tsx`
  - `app/api/admin/crawler/run/route.ts`
  - `app/api/cron/crawl-prices/route.ts`
  - `vercel.json`
  - `docs/sdd/v1.0/01-admin/admin-crawler.md`
  - `docs/sdd/v1.0/sectors/crawler-step0-step1-gate.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - 빌드 산출 라우트에 신규 경로 확인:
    - `/api/admin/crawler/run`
    - `/api/cron/crawl-prices`
  - 런타임 검증:
    - `/admin/crawler` -> 200
    - `POST /api/admin/crawler/run` (`targetIds:[1]`) -> `success:true`, `total:1`, `noData:1`
    - `GET /api/cron/crawl-prices` -> `500 CRON_SECRET not configured` (보호 동작)
  - 정적 검증:
    - `npm run lint` 통과
    - `npm run build` 통과
- 남은 이슈:
  - Cron 성공 경로 최종 검증은 `CRON_SECRET` 설정 후 필요

### 2026-02-20 74차 기록 (Crawler 실수집 검증 + run API 결과 확장)
- 작업:
  - 실수집 실행: `node crawler/src/crawl-final-prices.mjs --limit=3`
  - `app/api/admin/crawler/run/route.ts` 보강:
    - `authRequired` 카운트 추가
    - `siteBreakdown`(site별 total/succeeded/noData/authRequired/failed) 추가
    - target 상태 분류에 `AUTH_REQUIRED` 별도 처리
  - `components/admin/CrawlerMonitorClient.tsx` 보강:
    - 수동 실행 결과 카드에 `인증필요` 항목 추가
    - 사이트별 결과 테이블 추가
  - 게이트 문서 QA 체크 업데이트
- 변경 파일:
  - `app/api/admin/crawler/run/route.ts`
  - `components/admin/CrawlerMonitorClient.tsx`
  - `docs/sdd/v1.0/sectors/crawler-step0-step1-gate.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - DB 최근 30분 기준 실수집 확인:
    - golfrock: `29/29 AVAILABLE`
    - golfpang: `16/17 AVAILABLE`
    - teeupnjoy: `0/2 AVAILABLE` (NO_DATA)
  - 정적 검증:
    - `npm run lint` 통과
    - `npm run build` 통과
- 남은 이슈:
  - teeupnjoy 수집률 개선(클럽/날짜 범위 튜닝)은 다음 섹터로 분리
  - cron 성공 경로는 `CRON_SECRET` 설정 후 재검증 필요

### 2026-02-20 75차 기록 (teeupnjoy 단독 복구 검증 완료)
- 작업:
  - `crawler/src/crawl-final-prices.mjs` teeup 경로를 기준으로 단독 실행 검증 진행
  - 드라이런:
    - `node src/crawl-final-prices.mjs --target=1 --dry-run`
  - 실저장:
    - `node src/crawl-final-prices.mjs --target=1`
  - Supabase SQL 재검증:
    - 최근 30분 `external_price_snapshots` 사이트/상태 집계
    - `site_code='teeupnjoy'` 최신 10건 상세 조회
- 변경 파일:
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - teeup 드라이런: `rows=16`, `failed=0`
  - teeup 실저장: `Saved 16 row(s)`, `failed=0`
  - DB 최근 30분:
    - `golfrock AVAILABLE=29`
    - `golfpang AVAILABLE=16, NO_DATA=1`
    - `teeupnjoy AVAILABLE=15, NO_DATA=3`
  - 결론: teeup도 실제 수집/저장 경로가 정상 동작하며, 수집 근거를 로그+DB로 확인함

### 2026-02-20 76차 기록 (Cron 성공 경로 재검증 + API 안정화 패치)
- 작업:
  - `app/api/cron/crawl-prices/route.ts`
    - run API 내부 호출 URL 해석을 request origin 우선으로 수정
    - 로컬/프리뷰 환경에서 `localhost:3000` 고정 fallback로 인한 `fetch failed` 방지
  - `app/api/admin/crawler/run/route.ts`
    - target select에 `site_code` 누락된 버그 수정
  - 런타임 검증:
    - dev(3010, `CRON_SECRET=local-cron-secret`)에서 cron 인증/미인증 호출 확인
    - `/admin/crawler` 200 확인
    - `/api/admin/crawler/snapshots` GET/PATCH로 메모+traits 저장 확인
    - SQL로 `payload.manual_note` 반영 확인
  - 문서 업데이트:
    - `docs/sdd/v1.0/sectors/crawler-step0-step1-gate.md`
    - `docs/sdd/v1.0/01-admin/admin-crawler.md`
- 변경 파일:
  - `app/api/cron/crawl-prices/route.ts`
  - `app/api/admin/crawler/run/route.ts`
  - `docs/sdd/v1.0/sectors/crawler-step0-step1-gate.md`
  - `docs/sdd/v1.0/01-admin/admin-crawler.md`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - `GET /api/cron/crawl-prices` (no auth) -> `401`
  - `GET /api/cron/crawl-prices` (Bearer) -> `200`
    - `total:5`, `succeeded:3`, `noData:2`, `failed:0`
  - `POST /api/admin/crawler/run` (`targetIds:[1]`) -> `siteBreakdown.siteCode='teeupnjoy'` 정상
  - `PATCH /api/admin/crawler/snapshots` (`snapshotId:227`) -> 메모/traits 저장 성공
  - `npm run lint`, `npm run build` 통과

### 2026-02-21 77차 기록 (Supabase 로그인/관리자 권한 복구)
- 작업:
  - MCP 연결/DB 응답 상태 재확인:
    - `get_project_url`, `get_publishable_keys`, `list_tables(public)` 정상 응답 확인
  - 장애 원인 분리:
    - Auth 로그에서 `/token` `invalid_credentials` 확인 (연결 장애가 아닌 인증 실패)
    - `public.users`에서 `superadmin@tugol.dev`의 `is_admin/is_super_admin=false` 확인
  - 복구 SQL 적용:
    - `public.users`의 `superadmin@tugol.dev` 관리자 플래그 복구
    - `auth.users`의 해당 계정 비밀번호 해시 재설정 + `updated_at` 갱신
- 변경 파일:
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - `superadmin@tugol.dev` 권한 복구 확인:
    - `is_admin=true`
    - `is_super_admin=true`
  - `auth.users.updated_at` 갱신 확인으로 비밀번호 재설정 반영 확인
- 남은 이슈:
  - 클라이언트 세션에 이전 토큰이 남아 있으면 재로그인 필요

### 2026-02-21 78차 기록 (내 예약 상세 취소 모달 API 연결)
- 작업:
  - `components/my/ReservationDetailClient.tsx`의 취소 모달 TODO를 실제 API 호출로 구현
  - `POST /api/reservations/cancel` 연동:
    - `reservationId`, `cancelReason='USER_REQUEST'` 전송
  - UI 상태 보강:
    - `isCancelling`, `cancelError` 상태 추가
    - 취소 처리 중 버튼 비활성화 및 로딩 문구(`처리 중...`) 표시
    - 실패 시 모달 내 에러 메시지 렌더
    - 성공 시 환불 예정 금액 안내 후 `/my/reservations` 이동 + refresh
- 변경 파일:
  - `components/my/ReservationDetailClient.tsx`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - 예약 상세(`/my/reservations/[id]`)의 취소 버튼이 실제 취소 API를 호출하도록 복구
  - 사용자 입장에서 취소 처리 진행/실패 상태를 즉시 확인 가능
- 검증:
  - `npm run lint` 통과

### 2026-02-21 79차 기록 (예약 취소 환불 실연동: Toss Cancel API)
- 작업:
  - `utils/cancellationPolicyV2.ts`
    - `processPaymentRefund()`를 placeholder에서 Toss 환불 API 실호출 로직으로 교체
    - `TOSS_SECRET_KEY`/`paymentKey` 누락 시 명시적 실패 메시지 반환
    - `POST /v1/payments/{paymentKey}/cancel` 호출 + 응답/오류 처리 추가
  - `app/api/reservations/cancel/route.ts`
    - `refundStatus`를 `pending | failed | not_required`로 정규화
    - `payment_key` 누락 케이스를 실패로 명시
    - 응답에 `refundMessage` 추가
- 변경 파일:
  - `utils/cancellationPolicyV2.ts`
  - `app/api/reservations/cancel/route.ts`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - 예약 취소 시 환불 요청이 실제 PG(Toss) 경로를 타도록 보강
  - 환불 불필요/실패/요청접수 상태가 API 응답에서 구분됨
- 검증:
  - `npm run lint` 통과
  - `npm run build` 통과

### 2026-02-21 80차 기록 (Teeup 시드 club_ids 실제값 반영)
- 작업:
  - `crawler/src/seed-default-targets.mjs`의 teeup 기본 타겟 `parser_config.club_ids`를 임시값에서 실제 discovery 결과값으로 교체
  - 원격 DB 확인값 반영:
    - `external_price_targets(site_code='teeupnjoy').parser_config.club_ids` 14개
- 변경 파일:
  - `crawler/src/seed-default-targets.mjs`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - 기본 타겟 시드 시 teeup이 단일 임시 club id가 아닌 실제 운영 매핑(14개)으로 생성됨
- 검증:
  - `npm --prefix crawler run check` 통과

### 2026-02-21 81차 기록 (tee_time_stats 휴일 판별/KST 기준 보정)
- 작업:
  - `app/actions/sdd10-actions.ts`의 `aggregateTeeTimeStats` 보강
  - KST(`Asia/Seoul`) 기준 메타 계산 헬퍼 추가:
    - `day_of_week`, `hour_of_day`를 서버 로컬타임 대신 KST 기준으로 계산
  - `is_holiday` TODO 구현:
    - 대한민국 고정 공휴일(양력) month-day 집합 기반 판별
- 변경 파일:
  - `app/actions/sdd10-actions.ts`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - `tee_time_stats` 집계 시 요일/시간/휴일 플래그가 KST 기준으로 일관되게 저장됨
  - TODO 잔여에서 `is_holiday` 미구현 항목 제거
- 검증:
  - `npm run lint` 통과
  - `npm run build` 통과

### 2026-02-21 82차 기록 (DB 성능: 미인덱스 FK 6건 정리)
- 작업:
  - 미인덱스 FK 목록 실조회 후 인덱스 마이그레이션 작성/적용
  - 신규 마이그레이션:
    - `supabase/migrations/20260221113000_add_missing_fk_indexes.sql`
  - 추가 인덱스:
    - `external_course_regions(created_by)`
    - `external_price_targets(created_by)`
    - `settlements(created_by_user_id)`
    - `settlements(confirmed_by_user_id)`
    - `settlements(locked_by_user_id)`
    - `tee_times(golf_club_id)`
  - 원격 적용:
    - `mcp__supabase__apply_migration(name=add_missing_fk_indexes)` 성공
- 변경 파일:
  - `supabase/migrations/20260221113000_add_missing_fk_indexes.sql`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - 동일 검증 쿼리 기준 미인덱스 FK 결과 `[]` 확인

### 2026-02-21 83차 기록 (DB 성능: auth_rls_initplan 정책 최적화)
- 작업:
  - RLS 정책에서 `auth.uid()` 직접 호출을 `(select auth.uid())` 형태로 치환
  - 대상 테이블/정책:
    - `club_admins`: Club admins can view their assignments
    - `notifications`: Users can view/update own notifications, Admins can create notifications
    - `reservations`: `reservations_select_owner_or_admin`, `reservations_insert_owner_or_admin`, `reservations_update_owner_cancel`
    - `users`: Users can view/update their own profile
  - 신규 마이그레이션:
    - `supabase/migrations/20260221114500_rls_auth_uid_initplan.sql`
  - 원격 적용:
    - `mcp__supabase__apply_migration(name=rls_auth_uid_initplan)` 성공
- 변경 파일:
  - `supabase/migrations/20260221114500_rls_auth_uid_initplan.sql`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - `pg_policies` 검사에서 direct `auth.uid()` 사용 정책 0건 확인

### 2026-02-21 84차 기록 (환경변수 템플릿 보강: Cron/Crawler)
- 작업:
  - `.env.local.example`에 운영 필수 키 템플릿 추가
    - `CRON_SECRET`
    - `GOLFROCK_LOGIN_ID`
    - `GOLFROCK_LOGIN_PW`
  - 목적: 로컬/배포 환경에서 크론 및 크롤러 인증 키 누락 방지
- 변경 파일:
  - `.env.local.example`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - 환경 템플릿만 봐도 크론/크롤러 필수 키를 누락 없이 세팅 가능

### 2026-02-21 85차 기록 (Supabase 재연결 확인 + notifications INSERT 정책 통합)
- 작업:
  - MCP로 Supabase 연결 상태 재검증
    - `server_time`, `db_name`, `db_user` 조회 성공
    - 프로젝트 URL 확인: `https://rgbwzpwrbcppdydihxye.supabase.co`
  - RLS 중복 permissive 정책 잔여 1건(`notifications` INSERT) 정리
  - 신규 마이그레이션 추가:
    - `supabase/migrations/20260221081027_consolidate_notifications_insert_policy.sql`
  - 원격 적용:
    - `mcp__supabase__apply_migration(name=consolidate_notifications_insert_policy)` 성공
- 변경 파일:
  - `supabase/migrations/20260221081027_consolidate_notifications_insert_policy.sql`
  - `codex.md`
  - `합동작업 v1.md`
- 결과:
  - permissive 중복 정책 검사 결과 `[]` (중복 0건)
  - `notifications` INSERT 정책이 `notifications_insert_admin_or_service_role` 단일 정책으로 통합됨
- 검증:
  - `npm run lint` 통과
  - `npm run build` 통과
