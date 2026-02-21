# Sector Workflow (v1.0)

## Principle

섹터별 구현은 "설계 완료 → 승인 → 구현 → 검증" 순서만 허용한다.

## Process

### 1) Design Phase (구현 금지 단계)

- `docs/sdd/v1.0/_templates/sector-design-gate.md` 템플릿으로 설계 문서 작성
- 필수 확정 항목:
  - 범위/목표/비목표
  - 데이터 모델/마이그레이션
  - API 계약
  - 권한/RLS
  - 실패 시나리오/엣지 케이스
  - QA/AC
  - 배포/롤백

### 2) Approval Phase

- 오너 확인 후 `Status: Approved`로 변경
- 승인 전에는 코드 변경 금지

### 3) Build Phase

- 승인된 문서 기준으로만 구현
- 문서와 불일치 발견 시 구현 중단 후 문서 선수정

### 4) Verify Phase

- AC/QA 체크리스트를 통과해야 완료 처리
- 결과를 `합동작업 v1.md`와 `codex.md`에 기록

## Definition of Ready (DoR)

아래가 모두 채워져야 "구현 시작 가능":

- [ ] 섹터 설계 게이트 문서 작성 완료
- [ ] API 계약 확정
- [ ] 권한 정책 확정
- [ ] 테스트/검증 계획 확정
- [ ] 의존성/리스크/롤백 계획 확정
- [ ] 오너 승인 완료

## Definition of Done (DoD)

- [ ] 스펙 구현 완료
- [ ] AC/QA 체크 통과
- [ ] 문서-코드 일치 검증 완료
- [ ] 로그(`합동작업 v1.md`, `codex.md`) 기록 완료

