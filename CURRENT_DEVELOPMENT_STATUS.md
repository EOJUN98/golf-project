# 현재 개발 상태 기록

## 개요
Supabase 마이그레이션 정리, KST(한국 표준시) 기준 티타임 처리 보정, 데모 티타임 데이터 생성, 인증/로그인 경로 정리를 수행했다. 원격 Supabase 프로젝트에서 `supabase db push`가 동작하도록 마이그레이션 체인을 정리했으며, 프런트/서버 코드의 시간 처리와 타입 오류를 해결했다.

## 타임라인 요약
1. 마이그레이션 충돌/의존성 정리 및 idempotent화 적용.
2. RLS 재귀 문제 해결용 정책 재구성 추가.
3. KST 기준 티타임 생성 및 시간대 보정.
4. 타입 오류 및 서버 인증 경로 정리.
5. Supabase Auth 오류 확인 및 복구 필요 상태 기록.

## 체크리스트
### 완료
- 마이그레이션 파일 버전 충돌 제거.
- `supabase db push` 동작 가능 상태로 정리.
- KST 기준 티타임 생성 및 UTC/KST 오프셋 보정.
- 빌드 타입 오류 수정.
- 서버 인증 경로 통일.

### 진행 중
- Supabase Auth 정상화(로그인/회원가입 오류 해결).

### 대기/다음 단계
- Supabase 지원팀에 Auth 복구 요청 또는 새 프로젝트 재생성.
- 새 프로젝트 적용 후 관리자 계정 생성 및 권한 플래그 갱신.

## 코드/마이그레이션 변경
- `supabase/migrations/20260114_base_schema.sql` 기준 스키마 정리 및 idempotent 정리.
- 마이그레이션 버전 충돌 제거: `20260116_enhanced_users.sql`, `20260117_admin_teetimes_system.sql`, `20260118_notifications_system.sql`로 정리.
- RLS 재귀 방지 수정 추가: `supabase/migrations/20260119_rls_recursion_fix.sql` (SECURITY DEFINER 헬퍼 기반 정책 재생성).
- KST 시간 처리 보정:
  - `app/admin/tee-times/page.tsx`: 로컬 시간 문자열을 ISO로 변환 시 `Z` 강제 제거.
  - `app/admin/tee-times/actions.ts`, `utils/supabase/queries.ts`: `Asia/Seoul` 기준 날짜 범위 계산.
- 타입/빌드 오류 수정:
  - `types/database.ts`: suspension 필드 추가.
  - `app/api/pricing/route.ts`: mock user에 suspension 필드 반영.
- 서버 인증 흐름 정리:
  - `lib/supabase/server.ts` 신규.
  - `app/login/actions.ts` 서버 클라이언트로 로그인/회원가입/로그아웃 처리.

## 원격 DB 작업 (Supabase 프로젝트 ref: rgbwzpwrbcppdydihxye)
- 데모 티타임 생성: 오늘(KST)부터 14일, 1부/2부/3부 각 7분 간격.
- 시간대 보정: 기존 데이터가 UTC로 저장되어 KST 기준으로 9시간 오프셋 수정.
- 필요한 경우 데모 `golf_clubs` 생성.

## 현재 이슈 (미해결)
- Supabase Auth가 정상 동작하지 않음.
  - `signInWithPassword`는 `invalid_credentials` 반환.
  - `signUp`은 “Email address is invalid” 또는 “Database error checking email” 오류.
  - `auth` 스키마 RLS/권한 문제로 보이며, `supabase_auth_admin` 권한 수정이 불가.

## 다음 조치 제안
1. Supabase 지원팀에 Auth 복구 요청 또는 프로젝트 재생성.
2. 새 프로젝트에서 마이그레이션 재적용 후, 관리자 계정 생성.
3. `public.users`에서 `is_admin`, `is_super_admin` 플래그 업데이트 후 로그인 검증.
