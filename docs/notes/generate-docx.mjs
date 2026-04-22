import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType } from 'docx';
import { writeFileSync } from 'fs';

const NAVER_GREEN = '03C75A';
const DARK = '1E293B';
const GRAY = '64748B';
const LIGHT_GRAY = 'F1F5F9';

function heading(text, level = HeadingLevel.HEADING_1) {
  return new Paragraph({
    heading: level,
    spacing: { before: 400, after: 200 },
    children: [new TextRun({ text, bold: true, color: DARK, font: 'Apple SD Gothic Neo' })],
  });
}

function sectionNumber(num, title) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 500, after: 150 },
    children: [
      new TextRun({ text: `${num}. `, bold: true, color: NAVER_GREEN, size: 28, font: 'Apple SD Gothic Neo' }),
      new TextRun({ text: title, bold: true, color: DARK, size: 28, font: 'Apple SD Gothic Neo' }),
    ],
  });
}

function bodyText(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 150 },
    children: [new TextRun({
      text,
      size: 22,
      color: opts.color || '475569',
      font: 'Apple SD Gothic Neo',
      bold: opts.bold || false,
    })],
  });
}

function bulletItem(text, opts = {}) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: [new TextRun({ text, size: 22, color: '475569', font: 'Apple SD Gothic Neo', ...opts })],
  });
}

function emptyLine() {
  return new Paragraph({ spacing: { after: 100 }, children: [] });
}

function labelValue(label, value) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 22, color: DARK, font: 'Apple SD Gothic Neo' }),
      new TextRun({ text: value, size: 22, color: '475569', font: 'Apple SD Gothic Neo' }),
    ],
  });
}

function makeTable(headers, rows) {
  const headerCells = headers.map(h => new TableCell({
    shading: { fill: NAVER_GREEN, type: ShadingType.CLEAR },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: h, bold: true, color: 'FFFFFF', size: 20, font: 'Apple SD Gothic Neo' })],
    })],
  }));

  const dataRows = rows.map(row =>
    new TableRow({
      children: row.map(cell => new TableCell({
        children: [new Paragraph({
          children: [new TextRun({ text: cell, size: 20, color: '475569', font: 'Apple SD Gothic Neo' })],
        })],
      })),
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: headerCells }), ...dataRows],
  });
}

