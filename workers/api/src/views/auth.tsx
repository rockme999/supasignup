/**
 * Authentication pages (Login, Register).
 */
import type { FC } from 'hono/jsx';
import { Layout } from './layout';

export const LoginPage: FC<{ error?: string }> = ({ error }) => (
  <Layout title="로그인" loggedIn={false}>
    <div class="auth-page" style="flex-direction:column">
      <div class="auth-card">
        <h1>⚡ 번개가입</h1>
        <p class="sub">관리자 대시보드 로그인</p>
        {error && <div class="alert alert-error">{error}</div>}
        <div style="background:#dbeafe;color:#1e40af;padding:12px 16px;border-radius:8px;font-size:13px;margin-bottom:16px;line-height:1.6;text-align:left">
          카페24 쇼핑몰 사용자는 카페24 관리자에서 <strong>번개가입 앱</strong>을 실행하면 자동으로 로그인됩니다.
        </div>
        <form id="loginForm">
          <div class="form-group">
            <label>이메일</label>
            <input type="email" name="email" required placeholder="admin@example.com" />
          </div>
          <div class="form-group">
            <label>비밀번호</label>
            <input type="password" name="password" required placeholder="8자 이상" />
          </div>
          <button type="submit" class="btn btn-primary">로그인</button>
        </form>
        <p style="text-align:center; margin-top:16px; font-size:13px; color:#64748b">
          계정이 없으신가요? <a href="/dashboard/register">회원가입</a>
        </p>
        <script dangerouslySetInnerHTML={{__html: `
          document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            var btn = form.querySelector('button[type=submit]');
            const resp = await apiCall('POST', '/api/dashboard/auth/login', {
              email: form.email.value,
              password: form.password.value,
            }, btn);
            if (resp.ok) {
              window.location.href = '/dashboard';
            } else {
              const data = await resp.json();
              showToast('error', data.error === 'rate_limited' ? '로그인 시도 횟수 초과. 5분 후 다시 시도하세요.' : '이메일 또는 비밀번호가 올바르지 않습니다.');
            }
          });
        `}} />
      </div>
      <div style="margin-top:32px; text-align:center; font-size:11px; color:#94a3b8; line-height:1.8">
        <div>주식회사 수파레인 | 이메일 help@suparain.com</div>
        <div><a href="/privacy" style="color:#94a3b8">개인정보처리방침</a></div>
      </div>
    </div>
  </Layout>
);

export const RegisterPage: FC<{ error?: string }> = ({ error }) => (
  <Layout title="회원가입" loggedIn={false}>
    <div class="auth-page">
      <div class="auth-card">
        <h1>⚡ 번개가입</h1>
        <p class="sub">관리자 계정 생성</p>
        {error && <div class="alert alert-error">{error}</div>}
        <form id="registerForm">
          <div class="form-group">
            <label>이름</label>
            <input type="text" name="name" required placeholder="운영자 이름" />
          </div>
          <div class="form-group">
            <label>이메일</label>
            <input type="email" name="email" required placeholder="admin@example.com" />
          </div>
          <div class="form-group">
            <label>비밀번호</label>
            <input type="password" name="password" required placeholder="8자 이상" minlength={8} />
          </div>
          <div class="form-group">
            <label>비밀번호 확인</label>
            <input type="password" name="password_confirm" required placeholder="비밀번호 재입력" minlength={8} />
          </div>
          <button type="submit" class="btn btn-primary">회원가입</button>
        </form>
        <p style="text-align:center; margin-top:16px; font-size:13px; color:#64748b">
          이미 계정이 있으신가요? <a href="/dashboard/login">로그인</a>
        </p>
        <script dangerouslySetInnerHTML={{__html: `
          document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            if (form.password.value !== form.password_confirm.value) {
              showToast('error', '비밀번호가 일치하지 않습니다.');
              return;
            }
            var btn = form.querySelector('button[type=submit]');
            const resp = await apiCall('POST', '/api/dashboard/auth/register', {
              name: form.name.value,
              email: form.email.value,
              password: form.password.value,
            }, btn);
            if (resp.ok) {
              window.location.href = '/dashboard';
            } else {
              const data = await resp.json();
              const messages = { email_exists: '이미 가입된 이메일입니다.', weak_password: '비밀번호는 8자 이상이어야 합니다.' };
              showToast('error', messages[data.error] || '회원가입 중 오류가 발생했습니다.');
            }
          });
        `}} />
      </div>
    </div>
  </Layout>
);
