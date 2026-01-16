# Admin Tee Times System - 개선 제안 (Optional Enhancements)

**Feature:** SDD-01 Post-Implementation Improvements
**Status:** 💡 제안 단계
**Priority:** Low → Medium (향후 구현 시 참고)

---

## 🎯 개선 제안 요약

현재 SDD-01 구현은 모든 필수 기능을 충족합니다. 아래는 사용성, 성능, 보안을 더욱 향상시킬 수 있는 선택적 개선사항입니다.

---

## 1. Bulk Operations (일괄 처리)

### 1.1 Multiple Tee Times Creation (일괄 생성)

**현재 상태:**
- 티타임을 하나씩 생성해야 함
- 예: 08:00~17:00까지 20분 간격으로 생성 시 27번 클릭 필요

**개선안:**
```typescript
// Server Action 추가
export async function bulkCreateTeeTimes(payload: {
  golf_club_id: number;
  date: Date;
  start_time: string; // '08:00'
  end_time: string;   // '17:00'
  interval_minutes: number; // 20
  base_price: number;
  status?: 'OPEN' | 'BLOCKED';
}): Promise<{ success: boolean; count: number; error?: string }>;
```

**UI 추가:**
- "일괄 생성" 버튼
- 모달에 시작/종료 시간, 간격 입력 필드
- 생성될 티타임 수 미리보기

**장점:**
- ✅ 대량 티타임 생성 시간 절약
- ✅ 관리자 UX 대폭 개선
- ✅ 오류 발생 가능성 감소

---

### 1.2 Bulk Status Change (일괄 상태 변경)

**현재 상태:**
- 티타임을 하나씩 차단/해제해야 함

**개선안:**
```typescript
// 체크박스 선택 → 일괄 차단/해제
export async function bulkUpdateTeeTimeStatus(
  ids: number[],
  status: 'OPEN' | 'BLOCKED'
): Promise<{ success: boolean; updated: number; failed: number }>;
```

**UI 추가:**
- 테이블 헤더에 전체 선택 체크박스
- 각 행에 개별 체크박스
- "선택 항목 차단" / "선택 항목 활성화" 버튼

**장점:**
- ✅ 우천 시 하루 전체 차단 등 시나리오 대응
- ✅ 대량 작업 효율성

---

## 2. Template System (템플릿 시스템)

### 2.1 Tee Time Templates

**Use Case:**
- 매주 월요일 08:00~17:00, 20분 간격, 12만원
- 매주 주말 06:00~18:00, 15분 간격, 15만원

**개선안:**
```typescript
// 새 테이블
CREATE TABLE tee_time_templates (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  golf_club_id BIGINT REFERENCES golf_clubs(id),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  interval_minutes INTEGER NOT NULL,
  base_price NUMERIC(10,2) NOT NULL,
  day_of_week INTEGER[], -- [1,2,3,4,5] for Mon-Fri
  created_by TEXT REFERENCES users(id)
);

// Server Action
export async function applyTemplate(
  template_id: number,
  date: Date
): Promise<{ success: boolean; created: number }>;
```

**UI 추가:**
- "템플릿" 탭
- 템플릿 목록 + 생성/수정/삭제
- 티타임 생성 시 "템플릿에서 불러오기" 버튼

**장점:**
- ✅ 반복 작업 자동화
- ✅ 일관성 유지
- ✅ 신규 관리자 온보딩 용이

---

## 3. Advanced Filtering & Search (고급 필터)

### 3.1 Status Filter

**현재 상태:**
- 모든 상태의 티타임이 한 화면에 표시

**개선안:**
```tsx
<select>
  <option value="ALL">전체</option>
  <option value="OPEN">OPEN만</option>
  <option value="BOOKED">BOOKED만</option>
  <option value="BLOCKED">BLOCKED만</option>
</select>
```

**장점:**
- ✅ 특정 상태만 빠르게 확인
- ✅ BOOKED 티타임 집중 관리

---

### 3.2 Date Range Selection

**현재 상태:**
- 하루 단위로만 조회 가능

**개선안:**
```tsx
<input type="date" name="start_date" />
<input type="date" name="end_date" />
<button>조회 (최대 7일)</button>
```

**장점:**
- ✅ 주간/월간 티타임 한눈에 파악
- ✅ 예약률 분석 용이

---

## 4. Performance Optimization (성능 최적화)

### 4.1 Pagination

**현재 상태:**
- 한 날짜의 모든 티타임을 한 번에 로드
- 최대 ~50개 (05:00~18:00, 15분 간격)

