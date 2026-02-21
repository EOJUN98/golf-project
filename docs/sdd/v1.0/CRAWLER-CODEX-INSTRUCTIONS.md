# 크롤러 완성 - Codex 나노 단위 지시서

> 이 문서는 Codex가 한 줄도 빠짐없이 따라할 수 있도록 작성된 상세 구현 지시서입니다.
> 각 작업 단위는 독립적으로 실행 가능하며, 의존성이 있는 경우 명시합니다.

## 현재 상태 요약

### 완료된 것
- `crawler/src/crawl-final-prices.mjs`에 GolfRock 어댑터 완성
  - `loginGolfRock()` 함수 (line 514-536): Playwright 로그인 자동화
  - `parseGolfRockPriceHtml()` 함수: Node.js regex 기반 HTML 파서 (DOM 파싱 불필요)
  - `crawlGolfRockList()` 전면 재작성: **직접 AJAX fetch 방식** (아코디언 클릭 방식 폐기)
    - 로그인 → 날짜선택 → `#tranForm` 직렬화 → `join_time_list_get.asp` POST → HTML 파싱
    - 5개씩 병렬 배치 fetch (`Promise.all`)
    - 성능: 4개 window 전체 **18초** (기존 아코디언 방식 4분+ 대비 13배 빠름)
  - dry-run 테스트: 24행 수집, 실제 가격 (35,000~120,000원), 10개 이상 골프장
- 5개 default target seed 완료 (teeupnjoy=id1, golfrock=id2, golfpang=id3, golfmon=id4, smartscore=id5)
- `crawler/.env.local`에 GOLFROCK 자격증명 추가 완료

### GolfRock 직접 AJAX 방식 핵심 로직

```javascript
// Step 1: 날짜 변경 후 DOM에서 클럽 data-value 추출 (클릭 불필요)
const clubs = await page.evaluate(() =>
  Array.from(document.querySelectorAll('.club_info')).map(el => ({
    dataValue: el.getAttribute('data-value') || '',
    clubName: (el.querySelector('.club_str')?.textContent || '').trim(),
  })).filter(c => c.dataValue)
);

// Step 2: #tranForm 기본 파라미터 캡처
const formParams = await page.evaluate(() => {
  const form = document.querySelector('#tranForm');
  return form ? new URLSearchParams(new FormData(form)).toString() : '';
});

// Step 3: 5개씩 병렬 fetch
const batchResults = await page.evaluate(async ({ batchClubs, baseParams, dateVal }) => {
  return Promise.all(batchClubs.map(async club => {
    const params = new URLSearchParams(baseParams);
    params.set('club_code_str', club.dataValue);
    params.set('cond_date', dateVal);
    const resp = await fetch('join_time_list_get.asp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8', 'X-Requested-With': 'XMLHttpRequest' },
      body: params.toString(),
      credentials: 'include',
    });
    return { html: await resp.text(), clubName: club.clubName, dataValue: club.dataValue, ok: true };
  }));
}, { batchClubs: batch, baseParams: formParams, dateVal: dateYmd });

// Step 4: Node.js에서 regex 기반 HTML 파싱 (parseGolfRockPriceHtml)
```

### 남은 작업 목록
| # | 작업 | 의존성 | 난이도 |
|---|------|--------|--------|
| C1 | GitHub Actions 워크플로우에 GOLFROCK 환경변수 추가 | 없음 | S |
| C2 | TeeupNJoy club ID discovery 실행 + 검증 | 없음 | S |
| C3 | 테스트 스크립트 정리 (삭제) | 없음 | S |
| C4 | 실 데이터 크롤링 실행 (전체 window) + 검증 | C1, C2 | M |
| C5 | Admin 크롤러 UI에서 수집 데이터 확인 | C4 | S |

---

## C1: GitHub Actions 워크플로우 GOLFROCK 환경변수 추가

### 목적
GolfRock 어댑터가 GitHub Actions CI에서 로그인할 수 있도록 자격증명 환경변수를 추가한다.

