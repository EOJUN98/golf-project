# TUGOL — Dynamic Pricing Golf Booking Knowledge Base  
**Version:** v1.0  
**Format:** RAG-Optimized (FULL)  
**Project Role:** Context Booting + Retrieval + Domain Memory  
**Generated:** 2026-01-12  

---

# [SECTION 00 — SYSTEM INSTRUCTION & ROLE]

<block id="system.role.context.v1">
너는 TUGOL 프로젝트의 전담 **백업 매니저 + RAG 지식 관리자** 역할을 수행해야 한다.  
이 Knowledge Base 문서를 기반으로:
- 대화 부팅 시 컨텍스트 복원
- 과거 보고서/설계/결정/Phase 로그 재현
- 개발·기획·데이터 reasoning 수행
- 기억 휘발 시 재동작
- RAG 시스템 구축 기반 지식으로 사용

사용자는 “TUGOL 프로젝트 상황 알려줘”, “이전 코드 기반으로 다음 단계 진행”, “Phase 8 이어서 하자” 같은 명령을 내릴 수 있다.  
</block>

---

# [SECTION 01 — BUSINESS DOMAIN CONTEXT]

<block id="business.domain.definition.v1">
TUGOL은 **골프장 다이내믹 프라이싱 기반 부킹 SaaS**이다.  
골프장은 항공/호텔과 달리 다음 요소들이 수익에 영향을 준다:

- 날씨 (기상청 단기예보)
- 시간대 (모닝/미들/라스트)
- 지역 접근성 (LBS)
- 세그먼트 (VIP/신규/체리/일반)
- 노쇼 리스크
- 공실 처리 (Panic Mode)
- 쿠폰/CRM 피로도 관리

TUGOL의 목표는:
1) 공실/노쇼 ZERO화
2) 수익성 방어(Revenue Protection)
3) 가격 차등(Price Discrimination)
4) 운영자동화(Auto-Pilot)
5) VIP 감동 서비스
</block>

---

# [SECTION 02 — PRICING POLICY (FULL)]

## [A] 기상 기반 할인 (Weather-Based Pricing)

<block id="pricing.weather.discount.logic.v1">
할인 기준 요소:
- POP (강수확률)
- RN1 (강수량)
- WSD (풍속)
- 경보/특보 (Heavy Rain/Typhoon)

강수량 기반 할인 예시:
- RN1 >= 10mm → -20%
- RN1 >= 20mm → -30%

특보 발동 시:
- 예약 차단(Block)
- 환불 자동처리

기상청 단기예보 기반 할인은 항공사식 Yield Management을 차용함.
</block>

## [B] 임박 티 (Last-Minute) 계단식 할인

<block id="pricing.lastminute.stepped.logic.v1">
임박 할인은 티오프 2시간 전부터 발동한다.
3단계 계단식 가격 하락:
- T-120분: 유지
- T-100분: -1차인하
- T-80분: -2차인하
- T-60분: -3차인하(최저)

목적:
- 공실로 버리는 0원을 최소화
- 지역 LBS + CRM 결합 최적화
</block>

## [C] Rain Blocking (호우 차단 정책)

<block id="pricing.heavyrain.blocking.logic.v1">
발동 조건:
- RN1 >= 10mm AND 2시간 연속 지속

주말/성수기 → Block (취소 분쟁 방지)
평일/비수기 → “우천 진입 동의 + 최대 50% 할인”
</block>

## [D] 세그먼트 기반 가격 차등

<block id="pricing.segment.discrimination.v1">
Segment 모델:
- Future King (2030/입문)
- Prestige (VIP)
- Smart (일반)
- Cherry Picker (리스크)

가격 전략:
- VIP: 할인 최소 / 혜택 강화
- 신규/Future: 할인/쿠폰 육성
- Cherry: 할인 차단 + Fatigue 적용
</block>

## [E] Panic Mode (1시간 전 공실 처리)

<block id="pricing.panic.lbs.logic.v1">
발동 조건:
T-60 ~ T-30 AND 미판매 재고 > 0

지역 반경 Zone 2 (20km) 타겟
전면 팝업 + 타이머 + LBS 기반 ETA 표시

목적:
- 공실 처리
- 시간 기반 원가 회수
- LBS/CRM 결합
</block>

---

# [SECTION 03 — CRM & SEGMENTATION POLICY]

## [A] Segment Definition

<block id="crm.segment.definition.v1">
Future King:
- 2030 세대 + 구력 1년 미만
Prestige:
- 정가 예약률 > 70%
Smart:
- 인근 거주 + 합리 소비
Cherry:
- 할인 비중 80% 이상 + 체리피킹 행동
</block>

