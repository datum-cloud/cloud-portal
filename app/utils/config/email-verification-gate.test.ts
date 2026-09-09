import { isEmailVerificationGateEnabled } from './email-verification-gate';
import { afterEach, beforeEach, describe, expect, it } from 'bun:test';

const original = process.env.EMAIL_VERIFICATION_GATE;

beforeEach(() => {
  delete process.env.EMAIL_VERIFICATION_GATE;
});

afterEach(() => {
  if (original === undefined) {
    delete process.env.EMAIL_VERIFICATION_GATE;
  } else {
    process.env.EMAIL_VERIFICATION_GATE = original;
  }
});

describe('isEmailVerificationGateEnabled', () => {
  it('is off when the variable is unset — the default that ships', () => {
    expect(isEmailVerificationGateEnabled()).toBe(false);
  });

  it('is on for the exact string "true"', () => {
    process.env.EMAIL_VERIFICATION_GATE = 'true';
    expect(isEmailVerificationGateEnabled()).toBe(true);
  });

  it('is off for every other truthy-looking value', () => {
    for (const value of ['1', 'yes', 'TRUE', 'True', 'on', '']) {
      process.env.EMAIL_VERIFICATION_GATE = value;
      expect(isEmailVerificationGateEnabled()).toBe(false);
    }
  });

  it('re-reads on every call, so a test can flip it in-process', () => {
    expect(isEmailVerificationGateEnabled()).toBe(false);
    process.env.EMAIL_VERIFICATION_GATE = 'true';
    expect(isEmailVerificationGateEnabled()).toBe(true);
    process.env.EMAIL_VERIFICATION_GATE = 'false';
    expect(isEmailVerificationGateEnabled()).toBe(false);
  });
});
