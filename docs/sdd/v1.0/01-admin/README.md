# Admin SDD (v1.0)

관리자 영역은 “운영 신뢰도”가 핵심이므로 다음 원칙을 기본으로 한다.

- 클라이언트에서 DB 직접 write 금지(원칙). 모든 변경은 `/api/admin/*`로 수행.
- 집계/전체조회는 RLS와 충돌 가능성이 크므로 Service Role 사용 정책을 명문화.
- 날짜/시간/매출 기준은 `docs/sdd/v1.0/00-project.md` 정의를 따른다.

문서 목록:

- `docs/sdd/v1.0/01-admin/permissions-matrix.md`
- `docs/sdd/v1.0/01-admin/admin-dashboard.md`
- `docs/sdd/v1.0/01-admin/admin-tee-times.md`
- `docs/sdd/v1.0/01-admin/admin-reservations.md`
- `docs/sdd/v1.0/01-admin/admin-no-show.md`
- `docs/sdd/v1.0/01-admin/admin-settlements.md`
- `docs/sdd/v1.0/01-admin/admin-crawler.md`