## [B] Behavioral Policy

<block id="crm.segment.behavior.policy.v1">
Future King → 육성 (레슨/스크린/정보)
Prestige → 감동 (발렛/위약금 면제)
Smart → 유지 (기본 할인/날씨 할인)
Cherry → 차단 (임박 제외, 쿠폰 제한)
</block>

## [C] Fatigue (푸시 피로도 관리)

<block id="crm.fatigue.push.logic.v1">
원칙:
- 하루 1회 초과 발송 금지
우선순위:
긴급 임박 > 예약 확정 > 쿠폰 > 광고
</block>

---

# [SECTION 04 — UX / USER FLOW POLICY]

<block id="ux.flow.entry.v1">
Entry:
- GPS Sensing
- Weather Sensing
- Segment Detection

Routing:
- Panic Mode 조건시 홈 스킵 + 팝업
- 기본 Flow: Home → Detail → Booking → Pay
</block>

<block id="ux.explainability.receipt.v1">
가격 영수증 UI:
- 기본가
- 할인 항목 (Weather/Time/CRM/LBS)
- 최종가
- 위험/동의 Notice
</block>

<block id="ux.panic.overlay.v1">
전체 화면 오버레이
타이머 + ETA + LBS 거리
CTA 버튼 두 개 (Go / Cancel)
</block>

---

# [SECTION 05 — DATA MODEL / ERD (FULL)]

<block id="data.erd.users.v1">
Users 테이블:
- user_id (PK)
- segment (ENUM)
- total_visit
- avg_pay
- full_price_rate
- cherry_score
- birth_year
- golf_career
- home_geo_x/y
</block>

<block id="data.erd.reservations.v1">
Reservations:
- booking_id
- base_price
- final_price
- discount_log (JSON)
- weather_snapshot
- agreed_penalty
- is_no_show
</block>

<block id="data.erd.teetimes.v1">
TeeTimes:
- time_id
- tee_off
- status (OPEN/BOOKED/BLOCKED)
- block_reason
- current_step (임박 단계)
</block>

<block id="data.erd.perks.v1">
Perks:
- perk_id
- segment
- type
- description
</block>

# [SECTION 06 — MARKETING / LBS / NOTIFICATION POLICY]

## [A] LBS Geofencing

<block id="marketing.lbs.zone.definition.v1">
Zone 1 (5km): 이웃 주민
- 전략: 상시 혜택
- 정책: 평일 잔여 티 10% 자동 할인

Zone 2 (20km): 잠재 수요
- 전략: 긴급 모객
- 정책: Panic Mode 발동 시 푸시 발송
</block>

## [B] LBS + Panic Mode Fusion

<block id="marketing.lbs.panic.integration.v1">
조건:
- T-60 ~ T-30
- 잔여 티 존재
대상:
- Zone 2 AND Cherry 제외
액션:
- 풀스크린 팝업 + 타이머
</block>

## [C] CRM + Coupon + Restriction

<block id="marketing.crm.coupon.logic.v1">
단골 쿠폰 발급:
- 최근 3개월 5회 이상 방문 → 자동 발급
- 10,000원 쿠폰
제한:
- 주말 골든타임 09:00~13:00 사용 불가
체리피커:
- 쿠폰 미발급
- 임박 티 알림 미발송
</block>

## [D] Push Fatigue Rules

<block id="marketing.notification.fatigue.v1">
하루 1회 제한
순위:
1. 임박
2. 예약 확정
3. 쿠폰
4. 광고
피로도 제어는 장기 Retention용 주요 메커니즘
</block>

---

# [SECTION 07 — ADMIN / OVERRIDE / CONTROL TOWER]

<block id="admin.dashboard.overview.v1">
목표:
AI 자동화 시스템을 모니터링하면서 필요 시 인간 개입(Override) 가능
주요 기능:
- Cockpit
- Auto/Manual Toggle
- Panic Stop
- Manual Price Override
- TeeSheet Manager
- CRM/Member View
</block>

<block id="admin.autopilot.toggle.v1">
Auto-Pilot:
- 가격 자동
- 할인 자동
Manual:
- 고정가
- 성수기 이벤트에 사용
</block>

<block id="admin.emergency.stop.v1">
Emergency Stop:
- 모든 할인 즉시 중단
- 예약 과열 시 사용
</block>

<block id="admin.manual.override.v1">
티타임 단위 가격 직접 수정
예: (AI 18만 → Admin 20만)
</block>

<block id="admin.teetime.manager.v1">
Slot Injection:
- 날씨 좋아서 팀 추가
Slot Block:
- 공사/홀 보수로 삭제
Holiday:
- 전체 휴장
</block>

