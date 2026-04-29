# 위젯 스테이징↔프로덕션 배포 함정 (필독)

번개가입 위젯(`/widget/buttons.js`)을 **스테이징에 배포한 코드 변경이 모바일/브라우저에 도달하지 않는 함정**의 진단/해결 가이드.

작성: 2026-04-29 — 모바일에서 모든 프리셋이 미적용되는 회귀 사이클 (~5시간 디버그 후 본질 발견)

---

## 핵심 함정 3가지 (한 줄 요약)

1. **카페24 ScriptTag URL의 `vs` 파라미터는 ScriptTag 등록 시점에 고정** — 코드 배포해도 URL은 그대로
2. **우리 `/widget/buttons.js` endpoint의 `Cache-Control: max-age=3600`** — 1시간 동안 같은 URL은 옛 응답 caching
3. **위젯 IIFE의 `window.__BG_WIDGET_LOADED__` 가드가 환경 구분 없는 단일 변수** — 같은 가게에 prod+dev 앱 둘 다 설치 시, 먼저 실행된 IIFE가 가드 set → 나중 IIFE는 차단됨

이 셋이 결합되면: **dev에 어떤 픽스를 배포해도 모바일에서는 옛 prod 코드만 작동**. 디버그 로그/CSS/JS 변경이 한 줄도 도달 못 함. 추측 픽스 사이클 무한 반복.

---

## 어떻게 진단하는가

### 1. 증상 패턴 — 이런 증상이 나오면 즉시 캐시 의심

- 모바일에서 위젯이 "기본 버튼"처럼 보임 (preset/모서리 둥글기/높이 등 모든 옵션 미적용)
- `?bg_debug=1` URL로 접속해도 콘솔에 `[번개가입]` 로그 0건
- 데스크탑은 정상, 모바일만 문제 → 데스크탑 브라우저가 우연히 옛 캐시를 갱신했을 뿐
- 픽스 배포 후 동일 증상 반복 → 픽스가 IIFE에 도달조차 못 함

### 2. 첫 번째 검증 — 콘솔에서

```js
window.__BG_WIDGET_LOADED__
// → true 면 옛 가드 변수 (환경 분리 전 옛 코드)

Object.keys(window).filter(k => k.indexOf('__BG_WIDGET_LOADED') !== -1)
// → ['__BG_WIDGET_LOADED__'] 만 있으면 옛 코드만 실행 중 (dev IIFE 차단됨)
// → 새 가드 키 (예: '__BG_WIDGET_LOADED_https_bg_dev_suparain_kr__')도 같이 보여야 정상
```

### 3. Network 탭에서 vs 확인

`buttons.js`로 필터링 → 각 응답의 URL `vs=YYYYMMDDhhmmss.N` 값 확인:
- 빌드 시점이 며칠 전이면 disk cache hit으로 옛 응답 받는 중
- ETag로 매 요청 검증되어야 정상이지만 max-age 안에서는 검증 안 됨

### 4. 캐시 우회 검증 — Disable cache

inspect 창 (PC Chrome USB로 Android polling) → **Network 탭** → **`☑ Disable cache`** 체크 → 페이지 새로고침.

이 상태에서 `[번개가입] init: ua=...` 같은 로그가 뜨면 **새 코드가 작동 중** = 캐시가 본질이었음.

뜨지 않으면 → 다른 원인 (ES6+ syntax error, 가드 차단, ScriptTag 미박힘 등). `node -c /tmp/widget.js`로 syntax check 먼저.

---

## 해결 — 환경별 가드 키 (적용됨, commit `48bcab8`)

기존:
```js
if (window.__BG_WIDGET_LOADED__) return;
window.__BG_WIDGET_LOADED__ = true;
```

수정:
```js
var __BG_GUARD_KEY__ = '__BG_WIDGET_LOADED_' + (__MY_BASE_URL__ || 'unknown').replace(/[^a-z0-9]/gi, '_') + '__';
if (window[__BG_GUARD_KEY__]) return;
window[__BG_GUARD_KEY__] = true;
```

**효과**: 같은 페이지에 prod buttons.js와 dev buttons.js 둘 다 박혀도 각자 다른 가드 키 사용 → 둘 다 정상 실행.

---

## 캐시 정책 권장 (프로덕션 배포 시 적용)

### 위젯 JS (`/widget/buttons.js`)

```typescript
'Cache-Control': 'public, max-age=300, must-revalidate'  // 5분
```

