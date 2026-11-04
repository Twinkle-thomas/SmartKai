import React from 'react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReminderCenter from '../src/components/ReminderCenter.jsx';
import { defaultReminders } from '../src/domain/reminders.js';

const mocks = vi.hoisted(() => ({ list: vi.fn(), save: vi.fn(), acknowledge: vi.fn() }));
vi.mock('../src/services/reminders.js', () => ({ createReminderService: () => mocks }));
beforeEach(() => {
  vi.resetAllMocks(); mocks.list.mockResolvedValue([]);
  mocks.save.mockImplementation(async (records) => records.map((record) => ({ ...record, starts_at: new Date().toISOString(), last_acknowledged_at: null })));
});
afterEach(() => vi.useRealTimers());

test('first signed-in visit offers optional setup without blocking the questionnaire', async () => {
  const user = userEvent.setup(); render(<ReminderCenter client={{}} userId="a" route="personalisation" />);
  expect(await screen.findByRole('link', { name: 'Set up my reminders' })).toHaveAttribute('href', '#/reminders');
  await user.click(screen.getByRole('button', { name: 'Maybe later' }));
  expect(screen.queryByRole('link', { name: 'Set up my reminders' })).not.toBeInTheDocument();
  expect(mocks.save).not.toHaveBeenCalled();
});
test('users choose a weekly day off and time, save, preview, and can turn reminders off', async () => {
  const user = userEvent.setup(); render(<ReminderCenter client={{}} userId="a" route="reminders" />);
  const meal = await screen.findByLabelText('Enable plan upcoming meals reminder');
  expect(meal).not.toBeChecked();
  expect(screen.getByLabelText('Day for plan upcoming meals')).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Download calendar reminders' })).toBeDisabled();
  await user.click(meal);
  await user.selectOptions(screen.getByLabelText('Day for plan upcoming meals'), '2');
  await user.clear(screen.getByLabelText('Time for plan upcoming meals'));
  await user.type(screen.getByLabelText('Time for plan upcoming meals'), '10:30');
  await user.click(screen.getByRole('button', { name: 'Save reminder preferences' }));
  await screen.findByText('Your weekly reminders are saved.');
  expect(mocks.save).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining({ task_key: 'meal-planning', weekday: 2, time_of_day: '10:30', enabled: true })]));
  expect(screen.getByRole('button', { name: 'Download calendar reminders' })).toBeEnabled();
  await user.click(screen.getByRole('button', { name: 'Preview an alert' }));
  expect(screen.getByText('Preview: Plan upcoming meals')).toBeVisible();
  expect(mocks.acknowledge).not.toHaveBeenCalled();
  await user.click(meal);
  await user.click(screen.getByRole('button', { name: 'Save reminder preferences' }));
  await screen.findByText('Your weekly reminders are saved.');
  expect(screen.getByRole('button', { name: 'Download calendar reminders' })).toBeDisabled();
});
test('due alert points to a working pantry view and dismissal persists across reload', async () => {
  vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-11-01T21:00:00Z'));
  let records = [{ ...defaultReminders()[0], enabled: true, weekday: 1, starts_at: '2026-10-30T00:00:00Z' }];
  mocks.list.mockImplementation(async () => records);
  mocks.acknowledge.mockImplementation(async () => { records = records.map((record) => ({ ...record, last_acknowledged_at: new Date().toISOString() })); return records[0]; });
  const user = userEvent.setup(); const view = render(<ReminderCenter client={{}} userId="a" route="dashboard" />);
  expect(await screen.findByRole('heading', { name: 'A little time for food at home.' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Open meal planner' })).toHaveAttribute('href', '#/meals');
  await user.click(screen.getByRole('button', { name: 'Dismiss Plan upcoming meals reminder' }));
  expect(screen.queryByRole('heading', { name: 'A little time for food at home.' })).not.toBeInTheDocument();
  view.unmount(); render(<ReminderCenter client={{}} userId="a" route="reminders" />);
  await screen.findByRole('heading', { name: 'Your weekly reminders' });
  expect(screen.queryByRole('heading', { name: 'A little time for food at home.' })).not.toBeInTheDocument();
});
test('an open application checks the clock and reveals an alert at the due time', async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-11-01T19:59:45Z'));
  mocks.list.mockResolvedValue([{ ...defaultReminders()[0], enabled: true, weekday: 1, starts_at: '2026-10-30T00:00:00Z' }]);
  await act(async () => { render(<ReminderCenter client={{}} userId="a" route="dashboard" />); });
  expect(screen.queryByRole('heading', { name: 'A little time for food at home.' })).not.toBeInTheDocument();
  await act(async () => { vi.advanceTimersByTime(30000); });
  expect(screen.getByRole('heading', { name: 'A little time for food at home.' })).toBeInTheDocument();
});
test('load and save failures never report successful setup', async () => {
  mocks.list.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([]);
  mocks.save.mockRejectedValue(new Error('offline'));
  const user = userEvent.setup(); render(<ReminderCenter client={{}} userId="a" route="reminders" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not load');
  await user.click(screen.getByRole('button', { name: 'Reload reminders' }));
  await user.click(await screen.findByLabelText('Enable prepare for shopping reminder'));
  await user.click(screen.getByRole('button', { name: 'Save reminder preferences' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Could not confirm');
  expect(screen.queryByText('Your weekly reminders are saved.')).not.toBeInTheDocument();
});
test('signed-out access offers sign-in and never loads or saves preferences', () => {
  render(<ReminderCenter client={{}} route="reminders" />);
  expect(screen.getByRole('link', { name: 'Sign in to set reminders' })).toHaveAttribute('href', '#/login');
  expect(mocks.list).not.toHaveBeenCalled();
  expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
});
