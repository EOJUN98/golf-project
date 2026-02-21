# v1.0 SDD (Single Source Of Truth)

v1.0부터는 **모든 개발은 SDD 문서 기반으로만 진행**한다.

## Rules

- 코드 변경 전: 관련 SDD가 먼저 존재하고, 스펙이 합의되어 있어야 한다.
- 코드 변경 중: 구현이 스펙에서 벗어나면 스펙을 먼저 수정한다(즉흥 구현 금지).
- 코드 변경 후: SDD의 상태/필드/API/화면/권한이 실제 구현과 일치해야 한다.

## Sector Gate (Mandatory)

각 섹터(예: Pricing, Admin, Crawler, Reservations)는 구현 시작 전에 아래 설계 게이트를 통과해야 한다.

1. 섹터 범위/목표/비목표 확정
2. As-Is vs To-Be 정리
3. 데이터 모델/마이그레이션 영향 확정
4. API 계약(Request/Response/Error) 확정
5. 권한/RLS/Service Role 정책 확정
6. 실패 시나리오/엣지 케이스 정의
7. QA 시나리오/검증 기준(AC) 확정
8. 롤백/배포 순서 확정

위 8개가 문서화되지 않으면 해당 섹터 구현을 시작하지 않는다.

## Document Map

- `docs/sdd/v1.0/00-project.md`: v1.0 목표/비목표, 용어, 운영 원칙(타임존/매출 정의 등)
- `docs/sdd/v1.0/02-pricing-engine-v1.md`: v1.0 최우선 프라이싱 엔진 스펙
- `docs/sdd/v1.0/V1-PRIORITY-UPDATE.md`: 오너 우선순위 고정 문서
- `docs/sdd/v1.0/SECTOR-WORKFLOW.md`: 섹터별 설계 게이트/진행 워크플로우
- `docs/sdd/v1.0/sectors/`: 섹터별 설계 게이트 문서(승인 후 구현)
- `docs/sdd/v1.0/01-admin/`: 관리자 영역 SDD
- `docs/sdd/v1.0/90-api/`: API 계약(엔드포인트별 Request/Response/Error)
- `docs/sdd/v1.0/99-v0-gap-backlog.md`: v0에서 미구현/불완전/버그 목록(우선순위 포함)
- `docs/sdd/v1.0/_templates/`: SDD 템플릿

## Priority (v1.0)

1. 프라이싱 엔진: 외부 최종판매가 수집 + 특성 메모 + 엔진 연동
2. Admin 페이지 정비: 특히 티타임 추가/수정과 DB 반영 신뢰도 확보