### 사전 조건
GitHub 리포지토리 Settings → Secrets and variables → Actions에 아래 시크릿 등록 필요:
- `GOLFROCK_LOGIN_ID` = `01027524908`
- `GOLFROCK_LOGIN_PW` = `djguswns98!`

### 변경 파일: `.github/workflows/crawler-ingest.yml`

### 정확한 변경 내용

**변경 1: "Write crawler env" 스텝의 env 블록에 2줄 추가**

현재 코드 (line 63-75):
```yaml
      - name: Write crawler env
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
        run: |
          if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
            echo "Missing required secrets: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
            exit 1
          fi
          cat > crawler/.env.local <<EOF
          NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
          SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
          EOF
```

변경 후:
```yaml
      - name: Write crawler env
        env:
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          GOLFROCK_LOGIN_ID: ${{ secrets.GOLFROCK_LOGIN_ID }}
          GOLFROCK_LOGIN_PW: ${{ secrets.GOLFROCK_LOGIN_PW }}
        run: |
          if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
            echo "Missing required secrets: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY"
            exit 1
          fi
          cat > crawler/.env.local <<EOF
          NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL
          SUPABASE_SERVICE_ROLE_KEY=$SUPABASE_SERVICE_ROLE_KEY
          GOLFROCK_LOGIN_ID=$GOLFROCK_LOGIN_ID
          GOLFROCK_LOGIN_PW=$GOLFROCK_LOGIN_PW
          EOF
```

**변경 포인트 정리:**
1. `env:` 블록에 2줄 추가:
   - `GOLFROCK_LOGIN_ID: ${{ secrets.GOLFROCK_LOGIN_ID }}`
   - `GOLFROCK_LOGIN_PW: ${{ secrets.GOLFROCK_LOGIN_PW }}`
2. `cat > crawler/.env.local <<EOF` 안에 2줄 추가:
   - `GOLFROCK_LOGIN_ID=$GOLFROCK_LOGIN_ID`
   - `GOLFROCK_LOGIN_PW=$GOLFROCK_LOGIN_PW`

### AC (수락 조건)
- [ ] `GOLFROCK_LOGIN_ID`, `GOLFROCK_LOGIN_PW`가 .env.local에 기록됨
- [ ] 기존 SUPABASE 변수는 그대로 유지
- [ ] YAML 문법 오류 없음 (`yamllint` 또는 GitHub Actions 실행으로 확인)

---

## C2: TeeupNJoy Club ID Discovery 실행

### 목적
TeeupNJoy 사이트에서 활성 골프장 club_id 목록을 자동 발견하고, DB의 `external_price_targets` 테이블에 저장한다.

### 실행 명령

```bash
cd /Users/mybook/Desktop/tugol-app-main/crawler
node src/discover-teeup-club-ids.mjs --from=1 --to=500 --concurrency=8 --write-site=teeupnjoy
```

### 동작 설명
1. Playwright headless chromium으로 TeeupNJoy 사이트에 접속
2. club_id 1~500을 8개 동시 스캔 (API `/hp/join/hpJoinTeeTimeSearchClub.do` 호출)
3. 응답에 1개 이상 티타임이 있는 club_id를 수집
4. `--write-site=teeupnjoy` 옵션으로 `external_price_targets` 테이블의 teeupnjoy target의 `parser_config.club_ids` 필드를 자동 업데이트

### 예상 출력
```json
{
  "booking_day": "2026-02-26",
  "range": [1, 500],
  "min_count": 1,
  "found_count": 50,
  "rows": [
    { "club_id": 294, "count": 12 },
    { "club_id": 3, "count": 8 },
    ...
  ]
}
Updated target 1 with 50 club_ids.
```

### 검증 명령
discovery 후 dry-run으로 가격 수집 테스트:
```bash
node src/crawl-final-prices.mjs --target=1 --window=WEEK_BEFORE --dry-run
```

### AC
- [ ] discovery 실행 완료 (found_count > 0)
- [ ] DB의 teeupnjoy target `parser_config.club_ids`에 실제 club_id 배열 저장됨
- [ ] dry-run 시 가격 행이 1개 이상 출력됨

