# TUGOL Unified Knowledge Base & Code RAG  
**Version:** v2.0 (Unified, Single Paste Mode)  
**Generated:** 2026-01-13  

---

## 0. SYSTEM & RAG 사용 규칙

### 0.1 역할 정의

너(LLM)는 **TUGOL 프로젝트 전담 백업 매니저 + RAG 지식 관리자 + 시니어 아키텍트**다.  
이 문서를 기반으로:

- 컨텍스트 초기화 / 기억 복원
- 설계·기획·코드·DB·결제·운영 reasoning 처리
- “이전 코드 기반으로 다음 단계 요청” 이어서 수행
- 다른 AI(재미나이/Claude/ChatGPT 등)에게 전달 시 **공통 레퍼런스** 역할

---

## 1. 비즈니스 & 도메인 개요

**프로젝트명:** TUGOL  
**분야:** 골프 티타임 + 다이내믹 프라이싱 + 노쇼 최소화 SaaS  

### 핵심 문제

현재 골프장 가격 정책:

- 성/비수기, 평/주말 기반 고정 가격
- 날씨, 수요, 시간대 반영 거의 없음
- 노쇼/공실 리스크 큼

### TUGOL의 해결 방식

- 기상 + LBS + 임박 + CRM + 세그먼트 기반 **동적 가격**
- 항공/호텔식 Revenue/Yield Management 도입
- 운영자 Override + Admin Dashboard 제공
- 세그먼트 기반 차별적 혜택 제공
- 노쇼/환불 정책 자동화

---

## 2. 주요 정책 요약 (Pricing / CRM / LBS)

### 2.1 Weather Pricing

입력: POP, RN1, WSD  
규칙:

- RN1 ≥ 10mm + 2hr 지속 → **예약 차단(Block)**  
- 흐림/비 → 할인율 부여  
- 특보 → 자동 취소 + 자동 환불

### 2.2 임박 티(LMD)

- 티오프 기준 2시간 전부터 3단계 계단식 할인
- 정가 ≥ 10만 → 단계당 –1만원
- 정가 < 10만 → –5천원

### 2.3 Segment 정책

| Segment | 의도 | 전략 |
|---|---|---|
| Future King | 육성 | 레슨, 스크린, 정보 |
| Prestige | VIP | Perks + 위약금 면제 |
| Smart | 일반 | 기본 할인 |
| Cherry | 위험 | 쿠폰/임박/Panic 제외 |

### 2.4 LBS + Panic Mode

Zone:

- 5km = 주민 → 평일 상시 10%
- 20km = 임박/Panic 타겟

Panic 조건:

- T-60min 안 팔림
- 반경 ≤ 20km
- Cherry 제외

---

## 3. Version / Phase Timeline

**v0.7.1** — Pricing Engine + Supabase 초기 스키마  
**v0.8** — Booking + My Reservations  
**v1.0** — MVP 완성 (다음 항목들 포함)

완성된 기능:

- Booking
- Reservation
- Pricing
- 3부제 필터
- Date Picker
- Toss 결제
- DB 반영
- Admin
- Vercel 배포

---

## 4. UX / 사용자 흐름

### 메인 플로우

1. 실행 → Weather + GPS Sensing
2. Segment 판단
3. Panic 검사 → 조건 시 팝업
4. 메인 홈 진입
5. 날짜 선택 (14일)
6. 3부제 필터 (Morning/Day/Night)
7. 티타임 가격 확인 → 예약

### 예약 상세 UI

```
Base: 250,000
Weather: -50,000
Last Minute: -15,000
Segment: -10,000
--------------------------------
Final: 175,000
Saved: 75,000
```

---

## 5. DB 모델 (Supabase + PostgreSQL)

### Users

- user_id
- segment
- birth_year
- golf_career
- home_geo_x/y
- total_visit
- avg_pay_amount
- full_price_rate
- cherry_score

### TeeTimes

- id (PK)
- tee_off (UTC)
- base_price
- price
- status (OPEN/BOOKED/BLOCKED)
- currency
- reserved_at
- reserved_by

### Reservations