이유:
- 코드 변경 빈도: 며칠~주 단위 → 매 요청 fresh는 과도
- 5분이면 새 빌드가 5분 안에 모든 사용자에게 도달
- ETag로 변경 없을 때 304 응답 → 본문 전송 0
- max-age=3600 (1시간)은 **너무 김** → 함정의 원인

### 위젯 config (`/api/widget/config?client_id=...`)

```typescript
'Cache-Control': 'private, no-store, no-cache, must-revalidate'
```

이유:
- 운영자가 어드민에서 변경 즉시 위젯에 반영되어야
- KV 조회는 빠름 (latency 무시)
- 운영자가 자기 쇼핑몰 새로고침 → 즉시 새 설정 받음

### KV 무효화 흐름 (확인 필요)

운영자가 어드민 PUT 시 → KV 즉시 invalidate → 다음 위젯 요청부터 새 config.
`purgeWidgetConfigCache` 같은 헬퍼가 PUT 흐름에 호출되는지 점검.

---

## 운영자 테스트 시 주의

운영자가 어드민에서 옵션 변경하며 자기 쇼핑몰에서 테스트할 때:
- **위젯 config**가 즉시 반영되려면 위 정책 (max-age=0)
- **위젯 JS** 코드는 max-age=300이라 5분 내에 새 빌드 도달 (운영자가 코드 변경할 일은 거의 없으니 무관)
- 운영자가 캐시 우회 원하면 URL에 `?bg_fresh=<random>` 추가하거나 어드민에 "캐시 무효화" 버튼 (백로그)

---

## 같은 가게에 prod + dev 앱 둘 다 설치 시 주의

- 두 앱 모두 자기 ScriptTag를 가게에 박음 (서로 모름)
- 두 위젯이 같은 페이지에서 동시 실행되어 두 컨테이너가 동시 표시될 수 있음
- 이번 픽스(가드 키 분리)로 둘 다 정상 작동
- 검증 시 둘 중 어느 위젯이 어떤 응답을 받는지 명확히 구분 (Network 탭에서 도메인별)

검증할 때:
- **dev 앱 ScriptTag URL의 `client_id`와 config 요청의 `client_id`가 일치하는지** 확인. 일치 안 하면 위젯이 자기 ScriptTag를 못 찾고 다른 ScriptTag URL의 shop_id로 config 요청 가능 (`document.querySelectorAll('script[src*="buttons.js"]')`에서 첫 번째 매칭만 사용하는 등 분기 버그)

---

## 추측 픽스 사이클 회피 — 디버그 절차

회귀 보고를 받으면 **추측 픽스 금지**. 다음 절차를 우선:

1. **사용자 환경 확인** — 카페24 가게에 어떤 앱이 설치되어 있는지, 도메인이 어디인지, 모바일/데스크탑 어떤 환경인지
2. **빌드된 위젯 JS 직접 받기** — `curl -s "https://bg-dev.suparain.kr/widget/buttons.js?shop=test" -o /tmp/w.js`
3. **node -c로 syntax check**
4. **사용자 모바일 콘솔에서 디버그 로그** — `?bg_debug=1` 게이트로 init/loadConfig/render 단계별
5. **Network 탭의 vs/응답 시점 확인** — 옛 빌드인지 새 빌드인지
6. **Disable cache로 강제 fresh 검증** — 새 코드 도달 시 정상 작동하는지

본질 잡힌 후에만 픽스. 본질 안 잡힌 채 코드 변경 시 추측 사이클 → 코드 복잡도 증가 + 시간 낭비.

---

## 관련 commit (참고)

- `48bcab8` — 가드 키 환경별 분리 (이번 회귀 본질 픽스)
- `4efed17` — 위젯 endpoint cache max-age=0 (스테이징 적용; 프로덕션은 max-age=300 권장)
- `b50c4ac` — 디버그 로그 헬퍼 (`bgDebug`, `bgLog`) + viewport 모바일 분기
- `5221e14`, `6451ff6` — template literal 안 정규식 escape 픽스 (`/\\s+/`, `/\\+/g`)
- `98f8e3f` — ES5 변환 (`new URL`, `URLSearchParams`, `Array.from(padStart)`)

---

## 책방 KB 항목

- KB #644 — `WIDGET_JS template literal 안 정규식 \\X escape — NonEscapeCharacter 소멸 버그`
- KB #648 — 위젯 회귀 본질 진단 (이번 commit `48bcab8` 관련)

---

## 마무리

이번 회귀에서 ~5시간 디버그 사이클이 발생한 이유: 콘솔에 디버그 로그가 안 보이면 **즉시 캐시 의심**해야 했는데 코드 추측 픽스부터 진행. 다음에는 위 1-6단계 절차를 우선.
