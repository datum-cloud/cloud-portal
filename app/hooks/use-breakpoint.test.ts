import { breakpointForWidth, isBreakpoint } from './use-breakpoint';
import { describe, expect, it } from 'bun:test';

describe('breakpointForWidth', () => {
  it('maps widths below 768px to mobile', () => {
    expect(breakpointForWidth(0)).toBe('mobile');
    expect(breakpointForWidth(767)).toBe('mobile');
  });

  it('maps 768px to 1023px to tablet', () => {
    expect(breakpointForWidth(768)).toBe('tablet');
    expect(breakpointForWidth(1023)).toBe('tablet');
  });

  it('maps 1024px and up to desktop', () => {
    expect(breakpointForWidth(1024)).toBe('desktop');
    expect(breakpointForWidth(2560)).toBe('desktop');
  });
});

describe('isBreakpoint', () => {
  it('accepts the three tiers', () => {
    expect(isBreakpoint('mobile')).toBe(true);
    expect(isBreakpoint('tablet')).toBe(true);
    expect(isBreakpoint('desktop')).toBe(true);
  });

  it('rejects anything else, including a raw width', () => {
    expect(isBreakpoint('1280')).toBe(false);
    expect(isBreakpoint('')).toBe(false);
    expect(isBreakpoint(null)).toBe(false);
  });
});
