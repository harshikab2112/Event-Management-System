import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Eye, EyeOff, X } from 'lucide-react';
import GoogleSignInButton from './GoogleSignInButton.jsx';

export default function AuthModal({ request, onClose, onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [method, setMethod] = useState('password');
  const [step, setStep] = useState('form');
  const [form, setForm] = useState({ name: '', email: '', password: '', code: '', newPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [resendSeconds, setResendSeconds] = useState(0);

  useEffect(() => {
    if (!resendSeconds) return undefined;
    const timer = setInterval(() => setResendSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  function update(key, value) { setForm((current) => ({ ...current, [key]: value })); }
  function resetView(nextMode, nextMethod = 'password') {
    setMode(nextMode); setMethod(nextMethod); setStep('form'); setError(''); setNotice(''); setShowPassword(false); setResendSeconds(0);
    setForm((current) => ({ ...current, code: '', password: '', newPassword: '' }));
  }

  async function beginCode(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const route = mode === 'register' ? '/api/auth/otp/signup/request' : mode === 'reset' ? '/api/auth/otp/password-reset/request' : '/api/auth/otp/login/request';
    const payload = mode === 'register'
      ? { name: form.name, email: form.email, password: form.password }
      : { email: form.email };
    try {
      const result = await request(route, { method: 'POST', body: JSON.stringify(payload) });
      setStep('code'); setNotice(result.message || 'Check your inbox for a six-digit code.'); setResendSeconds(60);
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function verifyCode(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const route = mode === 'register' ? '/api/auth/otp/signup/verify' : mode === 'reset' ? '/api/auth/otp/password-reset/verify' : '/api/auth/otp/login/verify';
    const payload = { email: form.email, code: form.code };
    if (mode === 'reset') payload.newPassword = form.newPassword;
    try {
      const result = await request(route, { method: 'POST', body: JSON.stringify(payload) });
      if (result.token) onAuthenticated(result);
      else { resetView('login'); setNotice(result.message); }
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function signInWithPassword(event) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const result = await request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: form.email, password: form.password }) });
      onAuthenticated(result);
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  async function googleCredential(credential) {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await request('/api/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
      onAuthenticated(result);
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  }

  const onSubmit = step === 'code' ? verifyCode : mode === 'login' && method === 'password' ? signInWithPassword : beginCode;
  const heading = step === 'code' ? 'Check your email' : mode === 'register' ? 'Join Gatherly' : mode === 'reset' ? 'Reset your password' : 'Welcome back';
  const submitText = busy ? 'Please wait…' : step === 'code' ? mode === 'reset' ? 'Set new password' : 'Verify code' : mode === 'register' ? 'Send verification code' : mode === 'reset' ? 'Send reset code' : method === 'otp' ? 'Email me a sign-in code' : 'Sign in';

  return <div className="modal-backdrop" onClick={onClose}>
    <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title" onClick={(event) => event.stopPropagation()}>
      <div className="modal-head"><div><span className="eyebrow eyebrow-muted">MEMBER ACCESS</span><h2 id="auth-title">{heading}</h2><p>{step === 'code' ? `We sent a one-time code to ${form.email}. It expires in 10 minutes.` : mode === 'login' ? 'Sign in to book and manage your passes.' : mode === 'reset' ? 'We’ll send a code so you can choose a new password.' : 'Verify your email to create your account.'}</p></div><button type="button" className="modal-close" onClick={onClose} aria-label="Close sign in"><X size={17} /></button></div>

      {step === 'code' ? <form className="auth-fields" onSubmit={verifyCode}>
        <label>Email verification code<input autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength="6" minLength="6" required value={form.code} onChange={(event) => update('code', event.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="6-digit code" /></label>
        {mode === 'reset' && <label>New password<span className="password-input-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength="10" maxLength="128" required value={form.newPassword} onChange={(event) => update('newPassword', event.target.value)} /><button type="button" className="password-visibility" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span><small className="password-hint">Use at least 10 characters.</small></label>}
        <button className="button button-primary auth-submit" disabled={busy || form.code.length !== 6}>{submitText}<ArrowRight size={15} /></button>
        {notice && <p className="auth-notice" role="status">{notice}</p>}
        <div className="auth-code-actions"><button type="button" className="auth-switch" disabled={busy || resendSeconds > 0} onClick={beginCode}>{resendSeconds ? `Resend in ${resendSeconds}s` : 'Resend code'}</button><button type="button" className="auth-switch" onClick={() => { setStep('form'); setError(''); setNotice(''); update('code', ''); }}>Use a different email</button></div>
      </form> : <>
        <form className="auth-fields" onSubmit={onSubmit}>
          {mode === 'register' && <label>Your name<input autoComplete="name" required minLength="2" maxLength="80" value={form.name} onChange={(event) => update('name', event.target.value)} /></label>}
          <label>Email address<input type="email" autoComplete="email" required maxLength="254" value={form.email} onChange={(event) => update('email', event.target.value)} /></label>
          {mode === 'login' && method === 'password' && <label>Password<span className="password-input-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required maxLength="128" value={form.password} onChange={(event) => update('password', event.target.value)} /><button type="button" className="password-visibility" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span></label>}
          {mode === 'register' && <label>Password<span className="password-input-wrap"><input type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength="10" maxLength="128" required value={form.password} onChange={(event) => update('password', event.target.value)} /><button type="button" className="password-visibility" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></span><small className="password-hint">Use at least 10 characters.</small></label>}
          <button className="button button-primary auth-submit" disabled={busy}>{submitText}<ArrowRight size={15} /></button>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {notice && <p className="auth-notice" role="status">{notice}</p>}
        </form>
        {mode === 'login' && method === 'password' && <div className="auth-utility-links"><button className="auth-switch" type="button" onClick={() => resetView('login', 'otp')}>Sign in with an email code</button><button className="auth-switch" type="button" onClick={() => resetView('reset')}>Forgot password?</button></div>}
        {mode !== 'reset' && <><div className="auth-divider"><span>or continue with</span></div><GoogleSignInButton onCredential={googleCredential} /><div className="auth-mode-switch">{mode === 'login' ? 'New to Gatherly?' : 'Already have an account?'} <button type="button" onClick={() => resetView(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? 'Create account' : 'Sign in'}</button></div></>}
        {mode === 'reset' && <div className="auth-mode-switch"><button type="button" onClick={() => resetView('login')}>Back to sign in</button></div>}
      </>}
      {error && step === 'code' && <p className="auth-error" role="alert">{error}</p>}
      {step === 'code' && notice && mode !== 'reset' && <span className="sr-only"><Check size={1} /></span>}
    </section>
  </div>;
}
