# Admin Tee Times System - QA Checklist & Testing Guide

**Feature:** SDD-01 - Admin UI & Tee Time CRUD + 권한 강화
**Date:** 2026-01-16
**Status:** ✅ Implementation Complete

---

## 🚀 시스템 개요

### 구현된 기능
1. ✅ 티타임 CRUD (생성, 조회, 수정, 차단/해제)
2. ✅ SUPER_ADMIN / CLUB_ADMIN / USER 권한 시스템
3. ✅ 골프장별 접근 제어
4. ✅ BOOKED 티타임 보호
5. ✅ 날짜 및 골프장 필터링

### 파일 구조
```
supabase/migrations/
  └── 20260116_admin_teetimes_system.sql  ← DB 마이그레이션

app/admin/tee-times/
  ├── actions.ts                          ← Server Actions
  └── page.tsx                            ← Admin UI

types/
  └── database.ts                         ← 타입 정의 (업데이트됨)
```

---

## 📋 QA 테스트 체크리스트

### 1. 데이터베이스 마이그레이션 테스트

#### 1.1 마이그레이션 실행
```bash
# Supabase 로컬 환경
supabase migration up

# 또는 Supabase Dashboard에서 SQL Editor 실행
```

#### 1.2 테이블 확인
```sql
-- users 테이블에 is_super_admin 컬럼 확인
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'is_super_admin';

-- club_admins 테이블 생성 확인
SELECT * FROM information_schema.tables WHERE table_name = 'club_admins';

-- tee_times 테이블 updated_by, updated_at 컬럼 확인
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'tee_times' AND column_name IN ('updated_by', 'updated_at');
```

**Expected Results:**
- ✅ `users.is_super_admin` 컬럼 존재 (BOOLEAN)
- ✅ `club_admins` 테이블 존재 (4개 컬럼)
- ✅ `tee_times.updated_by`, `updated_at` 컬럼 존재

---

### 2. 권한 시스템 테스트

#### 2.1 SUPER_ADMIN 생성 및 확인

**SQL 실행:**
```sql
-- 첫 번째 사용자를 SUPER_ADMIN으로 설정
UPDATE public.users
SET is_super_admin = TRUE
WHERE id = (SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1);

-- 확인
SELECT id, email, name, is_admin, is_super_admin
FROM public.users
WHERE is_super_admin = TRUE;
```

**Expected Results:**
- ✅ 1명 이상의 SUPER_ADMIN 존재

#### 2.2 CLUB_ADMIN 생성 및 확인

**SQL 실행:**
```sql
-- 테스트용 CLUB_ADMIN 생성 (예시: 두 번째 사용자를 Club 72 관리자로 설정)
-- 1. 먼저 is_admin = TRUE 설정
UPDATE public.users
SET is_admin = TRUE
WHERE id = (SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1 OFFSET 1);

-- 2. club_admins 테이블에 매핑
INSERT INTO public.club_admins (user_id, golf_club_id)
VALUES (
  (SELECT id FROM public.users ORDER BY created_at ASC LIMIT 1 OFFSET 1),
  (SELECT id FROM public.golf_clubs WHERE name LIKE '%Club 72%' LIMIT 1)
)
ON CONFLICT (user_id, golf_club_id) DO NOTHING;

-- 확인
SELECT ca.*, u.email, u.name, gc.name as golf_club_name
FROM public.club_admins ca
JOIN public.users u ON u.id = ca.user_id
JOIN public.golf_clubs gc ON gc.id = ca.golf_club_id;
```

**Expected Results:**
- ✅ CLUB_ADMIN 사용자가 club_admins에 매핑됨
- ✅ 특정 골프장 ID와 연결됨

---

### 3. 웹 UI 테스트

#### 3.1 접근 제어 테스트

**Test Case 1: USER 계정으로 접근**
1. 일반 USER 계정으로 로그인
2. `/admin/tee-times` 직접 접속 시도

**Expected Results:**
- ✅ `/`로 리다이렉트됨
- ✅ "접근 권한이 없습니다" 화면 표시 (또는 리다이렉트)

**Test Case 2: SUPER_ADMIN 계정으로 접근**
1. SUPER_ADMIN 계정으로 로그인
2. `/admin/tee-times` 접속

**Expected Results:**
- ✅ 페이지 정상 로드
- ✅ 모든 골프장 목록 표시
- ✅ "티타임 추가" 버튼 활성화

**Test Case 3: CLUB_ADMIN 계정으로 접근**
1. CLUB_ADMIN 계정으로 로그인
2. `/admin/tee-times` 접속

**Expected Results:**
- ✅ 페이지 정상 로드
- ✅ 본인이 관리하는 골프장만 드롭다운에 표시
- ✅ "티타임 추가" 버튼 활성화

---

#### 3.2 티타임 조회 테스트

**Test Steps:**
1. Admin 페이지 접속
2. 골프장 선택
3. 날짜 선택