---

## C3: 테스트 스크립트 정리

### 목적
GolfRock 테스트에 사용한 임시 스크립트를 삭제한다.

### 삭제 파일
```bash
rm crawler/src/test-golfrock-login.mjs
rm crawler/src/test-golfrock-deep.mjs
rm crawler/src/test-golfrock-ajax-params.mjs
rm crawler/src/test-golfrock-html-sample.mjs
```

### AC
- [ ] 4개 파일 삭제 완료
- [ ] `npm --prefix crawler run check` 통과 (기존 스크립트에 영향 없음)

---

## C4: 실 데이터 크롤링 실행 + 검증

### 의존성
C1 (GitHub Actions env) + C2 (TeeupNJoy club IDs) 완료 후 실행

### 실행 명령 (로컬 테스트)

전체 window 크롤링 (4개 window 순차):
```bash
cd /Users/mybook/Desktop/tugol-app-main/crawler

# Window 1: 일주일 전
node src/crawl-final-prices.mjs --window=WEEK_BEFORE

# Window 2: 이틀 전
node src/crawl-final-prices.mjs --window=TWO_DAYS_BEFORE

# Window 3: 당일 오전
node src/crawl-final-prices.mjs --window=SAME_DAY_MORNING

# Window 4: 임박 3시간
node src/crawl-final-prices.mjs --window=IMMINENT_3H
```

### 예상 결과
각 window별로 Supabase `external_price_snapshots` 테이블에 행 삽입.
출력 예시:
```
Starting crawl for 5 target(s)...
[1] Crawling teeupnjoy - * (adapter: teeupnjoy_api)
[1] Saved 45 row(s)
[2] Crawling golfrock - * (adapter: golfrock_list)
[2] Saved 10 row(s)
[3] Crawling golfpang - * (adapter: golfpang_list)
[3] Saved 30 row(s)
Crawl finished: { success: 5, failed: 0, rows: 88 }
```

### 헬스 리포트 확인
```bash
node src/report-snapshot-health.mjs --hours=1
```

### AC
- [ ] teeupnjoy: Saved N row(s) (N > 0)
- [ ] golfrock: Saved N row(s) (N > 0, AUTH_REQUIRED 아님)
- [ ] golfpang: Saved N row(s) (또는 NO_DATA - 사이트 상태에 따라)
- [ ] golfmon/smartscore: AUTH_REQUIRED (예상 동작)
- [ ] 헬스 리포트에서 snapshots > 0

---

## C5: Admin 크롤러 UI에서 수집 데이터 확인

### 목적
`/admin/crawler` 페이지에서 수집된 가격 데이터가 올바르게 표시되는지 확인한다.

### 확인 방법
1. `npm run dev`로 개발 서버 시작
2. 브라우저에서 `http://localhost:3000/admin/crawler` 접속
3. Admin 계정으로 로그인 (또는 데모 모드)

### 확인 포인트
- [ ] 지역 탭에 골프장 목록이 표시됨
- [ ] 각 골프장의 최신 수집 시각이 표시됨
- [ ] 가격 범위 (min/avg/max)가 올바름
- [ ] Window별 통계 (WEEK_BEFORE, TWO_DAYS_BEFORE 등)가 표시됨
- [ ] GolfRock 골프장이 AUTH_REQUIRED가 아닌 AVAILABLE로 표시됨

---

## 보안 체크리스트

- [ ] `GOLFROCK_LOGIN_ID`, `GOLFROCK_LOGIN_PW`는 소스코드에 하드코딩되지 않음
- [ ] `crawler/.env.local`은 `.gitignore`에 포함되어 있음
- [ ] GitHub Actions에서는 Secrets로만 전달됨
- [ ] `crawl-final-prices.mjs`의 `loginGolfRock()`은 `process.env`에서만 읽음

---

## 파일 변경 요약