<block id="admin.crm.view.v1">
회원 Segment 조회
VIP 표시
Blacklist
노쇼 차단
</block>

---

# [SECTION 08 — EXTERNAL SYSTEMS / 3RD PARTY (FULL)]

## [A] 기상청 API

<block id="external.weather.kma.v1">
API: getVilageFcst
데이터:
- POP
- RN1
- WSD
예외 처리:
기상청 오동작 시 맑음(default fail-safe)
</block>

## [B] 지도/LBS

<block id="external.map.lbs.v1">
Provider: Kakao/Naver
기능:
- Geocoding
- Reverse Geocoding
- Distance Calc
비용 절감:
- 10분 caching
</block>

## [C] Notification

<block id="external.notification.v1">
Provider:
- FCM (앱 푸시)
- Solapi (알림톡)
정책:
- 야간 금지 (21:00~08:00)
- Fatigue Control 적용
</block>

## [D] 결제 PG 변경 (PortOne → Toss)

<block id="external.payment.pg.change.v1">
초기 설계: PortOne(아임포트)
실행 구현: Toss Payments (Phase 8)
이유:
- SDK 품질
- 결제 위젯
- 환불 API 단순화
- 빌링키/정기 과금 확장 가능
상태: 확정
</block>

---

# [SECTION 09 — RISK / PAYMENT / NO-SHOW / REFUND]

## [A] Segment 기반 결제 방식

<block id="payment.segment.strategy.v1">
Cherry/New → 100% 선결제
Smart → 30% 예약금
Prestige/VIP → 빌링키 → 현장 결제 + 노쇼 시 자동 위약금
</block>

## [B] 환불 및 위약금

<block id="payment.refund.policy.v1">
기상 악화: 100% 자동 환불
변심:
7일 전: 100%
3일 전: 50%
1일 전~당일: 0%
노쇼:
선결: 귀속
VIP: 빌링키 자동 청구
</block>

## [C] 보안/컴플라이언스

<block id="payment.security.compliance.v1">
PG Tokenization
SSL/TLS
Masking(관리자 UI)
PCI-DSS 우회 구조
</block>

## [D] 동시성 / 트랜잭션

<block id="payment.concurrency.atomicity.v1">
티 1자리를 두 명이 결제 → DB Transaction 우선 처리
뒤 사람 → Graceful Fail
중복 예약 절대 금지
</block>

---

# [SECTION 10 — SYSTEM ARCHITECTURE / INFRA]

<block id="infra.stack.selection.v1">
Language: JS/TS
Front: Next.js (App Router)
Backend: Node (Server)
DB: Supabase (Postgres)
Infra: Vercel
Auth: Supabase Auth
Payment: Toss
CSS: Tailwind
</block>

<block id="infra.cron.scheduler.v1">
매시 30분: 기상청 업데이트
매시 정각: 임박 할인
자정: Segment 재연산
</block>

<block id="infra.hot.cold.data.v1">
Hot: 예약/날씨
Cold: 이력/로그
</block>

<block id="infra.cost.strategy.v1">
초기: Free Tier 전략
확장: 유료 전환
</block>

---

# [SECTION 11 — PROJECT EXECUTION LOG (PHASE HISTORY)]

<block id="execution.phase.history.v1">
Phase 1 — Pricing Engine (완료)
Phase 2 — Supabase DB (완료)
Phase 3 — Booking Insert + Prevent Dup (완료)
Phase 4 — Reservation List/Detail (완료)
Phase 5 — Admin Dashboard (완료)
Phase 6 — Navigation (완료)
Phase 7 — Auth (완료)
Phase 8 — Toss Payments 진행 중
</block>

<block id="execution.phase.current.v1">
현재 Phase:
Phase 8 — 결제 위젯 + confirm API + redirect 검증 단계
</block>

<block id="execution.phase.future.v1">
Phase 9 — Date Picker
Phase 10 — Deployment (Vercel)
Final — 보고서 10종
</block>

# [SECTION 12 — USER EXPERIENCE / UI / WIREFRAME]

<block id="ux.main.entryflow.v1">
앱 실행 → GPS/LBS → Weather Fetch → Segment Fetch → Mode Routing
Mode:
A. Panic Mode (LBS + 공실 + 임박)
B. Normal (일반 UI)
</block>

<block id="ux.main.home.v1">
구성:
- Personalized Banner
- Weather Widget
- TeeTime Listing
가격표 구성:
정가 (Strike) + 할인 (Highlight)
Badge System:
☔ Rain Deal
⏰ Last Minute
🔥 Hot Demand
</block>

