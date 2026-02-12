# Crawler Monitoring SQL

아래 SQL은 Supabase SQL Editor에서 실행합니다.

## 1) 최근 24시간 사이트별 적재 건수
```sql
select
  site_code,
  count(*) as rows_count,
  count(*) filter (where crawl_status = 'SUCCESS') as success_count,
  count(*) filter (where crawl_status = 'FAILED') as failed_count,
  count(*) filter (where availability_status = 'NO_DATA') as no_data_count,
  max(crawled_at) as last_crawled_at
from public.external_price_snapshots
where crawled_at >= now() - interval '24 hours'
group by site_code
order by rows_count desc;
```

## 2) 윈도우별(1주전/2일전/당일오전/임박) 적재 건수
```sql
select
  collection_window,
  count(*) as rows_count,
  count(*) filter (where availability_status = 'AVAILABLE') as available_count,
  count(*) filter (where availability_status = 'NO_DATA') as no_data_count
from public.external_price_snapshots
where crawled_at >= now() - interval '24 hours'
group by collection_window
order by collection_window;
```

## 3) 활성 타깃 중 최근 24시간 스냅샷이 없는 타깃
```sql
select
  t.id,
  t.site_code,
  t.course_name,
  t.adapter_code,
  t.source_platform,
  t.updated_at
from public.external_price_targets t
left join public.external_price_snapshots s
  on s.target_id = t.id
 and s.crawled_at >= now() - interval '24 hours'
where t.active = true
group by t.id, t.site_code, t.course_name, t.adapter_code, t.source_platform, t.updated_at
having count(s.id) = 0
order by t.id;
```

## 4) 최근 24시간 상위 에러 메시지
```sql
select
  error_message,
  count(*) as error_count,
  max(crawled_at) as last_seen
from public.external_price_snapshots
where crawled_at >= now() - interval '24 hours'
  and error_message is not null
group by error_message
order by error_count desc, last_seen desc
limit 20;
```

## 5) 골프장 수동 지역 매핑 입력/수정
```sql
insert into public.external_course_regions (
  course_name,
  course_name_normalized,
  region,
  note,
  active
)
values (
  '클럽72',
  '클럽72',
  '수도권',
  '운영자 수동 지정',
  true
)
on conflict (course_name_normalized)
do update set
  course_name = excluded.course_name,
  region = excluded.region,
  note = excluded.note,
  active = excluded.active,
  updated_at = now();
```

매핑 조회:
```sql
select id, course_name, course_name_normalized, region, active, updated_at
from public.external_course_regions
order by updated_at desc, id desc;
```
