import React from 'react';
import { beforeEach, afterEach, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import HomePage from '../src/components/HomePage.jsx';
import { showcaseIndex } from '../src/presentation/scrollShowcase.js';

const preferences = vi.hoisted(() => ({ reduced: true, roomy: true }));
vi.mock('motion/react', async (load) => ({ ...await load(), useReducedMotion: () => preferences.reduced }));

beforeEach(() => {
  preferences.reduced = true;
  preferences.roomy = true;
  vi.stubGlobal('matchMedia', (query) => ({
    matches: query.includes('prefers-reduced-motion') ? preferences.reduced : preferences.roomy,
    media: query, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn(),
  }));
  vi.stubGlobal('IntersectionObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
});
afterEach(() => vi.unstubAllGlobals());

test('reduced motion keeps every feature inline, visible and actionable without a pinned preview', () => {
  render(<HomePage />);
  expect(screen.queryByTestId('sticky-showcase')).not.toBeInTheDocument();
  expect(document.querySelectorAll('.feature-section')).toHaveLength(6);
  for (const heading of screen.getAllByRole('heading', { level: 2 })) expect(heading).toBeVisible();
  expect(screen.getAllByRole('link', { name: 'Get Personalised Recommendations' }).every((link) => link.getAttribute('href') === '#/personalisation')).toBe(true);
});

test('roomy screens use one decorative pinned preview alongside all six readable descriptions', () => {
  preferences.reduced = false;
  render(<HomePage />);
  expect(screen.getByTestId('sticky-showcase')).toBeInTheDocument();
  expect(document.querySelectorAll('.story-step')).toHaveLength(6);
  const stage = document.querySelector('.sticky-product-stage');
  expect(stage).toHaveAttribute('aria-hidden', 'true');
  expect(stage.querySelectorAll('a, button, input, [tabindex]')).toHaveLength(0);
  expect(document.getElementById('personalised-recommendations').querySelector('a')).toHaveAttribute('href', '#/personalisation');
});

test('small viewports retain individual product illustrations instead of pinning', () => {
  preferences.reduced = false;
  preferences.roomy = false;
  render(<HomePage />);
  expect(screen.queryByTestId('sticky-showcase')).not.toBeInTheDocument();
  expect(document.querySelectorAll('.feature-image-reveal')).toHaveLength(6);
  expect(screen.queryByRole('radio')).not.toBeInTheDocument();
});

test('showcase selection handles every chapter boundary and clamps overscroll', () => {
  expect(showcaseIndex(-.1, 6)).toBe(0);
  expect(showcaseIndex(0, 6)).toBe(0);
  for (let chapter = 0; chapter < 6; chapter++) {
    expect(showcaseIndex((chapter + .5) / 6, 6)).toBe(chapter);
  }
  expect(showcaseIndex(1, 6)).toBe(5);
  expect(showcaseIndex(1.2, 6)).toBe(5);
  expect(showcaseIndex(NaN, 6)).toBe(0);
});