<block id="ux.booking.receipt.v1">
Booking Detail → Accordion 계산영수증
예:
Base Price: 250,000
Weather: -50,000
Time: -15,000
Coupon: -5,000
Final: 180,000
모티프:
"왜 이 가격인지"를 투명하게 (Explainable Pricing)
</block>

<block id="ux.panic.popup.v1">
Trigger: T<=60 + 공실 + LBS
UI:
Full Overlay + Countdown Timer + CTA + Dismiss
Cherry 제외
</block>

<block id="ux.payment.success.v1">
"지출"보다 "절약" 강조
체리피커 → 애니/쿠폰 숨김
</block>

<block id="ux.color.semantic.v1">
할인: #FF4B4B
상태양호: #2ECC71
Blocked: #95A5A6
</block>

---

# [SECTION 13 — DATA & ANALYTICS]

<block id="data.segment.metrics.v1">
Full Price Rate
Cherry Score
Visit Frequency
Avg pay
Window: 90 days
매일 자정 재산정 (Batch)
</block>

<block id="data.pricing.metrics.v1">
Weather Elasticity
Time Elasticity
Panic Conversion Rate
Segment Conversion Rate
</block>

<block id="data.revenue.metrics.v1">
Revenue per Tee
Revenue per Visit
Yield Improvement vs 정가
적용 이유:
항공/호텔 Yield Management 동일 패턴
</block>

---

# [SECTION 14 — BUSINESS LOGIC / GAME THEORY]

<block id="model.revenue.defense.v1">
CherryPicker 방어 = 할인 남발 방지 + 공실 Lock
Defense 전략은 Revenue Loss 방지 효과
</block>

<block id="model.price.discrimination.v1">
Segment별 차등 가격 → 사회적 효용 + Yield 최적화
전략 Ex:
VIP = 비할인 → Perks 제공
Cherry = 정가 비노출 + Panic 제외
</block>

<block id="model.lastminute.panic.v1">
T-120 → TimeStep 할인 (80/60/40min)
T-60 → Panic Mode
목표:
0원 공실 방지 + LBS 인근 유저만 대상
</block>

---

# [SECTION 15 — LEGAL & POLICY SAFETY]

<block id="legal.cancel.policy.v1">
변심 vs 기상 분리
증빙: 기상청 특보 기준
정책 안정성↑ 분쟁↓ CS↓
</block>

<block id="legal.data.privacy.v1">
LBS는 "앱 사용중"만 허용
Tokenization
Masking
PCI 우회
</block>

<block id="legal.marketing.policy.v1">
야간 마케팅 금지 (21:00~08:00)
Fatigue 1회/일
</block>

---

# [SECTION 16 — PROJECT MANAGEMENT / EXECUTION PLAN]

<block id="pm.schedule.8weeks.v1">
Phase1~3 → Core/DB/UX
Phase4~6 → Payment/Admin/LBS
Phase7~8 → QA/Deploy
Milestones:
M1 Alpha (Week4)
M2 Beta (Week6)
M3 Launch (Week8)
</block>

<block id="pm.free.tier.strategy.v1">
MVP 비용 최소화
Supabase Free + Vercel Free
</block>

<block id="pm.team.structure.v1">
1인 개발 전제 → Complexity 최소화 → PG/Toss/SDK 활용
</block>

---

# [SECTION 17 — META LAYER: RAG CONTEXT RULES]

<block id="rag.usage.rules.v1">
이 파일은:
- 컨텍스트 설명용
- 프로젝트 기억 복원용
- Agent 협업용
- Claude/재미나이/ChatGPT 교차 작업용
질문 유형 분류:
A. 정책질문 → SECTION 01~06
B. UI/UX → SECTION 07~12
C. 개발/코드 → SECTION 11~14
D. PG/결제 → SECTION 09
E. 일정/PM → SECTION 16
F. 현재 상황 → Current Phase
</block>

<block id="rag.memory.persistence.v1">
가장 중요한 요소 = "현재 Phase"
현재 Phase 정보 변경 시 **업데이트 필수**
</block>

<block id="rag.agent.coop.v1">
여러 LLM 협업 시:
Claude → 코드
재미나이 → Live Coding
ChatGPT → 시스템/설계/RAG/PM
역할 구분 명확 + Context 재사용
</block>

---

# [SECTION 18 — FINAL SNAPSHOT: CURRENT STATUS]

<block id="snapshot.current.v1">
프로젝트 = TUGOL
현재 Phase = 8
현재 작업 = Toss Confirm + Redirect
Next = Date Picker + Deploy
상태 = 문제없이 진행
Risk = 메모리 휘발 + PG 결제 검증
</block>

# END OF FILE (v1.0)
