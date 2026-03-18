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
  discord: {
    name: 'discord',
    displayName: 'Discord',
    icon: '<svg viewBox="0 0 24 24" width="20" height="20"><text x="4" y="18" font-size="16">D</text></svg>', // placeholder
    color: '#5865F2',
    bgColor: '#5865F2',
    textColor: '#FFFFFF',
  },
  facebook: {
    name: 'facebook',
    displayName: 'Facebook',
    icon: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#FFFFFF" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>',
    color: '#1877F2',
    bgColor: '#1877F2',
    textColor: '#FFFFFF',
  },
  x: {
    name: 'x',
    displayName: 'X',
    icon: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#FFFFFF" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>',
    color: '#000000',
    bgColor: '#000000',
    textColor: '#FFFFFF',
  },
  line: {
    name: 'line',
    displayName: 'LINE',
    icon: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#FFFFFF" d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.627-.63.349 0 .631.285.631.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.281.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314"/></svg>',
    color: '#06C755',
    bgColor: '#06C755',
    textColor: '#FFFFFF',
  },
  telegram: {
    name: 'telegram',
    displayName: 'Telegram',
    icon: '<svg viewBox="0 0 24 24" width="20" height="20"><path fill="#FFFFFF" d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>',
    color: '#0088cc',
    bgColor: '#0088cc',
    textColor: '#FFFFFF',
  },
};

/** Ordered list of providers for default widget rendering */
export const DEFAULT_PROVIDER_ORDER: ProviderName[] = [
  'kakao',
  'naver',
  'google',
  'apple',
  'discord',
  'facebook',
  'x',
  'line',
  'telegram',
];
