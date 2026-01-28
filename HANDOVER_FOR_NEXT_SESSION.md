# 🚩 TUGOL 세션 핸드오버 (2026-01-15)

## 📌 현재 개발 상태 (Save Point)
- **버전:** MVP v1.0 완성 및 통합 완료
- **핵심 아키텍처:** Next.js 16 (App Router) + Supabase (Auth/DB) + Toss Payments
- **DB 상태:** UUID 기반 스키마로 완전 전환됨 (`SUPABASE-USER-MIGRATION.sql` 적용 필요)

## ✅ 오늘 완료된 작업 (Priority Queue 1~4)
1.  **DB & User Modeling:**
    *   `users` 테이블 ID를 UUID로 변경하여 Supabase Auth와 완전 연동.
    *   회원가입 시 `public.users`에 자동 기록되는 트리거(Trigger) 설정.
2.  **Admin Dashboard (운영의 뇌):**
    *   **Sales View:** 일별 매출 현황을 보여주는 CSS 기반 막대 그래프 구현.
    *   **Price Override:** 관리자가 티타임의 기준 가격을 즉시 수정하는 기능.
    *   **Weather Sim:** 버튼 클릭으로 DB의 모든 날씨 정보를 랜덤하게 시뮬레이션하는 API 연동.
3.  **Core Pricing Engine:**
    *   DB의 `weather_condition` (JSONB) 데이터를 실제 가격 계산에 반영.
    *   `utils/supabase/queries.ts`를 고도화하여 로그인 유저의 Segment별 할인 적용.
4.  **Legal & Policy:**
    *   이용약관 및 개인정보처리방침 페이지 생성.
    *   로그인 페이지에 동의 문구 및 링크 추가.

## 🚀 다음 세션에서 시작할 일
1.  **실제 결제 테스트:** Toss Payments 테스트 키를 사용하여 결제 완료 후 DB 상태 변경 확인.
2.  **회원 등급(Segment) 자동화:** 유저의 예약 횟수나 금액에 따라 Segment(PRESTIGE, SMART 등)를 자동 갱신하는 배치 로직.
3.  **실제 기상청 API 연동:** 시뮬레이션 대신 실제 기상청 데이터를 받아오는 Worker 구현.

## 🛠 실행 방법
1.  `npm install` (의존성 설치)
2.  `npm run dev` (서버 실행 - 포트 3000)
3.  `http://localhost:3000/admin` 에서 "Weather Sim" 클릭 후 테스트 시작.

## ⚠️ 주의사항
- Supabase DB를 처음 설정할 경우 반드시 `SUPABASE-USER-MIGRATION.sql`을 SQL Editor에서 실행해야 합니다.
- 환경변수(`.env.local`)에 Supabase URL과 Key가 올바르게 설정되어 있는지 확인하십시오.
