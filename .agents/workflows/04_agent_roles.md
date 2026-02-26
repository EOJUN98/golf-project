---
description: Anti-Gravity Agent Roles Mapping v2
---
# Anti-Gravity 에이전트 역할 및 모델 매핑 (Agent Roles v2)

안티그래비티는 100% 파일 접근 및 수정 권한을 오직 `Executor`에게만 부여하고, `Planner`와 `Reviewer`는 설계 문서와 지시서(`spec.md`, `phase.md`)만을 통해 에이전트 조직을 철저히 통제한다.

## 🧠 1. Command Center (최고 지휘부 & 설계)
- **메인 플래너 (Architect & Task-Breaker)**
  - **모델:** `Claude Opus 4.6`
  - **역할:** 거시적 아키텍처 설계, 요구사항 분해, `spec.md` 및 `phase.md` 작성. 가장 넓고 깊은 사고력을 발휘해 태스크를 잘게 쪼갠다.
- **플랜 조언가 (Plan Advisor)**
  - **모델:** `Gemini 3.1 Pro`
  - **역할:** 메인 플래너가 도출한 계획에 대해 리뷰어가 아닌 '조언가'로서 접근. 누락된 컨텍스트, 엣지 케이스, 더 나은 대안 등을 제시하여 플래너의 독주를 방지한다.

## 🛡️ 2. QA & Security (검열 및 품질 관리 층)
- **보안 검사관 (Security Guard)**
  - **모델:** `Codex Top Tier` (최상위 모델)
  - **역할:** SQLi, 토큰 노출, 접근 권한 등 보안 취약점 전담 체크. 토큰 낭비 방지를 위해 코딩 매 순간이 아닌 **Phase 죵료 시**에만 집중적으로 투입된다.
- **테스트 검증자 & 코드 조언가 (Test Runner & Code Advisor)**
  - **모델:** `Codex 5.3 Extra High`
  - **역할:** 테스트 스크립트 실행 결과를 보고 사이드이펙트나 코드 최적화, 객체지향 설계 등에 대해 지속적으로 조언하고 리뷰를 달아준다.

## ⚙️ 3. Execution Engine (실무 실행 층)
- **코더 (Coder)**
  - **모델:** `Codex 5.3 Mid / High`
  - **역할:** 플래너의 지시서(`current_task.txt`)만 보고 빠르고 통제된 조건(Lock) 내에서 파일 작성 ও 덮어쓰기. 판단하지 않고 기계적으로 구현.
- **버그 픽서 (Fixer)**
  - **모델:** `Claude Sonnet 4.6`
  - **역할:** 에러 로그나 리뷰어의 피드백을 수용하여 논리적 결함을 추론하고, 코더가 남긴 맹점을 정확히 핀포인트로 수정.

## 🗄️ 4. Knowledge Base (백오피스 및 데이터 관리)
- **컨텍스트 매니저 (Recorder & Librarian)**
  - **모델:** `Gemini 3 Flash` (거대 토큰 처리 특화)
  - **역할:** 전체 코드베이스 컨텍스트, 과거 대화 로그 분석, 설계 의사결정 기록(ADR) 작성 등 무거운 문서 요약 및 검색 작업을 저비용 고효율로 전담.
