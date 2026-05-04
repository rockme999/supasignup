// Shop types
export interface Shop {
  shop_id: string;
  mall_id: string;
  platform: 'cafe24' | 'imweb' | 'godomall' | 'shopby';
  shop_name: string | null;
  shop_url: string | null;
  owner_id: string;
  client_id: string;
  client_secret: string;
  enabled_providers: string; // JSON array string
  icon_providers: string; // JSON array string — 아이콘 모드 프로바이더 ID (enabled_providers 부분집합), 빈 배열이면 전부 풀버튼
  platform_access_token: string | null;
  platform_refresh_token: string | null;
  allowed_redirect_uris: string | null; // JSON array string
  plan: 'free' | 'plus';
  sso_configured: number; // 0 or 1
  widget_style: string | null; // JSON string
  sso_type: string; // 카페24 SSO 슬롯 식별자 (sso, sso1, sso2, ...)
  coupon_config?: string | null; // JSON string (CouponConfig)
  coupon_enabled?: number; // 0 or 1 (coupon_config.enabled 파싱 결과 캐시용)
  kakao_channel_id?: string | null; // Plus: 카카오 채널 ID
  shop_identity?: string | null; // Plus: AI 분석 쇼핑몰 정체성 JSON
  banner_config?: string | null; // Plus: 미니배너 설정 JSON
  popup_config?: string | null; // Plus: 이탈 감지 팝업 설정 JSON
  escalation_config?: string | null; // Plus: 에스컬레이션 설정 JSON
  ai_suggested_copy?: string | null; // Plus: AI 브리핑 생성 추천 문구 JSON
  /** @deprecated 2026-04-30 — 이탈 감지 팝업(popup_config)으로 통합됨. 코드 미사용. 차후 DROP 예정. */
  exit_intent_config?: string | null;
  live_counter_config?: string | null; // Plus: 라이브 가입자 카운터 설정 JSON
  // ── 카페24 운영자 연락처 캐시 (0033) ──────────────────────
  // owners.email은 카페24 가입 시 @cafe24.auto 더미라 발송 불가 → /admin/store API로 가져온
  // 진짜 연락처를 저장. 새 install 시 자동 sync, 그 외 backfill 또는 lazy refresh.
  store_email?: string | null;
  store_phone?: string | null;
  store_admin_name?: string | null;
  store_synced_at?: string | null;
  // ── AI 주간 브리핑 자동 발송 토글 (0033, 기본 ON) ─────────
  auto_briefing_email?: number;     // 0 | 1
  auto_briefing_alimtalk?: number;  // 0 | 1 (Phase 2)
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Owner {
  owner_id: string;
  email: string;
  name: string | null;
  password_hash: string;
  role: 'user' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface User {
  user_id: string;
  provider: string;
  provider_uid: string;
  email: string | null; // AES-GCM encrypted
  email_hash: string | null; // SHA-256 hash for search
  name: string | null; // AES-GCM encrypted
  profile_image: string | null;
  raw_data: string | null; // AES-GCM encrypted JSON
  phone: string | null; // AES-GCM encrypted
  birthday: string | null; // AES-GCM encrypted
  gender: string | null; // plaintext
  created_at: string;
  updated_at: string;
}

export interface ShopUser {
  id: string;
  shop_id: string;
  user_id: string;
  platform_member_id: string | null;
  status: string;
  created_at: string;
}

export interface Subscription {
  id: string;
  owner_id: string;
  shop_id: string;
  plan: 'plus';
  billing_cycle: 'monthly' | 'yearly';
  status: 'pending' | 'active' | 'cancelled' | 'expired';
  payment_id: string | null;
  started_at: string;
  expires_at: string;
  created_at: string;
}

export interface LoginStat {
  id: string;
  shop_id: string;
  user_id: string;
  provider: string;
  action: 'signup' | 'login';
  created_at: string;
}

// OAuth types
export type ProviderName = 'google' | 'kakao' | 'naver' | 'apple' | 'discord' | 'facebook' | 'x' | 'line' | 'telegram';

export interface ProviderInfo {
  name: ProviderName;
  displayName: string;
  icon: string; // SVG string
  color: string;
  bgColor: string;
  textColor: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

export interface OAuthUserInfo {
  provider: ProviderName;
  providerUid: string;
  email?: string;
  name?: string;
  profileImage?: string;
  rawData: Record<string, unknown>;
  phone?: string;
  birthday?: string;
  gender?: string;
}

// KV session types
export interface OAuthSession {
  shop_id: string;
  redirect_uri: string;
  provider: ProviderName;
  cafe24_state: string;
  social_state: string;
  visitor_id?: string;
  device?: string;
}

export interface AuthCodeData {
  user_id: string;
  shop_id: string;
}

export interface AccessTokenData {
  user_id: string;
  shop_id: string;
}

export interface DashboardSession {
  owner_id: string;
}

// Widget types
export interface WidgetConfig {
  shop_id: string;
  providers: ProviderName[];
  iconProviders?: ProviderName[]; // providers 의 부분집합 — 아이콘 row로 렌더되는 프로바이더
  theme: string;
}

export interface WidgetStyle {
  preset: 'default' | 'compact' | 'icon-text' | 'icon-only' | 'mono' | 'outline' | 'outline-mono'
    // Plus 전용 프리셋 6종
    | 'glassmorphism' | 'neon-glow' | 'liquid-glass' | 'gradient-flow' | 'soft-shadow' | 'pulse';
  presetTier?: 'free' | 'plus'; // optional — 없으면 'free' 기본값. Plus 프리셋 보안 검증용
  buttonWidth: number;
  buttonHeight: number; // 버튼 높이 (px)
  buttonGap: number;
  borderRadius: number;
  align: 'left' | 'center' | 'right';
  buttonLabel: string; // e.g. '{name}로 시작하기', '{name}로 로그인', 직접 입력 가능
  showIcon: boolean; // 버튼에 프로바이더 아이콘 표시 여부
  iconGap: number; // 아이콘-텍스트 간격 (px)
  paddingLeft: number; // 버튼 왼쪽 여백 (px)
  showTitle: boolean; // 상단 "⚡ 간편 로그인" 타이틀 표시 여부
  showPoweredBy: boolean; // 하단 "powered by 번개가입" 표시 여부 (무료 플랜은 항상 true)
  widgetPosition: 'before' | 'after' | 'custom'; // 위젯 삽입 위치: 로그인 폼 앞/뒤/커스텀 셀렉터
  customSelector: string; // 커스텀 CSS 셀렉터 (widgetPosition이 'custom'일 때 사용)
  // ── Plus 전용: 쿠폰팩 통합 (v2.5.0) ──────────────────────
  showCouponPack?: boolean; // 위젯에 쿠폰팩 카드 노출 여부 (기본 true). false 시 위젯 표시 안 함
  couponPackPosition?: 'above' | 'below'; // 쿠폰팩 카드 위치: 소셜 버튼 위(above) 또는 아래(below). 기본 'below'
  couponPackGap?: number; // 소셜 버튼과 쿠폰팩 사이 간격(px). 기본 12
  // ── Plus 전용: 커스텀 텍스트 2종 ──────────────────────────
  customText1Enabled?: boolean; // 텍스트1(상단 타이틀 아래, 작은 폰트) 노출 여부. 기본 true
  customText1?: string; // 텍스트1 본문. 기본 '아이디 비밀번호 입력없이 번개가입! 번개로그인!'
  customText2Enabled?: boolean; // 텍스트2(소셜과 쿠폰팩 사이, 큰 폰트 볼드) 노출 여부. 기본 true
  customText2?: string; // 텍스트2 본문. 기본 '회원가입 즉시 사용가능한 쿠폰팩 증정'
}

export const DEFAULT_WIDGET_STYLE: WidgetStyle = {
  preset: 'default',
  buttonWidth: 370,
  buttonHeight: 45,
  buttonGap: 6,
  borderRadius: 5,
  align: 'left',
  buttonLabel: '{name}로 시작하기',
  showIcon: true,
  iconGap: 30,
  paddingLeft: 100,
  showTitle: true,
  showPoweredBy: true,
  widgetPosition: 'before',
  customSelector: '',
  // Plus 전용 기본값 (Free 플랜에서는 server-side 또는 client-side에서 무시)
  showCouponPack: true,
  couponPackPosition: 'below',
  couponPackGap: 12,
  customText1Enabled: true,
  customText1: '아이디 비밀번호 입력없이 번개가입! 번개로그인!',
  customText2Enabled: true,
  customText2: '회원가입 즉시 사용가능한 쿠폰팩 증정',
};

// Env binding types for Workers
export interface Env {
  DB: D1Database;
  KV: KVNamespace;
  BASE_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  KAKAO_CLIENT_ID: string;
  KAKAO_CLIENT_SECRET: string;
  NAVER_CLIENT_ID: string;
  NAVER_CLIENT_SECRET: string;
  APPLE_CLIENT_ID: string;
  APPLE_TEAM_ID: string;
  APPLE_KEY_ID: string;
  APPLE_PRIVATE_KEY: string;
  DISCORD_CLIENT_ID: string;
  DISCORD_CLIENT_SECRET: string;
  FACEBOOK_APP_ID: string;
  FACEBOOK_APP_SECRET: string;
  X_CLIENT_ID: string;
  X_CLIENT_SECRET: string;
  LINE_CHANNEL_ID: string;
  LINE_CHANNEL_SECRET: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_BOT_USERNAME: string;
  CAFE24_CLIENT_ID: string;
  CAFE24_CLIENT_SECRET: string;
  CAFE24_WEBHOOK_API_KEY: string;
  ENCRYPTION_KEY: string;
  JWT_SECRET: string;
  AI: any; // Cloudflare Workers AI binding
  CF_ACCOUNT_ID: string; // Cloudflare Account ID (AI REST API fallback + Analytics용)
  CF_AI_TOKEN: string; // Cloudflare AI API Token
  CF_API_TOKEN: string; // Cloudflare API Token (Analytics GraphQL용)
  BRIEFING_QUEUE: Queue; // Cloudflare Queue — 주간 브리핑 비동기 처리
  INQUIRY_ATTACHMENTS: R2Bucket; // R2 버킷 — 문의 첨부 이미지 (Phase 2)
  // ── 빌드 메타데이터 (배포 시 deploy.sh가 --var로 주입) ────────
  // 기본값은 wrangler.toml [vars]에 'unknown'으로 정의되어 있음.
  // 실제 배포 시 git rev-parse / date 결과로 override.
  VERSION: string;       // SemVer (예: '2.0.0') — workers/api/package.json 기준
  COMMIT_SHA: string;    // git short hash (예: 'd8ab2bb') — 'unknown'이면 로컬 dev
  BUILD_TIME: string;    // ISO 8601 UTC (예: '2026-04-27T08:30:00Z')
  // ── SMTP 발송 (Ecount wsmtp.ecount.com:587 STARTTLS, AI 주간 브리핑 등 운영자 발송) ──
  // wrangler secret put SMTP_USER / SMTP_PASS 로 등록. 미등록 환경에서는 발송 시도 자체 skip.
  SMTP_USER?: string;
  SMTP_PASS?: string;
}

// Billing
export const PLANS = {
  FREE: 'free',
  PLUS: 'plus',
} as const;

export const PLAN_PRICES = {
  monthly: 6900,
  yearly: 79000,
} as const;

// v2: Free 무제한이지만 기존 billing/stats 코드 호환성을 위해 유지 (대시보드 개편 시 제거 예정)
export const FREE_PLAN_MONTHLY_LIMIT = Infinity;
export const FREE_PLAN_WARN_THRESHOLD = Infinity;