| 파일 | 상태 | 설명 |
|------|------|------|
| `crawler/src/crawl-final-prices.mjs` | ✅ 완료 | `loginGolfRock()` + `parseGolfRockPriceHtml()` + `crawlGolfRockList()` (직접 AJAX) |
| `.github/workflows/crawler-ingest.yml` | 🔧 C1에서 수정 | GOLFROCK env vars 2개 추가 |
| `crawler/src/test-golfrock-login.mjs` | 🗑️ C3에서 삭제 | 임시 테스트 스크립트 |
| `crawler/src/test-golfrock-deep.mjs` | 🗑️ C3에서 삭제 | 임시 테스트 스크립트 |
| `crawler/src/test-golfrock-ajax-params.mjs` | 🗑️ C3에서 삭제 | 임시 테스트 스크립트 |
| `crawler/src/test-golfrock-html-sample.mjs` | 🗑️ C3에서 삭제 | 임시 테스트 스크립트 |

---

## 기술 참조

### GolfRock 직접 AJAX 방식 (최종 구현)

**핵심 발견 (AJAX 파라미터 인터셉트로 확인됨):**

```
POST https://m.golfrock.co.kr/join_time_list_get.asp
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
X-Requested-With: XMLHttpRequest

Body (#tranForm 직렬화 + club_code_str 오버라이드):
latitude=0&longitude=0&cond_area=000&cond_date=20260220&cond_tran_div1_yn=&cond_tran_div2_yn=Y
&cond_am_yn=Y&cond_pm_yn=Y&cond_night_yn=Y&cond_nocaddy_yn=&cond_sort=0
&club_code_str=202602204995&cond_join_mm_yn=&cond_join_mf_yn=&grp_div=&tran_no=&tran_seq=
&club_code=&search_club_name=
```

**핵심 파라미터:**
- `club_code_str`: `.club_info`의 `data-value` 값 (예: `202602204995`)
- `cond_date`: `YYYYMMDD` 형식 날짜
- 나머지: `#tranForm` 폼의 기본 필드들 (area, AM/PM/야간 필터 등)

**응답 HTML 구조:**
```html
<ul class='listwrap' onclick="fnv_move_page('01','15260958','1','4995');">
  <li>
    <p>2/20(금)</p>
    <p class='club'>(회원제)홍천지역</p>
    <p class='text11'><span></span><span class='fromme'>0km</span></p>
  </li>
  <li>
    <p class='time'>10:45</p>
    <p class='text11'><span class='hole'>대기자 없음</span></p>
  </li>
  <li><span>&nbsp;</span></li>
  <li>
    <p class='price'><span style='...'>현장</span>80,000원</p>
    <p>오늘</p>
  </li>
</ul>
```

**사이트 JavaScript (소스에서 확인):**
```javascript
// 아코디언 클릭 핸들러
$('.club_info').click(function(){
  if($(this).hasClass('on')){
    // 닫기
  } else {
    var v_club_data = $(this).data('value');
    fnv_compare_time_list_get(v_club_data);  // ← AJAX 함수 호출
  }
});

// AJAX 함수
function fnv_compare_time_list_get(v_club_data){
  $("#club_code_str").val(v_club_data);  // ← 폼 필드에 data-value 설정
  $.ajax({
    url: "join_time_list_get.asp",
    type: "POST",
    data: $("#tranForm").serialize(),     // ← 폼 전체 직렬화
    dataType: "html",
    success: function(data){
      $("#club_cont_list"+v_club_data).html(data);
    }
  });
}
```

**왜 직접 fetch가 아코디언 클릭보다 우월한가:**

| 항목 | 아코디언 클릭 방식 | 직접 AJAX fetch 방식 |
|------|-------------------|---------------------|
| 속도 | 4분+ (순차 클릭+대기) | **18초** (병렬 배치) |
| 안정성 | CSS 셀렉터 변경 시 깨짐 | 폼 직렬화 기반, 안정적 |
| 병렬성 | 불가 (DOM 이벤트 순차) | **5개 동시** (`Promise.all`) |
| 파싱 | `page.evaluate` (브라우저) | **Node.js regex** (빠름) |
| 에러 처리 | 타임아웃 의존 | fetch 응답 코드 확인 |

