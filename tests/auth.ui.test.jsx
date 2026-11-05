import React from 'react';
import { test, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AuthForm, { confirmationRedirect } from '../src/components/AuthForm.jsx';
import App from '../src/App.jsx';
import { readRoute } from '../src/navigation.js';

beforeEach(() => window.history.replaceState(null, '', '/#/register'));
const mockSession = { user: { id: 'test-evaluator', email: 'evaluator@example.test' } };
function authClient(initial = null, records = []) {
  let notify;
  let current = initial;
  const client = {
    auth: {
      onAuthStateChange: vi.fn((callback) => { notify = callback; queueMicrotask(() => callback('INITIAL_SESSION', current)); return { data: { subscription: { unsubscribe: vi.fn() } } }; }),
      signUp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signInWithPassword: vi.fn(async () => { current = mockSession; notify?.('SIGNED_IN', mockSession); return { data: { session: mockSession }, error: null }; }),
      signOut: vi.fn(async () => { current = null; notify?.('SIGNED_OUT', null); return { error: null }; }),
    },
    from: () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: records, error: null }) }) }) }),
  };
  return client;
}
async function registrationFields(user, confirmation = 'a-test-password') {
  await user.type(screen.getByLabelText('Email'), 'evaluator@example.test');
  await user.type(screen.getByLabelText('Password', { exact: true }), 'a-test-password');
  await user.type(screen.getByLabelText('Confirm password'), confirmation);
}

test('registration sends only credentials and safe callback, then asks for email confirmation', async () => {
  const client = authClient(); const user = userEvent.setup();
  render(<AuthForm client={client} mode="register" />);
  await registrationFields(user);
  await user.dblClick(screen.getByRole('button', { name: 'Create account' }));
  expect(client.auth.signUp).toHaveBeenCalledTimes(1);
  expect(client.auth.signUp).toHaveBeenCalledWith({ email: 'evaluator@example.test', password: 'a-test-password', options: { emailRedirectTo: confirmationRedirect() } });
  expect(await screen.findByRole('heading', { name: 'Check your inbox' })).toHaveFocus();
  expect(screen.queryByLabelText('Password', { exact: true })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '#/login');
});

test('mismatched registration passwords stay local and focus the confirmation field', async () => {
  const client = authClient(); const user = userEvent.setup();
  render(<AuthForm client={client} mode="register" />);
  await registrationFields(user, 'another-password');
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match');
  expect(screen.getByLabelText('Confirm password')).toHaveFocus();
  expect(client.auth.signUp).not.toHaveBeenCalled();
});

