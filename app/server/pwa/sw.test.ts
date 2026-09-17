import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const sw = readFileSync('public/sw.js', 'utf8');

describe('public/sw.js', () => {
  test('registers a fetch listener for Chromium installability', () => {
    expect(sw).toContain("addEventListener('fetch'");
  });

  test('does not proxy application traffic through respondWith', () => {
    expect(sw).not.toContain('event.respondWith');
  });

  test('claims clients only when the page asks, not on activate', () => {
    const activateStart = sw.indexOf("addEventListener('activate'");
    const messageStart = sw.indexOf("addEventListener('message'");
    expect(activateStart).toBeGreaterThan(-1);
    expect(messageStart).toBeGreaterThan(activateStart);
    expect(sw.slice(activateStart, messageStart)).not.toContain('self.clients.claim');
    expect(sw.slice(messageStart)).toContain('self.clients.claim()');
  });
});
