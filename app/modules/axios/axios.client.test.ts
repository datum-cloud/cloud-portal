import { appErrorFromSerialized } from './axios.client';
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

describe('appErrorFromSerialized', () => {
  it('keeps the raw denial and K8s reason from a serialized body', () => {
    const k8sDetails = { group: 'dns.networking.miloapis.com', kind: 'dnsrecordsets' };
    const error = appErrorFromSerialized(
      {
        code: 'AUTHORIZATION_ERROR',
        message: PERMISSION_DENIED_MESSAGE,
        status: 403,
        originalMessage: RAW,
        k8sReason: 'Forbidden',
        k8sDetails,
      },
      new AxiosError('x')
    );

    expect(error.message).toBe(PERMISSION_DENIED_MESSAGE);
    expect(error.originalMessage).toBe(RAW);
    expect(error.k8sReason).toBe('Forbidden');
    expect(error.k8sDetails).toEqual(k8sDetails);
  });
});
