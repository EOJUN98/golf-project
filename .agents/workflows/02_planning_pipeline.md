---
description: 3-Depth Planning Pipeline (Macro, Meso, Micro)
---
# Anti-Gravity Deep Planning 파이프라인

모듈과 에이전트는 환각이나 스코프 초과를 통제하기 위해 모든 작업을 철저히 '3단계 플래닝 루프(Progessive Elaboration)'를 거친 후 코딩에 돌입한다.

## 🌊 Depth 1: Macro Planning (거시적 설계 및 Phase 분할)
- **목적:** 전체 업무의 방향성 고정 및 Phase 구성
- **과정:** 
  1. (Planner) 지시를 바탕으로 3~5개의 Phase 분해 및 `spec.md` 작성.
  2. (Reviewer) 검토 및 수정.
  3. (Human) 인간의 최종 승인 ➡️ Depth 2로 진행.

## 🌊 Depth 2: Meso Planning (Phase별 Task 분해)
- **목적:** 승인된 특정 Phase 내부의 태스크를 식별하고, 난이도 및 의존성 분석
- **과정:** 
  1. (Planner) 해당 Phase의 Task 분해 및 `phase_N.md` 뼈대 생성.
  2. (Reviewer) Task 난이도 평가 및 의존성/부작용 검토.
  3. (Human) 인간의 부분 승인 ➡️ Depth 3 마이크로 플래닝 여부 결정.

## 🌊 Depth 3: Micro Planning (난이도 높은 Task의 초정밀 스텝화)
- **목적:** Executor(작업자)가 판단 없이 코딩만 할 수 있도록 완벽한 지침서 작성
- **과정:** 
  1. (Planner) Task를 5개 이하의 마이크로 스텝(Micro-steps)으로 쪼개고 `current_task.txt` 수준의 체크리스트를 만듦.
  2. (Reviewer) 보안 결함이나 엣지 케이스 점검 후 스텝 보강.
  3. (Human) 최종 설계도 승인 ➡️ 비로소 **[Executor]** 가동, 코딩 시작.
