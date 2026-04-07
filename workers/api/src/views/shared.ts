/**
 * Shared constants, types, and utilities for dashboard SSR pages.
 */
import { WidgetStyle, DEFAULT_WIDGET_STYLE } from '@supasignup/bg-core';
export type { WidgetStyle };
export { DEFAULT_WIDGET_STYLE };

// ─── Provider constants ───────────────────────────────────────

export const providerColors: Record<string, string> = {
  google: '#f2f2f2',
  kakao: '#fee500',
  naver: '#03c75a',
  apple: '#000000',
  discord: '#5865f2',
  facebook: '#1877f2',
  x: '#000000',
  line: '#06c755',
  telegram: '#26a5e4',
  toss: '#0064ff',
  tiktok: '#000000',
};

export const providerDisplayNames: Record<string, string> = {
  google: 'Google',
  kakao: '카카오',
  naver: '네이버',
  apple: 'Apple',
  discord: 'Discord',
  facebook: 'Facebook',
  x: 'X (Twitter)',
  line: 'LINE',
  telegram: 'Telegram',
  toss: '토스',
  tiktok: 'TikTok',
};

export const providerPieColors: Record<string, string> = {
  google: '#4285f4',
  kakao: '#f7c948',
  naver: '#03c75a',
  apple: '#555555',
  discord: '#5865f2',
  facebook: '#1877f2',
  x: '#666666',
  line: '#06c755',
  telegram: '#26a5e4',
  toss: '#0064ff',
  tiktok: '#888888',
};

export const PIE_FALLBACK_COLORS = ['#6366f1','#f59e0b','#10b981','#ef4444','#8b5cf6','#ec4899','#14b8a6','#f97316'];

// ─── Coupon config constants ──────────────────────────────────

export type CouponConfigUI = {
  shipping: { enabled: boolean; expire_days: number };
  amount: { enabled: boolean; expire_days: number; discount_amount: number; min_order: number };
  rate: { enabled: boolean; expire_days: number; discount_rate: number; min_order: number };
  cafe24_coupons?: {
    shipping_coupon_no?: number;
    amount_coupon_no?: number;
    rate_coupon_no?: number;
  };
};

export const DEFAULT_COUPON_CONFIG_UI: CouponConfigUI = {
  shipping: { enabled: false, expire_days: 30 },
  amount: { enabled: true, expire_days: 30, discount_amount: 3000, min_order: 0 },
  rate: { enabled: false, expire_days: 7, discount_rate: 10, min_order: 0 },
};

// ─── Types ────────────────────────────────────────────────────

export type HomeStats = {
  total_signups: number;
  total_logins: number;
  today_signups: number;
  month_signups: number;
  by_provider: Record<string, number>;
};

export type DailyData = { day: string; action: string; cnt: number };

export type FunnelEventRow = { event_type: string; cnt: number };

export type ShopDetail = {
  shop_id: string;
  shop_name: string;
  mall_id: string;
  client_id: string;
  client_secret: string;
  platform: string;
  plan: string;
  enabled_providers: string;
  created_at: string;
  sso_configured: number;
};

export type ShopSummary = {
  shop_id: string;
  shop_name: string;
  mall_id: string;
  plan: string;
  sso_configured: number;
  created_at: string;
};

export type OauthDropoffData = {
  total_oauth_start: number;
  total_signup_complete: number;
  overall_completion_rate: number;
  overall_dropoff_rate: number;
  providers: Array<{
    provider: string;
    oauth_start: number;
    signup_complete: number;
    completion_rate: number;
    dropoff_rate: number;
  }>;
};

export type EffortData = {
  avg_visit_count: number | null;
  avg_session_pages: number | null;
  avg_product_views: number | null;
  avg_hours_to_signup: number | null;
  total_signups: number;
  first_visit_signups: number;
  first_visit_rate: number;
  trigger_distribution: Record<string, number>;
};

export type DistributionData = {
  device: Array<{ device: string; count: number }>;
  referrer: {
    categories: Record<string, number>;
    top_domains: Array<{ domain: string; count: number }>;
  };
  first_visit_page: Array<{ page_type: string; count: number }>;
  provider_by_device: Array<{ provider: string; device: string; count: number }>;
};

export type HourlyData = {
  heatmap: number[][];
  day_names: string[];
  peak: { day: string; hour: number; count: number; label: string };
};

// ─── Utility functions ────────────────────────────────────────

export function parseProviders(raw: string | null | undefined): string[] {
  try { return JSON.parse(raw || '[]'); } catch { return []; }
}

export const inquiryStatusLabel = (status: string) => {
  if (status === 'pending') return { label: '접수됨', cls: 'badge-yellow' };
  if (status === 'replied') return { label: '답변완료', cls: 'badge-green' };
  if (status === 'closed') return { label: '종료', cls: 'badge-gray' };
  return { label: status, cls: 'badge-gray' };
};
