# 🎓 TUGOL 프로젝트 개념 정리

> 작성일: 2026-01-12
> 대상: Next.js/TypeScript 초보자

---

## 1. TypeScript vs Next.js 차이점

### TypeScript = 언어 (Language)
```typescript
// JavaScript에 "타입"을 추가한 언어
let clubName: string = "Club 72";  // ← 문자열 타입
let price: number = 250000;         // ← 숫자 타입

// 함수도 타입 지정 가능
function calculatePrice(base: number, discount: number): number {
  return base - discount;
}
```

**특징:**
- 코드 작성 중에 에러를 미리 잡아줌
- 개발 시에만 사용, 실행 시에는 JavaScript로 변환됨
- 선택사항 (JavaScript로도 Next.js 사용 가능)

---

### Next.js = 프레임워크 (Framework)
```
프로젝트 구조 = 곧 라우팅
/app/page.tsx              → 메인 페이지 (/)
/app/admin/page.tsx        → 관리자 페이지 (/admin)
/app/api/pricing/route.ts  → API 엔드포인트 (/api/pricing)
```

**특징:**
- React 기반 웹 프레임워크
- 파일 구조로 자동 라우팅
- 서버 렌더링(SSR) + API 라우트 제공
- TypeScript와 JavaScript 모두 사용 가능

---

### 관계도
```
JavaScript (기본 언어)
  └─ TypeScript (타입 추가 버전)
      └─ React (UI 라이브러리)
          └─ Next.js (프레임워크, React + 서버)
```

**쉬운 비유:**
- **TypeScript** = 한국어/영어 (언어)
- **Next.js** = 노션/워드 (도구)
- **우리 프로젝트** = Next.js(도구)를 쓰면서 TypeScript(언어)로 작성

---

## 2. 환경변수 사용법

### .env.local 파일
```bash
# 서버 전용 변수 (브라우저에서 접근 불가)
WEATHER_API_KEY=xxx
GRID_X=54
GRID_Y=123

# 브라우저에서도 접근 가능한 변수 (NEXT_PUBLIC_ 접두사 필요)
NEXT_PUBLIC_MAP_KEY=yyy
```

### Next.js에서 사용
```typescript
// app/api/pricing/route.ts (서버 사이드)
const apiKey = process.env.WEATHER_API_KEY; // ✅ 가능
const mapKey = process.env.NEXT_PUBLIC_MAP_KEY; // ✅ 가능

// app/page.tsx (클라이언트 사이드)
const apiKey = process.env.WEATHER_API_KEY; // ❌ undefined (보안상 접근 불가)
const mapKey = process.env.NEXT_PUBLIC_MAP_KEY; // ✅ 가능
```

**중요:**
- API 키 같은 민감 정보는 `NEXT_PUBLIC_` 붙이지 말 것!
- `.env.local`은 `.gitignore`에 포함되어 Git에 올라가지 않음

---

## 3. 프로젝트 구조

### 현재 구조
```
tugol-app-main/
├── .env.local              # 환경변수 (Git에 올라가지 않음)
├── app/
│   ├── page.tsx           # 메인 페이지 (골퍼용)
│   ├── admin/
│   │   └── page.tsx       # 관리자 페이지
│   ├── api/
│   │   └── pricing/
│   │       └── route.ts   # 가격 계산 API
│   └── layout.tsx         # 공통 레이아웃
├── public/                # 정적 파일 (이미지 등)
├── package.json
└── app.js.backup          # 구버전 Express 서버 (백업)
```

### 삭제된 파일
- **app.js** → `app.js.backup`으로 백업됨
  - 이유: Express와 Next.js 이중 구조 제거
  - Next.js로 통일하여 JS/TS 혼용 문제 해결

---

## 4. API Route 작동 원리

### 파일: app/api/pricing/route.ts
```typescript
export async function GET() {
  // 1. 기상청 API 호출
  const weather = await getRealWeather();

  // 2. 가격 계산 로직
  const prices = calculatePricing(weather);

  // 3. JSON 응답
  return NextResponse.json({ data: prices });
}
```

### 프론트엔드에서 호출
```typescript
// app/page.tsx
const res = await fetch('/api/pricing');  // ← 자동으로 route.ts 호출
const data = await res.json();
```

**흐름:**
1. 브라우저: `/api/pricing` 요청
2. Next.js: `app/api/pricing/route.ts`의 `GET()` 함수 실행
3. 서버: 기상청 API 호출 + 가격 계산
4. 브라우저: JSON 응답 받음

---

## 5. TypeScript 핵심 문법 (자주 보는 것만)

### (1) 타입 선언
```typescript
let name: string = "홍길동";
let age: number = 30;
let isVIP: boolean = true;
```

### (2) 인터페이스 (객체 구조 정의)
```typescript
interface TeeTime {
  time: string;
  basePrice: number;
  finalPrice: number;
}

const tee: TeeTime = {
  time: "08:00",
  basePrice: 250000,
  finalPrice: 200000
};
```

### (3) 배열 타입
```typescript
const prices: number[] = [100, 200, 300];
const times: string[] = ["08:00", "09:00"];
```

### (4) any (타입 모를 때 - 권장하지 않음)
```typescript
const data: any = { foo: "bar" }; // 모든 타입 허용
```

### (5) ! (Non-null assertion)
```typescript
const apiKey = process.env.WEATHER_API_KEY!;
// ↑ "이 값은 무조건 있다"고 TypeScript에 알려줌
```

---

## 6. 자주 나오는 에러 해결

### "Cannot find module" 에러
```bash
npm install
```
→ node_modules 재설치

### 환경변수가 undefined
- `.env.local` 파일 확인
- 서버 재시작 필요 (`npm run dev` 중단 후 재실행)
- 클라이언트에서 접근하려면 `NEXT_PUBLIC_` 접두사 필요

### TypeScript 타입 에러
```typescript
// 에러 예시
const price: number = "100"; // ❌ 타입 불일치

// 해결
const price: number = 100; // ✅
const priceStr: string = "100"; // ✅
```

---

## 7. 다음 학습 목표

1. **React Hooks** (useState, useEffect)
2. **API 호출 패턴** (fetch, async/await)
3. **TypeScript 인터페이스** 활용
4. **Supabase 연동** (DB 저장)
5. **에러 핸들링** (try-catch)

---

> 💡 **Tip**: 이 문서는 프로젝트 루트에 있어. 헷갈릴 때마다 참고하자!
