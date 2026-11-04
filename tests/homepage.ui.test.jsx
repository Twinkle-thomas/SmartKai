import React from 'react';
import { test, expect, beforeEach } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App.jsx';
import { readRoute } from '../src/navigation.js';

beforeEach(() => window.history.replaceState(null, '', '/'));

test('homepage presents the product without a questionnaire or sign-in form', async () => {
  render(<App />);
  expect(await screen.findByRole('heading', { level: 1 }, { timeout: 5000 })).toHaveTextContent('Less Food Waste.More Food Saved.');
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Choose an example household')).not.toBeInTheDocument();
  expect(screen.queryByText('In development')).not.toBeInTheDocument();
  for (const id of ['leftovers','storage-guidance']) {
    const section = document.getElementById(id);
    expect(within(section).getByText('Available now')).toBeInTheDocument();
    expect(within(section).getByText('Illustrative preview · Open the tool to use your own saved data.')).toBeInTheDocument();
    expect(within(section).queryByRole('button')).not.toBeInTheDocument();
    expect(within(section).queryByRole('textbox')).not.toBeInTheDocument();
  }
  expect(within(document.getElementById('personalised-recommendations')).getByText('Available now')).toBeInTheDocument();
});

test('personalisation is opened intentionally and answers survive dashboard navigation', async () => {
  const user = userEvent.setup(); render(<App />);
  await screen.findByRole('heading', { level: 1 }, { timeout: 5000 });
  await user.click(screen.getAllByRole('link', { name: 'Get Personalised Recommendations', exact: true })[0]);
  await screen.findByLabelText('Choose an example household');
  expect(window.location.hash).toBe('#/personalisation');
  await user.selectOptions(screen.getByLabelText('Choose an example household'), 'multiple-profiles');
  await user.click(screen.getByRole('button', { name: /View household guidance/ }));
  await user.click(within(screen.getByRole('navigation', { name: 'Application navigation' })).getByRole('link', { name: 'Overview' }));
  await screen.findByRole('heading', { name: /A little more clarity/ });
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  expect(screen.getByText('Your next steps, ready to revisit.')).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'View your guidance' }));
  expect(await screen.findByRole('heading', { name: 'Household results' })).toBeInTheDocument();
  expect(screen.getAllByRole('radio').filter((radio) => radio.checked)).toHaveLength(5);
});

test('Explore SmartKai opens a working dashboard; account has no questionnaire', async () => {
  const user = userEvent.setup(); render(<App />);
  await screen.findByRole('heading', { level: 1 }, { timeout: 5000 });
  await user.click(screen.getByRole('link', { name: 'Explore SmartKai', exact: true }));
  await screen.findByRole('heading', { name: 'Your household tools.' });
  expect(window.location.hash).toBe('#/dashboard');
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Open account & history' }));
  expect(await screen.findByRole('heading', { name: 'A place to come back to.' })).toBeInTheDocument();
  expect(window.location.hash).toBe('#/account');
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
});

test('unknown routes show a recovery action and legacy links are recognised', async () => {
  render(<App />);
  await act(async () => { window.location.hash = '#/missing'; window.dispatchEvent(new HashChangeEvent('hashchange')); });
  expect(await screen.findByRole('link', { name: 'Back to SmartKai' })).toHaveAttribute('href', '#/');
  expect(readRoute('#evaluator-workspace')).toBe('account');
  expect(readRoute('#assessment')).toBe('personalisation');
  expect(readRoute('#guidance')).toBe('personalisation');
});
