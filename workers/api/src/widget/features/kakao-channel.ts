/**
 * kakao-channel.ts — 카카오 채널 추가 안내
 *
 * IIFE 안에 인라인으로 삽입되는 JS 문자열을 반환.
 *
 * BGWidget.prototype 메서드:
 *   initKakaoChannel(config)  — 가입 완료 페이지에 카카오 채널 추가 버튼 삽입
 *
 * 의존 (IIFE 스코프):
 *   self.trackEvent, self.showToast
 */
export function getKakaoChannelJs(): string {
  return `
  // ─── Plus: 카카오 채널 추가 안내 ──────────────────────────────
  BGWidget.prototype.initKakaoChannel = function(config) {
    var self = this;

    // 가입 완료 페이지(/member/join.html)에서만 동작
    var path = window.location.pathname.toLowerCase();
    var isJoinPage = path.indexOf('/member/join') >= 0;
    if (!isJoinPage) return;

    var channelId = config.kakao_channel_id;
    if (!channelId) return;

    // 카카오 채널 추가 버튼 생성
    var btn = document.createElement('button');
    var bs = btn.style;
    bs.display = 'flex';
    bs.alignItems = 'center';
    bs.justifyContent = 'center';
    bs.gap = '8px';
    bs.width = '100%';
    bs.maxWidth = '320px';
    bs.margin = '12px auto 0';
    bs.padding = '12px 16px';
    bs.background = '#FEE500';
    bs.color = '#191919';
    bs.border = 'none';
    bs.borderRadius = '10px';
    bs.fontSize = '14px';
    bs.fontWeight = '600';
    bs.cursor = 'pointer';
    bs.fontFamily = '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
    bs.boxSizing = 'border-box';

    // 카카오 아이콘 (SVG)
    var iconSpan = document.createElement('span');
    iconSpan.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18"><path fill="#191919" d="M12 3C6.48 3 2 6.36 2 10.4c0 2.6 1.72 4.88 4.3 6.18l-1.1 4.02c-.08.3.26.54.52.36l4.78-3.18c.48.06.98.1 1.5.1 5.52 0 10-3.36 10-7.48C22 6.36 17.52 3 12 3z"/></svg>';

    var label = document.createElement('span');
    label.textContent = '\\uCE74\\uCE74\\uC624 \\uCC44\\uB110 \\uCD94\\uAC00\\uD558\\uACE0 \\uC54C\\uB9BC \\uBC1B\\uAE30'; // 카카오 채널 추가하고 알림 받기

    btn.appendChild(iconSpan);
    btn.appendChild(label);

    btn.addEventListener('mouseenter', function() { this.style.opacity = '0.85'; });
    btn.addEventListener('mouseleave', function() { this.style.opacity = '1'; });

    btn.addEventListener('click', function() {
      self.trackEvent('kakao_channel_click', { channel_id: channelId });
      window.open('https://pf.kakao.com/' + channelId, '_blank');
    });

    // 가입 완료 영역 찾아서 버튼 삽입
    var joinComplete = document.querySelector('.xans-member-join') || document.querySelector('#member_join') || document.querySelector('.join_wrap');
    if (joinComplete) {
      joinComplete.appendChild(btn);
    } else {
      // 영역을 찾지 못하면 body 하단에 플로팅 형태로 표시
      btn.style.position = 'fixed';
      btn.style.bottom = '80px';
      btn.style.left = '50%';
      btn.style.transform = 'translateX(-50%)';
      btn.style.zIndex = '99998';
      btn.style.boxShadow = '0 4px 20px rgba(0,0,0,.2)';
      document.body.appendChild(btn);
    }

    // 토스트 안내 표시
    self.showToast('\\uCE74\\uCE74\\uC624 \\uCC44\\uB110 \\uCD94\\uAC00\\uD558\\uACE0 \\uC54C\\uB9BC \\uBC1B\\uC544\\uBCF4\\uC138\\uC694! \\u2764\\uFE0F'); // 카카오 채널 추가하고 알림 받아보세요! ❤️
    self.trackEvent('kakao_channel_show', {});
  };
`;
}
