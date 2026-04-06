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
  platform_access_token: string | null;
  platform_refresh_token: string | null;
  allowed_redirect_uris: string | null; // JSON array string
  plan: 'free' | 'plus';
  sso_configured: number; // 0 or 1
  widget_style: string | null; // JSON string
  coupon_config?: string | null; // JSON string (CouponConfig)
  kakao_channel_id?: string | null; // Plus: 카카오 채널 ID
  shop_identity?: string | null; // Plus: AI 분석 쇼핑몰 정체성 JSON
  banner_config?: string | null; // Plus: 미니배너 설정 JSON
  popup_config?: string | null; // Plus: 이탈 감지 팝업 설정 JSON
  escalation_config?: string | null; // Plus: 에스컬레이션 설정 JSON
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
  theme: string;
}

export interface WidgetStyle {
  preset: 'default' | 'compact' | 'icon-text' | 'icon-only' | 'mono' | 'outline' | 'outline-mono';
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
