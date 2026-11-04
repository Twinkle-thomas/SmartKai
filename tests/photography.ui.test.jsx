import React from 'react';
import { test, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import HomePage from '../src/components/HomePage.jsx';

test('food photographs have useful alt text, responsive sources and reserved dimensions', () => {
  render(<HomePage />);
  const images = screen.getAllByRole('img');
  expect(images).toHaveLength(7);
  for (const image of images) {
    expect(image.getAttribute('alt').length).toBeGreaterThan(35);
    expect(image.getAttribute('src')).toMatch(/^\/media\/food\/.+\.webp$/);
    expect(image.getAttribute('srcset')).toMatch(/640w.*1024w.*1600w/);
    expect(Number(image.getAttribute('width'))).toBeGreaterThan(0);
    expect(Number(image.getAttribute('height'))).toBeGreaterThan(0);
  }
  const hero = screen.getByAltText(/Fresh peppers, carrots/);
  expect(hero).toHaveAttribute('loading', 'eager');
  expect(hero).toHaveAttribute('fetchpriority', 'high');
  expect(images.filter((image) => image.loading === 'lazy' || image.getAttribute('loading') === 'lazy')).toHaveLength(6);
  expect(within(document.getElementById('leftovers')).getByRole('img')).toHaveAttribute('alt', expect.stringContaining('reusable glass containers'));
});

test('credit manifest covers all six licensed sources and optimised local assets', async () => {
  const base = join(process.cwd(), 'public');
  const credits = JSON.parse(await readFile(join(base, 'media/food/credits.json'), 'utf8'));
  expect(credits).toHaveLength(6);
  for (const credit of credits) {
    expect(credit.source).toMatch(/^https:\/\/unsplash.com\/photos\//);
    expect(credit.license).toBe('https://unsplash.com/license');
    expect(credit.photographer.length).toBeGreaterThan(2);
    expect(credit.variants.map(({ width }) => width)).toEqual([640, 1024, 1600]);
    for (const variant of credit.variants) {
      const file = await stat(join(base, variant.file.slice(1)));
      expect(file.size).toBe(variant.bytes);
      expect(file.size).toBeLessThan(({ 640: 120, 1024: 250, 1600: 600 })[variant.width] * 1024);
    }
  }
});

test('photographer credits are available without interrupting the homepage', () => {
  render(<HomePage />);
  const disclosure = screen.getByText('Photography credits').closest('details');
  expect(disclosure).not.toHaveAttribute('open');
  expect(within(disclosure).getAllByRole('link', { hidden: true })).toHaveLength(7);
});
