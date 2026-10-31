import React from 'react';
import { test, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App.jsx';
import { SCENARIOS } from '../src/data/scenarios.js';
test('requires all answers before displaying results', async () => {
  const user = userEvent.setup(); render(<App />);
  await user.click(screen.getByRole('button', { name: /View household guidance/ }));
  expect(screen.queryByRole('heading', { name: 'Household results' })).not.toBeInTheDocument();
  expect(screen.getAllByRole('radio').every((radio) => radio.required)).toBe(true);
});
for (const scenario of SCENARIOS) {
  test(`scenario selection and displayed guidance: ${scenario.id}`, async () => {
    const user = userEvent.setup(); render(<App />);
    await user.selectOptions(screen.getByLabelText('Try a fictional test scenario'), scenario.id);
    expect(screen.getAllByRole('radio').filter((radio) => radio.checked)).toHaveLength(5);
    await user.click(screen.getByRole('button', { name: /View household guidance/ }));
    const heading = screen.getByRole('heading', { name: 'Household results' });
    expect(heading).toHaveFocus();
    const results = within(heading.closest('section'));
    if (scenario.expectedProfiles.length) {
      for (const profile of scenario.expectedProfiles) expect(results.getAllByText(profile)).toHaveLength(2);
      await user.click(results.getByText('Why were these profiles assigned?'));
      expect(results.getAllByText(/meeting the threshold of 2/)).toHaveLength(scenario.expectedProfiles.length);
    } else expect(results.getByText('General food-waste prevention guidance')).toBeInTheDocument();
  });
}
test('editing clears stale results and scenario identity; reset clears all answers', async () => {
  const user = userEvent.setup(); render(<App />);
  await user.selectOptions(screen.getByLabelText('Try a fictional test scenario'), 'overbuyer-only');
  await user.click(screen.getByRole('button', { name: /View household guidance/ }));
  await user.click(within(screen.getAllByRole('group')[0]).getByRole('radio', { name: /Never/ }));
  expect(screen.queryByRole('heading', { name: 'Household results' })).not.toBeInTheDocument();
  expect(screen.getByLabelText('Try a fictional test scenario')).toHaveValue('');
  await user.click(screen.getByRole('button', { name: /View household guidance/ }));
  expect(screen.getByText('Custom fictional household')).toBeInTheDocument();
  expect(screen.getByText('General food-waste prevention guidance')).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Start again' }));
  expect(screen.getAllByRole('radio').some((radio) => radio.checked)).toBe(false);
  expect(screen.getByText('0 of 5 answered')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Household results' })).not.toBeInTheDocument();
});
