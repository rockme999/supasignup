# {{서비스명}} — AI 자동답변 캐시·비용 실측 벤치마크 (템플릿)

> 실측 방법: `scripts/bench-via-local-worker.mjs` 를 `wrangler dev --remote` 와 함께 실행
> 상세 절차: 플레이북 "비용·레이턴시 벤치마크" 섹션 참조

---

## 사전 준비

1. **Cloudflare API Token 발급** (최초 1회, 필요 시)
   - https://dash.cloudflare.com/profile/api-tokens → "Create Token"
   - "Workers AI" > "Read" 권한 템플릿
2. **환경파일 준비** (최초 1회)
   ```bash
   cp scripts/.env.bench.example scripts/.env.bench
   # scripts/.env.bench 에 CF_API_TOKEN 기입
   ```

또는 **wrangler dev --remote + 임시 bench 엔드포인트** 경유 (토큰 불필요):
1. `workers/api/src/routes/_bench-kimi.ts` 임시 생성 (플레이북 스니펫 복사)
2. `workers/api/src/index.ts` 에 라우트 등록
3. `npx wrangler dev --local=false --port 8787` 실행
4. `node scripts/bench-via-local-worker.mjs` 실행
5. 완료 후 임시 라우트·등록 제거

---

## 예상 수치 (실측 전 추정)

| 라운드 | 평균 지연 | 평균 비용/호출 |
|---|---:|---:|
| 1 (cache miss) | TODO — 30~90초 범위 | TODO |
| 2 (cache hit) | TODO | TODO |

**월 {{호출량}}건 기준 예상**: TODO

---

## 실 청구 실측 ({{YYYY-MM-DD}} Cloudflare 대시보드 교차검증)

| 지표 | 실측값 | 비고 |
|---|---:|---|
| 총 호출 수 | {{?}}회 | 벤치 실행 |
| 총 Neurons 사용 | {{?}} | |
| 입력 토큰 총합 | {{?}} | 평균 {{?}}/호출 |
| 출력 토큰 총합 | {{?}} | 평균 {{?}}/호출 |
| **Neurons 기반 청구** | **${{?}}** | $0.011 / 1,000 neurons × Neurons |
| **호출당 비용** | **${{?}} (≈ {{?}}원)** | |

### 월 비용 재추정 (실측 기반)

| 호출량 | USD | KRW |
|---|---:|---:|
| 하루 20건 (월 600) | ${{?}} | ≈ {{?}}원 |
| 하루 100건 (월 3,000) | ${{?}} | ≈ {{?}}원 |
| 하루 500건 (월 15,000) | ${{?}} | ≈ {{?}}원 |

### 캐시 효과 판정

- 지연시간: Round 1 {{?}}초 → Round 2 {{?}}초 ({{?}}% 변화)
- 판정: ✅ 캐시 효과 확인 / 🟡 부분 효과 / ❌ 미동작 의심

---

## 실측 결과 (스크립트 append)

<!-- 여기부터는 benchmark 스크립트가 자동으로 채웁니다. 수동 편집 금지. -->
