import React from 'react';
import {beforeEach,expect,test,vi} from 'vitest';
import {render,screen,waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordRecovery,{recoveryRedirect} from '../src/components/PasswordRecovery.jsx';
import App from '../src/App.jsx';
import {readRoute} from '../src/navigation.js';
function client(session=null){
 return {auth:{onAuthStateChange:vi.fn(callback=>{queueMicrotask(()=>callback('INITIAL_SESSION',session));return {data:{subscription:{unsubscribe:vi.fn()}}};}),resetPasswordForEmail:vi.fn().mockResolvedValue({error:null}),updateUser:vi.fn().mockResolvedValue({data:{user:session?.user},error:null})}};
}
beforeEach(()=>window.history.replaceState(null,'','/#/forgot-password'));
test('reset request uses the current origin and a generic response, preventing duplicate submission',async()=>{
 const api=client(),user=userEvent.setup();render(<PasswordRecovery client={api} mode="forgot-password"/>);
 await user.type(screen.getByLabelText('Email'),'evaluator@example.test');await user.dblClick(screen.getByRole('button',{name:'Send reset link'}));
 expect(api.auth.resetPasswordForEmail).toHaveBeenCalledOnce();expect(api.auth.resetPasswordForEmail).toHaveBeenCalledWith('evaluator@example.test',{redirectTo:recoveryRedirect()});expect(await screen.findByRole('status')).toHaveTextContent('If an account is eligible');expect(screen.getByRole('heading',{name:'Check your inbox'})).toHaveFocus();
 expect(recoveryRedirect({pathname:'/',origin:'https://smartkai.vercel.app'})).toBe('https://smartkai.vercel.app/?auth=recovery');
});
test('request rate limits and network errors keep a usable form',async()=>{
 const api=client();api.auth.resetPasswordForEmail.mockResolvedValueOnce({error:{status:429}}).mockRejectedValueOnce(new TypeError('Network failed'));const user=userEvent.setup();render(<PasswordRecovery client={api} mode="forgot-password"/>);
 await user.type(screen.getByLabelText('Email'),'evaluator@example.test');await user.click(screen.getByRole('button',{name:'Send reset link'}));expect(await screen.findByRole('alert')).toHaveTextContent('Too many requests');await user.click(screen.getByRole('button',{name:'Send reset link'}));expect(await screen.findByRole('alert')).toHaveTextContent('Check your connection');
});
test('an absent session or expired recovery link never offers a password update',async()=>{
 window.history.replaceState(null,'','/?auth=recovery#error=access_denied&error_code=otp_expired');const api=client();render(<PasswordRecovery client={api} mode="reset-password"/>);
 expect(await screen.findByRole('alert')).toHaveTextContent('invalid or expired');expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();expect(api.auth.updateUser).not.toHaveBeenCalled();expect(screen.getByRole('link',{name:'Request a new reset email'})).toHaveAttribute('href','#/forgot-password');
});
test('password confirmation mismatch remains local and focuses the confirmation',async()=>{
 const api=client({user:{id:'test-user'}}),user=userEvent.setup();render(<PasswordRecovery client={api} mode="reset-password"/>);
 await user.type(await screen.findByLabelText('New password'),'new-test-password');await user.type(screen.getByLabelText('Confirm new password'),'different-password');await user.click(screen.getByRole('button',{name:'Update password'}));expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match');expect(screen.getByLabelText('Confirm new password')).toHaveFocus();expect(api.auth.updateUser).not.toHaveBeenCalled();
});
test('valid recovery session updates explicitly, clears callback URL and offers account continuation',async()=>{
 window.history.replaceState(null,'','/?auth=recovery#access_token=synthetic&refresh_token=synthetic&type=recovery');const api=client({user:{id:'test-user'}}),user=userEvent.setup();render(<PasswordRecovery client={api} mode="reset-password"/>);
 await user.type(await screen.findByLabelText('New password'),'new-test-password');await user.type(screen.getByLabelText('Confirm new password'),'new-test-password');await user.dblClick(screen.getByRole('button',{name:'Update password'}));await screen.findByRole('heading',{name:'Password updated'});expect(api.auth.updateUser).toHaveBeenCalledOnce();expect(api.auth.updateUser).toHaveBeenCalledWith({password:'new-test-password'});expect(window.location.search).toBe('');expect(window.location.hash).toBe('#/reset-password');expect(screen.queryByLabelText('New password')).not.toBeInTheDocument();expect(screen.getByRole('link',{name:'Continue to SmartKai'})).toHaveAttribute('href','#/dashboard');
});
test('rejected password policy errors clear entered passwords and allow correction',async()=>{
 const api=client({user:{id:'test-user'}});api.auth.updateUser.mockResolvedValue({error:{code:'same_password'}});const user=userEvent.setup();render(<PasswordRecovery client={api} mode="reset-password"/>);
 await user.type(await screen.findByLabelText('New password'),'new-test-password');await user.type(screen.getByLabelText('Confirm new password'),'new-test-password');await user.click(screen.getByRole('button',{name:'Update password'}));expect(await screen.findByRole('alert')).toHaveTextContent('different from your current password');expect(screen.getByLabelText('New password')).toHaveValue('');expect(screen.getByLabelText('Confirm new password')).toHaveValue('');
});
test('recovery callback mounts the reset screen instead of signed-in onboarding',async()=>{
 window.history.replaceState(null,'','/?auth=recovery');const api=client({user:{id:'test-user'}});render(<App client={api}/>);expect(await screen.findByLabelText('New password')).toBeInTheDocument();expect(window.location.search).toBe('?auth=recovery');expect(screen.queryByLabelText('Choose an example household')).not.toBeInTheDocument();expect(readRoute('#/forgot-password')).toBe('forgot-password');expect(readRoute('#/reset-password')).toBe('reset-password');
});
test('forgot password is reachable from the existing sign-in page and unavailable configuration is explicit',async()=>{
 window.history.replaceState(null,'','/#/login');const user=userEvent.setup(),view=render(<App client={client()}/>);await user.click(await screen.findByRole('link',{name:'Forgot password?'}));expect(await screen.findByRole('button',{name:'Send reset link'})).toBeInTheDocument();view.unmount();render(<PasswordRecovery client={null} mode="forgot-password"/>);expect(screen.getByRole('alert')).toHaveTextContent('unavailable');
});
