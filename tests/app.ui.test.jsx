import React from 'react';
import { test, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App.jsx';
import { SCENARIOS } from '../src/data/scenarios.js';
beforeEach(() => window.history.replaceState(null, '', '/#/personalisation'));
test('requires all answers before displaying results', async () => {
  const user = userEvent.setup(); render(<App />);
  await user.click(screen.getByRole('button', { name: /View household guidance/ }));
  expect(screen.getByRole('alert')).toHaveTextContent('Please answer all five questions');
  expect(screen.getByRole('alert')).toHaveTextContent('5 questions need an answer');
  await user.click(within(screen.getByRole('alert')).getAllByRole('button')[0]);
  expect(screen.getAllByRole('radio')[0]).toHaveFocus();
  expect(screen.queryByRole('heading', { name: 'Household results' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('radio').every((radio) => radio.required)).toBe(true);
});
for (const scenario of SCENARIOS) {
  test(`scenario selection and displayed guidance: ${scenario.id}`, async () => {
    const user = userEvent.setup(); render(<App />);
    await user.selectOptions(screen.getByLabelText('Choose an example household'), scenario.id);
    expect(screen.getAllByRole('radio').filter((radio) => radio.checked)).toHaveLength(5);
    await user.click(screen.getByRole('button', { name: /View household guidance/ }));
    const heading = screen.getByRole('heading', { name: 'Household results' });
    expect(heading).toHaveFocus();
    const results = within(heading.closest('section'));
    expect(document.body.textContent).not.toMatch(/fictional|threshold|provisional|score [012]/i);
    if (scenario.expectedProfiles.length) {
      for (const profile of scenario.expectedProfiles) expect(results.getAllByText(profile)).toHaveLength(2);
      expect(results.getByText('About this guidance').closest('details')).not.toHaveAttribute('open');
      await user.click(results.getByText('About this guidance'));
      expect(results.getAllByText(/you selected Often for the related food-management practice/)).toHaveLength(scenario.expectedProfiles.length);
    } else expect(results.getByText('General food-waste prevention guidance')).toBeInTheDocument();
  });
}
test('editing clears stale results and scenario identity; reset clears all answers', async () => {
  const user = userEvent.setup(); render(<App />);
  await user.selectOptions(screen.getByLabelText('Choose an example household'), 'overbuyer-only');
  await user.click(screen.getByRole('button', { name: /View household guidance/ }));
  await user.click(within(screen.getAllByRole('group')[0]).getByRole('radio', { name: /Never/ }));
  expect(screen.queryByRole('heading', { name: 'Household results' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Choose an example household')).toHaveValue('');
  await user.click(screen.getByRole('button', { name: /View household guidance/ }));
  expect(screen.getByText('Your household')).toBeInTheDocument();
  expect(screen.getByText('General food-waste prevention guidance')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Start again' }));
  expect(screen.getAllByRole('radio').some((radio) => radio.checked)).toBe(false);
  expect(screen.getByText('0 of 5 answered')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Household results' })).not.toBeInTheDocument();
});