### GolfRock 로그인

- URL: `https://m.golfrock.co.kr/member/login.asp`
- ID 필드: `input[name="memb_handphone"]` (type="tel")
- PW 필드: `input[name="memb_pass"]` (type="password")
- 로그인 버튼: `button.btn-yell` (text="로그인")
- 성공 시: body에 "로그아웃" 또는 "마이페이지" 텍스트 존재

### TeeupNJoy 사이트 구조

**API 어댑터 (이미 구현됨):**
- API: POST `/hp/join/hpJoinTeeTimeSearchClub.do`
- 파라미터: `trgetTcYn=Y`, `bookingDay=YYYYMMDD`, `bookingEndDay=YYYYMMDD`, `clubId=N`, `joinType=join`
- 응답: JSON `{ success: true, resultList: { "YYYYMMDD": [...teeTimes] }, resultListCnt: { "YYYYMMDD": N } }`
- 티타임 객체: `{ bookingTime: "0730", bookDiscount: "89000", prName: "코스A", bookingDay: "20260226" }`

**Club ID Discovery:**
- 스캔 범위: 1~500 (기본)
- 방식: 각 clubId로 API 호출 → `resultListCnt > 0`이면 활성
- 결과: `parser_config.club_ids` 배열에 저장

### 크롤러 파이프라인

```
GitHub Actions (4시간 cron, minute 13 UTC)
  → seed-default-targets.mjs (target 등록)
  → discover-teeup-club-ids.mjs (00:13 UTC only, 1일 1회)
  → crawl-final-prices.mjs --window=WEEK_BEFORE
  → crawl-final-prices.mjs --window=TWO_DAYS_BEFORE
  → crawl-final-prices.mjs --window=SAME_DAY_MORNING
  → crawl-final-prices.mjs --window=IMMINENT_3H
  → report-snapshot-health.mjs --hours=48
```

### 어댑터 디스패치 로직

```javascript
async function crawlTarget(browser, target, args) {
  const adapterCode = (target.adapter_code || target.site_code || 'generic_single').toLowerCase();
  if (adapterCode.includes('golfpang'))  → crawlGolfPangList(browser, target, args)
  if (adapterCode.includes('golfrock'))  → crawlGolfRockList(browser, target, args)  // 직접 AJAX
  if (adapterCode.includes('teeup'))     → crawlTeeupNjoyApi(browser, target, args)  // 직접 API
  if (adapterCode.includes('golfmon') || 'smartscore') → AUTH_REQUIRED 반환
  else → crawlGenericSingle(browser, target)
}
```

### DB 테이블 (참조)

**external_price_targets:**
| 필드 | 타입 | 설명 |
|------|------|------|
| id | serial PK | |
| site_code | text | 'teeupnjoy', 'golfrock', 'golfpang' 등 |
| course_name | text | '*' = 모든 골프장 |
| url | text | 사이트 URL |
| adapter_code | text | 어댑터 식별자 |
| parser_config | jsonb | 어댑터별 설정 (club_ids 등) |
| active | boolean | 활성 여부 |

**external_price_snapshots:**
| 필드 | 타입 | 설명 |
|------|------|------|
| id | serial PK | |
| target_id | int FK | external_price_targets.id |
| site_code | text | |
| course_name | text | 골프장명 |
| play_date | date | 플레이 날짜 |
| tee_time | text | 'HH:MM' 또는 null |
| final_price | int | 최종 가격 (원) |
| original_price | int | 원래 가격 (할인 전) |
| collection_window | text | WEEK_BEFORE/TWO_DAYS_BEFORE/SAME_DAY_MORNING/IMMINENT_3H |
| day_part | text | PART_1/PART_2/PART_3 |
| slot_position | text | EARLY/MIDDLE/LATE |
| availability_status | text | AVAILABLE/NO_DATA/AUTH_REQUIRED/FAILED |
| crawl_status | text | SUCCESS/FAILED |
| payload | jsonb | 원시 데이터/디버그 정보 |
| crawled_at | timestamptz | 수집 시각 |
