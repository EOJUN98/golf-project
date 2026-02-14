# v1.0 SDD (Single Source Of Truth)

v1.0부터는 **모든 개발은 SDD 문서 기반으로만 진행**한다.

## Rules

- 코드 변경 전: 관련 SDD가 먼저 존재하고, 스펙이 합의되어 있어야 한다.
- 코드 변경 중: 구현이 스펙에서 벗어나면 스펙을 먼저 수정한다(즉흥 구현 금지).
- 코드 변경 후: SDD의 상태/필드/API/화면/권한이 실제 구현과 일치해야 한다.

## Document Map

- `docs/sdd/v1.0/00-project.md`: v1.0 목표/비목표, 용어, 운영 원칙(타임존/매출 정의 등)
- `docs/sdd/v1.0/01-admin/`: 관리자 영역 SDD
- `docs/sdd/v1.0/90-api/`: API 계약(엔드포인트별 Request/Response/Error)
- `docs/sdd/v1.0/99-v0-gap-backlog.md`: v0에서 미구현/불완전/버그 목록(우선순위 포함)
- `docs/sdd/v1.0/_templates/`: SDD 템플릿

