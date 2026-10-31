import React from 'react';
import { test, expect, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App.jsx';
import EvaluatorStorage from '../src/components/EvaluatorStorage.jsx';
import { personalise } from '../src/domain/personalisation.js';
import { SCENARIOS } from '../src/data/scenarios.js';

const session = (id = 'A') => ({ user: { id, email: `evaluator-${id}@example.test` } });
const assessment = { ...personalise(SCENARIOS[6].scores), scores: SCENARIOS[6].scores, scenarioId: SCENARIOS[6].id };
const savedRecord = {
  id: 'saved-1', created_at: '2026-10-31T00:00:00Z', rule_version: 'provisional-v1', scenario_key: 'multiple-profiles',
  overbuying: 2, forgetting_food: 2, poor_meal_planning: 0, discarding_leftovers: 1, storage_uncertainty: 2,
  households: { fictional_label: 'Fictional Household saved-1' },
  assessment_results: personalise(SCENARIOS[6].scores),
};
function fakeClient(initialSession = null) {
  let notify;
  const unsubscribe = vi.fn();
  const limit = vi.fn().mockResolvedValue({ data: [], error: null });
  const client = {
    auth: {
      onAuthStateChange: vi.fn((callback) => {
        notify = callback;
        queueMicrotask(() => callback('INITIAL_SESSION', initialSession));
        return { data: { subscription: { unsubscribe } } };
      }),
      signInWithPassword: vi.fn(async () => { notify('SIGNED_IN', session()); return { error: null }; }),
      signOut: vi.fn(async () => { notify('SIGNED_OUT', null); return { error: null }; }),
    },
    rpc: vi.fn().mockResolvedValue({ data: 'saved-1', error: null }),
    from: vi.fn(() => ({ select: () => ({ order: () => ({ limit }) }) })),
  };
  return { client, limit, unsubscribe, emit: (next) => act(() => notify(next ? 'SIGNED_IN' : 'SIGNED_OUT', next)) };
}

test('sign in, save once, reload history, display snapshots and sign out', async () => {
  const { client, limit } = fakeClient();
  const user = userEvent.setup();
  render(<App client={client} />);
  await user.type(await screen.findByLabelText('Evaluator email'), 'evaluator-A@example.test');
  await user.type(screen.getByLabelText('Password'), 'fictional-test-password');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(client.auth.signInWithPassword).toHaveBeenCalledWith({ email: 'evaluator-A@example.test', password: 'fictional-test-password' });
  await screen.findByText('No saved assessments yet.');
  expect(screen.getByRole('button', { name: 'Save assessment' })).toBeDisabled();
  await user.selectOptions(screen.getByLabelText('Try a fictional test scenario'), 'multiple-profiles');
  await user.click(screen.getByRole('button', { name: /View household guidance/ }));
  limit.mockResolvedValue({ data: [savedRecord], error: null });
  await user.dblClick(screen.getByRole('button', { name: 'Save assessment' }));
  await screen.findByText(/Saved successfully/);
  expect(client.rpc).toHaveBeenCalledTimes(1);
  expect(screen.getByRole('button', { name: 'Assessment saved' })).toBeDisabled();
  await user.click(await screen.findByText('Fictional Household saved-1'));
  expect(screen.getByText('Saved recommendations')).toBeVisible();
  expect(screen.getByText('Saved answers')).toBeVisible();
  await user.click(screen.getByRole('button', { name: 'Sign out' }));
  await screen.findByRole('button', { name: 'Sign in' });
  expect(screen.queryByText('Fictional Household saved-1')).not.toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Household results' })).toBeInTheDocument();
  expect(client.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
});

test('failed sign-in clears password and preserves local access', async () => {
  const { client } = fakeClient();
  client.auth.signInWithPassword.mockResolvedValue({ error: { message: 'invalid credentials' } });
  const user = userEvent.setup();
  render(<EvaluatorStorage client={client} assessment={assessment} />);
  await user.type(await screen.findByLabelText('Evaluator email'), 'evaluator@example.test');
  await user.type(screen.getByLabelText('Password'), 'fictional-test-password');
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Sign-in failed');
  expect(screen.getByLabelText('Password')).toHaveValue('');
  expect(client.rpc).not.toHaveBeenCalled();
});

test('failed save leaves local guidance and provides retry feedback', async () => {
  const { client } = fakeClient(session());
  client.rpc.mockResolvedValue({ data: null, error: { message: 'network failure' } });
  const user = userEvent.setup();
  render(<App client={client} />);
  await screen.findByRole('button', { name: 'Save assessment' });
  await user.selectOptions(screen.getByLabelText('Try a fictional test scenario'), 'multiple-profiles');
  await user.click(screen.getByRole('button', { name: /View household guidance/ }));
  await user.click(screen.getByRole('button', { name: 'Save assessment' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Save could not be confirmed');
  expect(screen.getByRole('heading', { name: 'Household results' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Save assessment' })).toBeEnabled();
});

test('restored session loads history; account switch clears prior records and rejects stale responses', async () => {
  const { client, limit, emit, unsubscribe } = fakeClient(session());
  let completeOldRequest;
  limit.mockReturnValueOnce(new Promise((resolve) => { completeOldRequest = resolve; }));
  const view = render(<EvaluatorStorage client={client} assessment={null} />);
  await screen.findByText('evaluator-A@example.test');
  emit(session('B'));
  await screen.findByText('evaluator-B@example.test');
  await screen.findByText('No saved assessments yet.');
  await act(async () => completeOldRequest({ data: [savedRecord], error: null }));
  expect(screen.queryByText('Fictional Household saved-1')).not.toBeInTheDocument();
  view.unmount();
  expect(unsubscribe).toHaveBeenCalled();
});

test('history failure can be refreshed and saved snapshots survive remount', async () => {
  const { client, limit } = fakeClient(session());
  limit.mockResolvedValueOnce({ data: null, error: { message: 'offline' } });
  const user = userEvent.setup();
  const view = render(<EvaluatorStorage client={client} assessment={null} />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load history');
  limit.mockResolvedValue({ data: [savedRecord], error: null });
  await user.click(screen.getByRole('button', { name: 'Refresh history' }));
  await screen.findByText('Fictional Household saved-1');
  view.unmount();
  render(<EvaluatorStorage client={client} assessment={null} />);
  await screen.findByText('Fictional Household saved-1');
});

test('answer changes during save do not mark the new assessment as saved', async () => {
  const { client } = fakeClient(session());
  let finish;
  client.rpc.mockReturnValue(new Promise((resolve) => { finish = resolve; }));
  const user = userEvent.setup();
  const view = render(<EvaluatorStorage client={client} assessment={assessment} />);
  await user.click(await screen.findByRole('button', { name: 'Save assessment' }));
  view.rerender(<EvaluatorStorage client={client} assessment={{ ...assessment }} />);
  expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
  await act(async () => finish({ data: 'saved-1', error: null }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Save assessment' })).toBeEnabled());
  expect(screen.queryByText(/Saved successfully/)).not.toBeInTheDocument();
});

test('sign-out failure keeps the current evaluator workspace visible', async () => {
  const { client } = fakeClient(session());
  client.auth.signOut.mockResolvedValue({ error: { message: 'offline' } });
  const user = userEvent.setup();
  render(<EvaluatorStorage client={client} assessment={null} />);
  await user.click(await screen.findByRole('button', { name: 'Sign out' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not sign out');
  expect(screen.getByText('evaluator-A@example.test')).toBeInTheDocument();
});
