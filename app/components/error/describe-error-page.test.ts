import { describeErrorPage } from './describe-error-page';
import { AppError, AuthorizationError } from '@/utils/errors/app-error';
import { PERMISSION_DENIED_MESSAGE } from '@/utils/errors/authorization-message';
import { rbacDenial } from '@/utils/errors/rbac-denial.fixture';
import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

const RAW = rbacDenial({
  verb: 'list',
  resource: 'dnsrecordsets',
  group: 'dns.networking.miloapis.com',
});
const PLAIN = PERMISSION_DENIED_MESSAGE;

describe('describeErrorPage', () => {
  it('names the area and keeps the raw text for a labelled 403 body', () => {
    expect(describeErrorPage({ status: 403, message: PLAIN, originalMessage: RAW }, 403)).toEqual({
      title: 'Permission denied to view DNS.',
      detail: RAW,
    });
  });

  it('keeps the default title for an unlabelled group but shows the raw text', () => {
    const raw = RAW.replaceAll('dns.networking.miloapis.com', 'foo.example.com');
    expect(describeErrorPage({ status: 403, message: PLAIN, originalMessage: raw }, 403)).toEqual({
      detail: raw,
    });
  });

  it('returns nothing extra when a 403 has no raw text', () => {
    expect(describeErrorPage({ status: 403, message: PLAIN }, 403)).toEqual({});
  });

  it("never shows the HTTP client's text as the details", () => {
    const error = new AppError(PLAIN, {
      status: 403,
      cause: new AxiosError('Request failed with status code 403'),
    });
    expect(describeErrorPage(error, 403)).toEqual({});
  });

  it('treats a thrown AppError like its serialized body', () => {
    expect(describeErrorPage(new AuthorizationError(RAW), 403)).toEqual({
      title: 'Permission denied to view DNS.',
      detail: RAW,
    });
  });

  it('leaves other statuses alone', () => {
    expect(describeErrorPage('Organization is required', 400)).toEqual({});
    expect(describeErrorPage({ status: 404, message: "Project 'x' not found" }, 404)).toEqual({});
    expect(describeErrorPage({ status: 500, message: 'boom', originalMessage: RAW }, 500)).toEqual(
      {}
    );
  });
});
