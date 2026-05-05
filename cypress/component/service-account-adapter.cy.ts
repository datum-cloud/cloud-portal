import {
  toCreateServiceAccountPayload,
  USE_CASE_ANNOTATION,
} from '@/resources/service-accounts/service-account.adapter';

describe('toCreateServiceAccountPayload', () => {
  it('produces a minimal ServiceAccount with no annotations when only name is given', () => {
    const payload = toCreateServiceAccountPayload('svc-min');

    expect(payload.apiVersion).to.equal('iam.miloapis.com/v1alpha1');
    expect(payload.kind).to.equal('ServiceAccount');
    expect(payload.metadata?.name).to.equal('svc-min');
    expect(payload.metadata?.annotations).to.equal(undefined);
    expect(payload.spec?.state).to.equal('Active');
  });

  it('stamps the description annotation when displayName is provided', () => {
    const payload = toCreateServiceAccountPayload('svc-named', 'My Service');

    expect(payload.metadata?.annotations).to.deep.equal({
      'kubernetes.io/description': 'My Service',
    });
  });

  it('stamps the use-case annotation under iam.miloapis.com when useCase is provided', () => {
    const payload = toCreateServiceAccountPayload('svc-cicd', undefined, 'cicd');

    expect(USE_CASE_ANNOTATION).to.equal('iam.miloapis.com/use-case');
    expect(payload.metadata?.annotations).to.deep.equal({
      'iam.miloapis.com/use-case': 'cicd',
    });
  });

  it('stamps both annotations together when displayName and useCase are both provided', () => {
    const payload = toCreateServiceAccountPayload('svc-both', 'My Service', 'service');

    expect(payload.metadata?.annotations).to.deep.equal({
      'kubernetes.io/description': 'My Service',
      'iam.miloapis.com/use-case': 'service',
    });
  });

  it('omits the annotations object entirely when both optional inputs are empty', () => {
    // displayName="" should not stamp anything (truthy check in adapter).
    const payload = toCreateServiceAccountPayload('svc-empty', '', undefined);

    expect(payload.metadata?.annotations).to.equal(undefined);
  });
});