function flowStep(num, text) {
  return new Paragraph({
    spacing: { after: 100 },
    indent: { left: 360 },
    children: [
      new TextRun({ text: `STEP ${num}  `, bold: true, color: NAVER_GREEN, size: 22, font: 'Apple SD Gothic Neo' }),
      new TextRun({ text, size: 22, color: '475569', font: 'Apple SD Gothic Neo' }),
    ],
  });
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: { font: 'Apple SD Gothic Neo', size: 22 },
      },
    },
  },
  sections: [{
    properties: {
      page: {
        margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
      },
    },
    children: [
      // ─── 표지 ───
      emptyLine(),
      emptyLine(),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: '네이버 로그인 검수 신청 자료', size: 24, color: NAVER_GREEN, bold: true, font: 'Apple SD Gothic Neo' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: '번개가입 서비스 소개서', size: 44, bold: true, color: DARK, font: 'Apple SD Gothic Neo' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
        children: [new TextRun({ text: '소셜 로그인 1-클릭으로 쇼핑몰 회원가입 완료', size: 26, color: GRAY, font: 'Apple SD Gothic Neo' })],
      }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 600 },
        children: [new TextRun({ text: '주식회사 수파레인 | 2026년 3월', size: 20, color: GRAY, font: 'Apple SD Gothic Neo' })],
      }),

      // ─── 1. 서비스 개요 ───
      sectionNumber('1', '서비스 개요'),
      bodyText('번개가입(BungaeGaib)은 카페24 쇼핑몰에 설치하는 소셜 로그인 기반 회원가입 솔루션입니다.'),
      bodyText('쇼핑몰 고객이 소셜 계정(Google, Kakao, Naver, Apple 등)으로 복잡한 회원가입 폼 없이 버튼 1번 클릭으로 회원가입과 로그인을 동시에 완료할 수 있습니다.'),
      emptyLine(),

      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: '서비스 기본 정보', bold: true, size: 24, color: DARK, font: 'Apple SD Gothic Neo' })],
      }),
      labelValue('서비스명', '번개가입 (BungaeGaib)'),
      labelValue('서비스 URL', 'https://bg.suparain.kr'),
      labelValue('서비스 유형', 'B2B SaaS (쇼핑몰 운영자 대상)'),
      labelValue('지원 플랫폼', '카페24 (향후 아임웹, 고도몰, 샵바이 확장 예정)'),
      labelValue('지원 프로바이더', 'Google, Kakao, Naver, Apple, Discord, Telegram (6종)'),
      emptyLine(),

      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: '대상 사용자', bold: true, size: 24, color: DARK, font: 'Apple SD Gothic Neo' })],
      }),
      makeTable(
        ['구분', '대상', '설명'],
        [
          ['쇼핑몰 운영자', '카페24 쇼핑몰 사업자', '번개가입을 쇼핑몰에 설치하여 소셜 로그인 기능을 제공하는 주체'],
          ['쇼핑몰 고객', '쇼핑몰 방문자/구매자', '소셜 계정으로 1-클릭 회원가입을 이용하는 최종 사용자'],
        ]
      ),
      emptyLine(),

      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: '핵심 가치', bold: true, size: 24, color: DARK, font: 'Apple SD Gothic Neo' })],
      }),
      bulletItem('회원가입 이탈률 감소 — 복잡한 가입 폼 대신 소셜 로그인 1-클릭'),
      bulletItem('쇼핑몰 가입량 극대화 — 가입 허들을 낮춰 전환율 향상'),
      bulletItem('간편한 설치 — 카페24 앱스토어에서 설치, 코드 수정 불필요'),
      bulletItem('운영자 대시보드 — 실시간 가입 통계, 프로바이더 설정, 위젯 커스터마이징'),

      // ─── 2. 서비스 구조도 ───
      sectionNumber('2', '서비스 구조도 (네이버 로그인 플로우)'),
      bodyText('쇼핑몰 고객이 네이버로 회원가입하는 전체 흐름입니다.'),
      emptyLine(),

      new Paragraph({
        spacing: { after: 200 },
        alignment: AlignmentType.CENTER,
        children: [new TextRun({
          text: '[ 쇼핑몰 고객 ] → [ 번개가입 위젯 ] → [ 네이버 인증 ] → [ 번개가입 서버 ] → [ 카페24 SSO ] → [ 회원가입 완료 ]',
          bold: true, size: 20, color: NAVER_GREEN, font: 'Apple SD Gothic Neo',
        })],
      }),

      flowStep('1', '쇼핑몰 고객이 카페24 쇼핑몰 로그인/회원가입 페이지를 방문합니다.'),
      flowStep('2', '번개가입 위젯에서 "네이버로 시작하기" 버튼을 클릭합니다.'),
      flowStep('3', '네이버 OAuth 인증 페이지가 열리고, 고객이 네이버 계정으로 로그인합니다.'),
      flowStep('4', '네이버가 이메일, 이름 정보를 번개가입 서버에 전달합니다.'),
      flowStep('5', '번개가입 서버가 카페24 SSO를 통해 쇼핑몰 회원을 자동 생성합니다.'),
      flowStep('6', '회원가입 + 로그인이 동시에 완료됩니다. (재방문 시 자동 로그인)'),
      emptyLine(),

      bodyText('기술 방식: 번개가입이 OAuth 2.0 Provider 역할을 하고, 카페24가 OAuth Client로 동작하는 SSO(Single Sign-On) 구조입니다.', { color: GRAY }),

      // ─── 3. 주요 기능 설명 ───
      sectionNumber('3', '주요 기능 설명'),

      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: '3-1. 소셜 로그인 위젯', bold: true, size: 24, color: DARK, font: 'Apple SD Gothic Neo' })],
      }),
      bodyText('카페24 쇼핑몰의 로그인/회원가입 페이지에 자동으로 삽입되는 소셜 로그인 버튼 위젯입니다.'),
      bulletItem('지원 프로바이더: Google, Kakao, Naver, Apple, Discord, Telegram (6종)'),
      bulletItem('커스터마이징: 버튼 스타일(컬러/모노톤/테두리/아이콘), 크기, 간격, 문구, 정렬 등'),
      bulletItem('스마트 버튼: 마지막 사용한 프로바이더를 자동으로 상단에 표시'),
      bulletItem('설치 방식: 카페24 앱 설치 시 자동 삽입 (JavaScript 위젯)'),
      emptyLine(),

      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: '3-2. 카페24 SSO 연동', bold: true, size: 24, color: DARK, font: 'Apple SD Gothic Neo' })],
      }),
      bodyText('번개가입이 OAuth 2.0 Provider 역할을 수행하여 카페24 쇼핑몰과 소셜 프로바이더 간 인증을 중개합니다.'),
      bulletItem('카페24 SSO 표준 프로토콜 준수 (authorize → token → userinfo)'),
      bulletItem('PKCE(Proof Key for Code Exchange) 지원으로 보안 강화'),
      bulletItem('개인정보(이메일, 이름) AES-256-GCM 암호화 저장'),
      bulletItem('카페24 회원 자동 생성 — 고객이 추가 입력 없이 즉시 가입 완료'),
      emptyLine(),

      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: '3-3. 관리자 대시보드', bold: true, size: 24, color: DARK, font: 'Apple SD Gothic Neo' })],
      }),
      bodyText('쇼핑몰 운영자가 번개가입을 관리하는 웹 대시보드입니다.'),
      bulletItem('가입 통계: 일별/주별/월별 가입자 수, 프로바이더별 분포'),
      bulletItem('프로바이더 설정: 활성화/비활성화, 순서 변경'),
      bulletItem('위젯 커스터마이징: 실시간 미리보기와 함께 디자인 조정'),
      bulletItem('SSO 설정 가이드: 카페24 관리자에서 SSO 등록하는 단계별 안내'),
      bulletItem('URL: https://bg.suparain.kr/dashboard'),

      // ─── 4. 네이버 로그인 활용 방식 ───
      sectionNumber('4', '네이버 로그인 활용 방식'),

      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: '사용 목적', bold: true, size: 24, color: DARK, font: 'Apple SD Gothic Neo' })],
      }),
      bodyText('네이버 로그인은 카페24 쇼핑몰 고객의 회원가입 및 로그인 인증 수단으로만 사용됩니다.'),
      bulletItem('쇼핑몰 회원가입 시 네이버 계정으로 본인 인증'),
      bulletItem('재방문 시 네이버 계정으로 간편 로그인'),
      bulletItem('네이버에서 제공하는 이메일, 이름 정보로 카페24 쇼핑몰 회원 자동 생성'),
      emptyLine(),

      new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: 'OAuth 기술 정보', bold: true, size: 24, color: DARK, font: 'Apple SD Gothic Neo' })],
      }),
      labelValue('Callback URL', 'https://bg.suparain.kr/oauth/callback/naver'),
      labelValue('요청 Scope', '(기본 프로필) 이메일, 이름'),
      labelValue('인증 방식', 'OAuth 2.0 Authorization Code Grant'),
      emptyLine(),

      new Paragraph({
        spacing: { before: 200, after: 100 },
        shading: { fill: 'FEF2F2', type: ShadingType.CLEAR },
        children: [new TextRun({ text: '사용하지 않는 용도 (명시)', bold: true, size: 22, color: 'DC2626', font: 'Apple SD Gothic Neo' })],
      }),
      bulletItem('마케팅 목적의 사용자 정보 활용 없음'),
      bulletItem('제3자에 대한 사용자 정보 판매/제공 없음'),
      bulletItem('네이버 소셜 활동(카페, 블로그 등) 접근 없음'),
      bulletItem('사용자 행동 추적/프로파일링 없음'),

      // ─── 5. 수집하는 사용자 정보 ───
      sectionNumber('5', '수집하는 사용자 정보'),
      bodyText('네이버 로그인을 통해 수집하는 정보는 최소한으로 제한됩니다.'),
      emptyLine(),

      makeTable(
        ['항목', '필수 여부', '수집 목적', '보관 방식'],
        [
          ['이메일', '필수', '카페24 쇼핑몰 회원 ID로 사용', 'AES-256-GCM 암호화 저장'],
          ['이름', '필수', '카페24 쇼핑몰 회원 이름으로 사용', 'AES-256-GCM 암호화 저장'],
          ['고유 식별자(ID)', '자동 수집', '동일 사용자 재로그인 식별', '해시 처리(SHA-256)'],
        ]
      ),
      emptyLine(),

      new Paragraph({
        spacing: { after: 100 },
        children: [new TextRun({ text: '수집하지 않는 정보', bold: true, size: 22, color: DARK, font: 'Apple SD Gothic Neo' })],
      }),
      bulletItem('전화번호, 생년월일, 성별, 주소 — 수집하지 않음'),
      bulletItem('네이버 소셜 활동 정보 — 접근하지 않음'),

      // ─── 6. 개인정보 처리 ───
      sectionNumber('6', '개인정보 처리'),

      makeTable(
        ['보호 조치', '상세 내용'],
        [
          ['암호화 저장', '이메일, 이름 등 개인식별정보(PII)를 AES-256-GCM 알고리즘으로 암호화하여 저장'],
          ['전송 구간 암호화', '모든 데이터 전송은 HTTPS(TLS 1.3)를 통해 암호화'],
          ['검색용 해시', '이메일 해시(SHA-256)를 회원 매칭 목적으로 별도 저장 (원본 복원 불가)'],
          ['즉시 삭제', '인증 과정에서 사용된 임시 토큰은 인증 완료 즉시 파기'],
          ['제3자 미제공', '수집된 개인정보는 카페24 쇼핑몰 회원가입 목적 외에 제3자에게 제공하지 않음'],
          ['서버리스 아키텍처', 'Cloudflare Workers 환경에서 운영, 물리적 서버 관리 리스크 최소화'],
        ]
      ),
      emptyLine(),
      labelValue('개인정보처리방침', 'https://bg.suparain.kr/privacy'),
      labelValue('서비스 이용약관', 'https://bg.suparain.kr/terms'),

      // ─── 7. 운영사 정보 ───
      sectionNumber('7', '운영사 정보'),
      makeTable(
        ['항목', '내용'],
        [
          ['회사명', '주식회사 수파레인'],
          ['대표이사', '임호빈'],
          ['사업자등록번호', '716-88-01081'],
          ['소재지', '경기도 김포시 태장로 789 금광하이테크시티 465호'],
          ['전화', '031-992-5988'],
          ['이메일', 'help@suparain.com'],
          ['서비스 URL', 'https://bg.suparain.kr'],
        ]
      ),
      emptyLine(),
      emptyLine(),

      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 },
        children: [new TextRun({ text: '— 끝 —', size: 24, color: GRAY, font: 'Apple SD Gothic Neo' })],
      }),
    ],
  }],
});

const buffer = await Packer.toBuffer(doc);
writeFileSync('/Users/happyyuna/MyWorks/Development/projects/supasignup/docs/네이버_검수_서비스소개.docx', buffer);
console.log('Word 문서 생성 완료: docs/네이버_검수_서비스소개.docx');