**Expected Results:**
- ✅ 선택한 날짜의 티타임 목록 표시
- ✅ 티오프 시간 오름차순 정렬
- ✅ 각 티타임의 상태 뱃지 정확히 표시:
  - OPEN: 녹색 (CheckCircle 아이콘)
  - BOOKED: 파란색 (Clock 아이콘)
  - BLOCKED: 회색 (Ban 아이콘)
- ✅ 예약자 정보 표시 (BOOKED인 경우)
- ✅ 티타임이 없으면 "선택한 날짜에 티타임이 없습니다" 메시지

---

#### 3.3 티타임 생성 테스트

**Test Steps:**
1. "티타임 추가" 버튼 클릭
2. 모달 열림 확인
3. 정보 입력:
   - 티오프 시간: `14:30`
   - 기본 가격: `120000`
   - 초기 상태: `OPEN`
4. "생성" 버튼 클릭

**Expected Results:**
- ✅ 성공 알림: "티타임이 생성되었습니다"
- ✅ 모달 닫힘
- ✅ 목록에 새 티타임 표시
- ✅ DB 확인:
  ```sql
  SELECT * FROM tee_times WHERE tee_off::time = '14:30:00';
  ```

**Edge Cases:**
- ❌ 음수 가격 입력 → 입력 차단 (HTML min="0")
- ❌ 시간 미입력 → 브라우저 validation

---

#### 3.4 티타임 수정 테스트

**Test Case 1: OPEN 상태 티타임 수정**
1. OPEN 상태의 티타임 찾기
2. 수정 버튼(연필 아이콘) 클릭
3. 가격 변경: `120000` → `110000`
4. "수정" 버튼 클릭

**Expected Results:**
- ✅ 성공 알림: "티타임이 수정되었습니다"
- ✅ 테이블에 변경된 가격 표시
- ✅ `updated_at` 컬럼 업데이트

**Test Case 2: BOOKED 상태 티타임 수정 시도**
1. BOOKED 상태의 티타임 찾기
2. 수정 버튼이 비활성화되어 있는지 확인

**Expected Results:**
- ✅ 수정 버튼 비활성화 (opacity-30, cursor-not-allowed)
- ✅ 클릭해도 반응 없음

---

#### 3.5 티타임 차단 테스트

**Test Case 1: OPEN 티타임 차단**
1. OPEN 상태 티타임의 차단 버튼(Ban 아이콘) 클릭
2. 확인 대화상자 → "확인" 클릭

**Expected Results:**
- ✅ 성공 알림: "티타임이 차단되었습니다"
- ✅ 상태가 BLOCKED로 변경
- ✅ 차단 버튼이 활성화 버튼(CheckCircle)으로 변경

**Test Case 2: BOOKED 티타임 차단 시도**
1. BOOKED 상태 티타임의 차단 버튼 클릭 시도

**Expected Results:**
- ✅ 차단 버튼 비활성화
- ✅ 클릭해도 반응 없음

**Test Case 3: BLOCKED 티타임 활성화**
1. BLOCKED 상태 티타임의 활성화 버튼 클릭
2. 확인 대화상자 → "확인" 클릭

**Expected Results:**
- ✅ 성공 알림: "티타임이 활성화되었습니다"
- ✅ 상태가 OPEN으로 변경

---

#### 3.6 권한별 접근 테스트

**Test Case 1: SUPER_ADMIN이 모든 골프장 접근**
1. SUPER_ADMIN으로 로그인
2. 골프장 드롭다운 확인
3. 각 골프장 선택 후 티타임 생성/수정 시도

**Expected Results:**
- ✅ 모든 골프장 표시
- ✅ 모든 골프장에 대해 CRUD 작업 가능

**Test Case 2: CLUB_ADMIN이 타 골프장 접근 시도**
1. CLUB_ADMIN으로 로그인 (예: Club 72만 관리)
2. 골프장 드롭다운 확인

**Expected Results:**
- ✅ 본인 골프장(Club 72)만 표시
- ✅ 다른 골프장은 드롭다운에 없음

**Test Case 3: CLUB_ADMIN이 API 직접 호출 시도 (보안 테스트)**
```javascript
// 브라우저 콘솔에서 테스트
fetch('/admin/tee-times/actions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'createTeeTime',
    payload: {
      golf_club_id: 999, // 접근 권한 없는 골프장 ID
      tee_off: '2026-01-20T10:00:00Z',
      base_price: 100000
    }
  })
});
```

**Expected Results:**
- ✅ Server Action에서 403 에러 또는 "Access denied" 메시지 반환
- ✅ DB에 티타임 생성되지 않음

---

### 4. 데이터베이스 무결성 테스트

#### 4.1 RLS 정책 테스트

**Test SQL (SUPER_ADMIN으로 실행):**
```sql
-- 현재 사용자를 SUPER_ADMIN으로 변경
SET LOCAL session.user_id = 'super-admin-user-id';

-- 모든 티타임 조회 시도
SELECT * FROM tee_times;
```

