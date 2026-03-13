/**
 * Tests for social OAuth provider URL building and response mapping.
 */
import { describe, it, expect } from 'vitest';
import { buildSocialAuthUrl } from './social';
import type { SocialAuthUrlParams } from './social';

const BASE_PARAMS: SocialAuthUrlParams = {
  clientId: 'test_client_id',
  redirectUri: 'https://bg.suparain.kr/oauth/callback/google',
  state: 'random_state_123',
  codeChallenge: 'challenge_abc',
};

describe('buildSocialAuthUrl', () => {
  describe('Google', () => {
    it('builds correct Google OAuth URL', () => {
      const url = new URL(buildSocialAuthUrl('google', BASE_PARAMS));
      expect(url.origin).toBe('https://accounts.google.com');
      expect(url.pathname).toBe('/o/oauth2/v2/auth');
      expect(url.searchParams.get('client_id')).toBe('test_client_id');
      expect(url.searchParams.get('redirect_uri')).toBe(BASE_PARAMS.redirectUri);
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toContain('openid');
      expect(url.searchParams.get('scope')).toContain('email');
      expect(url.searchParams.get('scope')).toContain('profile');
      expect(url.searchParams.get('state')).toBe('random_state_123');
      expect(url.searchParams.get('code_challenge')).toBe('challenge_abc');
      expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    });
  });

  describe('Kakao', () => {
    it('builds correct Kakao OAuth URL', () => {
      const url = new URL(buildSocialAuthUrl('kakao', {
        ...BASE_PARAMS,
        redirectUri: 'https://bg.suparain.kr/oauth/callback/kakao',
      }));
      expect(url.origin).toBe('https://kauth.kakao.com');
      expect(url.pathname).toBe('/oauth/authorize');
      expect(url.searchParams.get('client_id')).toBe('test_client_id');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toContain('account_email');
      expect(url.searchParams.get('state')).toBe('random_state_123');
    });
  });

  describe('Naver', () => {
    it('builds correct Naver OAuth URL', () => {
      const url = new URL(buildSocialAuthUrl('naver', {
        ...BASE_PARAMS,
        redirectUri: 'https://bg.suparain.kr/oauth/callback/naver',
      }));
      expect(url.origin).toBe('https://nid.naver.com');
      expect(url.pathname).toBe('/oauth2.0/authorize');
      expect(url.searchParams.get('client_id')).toBe('test_client_id');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('state')).toBe('random_state_123');
    });
  });

  describe('Apple', () => {
    it('builds correct Apple OAuth URL', () => {
      const url = new URL(buildSocialAuthUrl('apple', {
        ...BASE_PARAMS,
        redirectUri: 'https://bg.suparain.kr/oauth/callback/apple',
      }));
      expect(url.origin).toBe('https://appleid.apple.com');
      expect(url.pathname).toBe('/auth/authorize');
      expect(url.searchParams.get('client_id')).toBe('test_client_id');
      expect(url.searchParams.get('response_type')).toBe('code');
      expect(url.searchParams.get('scope')).toContain('email');
      expect(url.searchParams.get('response_mode')).toBe('form_post');
      expect(url.searchParams.get('state')).toBe('random_state_123');
    });
  });
});
