import { describeToastError } from './describe-toast-error';
import { ProjectReadOnlyError } from '@/features/project/read-only/project-read-only-error';
import { AppError } from '@/utils/errors/app-error';
import { PERMISSION_DENIED_MESSAGE } from '@/utils/errors/authorization-message';
import { rbacDenial } from '@/utils/errors/rbac-denial.fixture';
import { AxiosError } from 'axios';
import { describe, expect, it } from 'vitest';

const RAW = rbacDenial({
  verb: 'patch',
  resource: 'dnsrecordsets',
  group: 'dns.networking.miloapis.com',
  name: 'www',
});
const ADVICE = 'Ask an administrator for access.';

const labelled403 = () =>
  new AppError(PERMISSION_DENIED_MESSAGE, {
    status: 403,
    originalMessage: RAW,
    requestId: 'req-1',
  });

describe('describeToastError', () => {
  it('names the area and keeps the raw text for a labelled 403', () => {
    expect(describeToastError(labelled403(), { title: 'Could not update DNS record' })).toEqual({
      title: 'Could not update DNS record',
      message: `Permission denied for changes to DNS. ${ADVICE}`,
      detail: RAW,
      requestId: 'req-1',
    });
  });

  it('uses the description as the title when the caller gives none', () => {
    const description = describeToastError(labelled403());
    expect(description.title).toBe('Permission denied for changes to DNS.');
    expect(description.message).toBe(ADVICE);
  });

  it('matches today for a plain error', () => {
    expect(describeToastError(new Error('Name is too long'), { title: 'Could not save' })).toEqual({
      title: 'Could not save',
      message: 'Name is too long',
    });
  });

  it("keeps a read-only project's redacted text", () => {
    const error = new ProjectReadOnlyError();
    const description = describeToastError(error, { title: 'Could not save' });
    expect(description.message).toBe(error.message);
    expect(description).not.toHaveProperty('detail');
  });

  it("lets the caller's message win but keeps the details", () => {
    const description = describeToastError(labelled403(), { title: 'DNS', message: 'Custom text' });
    expect(description.message).toBe('Custom text');
    expect(description.detail).toBe(RAW);
  });

  it("names the area when the caller passes the error's own message", () => {
    expect(
      describeToastError(labelled403(), { title: 'DNS Record', message: PERMISSION_DENIED_MESSAGE })
    ).toEqual({
      title: 'DNS Record',
      message: `Permission denied for changes to DNS. ${ADVICE}`,
      detail: RAW,
      requestId: 'req-1',
    });
  });

  it("keeps the server's sentence under details instead of the HTTP client's", () => {
    const sentence = 'This billing account still has projects linked to it.';
    const error = new AppError(sentence, {
      status: 409,
      cause: new AxiosError('Request failed with status code 409'),
    });
    const description = describeToastError(error, { title: 'Could not delete billing account' });
    expect([description.message, description.detail]).toContain(sentence);
    expect(description.detail).not.toBe('Request failed with status code 409');
  });

  it('survives a non-Error value', () => {
    expect(typeof describeToastError(undefined, { title: 'Oops' }).title).toBe('string');
    expect(typeof describeToastError('boom').title).toBe('string');
  });
});
