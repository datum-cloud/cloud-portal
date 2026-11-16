import {
  emailDomainJoiningErrorMessage,
  emailDomainJoiningFormSchema,
} from './email-domain-joining.schema';
import { ValidationError } from '@/utils/errors/app-error';
import { describe, expect, it } from 'vitest';

describe('emailDomainJoiningFormSchema', () => {
  it('accepts domains serialized by the form adapter', () => {
    const result = emailDomainJoiningFormSchema.safeParse({
      domains: '["acme.com","eu.acme.com"]',
      role: 'viewer',
      roleNamespace: 'datum-cloud',
    });
    expect(result.success).toBe(true);
    expect(result.data?.domains).toEqual(['acme.com', 'eu.acme.com']);
  });

  it('rejects an empty list and too many domains', () => {
    expect(emailDomainJoiningFormSchema.safeParse({ domains: '[]', role: 'viewer' }).success).toBe(
      false
    );

    const eleven = Array.from({ length: 11 }, (_, i) => `d${i}.example.com`);
    expect(
      emailDomainJoiningFormSchema.safeParse({ domains: eleven, role: 'viewer' }).success
    ).toBe(false);
  });

  it('requires a role', () => {
    expect(
      emailDomainJoiningFormSchema.safeParse({ domains: ['acme.com'], role: '' }).success
    ).toBe(false);
  });
});

describe('emailDomainJoiningErrorMessage', () => {
  it("shows milo's explanation from each cause", () => {
    const error = new ValidationError('Organization "acme" is invalid: [...]', [
      {
        path: ['spec', 'emailDomainJoining', 'domains'],
        message:
          'Invalid value: ["gmail.com"]: gmail.com is a public email provider, where anyone can get an address.',
      },
      {
        path: ['spec', 'emailDomainJoining', 'domains'],
        message:
          'Invalid value: ["other.io"]: no project in this organization has a verified Domain for other.io.',
      },
    ]);
    expect(emailDomainJoiningErrorMessage(error)).toBe(
      'gmail.com is a public email provider, where anyone can get an address. No project in this organization has a verified Domain for other.io.'
    );
  });

  it('turns the feature gate message into a sentence', () => {
    const error = new ValidationError('forbidden', [
      {
        path: ['spec', 'emailDomainJoining'],
        message: 'Forbidden: email domain joining is not available yet',
      },
    ]);
    expect(emailDomainJoiningErrorMessage(error)).toBe('Email domain joining is not available yet');
  });

  it('falls back to the error message without causes', () => {
    expect(emailDomainJoiningErrorMessage(new Error('Network error'))).toBe('Network error');
  });
});