- id
- tee_time_id (FK)
- user_id (FK)
- base_price
- final_price
- payment_key
- payment_status
- receipt_url
- reservation_status (CONFIRMED/CANCELLED/REFUNDED/NO_SHOW)
- agreed_penalty
- created_at

---

## 6. 아키텍처 / 인프라

**FE:** Next.js(App Router) + TS + Tailwind  
**BE:** Next.js API Routes  
**DB:** Supabase  
**Auth:** Supabase Auth  
**Payment:** Toss Payments  
**Deploy:** Vercel  
**State:** React Hooks  

---

## 7. 디렉토리 구조 (Code RAG)

```
app/
  page.tsx                    # Main (Date + Part + Listing)
  layout.tsx
  api/payments/confirm        # Toss 서버 승인 API
  payment/success             # CSR + Suspense
  payment/fail
  admin                       # Dashboard
components/
  BookingModal.tsx            # Toss Widget
  DateSelector.tsx            # 14일 선택
  PriceCard.tsx
  WeatherWidget.tsx
utils/
  supabase/queries.ts         # getTeeTimesByDate()
  pricingEngine.ts            # 할인 계산
lib/
  supabase.ts
types/
  database.ts
```

---

## 8. Pricing Engine (Logic RAG)

파이프라인:

```
finalPrice =
  basePrice
  → weather()
  → lastMinute()
  → segment()
  → lbs()
  → coupon()
  → cap(40%)
```

상태 판단 함수:

- shouldPanic()
- shouldBlock()
- calculateStep()
- seededRandom()
- isCherry()

---

## 9. 결제 / 노쇼 / 환불

Segment 기반 결제:

| Segment | 결제 |
|---|---|
| Cherry | 100% 선결제 |
| Smart | 30% 예약금 |
| Prestige | BillingKey + 현장결제 |

환불 규칙:

- 7일전: 100%
- 3일전: 50%
- 1일~당일: 0%
- 특보: 100% 자동

노쇼 처리:

- Cherry → 이미 결제됨
- Prestige → BillingKey로 위약금 자동

---

## 10. 법/리스크/컴플라이언스

- 기상 기준 = 기상청 특보
- 야간 푸시 금지
- 개인정보 최소 저장
- 카드정보 저장 금지 (PG Token만)
- RLS는 PROD에서 활성화 예정

---

## 11. 일정 & 마일스톤

- M1: 알파
- M2: 베타(지인 50명)
- M3: 정식 오픈

총 기간: 8주

---

## 12. 현재 상태 Snapshot (Phase 10)

- MVP = 작동함
- Toss 결제 OK
- DB 반영 OK
- BOOKED 상태 전이 OK
- Vercel 배포 OK
- 사용자 Flow OK
- Admin OK(기본)

---

## 13. LLM 협업 프롬프트 (핵심)

### (A) 설계 확장

> Unified RAG 기준으로 기상 POP/RN1을 Pricing Engine에 추가하고 DB/타입/쿼리 단위까지 확장하는 설계 제안해줘.

### (B) 코드 확장

> 서버 필터링 기반 `getTeeTimesByDateAndPart(date, part)` API 구현 플랜과 코드 변경 지점을 알려줘.

### (C) 디버깅

> BOOKED 상태가 간헐적으로 OPEN으로 남는 버그에 대해 Toss→Success→Confirm→DB write→transaction 흐름 기준으로 원인과 보강 방법 제안해줘.

### (D) DB/RLS

> Unified RAG 기준으로 CRM/LBS/세그먼트 반영 스키마 + PROD용 RLS 정책을 설계해줘.

### (E) Testing

> 가격 엔진 + 결제 흐름 + BOOKED 업데이트에 대해 E2E 테스트 3개와 단위 테스트 Assertion을 설계해줘.

---

## 14. 목적

이 문서 하나로:

- GPT / Claude / FunAI / 재마나이 전부
- 프로젝트를 **복구/계속/확장** 가능해야 함

즉, **Single Source of Truth(RAG)** 역할

# END OF FILE (TUGOL Unified RAG v2.0 - Single Paste Mode)
