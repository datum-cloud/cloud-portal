import { parseK8sMessage } from '@/utils/errors/error-parser';

describe('parseK8sMessage', () => {
  it('extracts message after single colon in resource path pattern', () => {
    const raw =
      'projects.resourcemanager.miloapis.com "jinja-otoke-tkr5rh" is forbidden: Insufficient quota resources available.';
    const result = parseK8sMessage(raw);
    expect(result).to.equal('Insufficient quota resources available.');
  });

  it('extracts deepest segment from admission webhook nested message', () => {
    const raw =
      'admission webhook "vdomain-v1alpha.kb.io" denied the request: domains.networking.datumapis.com "hiyahya-dev" is forbidden: cannot delete Domain while in use by an HTTPProxy';
    const result = parseK8sMessage(raw);
    expect(result).to.equal('Cannot delete Domain while in use by an HTTPProxy');
  });

  it('returns full message when no colon-separated nesting', () => {
    const raw = 'Something went wrong';
    const result = parseK8sMessage(raw);
    expect(result).to.equal('Something went wrong');
  });

  it('handles simple K8s not found message', () => {
    const raw = 'dnszones.dns.networking.miloapis.com "example" not found';
    const result = parseK8sMessage(raw);
    expect(result).to.equal('DNS Zone "example" not found');
  });

  it('capitalizes the first letter of the result', () => {
    const raw =
      'admission webhook "foo.kb.io" denied the request: resources.api.com "bar" is invalid: must be at least 3 characters';
    const result = parseK8sMessage(raw);
    expect(result).to.equal('Must be at least 3 characters');
  });

  it('handles empty string gracefully', () => {
    const result = parseK8sMessage('');
    expect(result).to.equal('');
  });

  it('handles message with only webhook prefix and resource path', () => {
    const raw = 'admission webhook "test.kb.io" denied the request: something unexpected happened';
    const result = parseK8sMessage(raw);
    expect(result).to.equal('Something unexpected happened');
  });

  it('humanizes not-found in multi-segment webhook message', () => {
    const raw =
      'admission webhook "foo.kb.io" denied the request: dnszones.dns.networking.miloapis.com "example" not found';
    const result = parseK8sMessage(raw);
    expect(result).to.equal('DNS Zone "example" not found');
  });
});
