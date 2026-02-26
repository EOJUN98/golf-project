---
description: SSD-RAM-Cache Context Memory Architecture
---
# Context Memory Architecture (컨텍스트 메모리 구조)

LLM 에이전트의 컨텍스트 비대화 및 환각(Lost in the middle) 현상을 방지하기 위해 3단 계층화된 메모리 아키텍처를 따른다. 모든 문서 정보는 이 위계에 맞춰 읽기/쓰기가 이루어진다.

## 💾 1. SSD 영역: `spec.md` (Global Context)
- **역할:** 전체 프로젝트의 목적과 흔들리지 않는 뼈대. (장기 기억)
- **포함 사항:** 프로젝트 목표, Core 기술 스택, Phase 목록 (Macro Plan), 전체 아키텍처/DB 스키마.
- **접근 통제:** 매우 낮음. Planner가 전체 Phase를 설정하거나, 새 Phase로 넘어갈 때만 읽는다. Executor는 절대 읽지 않는다.

## 🧠 2. RAM 영역: `phase_X.md` (Working Context)
- **역할:** 현재 진행 중인 특정 Phase에 대한 초정밀 작업 지시서. (단기 기억)
- **포함 사항:** 현재 Phase의 목표, 분석된 Task 목록 (Meso Plan), 세부 마이크로 스텝 체크리스트 (Micro Plan), 코드 검증 조건.
- **접근 통제:** 높음. 현재 활성화된 Phase 파일만 Executor와 Reviewer가 지속적으로 읽고 Status(진행 상태)를 갱신/기록한다.

## ⚡ 3. L1 Cache 영역: `current_task.txt` (명령 프롬프트/프롬프트 캐시)
- **역할:** 가장 작은 단위의 실행을 위한 휘발성 메모리. (즉각적 지시)
- **포함 사항:** 오직 **"지금 당장 치어내야 할 1개의 마이크로 스텝"** 정보만 담음. (예: "users 테이블의 email 필드에 unique 조건을 거는 migration 코드를 작성해라.")
- **효과:** Executor가 전체 스펙을 고민하느라 생기는 환각을 100% 방지하고 정확도와 속도를 극대화.