**Expected Results:**
- ✅ 모든 골프장의 티타임 조회 가능

**Test SQL (CLUB_ADMIN으로 실행):**
```sql
-- 현재 사용자를 CLUB_ADMIN으로 변경
SET LOCAL session.user_id = 'club-admin-user-id';

-- 모든 티타임 조회 시도
SELECT * FROM tee_times;
```

**Expected Results:**
- ✅ club_admins에 매핑된 골프장의 티타임만 조회됨

#### 4.2 Updated_at 트리거 테스트

```sql
-- 티타임 업데이트
UPDATE tee_times
SET base_price = 130000
WHERE id = 1;

-- updated_at 확인
SELECT id, base_price, updated_at
FROM tee_times
WHERE id = 1;
```

**Expected Results:**
- ✅ `updated_at`이 현재 시간으로 자동 업데이트됨

---

### 5. 에러 처리 테스트

#### 5.1 유효하지 않은 입력 테스트

**Test Cases:**
- 음수 가격 입력 → HTML validation으로 차단
- 미래가 아닌 과거 날짜 → 생성은 가능하지만 권장하지 않음 (비즈니스 로직 추가 필요 시)
- 빈 시간 입력 → HTML required 속성으로 차단

#### 5.2 네트워크 오류 시뮬레이션

**Test Steps:**
1. 개발자 도구 → Network → Offline
2. 티타임 생성 시도

**Expected Results:**
- ✅ "Failed to create tee time" 에러 메시지
- ✅ 사용자에게 알림

---

### 6. UI/UX 테스트

#### 6.1 반응형 디자인
- ✅ 데스크톱 (1920px): 모든 요소 정상 표시
- ✅ 태블릿 (768px): 테이블 가로 스크롤
- ✅ 모바일 (375px): Admin은 Desktop 우선이므로 참고만

#### 6.2 로딩 상태
- ✅ 초기 로딩: Loader2 스피너 표시
- ✅ 티타임 페칭: 테이블 영역에 스피너
- ✅ 버튼 클릭 후: 비활성화 상태 (disabled)

#### 6.3 접근성
- ✅ 버튼에 title 속성 (툴팁)
- ✅ 비활성화된 버튼 명확히 구분 (opacity-30)
- ✅ 색상 대비 적절 (WCAG AA)

---

## 🐛 알려진 제한사항

1. **동시성 충돌**: 여러 관리자가 동시에 같은 티타임 수정 시 마지막 저장이 우선 (Last Write Wins)
   - 향후 개선: Optimistic Locking 또는 Version 컬럼 추가

2. **과거 날짜 티타임**: 과거 날짜에도 티타임 생성 가능
   - 향후 개선: 서버 검증 추가

3. **골프장 없는 경우**: club_admins에 매핑 안 된 CLUB_ADMIN은 빈 화면
   - 현재: "접근 권한이 없습니다" 메시지 표시
   - 향후 개선: 관리자에게 골프장 할당 요청 UI

---

## ✅ 최종 검증 체크리스트

### DB 마이그레이션
- [ ] `is_super_admin` 컬럼 생성 확인
- [ ] `club_admins` 테이블 생성 확인
- [ ] `tee_times.updated_by`, `updated_at` 컬럼 확인
- [ ] RLS 정책 적용 확인
- [ ] 헬퍼 함수 생성 확인

### 권한 시스템
- [ ] SUPER_ADMIN 생성 및 테스트
- [ ] CLUB_ADMIN 생성 및 매핑
- [ ] USER 접근 차단 확인
- [ ] API 레벨 권한 검증

### CRUD 기능
- [ ] 티타임 생성 (CREATE)
- [ ] 티타임 조회 (READ)
- [ ] 티타임 수정 (UPDATE)
- [ ] 티타임 차단/해제 (BLOCK/UNBLOCK)
- [ ] BOOKED 티타임 보호

### UI/UX
- [ ] 골프장 선택 드롭다운
- [ ] 날짜 선택
- [ ] 티타임 테이블 표시
- [ ] 생성 모달
- [ ] 수정 모달
- [ ] 상태 뱃지
- [ ] 로딩 스피너
- [ ] 에러 메시지

### 보안
- [ ] RLS 정책 작동 확인
- [ ] 권한 없는 API 호출 차단
- [ ] SQL Injection 방지 (Supabase 자동 처리)
- [ ] XSS 방지 (React 자동 처리)

---

## 🚀 다음 단계 (SDD-02)

현재 SDD-01 구현 완료 후, 다음 단계 준비:

1. **Bulk Operations**: 여러 티타임 일괄 생성
2. **Template System**: 티타임 템플릿 저장/로드
3. **Analytics Dashboard**: 티타임 예약률, 수익 통계
4. **Notification System**: 관리자 알림 (예약 발생 시)

---

**문서 작성일:** 2026-01-16
**작성자:** Claude AI Assistant
**상태:** ✅ Ready for QA Testing