test('disabled registration is explained and password fields clear after failure', async () => {
  const client = authClient(); client.auth.signUp.mockResolvedValue({ error: { code: 'signup_disabled' } });
  const user = userEvent.setup(); render(<AuthForm client={client} mode="register" />);
  await registrationFields(user);
  await user.click(screen.getByRole('button', { name: 'Create account' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Registration is not open yet');
  expect(screen.getByLabelText('Password', { exact: true })).toHaveValue('');
  expect(screen.getByLabelText('Confirm password')).toHaveValue('');
  expect(screen.getByRole('button', { name: 'Create account' })).toBeEnabled();
});

test.each([
  ['email_address_invalid','valid email address'],
  ['validation_failed','email and password meet the form requirements'],
  ['email_address_not_authorized','designated demonstration email'],
  ['invalid_credentials','Forgot password'],
])('authentication error %s gives a safe next step',async(code,message)=>{
  const client=authClient();client.auth.signUp.mockResolvedValue({error:{code,message:'Internal account and server details must not be displayed'}});
  const user=userEvent.setup();render(<AuthForm client={client} mode="register"/>);await registrationFields(user);await user.click(screen.getByRole('button',{name:'Create account'}));
  expect(await screen.findByRole('alert')).toHaveTextContent(message);expect(screen.queryByText(/Internal account and server/)).not.toBeInTheDocument();
});

test('auto-confirmed registration continues to personalisation without pretending email was sent', async () => {
  const client = authClient(); client.auth.signUp.mockResolvedValue({ data: { session: mockSession }, error: null });
  const completed = vi.fn(); const user = userEvent.setup();
  render(<AuthForm client={client} mode="register" onAuthenticated={completed} />);
  await registrationFields(user); await user.click(screen.getByRole('button', { name: 'Create account' }));
  await waitFor(() => expect(completed).toHaveBeenCalledWith('personalisation'));
  expect(screen.queryByText('Check your inbox')).not.toBeInTheDocument();
});

test('login with no saved assessment opens onboarding questions', async () => {
  window.history.replaceState(null, '', '/#/login');
  const client = authClient(); const user = userEvent.setup(); render(<App client={client} />);
  await user.type(await screen.findByLabelText('Email'), 'evaluator@example.test');
  await user.type(screen.getByLabelText('Password', { exact: true }), 'a-test-password');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByLabelText('Choose an example household')).toBeInTheDocument();
  expect(window.location.hash).toBe('#/personalisation');
  expect(await screen.findByText('No saved assessments yet.')).toBeInTheDocument();
});

test('an existing session redirects the login page without collecting credentials again', async () => {
  window.history.replaceState(null, '', '/#/login');
  const client = authClient(mockSession); render(<App client={client} />);
  await screen.findByLabelText('Choose an example household');
  expect(client.auth.signInWithPassword).not.toHaveBeenCalled();
});

const saved = { id: 'saved-onboarding', created_at: '2026-10-31T00:00:00Z', households: { fictional_label: 'Household demo' }, assessment_results: { profiles: ['Overbuyer'], recommendations: [{ id: 'shopping', profile: 'Overbuyer', text: 'Check food before shopping.' }], explanations: [] } };

test('returning login opens dashboard with saved profiles and guidance, without questions', async () => {
  window.history.replaceState(null, '', '/#/login');
  const client = authClient(null, [saved]); const user = userEvent.setup();
  render(<App client={client} />);
  await user.type(await screen.findByLabelText('Email'), 'evaluator@example.test');
  await user.type(screen.getByLabelText('Password', { exact: true }), 'a-test-password');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  await screen.findByRole('heading', { name: /Welcome back.*Your household/ });
  expect(window.location.hash).toBe('#/dashboard');
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  expect(await screen.findByRole('heading', { name: 'Your latest saved guidance' })).toBeInTheDocument();
  expect(screen.getAllByText('Check food before shopping.', { exact: false }).length).toBeGreaterThan(0);
  expect(screen.getByRole('link', { name: 'Go to dashboard' })).toHaveAttribute('href', '#/dashboard');
  expect(screen.queryByRole('link', { name: 'Get started' })).not.toBeInTheDocument();
  await user.click(screen.getAllByRole('link', { name: 'SmartKai home' })[0]);
  await screen.findByRole('heading', { level: 1, name: /Less Food Waste/ }, { timeout: 5000 });
  expect(screen.getByRole('link', { name: 'Go to dashboard' })).toHaveAttribute('href', '#/dashboard');
  expect(screen.queryByRole('link', { name: /^Sign in/ })).not.toBeInTheDocument();
  const navigation = within(screen.getByRole('navigation', { name: 'Main navigation' }));
  expect(navigation.getAllByRole('link', { name: /dashboard/i })).toHaveLength(1);
  await user.click(navigation.getByRole('button', { name: 'Log out' }));
  expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  await screen.findByRole('link', { name: 'Get started' });
  expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument();
});

test('history failure opens dashboard with retry rather than treating the account as new', async () => {
  window.history.replaceState(null, '', '/#/login');
  const client = authClient(mockSession);
  let fail = true;
  client.from = () => ({ select: () => ({ order: () => ({ limit: async () => ({ data: fail ? null : [saved], error: fail ? new Error('offline') : null }) }) }) });
  const user = userEvent.setup(); render(<App client={client} />);
  await screen.findByRole('button', { name: 'Try loading guidance again' });
  expect(window.location.hash).toBe('#/dashboard');
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  fail = false;
  await user.click(screen.getByRole('button', { name: 'Try loading guidance again' }));
  await screen.findByText('Expand your latest assessment to see your saved profiles and recommendations.');
});

test('confirmed-email return opens assessment and removes callback query parameters', async () => {
  window.history.replaceState(null, '', '/?auth=confirm');
  const client = authClient(mockSession); render(<App client={client} />);
  await screen.findByLabelText('Choose an example household');
  expect(window.location.hash).toBe('#/personalisation');
  expect(window.location.search).toBe('');
  expect(readRoute('#access_token=simulated-token')).toBe('login');
});

test('expired confirmation links show a safe recovery message', async () => {
  window.history.replaceState(null, '', '/?auth=confirm#error=access_denied&error_code=otp_expired');
  render(<App client={authClient()} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('confirmation link is invalid or expired');
  expect(await screen.findByLabelText('Email')).toBeInTheDocument();
});

test('registration is disabled when no Supabase client is configured', () => {
  render(<AuthForm client={null} mode="register" />);
  expect(screen.getByRole('button', { name: 'Create account' })).toBeDisabled();
});