**개선안 (필요 시):**
```typescript
export async function getTeeTimes(
  golfClubId: number,
  date: Date,
  page: number = 1,
  pageSize: number = 20
): Promise<{
  teeTimes: TeeTime[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
}>;
```

**판단 기준:**
- 50개 이하 → 페이지네이션 불필요
- 100개 이상 → 페이지네이션 권장

---

### 4.2 Optimistic UI Updates

**현재 상태:**
- 작업 완료 후 서버에서 재조회
- 네트워크 왕복 시간 발생

**개선안:**
```typescript
// 즉시 UI 업데이트 → 백그라운드 서버 동기화
const handleBlockTeeTime = async (id: number) => {
  // Optimistic update
  setTeeTimes(prev => prev.map(tt =>
    tt.id === id ? { ...tt, status: 'BLOCKED' } : tt
  ));

  // Server call
  const result = await blockTeeTime(id);

  // Rollback if failed
  if (!result.success) {
    setTeeTimes(prev => prev.map(tt =>
      tt.id === id ? { ...tt, status: 'OPEN' } : tt
    ));
    alert(result.error);
  }
};
```

**장점:**
- ✅ 즉각적인 피드백
- ✅ 체감 성능 향상

---

## 5. Enhanced Security (보안 강화)

### 5.1 Audit Log

**개선안:**
```sql
CREATE TABLE admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL, -- 'CREATE', 'UPDATE', 'BLOCK', 'UNBLOCK'
  resource_type TEXT NOT NULL, -- 'tee_time'
  resource_id BIGINT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**장점:**
- ✅ 모든 관리 작업 추적
- ✅ 문제 발생 시 원인 파악
- ✅ 보안 감사 대응

---

### 5.2 Two-Factor Confirmation for Bulk Delete

**개선안:**
```typescript
const handleBulkBlock = async (ids: number[]) => {
  if (ids.length > 10) {
    const confirmText = prompt('10개 이상 차단합니다. "CONFIRM"을 입력하세요:');
    if (confirmText !== 'CONFIRM') return;
  }
  // Proceed...
};
```

**장점:**
- ✅ 실수로 인한 대량 차단 방지
- ✅ 관리자 주의 환기

---

## 6. UI/UX Enhancements

### 6.1 Keyboard Shortcuts

**개선안:**
```typescript
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey) {
      switch (e.key) {
        case 'n': // Cmd+N: 새 티타임
          e.preventDefault();
          setIsCreateModalOpen(true);
          break;
        case 'r': // Cmd+R: 새로고침
          e.preventDefault();
          fetchTeeTimes();
          break;
      }
    }
  };
  window.addEventListener('keydown', handleKeyPress);
  return () => window.removeEventListener('keydown', handleKeyPress);
}, []);
```

**장점:**
- ✅ 파워 유저 생산성 향상
- ✅ 마우스 클릭 횟수 감소

---

### 6.2 Drag & Drop Time Adjustment

**개선안:**
- 테이블에서 티타임을 드래그하여 시간 변경
- 예: 08:00 → 08:30으로 드래그

**구현 난이도:** 🔴 High
**우선순위:** 🟡 Low

---

### 6.3 Price History Graph

**개선안:**
- 각 티타임의 가격 변경 이력을 그래프로 표시
- 동적 가격 책정 분석 용이

**Example:**
```
120,000원 (생성) → 110,000원 (수정 1) → 115,000원 (수정 2)
         ↓              ↓                 ↓
     Jan 15         Jan 16            Jan 17
```

---

## 7. Analytics & Reporting (분석 기능)

### 7.1 Tee Time Utilization Report

**개선안:**
```sql
-- 골프장별 예약률
SELECT
  gc.name,
  DATE(tt.tee_off) as date,
  COUNT(*) as total_slots,
  COUNT(CASE WHEN tt.status = 'BOOKED' THEN 1 END) as booked_slots,
  ROUND(COUNT(CASE WHEN tt.status = 'BOOKED' THEN 1 END)::numeric / COUNT(*)::numeric * 100, 2) as booking_rate
