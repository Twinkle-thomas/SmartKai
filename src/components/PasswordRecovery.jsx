import {useEffect,useRef,useState} from 'react';
import {useAccountSession} from './AccountSession.jsx';

export function recoveryRedirect(location=window.location){
  const url=new URL(location.pathname,location.origin);
  url.searchParams.set('auth','recovery');
  return url.href;
}

export default function PasswordRecovery({client,mode}){
  const resetting=mode==='reset-password';
  const {session,ready}=useAccountSession(client);
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[confirmation,setConfirmation]=useState('');
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[success,setSuccess]=useState(false),[show,setShow]=useState(false);
  const [linkError]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).has('error')||new URLSearchParams(window.location.search).has('error'));
  const lock=useRef(false),alive=useRef(true),confirmationInput=useRef(null),successTitle=useRef(null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;};},[client]);
  useEffect(()=>{if(success)successTitle.current?.focus();},[success]);
  async function submit(event){
    event.preventDefault();if(lock.current||!client)return;setError('');
    if(resetting&&(!ready||!session||linkError)){setError('Open a valid reset link from your email first.');return;}
    if(resetting&&password!==confirmation){setError('Passwords do not match. Please enter them again.');confirmationInput.current?.focus();return;}
    lock.current=true;setBusy(true);
    try{
      const response=resetting?await client.auth.updateUser({password}):await client.auth.resetPasswordForEmail(email.trim(),{redirectTo:recoveryRedirect()});
      if(response.error)throw response.error;
      if(alive.current){
        if(resetting){
          // Remove callback tokens/query parameters without leaving the success view.
          const url=new URL(window.location.href);url.searchParams.delete('auth');url.searchParams.delete('code');url.hash='/reset-password';
          window.history.replaceState(null,'',url);window.dispatchEvent(new HashChangeEvent('hashchange'));
        }
        setSuccess(true);
      }
    }catch(failure){
      if(alive.current)setError(failure.code==='weak_password'?'Choose a stronger password that meets the account requirements.':failure.code==='same_password'?'Choose a password different from your current password.':failure.status===429||['over_email_send_rate_limit','over_request_rate_limit'].includes(failure.code)?'Too many requests. Wait a few minutes before trying again.':resetting?'Could not update the password. Your link may have expired; request a new reset email if needed.':'Could not request a reset email. Check your connection and try again.');
    }finally{lock.current=false;if(alive.current){setBusy(false);setPassword('');setConfirmation('');setShow(false);}}
  }
  return <section className="auth-card" aria-labelledby="recovery-title"><p className="eyebrow">Your SmartKai account</p><h2 id="recovery-title">{resetting?'Choose a new password':'Reset your password'}</h2>
    {!client?<p role="alert" className="auth-error">Account access is unavailable right now. Please try again later.</p>:success?<div className="auth-confirmation"><h3 tabIndex={-1} ref={successTitle}>{resetting?'Password updated':'Check your inbox'}</h3><p role="status">{resetting?'Your new password is saved. You can continue to your SmartKai account.':'If an account is eligible for this email address, you’ll receive a password-reset link. Check your spam folder too. Open the newest link to choose a new password.'}</p><a className="primary" href={resetting?'#/dashboard':`${window.location.pathname}#/login`}>{resetting?'Continue to SmartKai':'Back to sign in'}</a></div>:resetting&&!ready?<p role="status">Checking your reset link…</p>:resetting&&(linkError||!session)?<><p role="alert" className="auth-error">This reset link is missing, invalid or expired. Request a new email and open its reset link.</p><a className="primary mt-4" href="#/forgot-password">Request a new reset email</a></>:<form className="account-auth-form" onSubmit={submit} aria-label={resetting?'Choose a new password':'Request password reset'}>
      {resetting?<><label>New password<div className="password-field"><input type={show?'text':'password'} autoComplete="new-password" required minLength={8} maxLength={128} disabled={busy} value={password} onChange={e=>setPassword(e.target.value)}/><button type="button" disabled={busy} aria-label={show?'Hide new password':'Show new password'} aria-pressed={show} onClick={()=>setShow(value=>!value)}>{show?'Hide':'Show'}</button></div></label><p className="auth-small">Use at least 8 characters and choose a unique password.</p><label>Confirm new password<input ref={confirmationInput} type={show?'text':'password'} autoComplete="new-password" required minLength={8} maxLength={128} disabled={busy} value={confirmation} onChange={e=>setConfirmation(e.target.value)}/></label></>:<><p>Enter your SmartKai account email. We’ll send a link so you can choose a new password.</p><label>Email<input type="email" autoComplete="email" required disabled={busy} value={email} onChange={e=>setEmail(e.target.value)}/></label></>}
      {error&&<p role="alert" className="auth-error">{error}</p>}<button className="primary" disabled={busy}>{busy?(resetting?'Updating password…':'Requesting email…'):(resetting?'Update password':'Send reset link')}</button><a className="text-link" href={`${window.location.pathname}#/login`}>Back to sign in</a>
    </form>}
  </section>;
}
