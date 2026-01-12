# TUGOL MVP Development Checkpoint (v0.7.1)

**Project:** TUGOL - Dynamic Pricing Golf Booking App
**Stack:** Next.js 16 (App Router), TypeScript, Tailwind CSS, Supabase
**Current Phase:** Phase 3 Complete (Booking Flow Ready) / Phase 4 Pending

---

## 1. Core Logic (The Brain)
- **Pricing Engine (`utils/pricingEngine.ts`):**
  - **Seeded Random:** `teeOffTime`을 시드(Seed)로 사용하여 새로고침 시 가격 변동 방지.
  - **Rain Blocking:** 강수량(rainfall) >= 10mm & 연속 2시간 예보 시 `isBlocked: true` 반환.
  - **Panic Mode:** 티오프 1시간 전 + 미예약 상태 시 `isPanicTarget: true` 반환.
  - **Cherry Picker Defense:** 체리피커 등급(`CHERRY`)은 임박 할인 로직에서 제외.

## 2. Database Schema (The Spine)
- **Tables (Supabase):**
  - `users`: `user_segment` (FUTURE_KING, PRESTIGE, SMART, CHERRY_PICKER) 포함.
  - `tee_times`: `status` (OPEN, BOOKED, BLOCKED), `weather_condition` (JSONB) 포함.
  - `reservations`: `discount_breakdown` (JSONB), `final_price` 포함.
- **Type Definitions (`types/database.ts`):** 기획서 [03] 기준 스키마와 100% 일치.

## 3. UI/UX (The Face)
- **Components:**
  - `PriceCard`: 정가 취소선, 할인가 강조, 날씨 뱃지, 패닉 모드 팝업 연동.
  - `BookingModal`: 예약 확인 및 DB Insert 트리거.
- **Error Handling:**
  - **Smart Fallback:** DB 연결 실패 시 Mock Data로 자동 전환되어 앱 구동 유지.

## 4. Current Status (v0.7.1)
- **Completed:**
  - ✅ Project Setup (Clean Slate)
  - ✅ Pricing Logic Implementation
  - ✅ DB Connection & Seeding (Real Data Integration)
  - ✅ Booking Flow (Insert to DB + Status Update)
  - ✅ Hotfix: `reservations` table schema update (`discount_breakdown` column added).

## 5. Next Steps (Phase 4)
- **Target:** Implement **My Reservations Page** (`/app/reservations/page.tsx`).
- **Requirements:**
  - Fetch user's booking history (Join `reservations` + `tee_times`).
  - Display list of booked slots (Date, Time, Price, Status).
  - Add navigation link to Header.

---
**Note for AI:**
This file serves as a context anchor. When restarting, load this configuration and proceed immediately to Phase 4.