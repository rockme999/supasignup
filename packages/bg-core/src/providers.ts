import type { ProviderInfo, ProviderName } from './types';

export const PROVIDER_INFO: Record<ProviderName, ProviderInfo> = {
  google: {
    name: 'google',
    displayName: '구글',
    icon: '<svg viewBox="0 0 24 24" width="20" height="20"><text x="4" y="18" font-size="16">G</text></svg>', // placeholder
    color: '#4285F4',
    bgColor: '#FFFFFF',
    textColor: '#1F1F1F',
  },
  kakao: {
    name: 'kakao',
    displayName: '카카오',
    icon: '<svg viewBox="0 0 24 24" width="20" height="20"><text x="4" y="18" font-size="16">K</text></svg>', // placeholder
    color: '#FEE500',
    bgColor: '#FEE500',
    textColor: '#191919',
  },
  naver: {
    name: 'naver',
    displayName: '네이버',
    icon: '<svg viewBox="0 0 24 24" width="20" height="20"><text x="4" y="18" font-size="16">N</text></svg>', // placeholder
    color: '#03C75A',
    bgColor: '#03C75A',
    textColor: '#FFFFFF',
  },
  apple: {
    name: 'apple',
    displayName: 'Apple',
    icon: '<svg viewBox="0 0 24 24" width="20" height="20"><text x="4" y="18" font-size="16">A</text></svg>', // placeholder
    color: '#000000',
    bgColor: '#000000',
    textColor: '#FFFFFF',
  },
};

/** Ordered list of providers for default widget rendering */
export const DEFAULT_PROVIDER_ORDER: ProviderName[] = [
  'kakao',
  'naver',
  'google',
  'apple',
];