FROM tee_times tt
JOIN golf_clubs gc ON gc.id = tt.golf_club_id
WHERE tt.tee_off >= NOW() - INTERVAL '30 days'
GROUP BY gc.name, DATE(tt.tee_off)
ORDER BY date DESC, gc.name;
```

**UI:**
- 새 페이지: `/admin/analytics`
- 차트 라이브러리: Recharts 또는 Chart.js
- 날짜 범위 선택

---

### 7.2 Revenue Forecast

**개선안:**
- 앞으로 7일간 예상 매출 계산
- Formula: `SUM(base_price WHERE status='OPEN' or status='BOOKED')`

---

## 8. Mobile Admin Support (모바일 지원)

**현재 상태:**
- Desktop 우선 설계
- 모바일에서는 가로 스크롤 발생

**개선안:**
- 반응형 카드 레이아웃
- 모바일 전용 간소화 UI
- PWA 지원 (오프라인 조회)

**우선순위:** 🟡 Medium (관리자가 외부에서 접속할 경우 유용)

---

## 9. Notification System (알림 시스템)

### 9.1 Real-time Booking Notifications

**개선안:**
```typescript
// Supabase Realtime 사용
useEffect(() => {
  const channel = supabase
    .channel('tee_times_changes')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'tee_times',
      filter: `golf_club_id=eq.${selectedClubId}`
    }, (payload) => {
      if (payload.new.status === 'BOOKED') {
        toast.success('새 예약이 발생했습니다!');
        fetchTeeTimes(); // 자동 새로고침
      }
    })
    .subscribe();

  return () => { channel.unsubscribe(); };
}, [selectedClubId]);
```

**장점:**
- ✅ 실시간 예약 현황 파악
- ✅ 여러 관리자 동시 작업 시 충돌 방지

---

### 9.2 Email Digest

**개선안:**
- 매일 오전 8시 관리자에게 이메일 발송
- 내용: 오늘 예약률, 빈 슬롯 수, 어제 대비 변화

---

## 10. Error Recovery (오류 복구)

### 10.1 Soft Delete with Restore

**현재 상태:**
- BLOCK은 soft delete이지만 restore만 가능

**개선안:**
```sql
ALTER TABLE tee_times ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE tee_times ADD COLUMN deleted_by TEXT;

-- Soft delete policy
CREATE POLICY "Hide deleted tee times"
ON tee_times FOR SELECT
USING (deleted_at IS NULL OR /* is_super_admin */);
```

```typescript
export async function restoreDeletedTeeTime(id: number);
```

**UI:**
- "휴지통" 탭
- 삭제된 티타임 목록
- 복구 버튼

---

### 10.2 Undo Last Action

**개선안:**
```typescript
const [actionHistory, setActionHistory] = useState<Action[]>([]);

const handleUndo = () => {
  const lastAction = actionHistory.pop();
  if (lastAction.type === 'BLOCK') {
    unblockTeeTime(lastAction.teeTimeId);
  }
  // ...
};
```

**UI:**
- 상단에 "실행 취소" 버튼
- 최근 5개 작업 저장

---

## 📊 우선순위 매트릭스

| 개선사항 | Impact | Effort | Priority |
|---------|--------|--------|----------|
| Bulk Creation | 🟢 High | 🟡 Medium | ⭐⭐⭐ High |
| Template System | 🟢 High | 🔴 High | ⭐⭐ Medium |
| Status Filter | 🟢 High | 🟢 Low | ⭐⭐⭐ High |
| Audit Log | 🟡 Medium | 🟡 Medium | ⭐⭐ Medium |
| Optimistic UI | 🟡 Medium | 🟡 Medium | ⭐ Low |
| Real-time Notifications | 🟡 Medium | 🔴 High | ⭐ Low |
| Mobile Support | 🟡 Medium | 🔴 High | ⭐ Low |
| Analytics Dashboard | 🟢 High | 🔴 High | ⭐⭐ Medium |

---

## 🚀 추천 구현 순서 (SDD-02+)

### Phase 1 (Quick Wins)
1. ✅ Status Filter (1시간)
2. ✅ Bulk Creation (4시간)

### Phase 2 (High Value)
3. ✅ Template System (2일)
4. ✅ Audit Log (1일)

### Phase 3 (Long-term)
5. ✅ Analytics Dashboard (3일)
6. ✅ Real-time Notifications (2일)

---

## ⚠️ 구현 시 주의사항

1. **Backwards Compatibility**: 기존 데이터와 호환성 유지
2. **Performance Impact**: 대량 작업 시 DB 부하 고려
3. **User Training**: 새 기능 추가 시 관리자 교육 필요
4. **Testing**: 각 기능마다 QA 체크리스트 작성

---

**문서 작성일:** 2026-01-16
**작성자:** Claude AI Assistant
**상태:** 💡 제안 단계 (Optional)
**Next Review:** SDD-02 시작 전
