import { useEffect, useRef, useState } from 'react';

export function confirmationRedirect(location = window.location) {
  const url = new URL(location.pathname, location.origin);
  url.searchParams.set('auth', 'confirm');
  return url.href;
}

function friendlyError(mode, error) {
  if (error?.code === 'email_address_invalid' || error?.code === 'validation_failed') return 'Enter a valid email address that can receive verification messages. Reserved example or test addresses may not be accepted.';
  if (error?.code === 'invalid_credentials') return 'Email or password not recognised. Check your SmartKai credentials or choose Forgot password.';
  if (error?.code === 'signup_disabled') return 'Registration is not open yet. You can still sign in with an existing account.';
  if (error?.code === 'over_email_send_rate_limit' || error?.status === 429) return 'Too many attempts. Please wait a little before trying again.';
  if (error?.code === 'email_not_confirmed') return 'Please confirm your email address using the link in your inbox, then sign in.';
  if (error?.code === 'email_address_not_authorized') return 'This demo cannot send verification to this address yet. Use the designated demonstration email or contact the project owner.';
  if (error?.name === 'AuthRetryableFetchError' || error instanceof TypeError) return 'Could not reach the account service. Check your connection and retry. If you already requested verification, check your inbox first.';
  if (error?.status >= 500) return 'The account service is temporarily unavailable. Please try again later.';
  if (error?.code === 'weak_password') return 'Choose a stronger password that meets the account requirements.';
  return mode === 'register' ? 'Could not create your account. Check your details and connection, or try signing in.' : 'Sign-in failed. Check your email, password and connection.';
}

export default function AuthForm({ client, mode = 'login', onAuthenticated }) {
  const registering = mode === 'register';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const alive = useRef(true);
  const lock = useRef(false);
  const confirmInput = useRef(null);
  const message = useRef(null);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (sent) message.current?.focus(); }, [sent]);

  async function submit(event) {
    event.preventDefault();
    if (lock.current || !client) return;
    setError('');
    if (registering && password !== confirmation) { setError('Passwords do not match. Please enter them again.'); confirmInput.current?.focus(); return; }
    lock.current = true; setBusy(true);
    try {
      const result = registering
        ? await client.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: confirmationRedirect() } })
        : await client.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) throw result.error;
      if (alive.current) {
        if (registering && !result.data?.session) setSent(true);
        else onAuthenticated?.(registering ? 'personalisation' : 'dashboard');
      }
    } catch (authError) {
      if (alive.current) setError(friendlyError(mode, authError));
    } finally {
      lock.current = false;
      if (alive.current) { setBusy(false); setPassword(''); setConfirmation(''); setShowPassword(false); }
    }
  }

  if (sent) return <div className="auth-confirmation"><span aria-hidden="true">↗</span><h3 ref={message} tabIndex={-1}>Check your inbox</h3><p>If your email address is eligible, you’ll receive a confirmation link. Open it to confirm your email, then continue to SmartKai.</p><a className="primary" href="#/login">Back to sign in</a><p className="auth-small">No message? Check your spam folder. Delivery can take a few minutes.</p></div>;
  return <form onSubmit={submit} className="account-auth-form" aria-label={registering ? 'Create your account' : 'Sign in to SmartKai'}>
    <label>Email<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required disabled={busy || !client} /></label>
    {registering && <p className="auth-small">Use an inbox you can open. You may need to confirm your email before signing in. A made-up address cannot receive the verification link.</p>}
    <label>Password<div className="password-field"><input type={showPassword ? 'text' : 'password'} autoComplete={registering ? 'new-password' : 'current-password'} minLength={registering ? 8 : undefined} value={password} onChange={(event) => setPassword(event.target.value)} required disabled={busy || !client} aria-describedby={registering ? 'password-guidance' : undefined} /><button type="button" onClick={() => setShowPassword((value) => !value)} disabled={busy} aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword}>{showPassword ? 'Hide' : 'Show'}</button></div></label>
    {registering && <><p id="password-guidance" className="auth-small">Use at least 8 characters. Choose a unique password.</p><label>Confirm password<input ref={confirmInput} type={showPassword ? 'text' : 'password'} autoComplete="new-password" minLength={8} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required disabled={busy || !client} /></label></>}
    {error && <p role="alert" className="auth-error">{error}</p>}
    <button className="primary" type="submit" disabled={busy || !client}>{busy ? registering ? 'Creating account…' : 'Signing in…' : registering ? 'Create account' : 'Sign in'}</button>
    {!registering && <a className="text-link" href="#/forgot-password">Forgot password?</a>}
    <p className="auth-switch">{registering ? 'Already have an account? ' : 'New to SmartKai? '}<a href={registering ? '#/login' : '#/register'}>{registering ? 'Sign in' : 'Create an account'}</a></p>
  </form>;
}
